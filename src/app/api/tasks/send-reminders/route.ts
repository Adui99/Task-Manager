import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import Message from "@/models/Message";
import Notification from "@/models/Notification";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await verifyAuth();
    const userRole = session?.role;
    const adminId = session?.userId;
    if (userRole !== "admin" && userRole !== "vice_admin" || !adminId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { taskIds } = await req.json();
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ message: "No task IDs provided" }, { status: 400 });
    }

    const tasks = await Task.find({ _id: { $in: taskIds } }).populate("assignees", "_id name");

    const tasksByUser = new Map<string, { user: any, tasks: any[] }>();

    tasks.forEach(task => {
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

    let usersNotified = 0;
    for (const [userId, data] of tasksByUser.entries()) {
      // Create chat message
      const taskListStr = data.tasks.map(t => `- ${t.title}`).join('\\n');
      const content = `Hệ thống ghi nhận bạn đang có ${data.tasks.length} công việc đã vượt quá thời hạn (Deadline):\\n${taskListStr}\\n\\nVui lòng kiểm tra lại bảng Kanban và xử lý sớm nhất có thể.`;
      
      await Message.create({
        sender_id: adminId,
        receiver_id: userId,
        content: content
      });

      // Create bell notification
      await Notification.create({
        user_id: userId,
        title: "Công việc quá hạn",
        content: `Bạn có ${data.tasks.length} công việc quá hạn cần xử lý.`,
        type: "reminder"
      });

      usersNotified++;
    }

    return NextResponse.json({ 
      message: "Reminders sent successfully", 
      usersNotified: usersNotified,
      tasksOverdue: tasks.length
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
