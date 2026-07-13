import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import User from "@/models/User";
import Message from "@/models/Message";
import Notification from "@/models/Notification";

export async function GET(req: Request) {
  try {
    await dbConnect();

    // Verify token from Vercel Cron OR check if user is admin
    const authHeader = req.headers.get("authorization");
    const session = await verifyAuth();
    const userRole = session?.role;
    
    const isCronRequest = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isAdminUser = userRole === "admin" || userRole === "vice_admin";

    if (!isCronRequest && !isAdminUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Calculate threshold (42 hours ago)
    const thresholdTime = new Date(Date.now() - 42 * 60 * 60 * 1000);

    // Find all tasks that are overdue by >= 42 hours
    const overdueTasks = await Task.find({
      status: { $ne: "done" },
      deadline: { $lt: thresholdTime },
      archived: { $ne: true }
    }).populate("assignees", "_id name");

    if (!overdueTasks || overdueTasks.length === 0) {
      return NextResponse.json({ 
        message: "No overdue tasks found",
        usersNotified: 0,
        tasksOverdue: 0 
      });
    }

    // Group tasks by assignee
    const tasksByUser = new Map<string, { user: any, tasks: any[] }>();

    overdueTasks.forEach(task => {
      const assignees: any[] = task.assignees || [];
      assignees.forEach(assignee => {
        if (assignee && assignee._id) {
          const userId = assignee._id.toString();
          if (!tasksByUser.has(userId)) {
            tasksByUser.set(userId, { user: assignee, tasks: [] });
          }
          tasksByUser.get(userId)!.tasks.push(task);
        }
      });
    });

    // Find an admin user to act as the sender of the chat message
    const adminUser = await User.findOne({ role: "admin" });
    const adminId = adminUser ? adminUser._id : null;

    let usersNotified = 0;
    for (const [userId, data] of tasksByUser.entries()) {
      // Create bell notification
      await Notification.create({
        user_id: userId,
        title: "Cảnh báo quá hạn (Tự động)",
        content: `Hệ thống ghi nhận bạn có ${data.tasks.length} công việc đã quá hạn hơn 42 tiếng.`,
        type: "reminder"
      });

      // Create chat message if admin exists
      if (adminId) {
        const taskListStr = data.tasks.map(t => `- ${t.title}`).join('\\n');
        const content = `[Hệ thống tự động] Bạn đang có ${data.tasks.length} công việc đã vượt quá thời hạn (Deadline) hơn 42 tiếng:\\n${taskListStr}\\n\\nVui lòng kiểm tra lại bảng Kanban và xử lý ngay lập tức.`;
        
        await Message.create({
          sender_id: adminId,
          receiver_id: userId,
          content: content
        });
      }

      usersNotified++;
    }

    return NextResponse.json({ 
      message: "Overdue reminders sent successfully", 
      usersNotified: usersNotified,
      tasksOverdue: overdueTasks.length
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
