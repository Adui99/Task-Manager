import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import User from "@/models/User";
import { sendOverdueReminderEmail } from "@/lib/sendEmail";

export async function GET(req: Request) {
  try {
    await dbConnect();

    // Verify token from Vercel Cron OR check if user is admin
    const authHeader = req.headers.get("authorization");
    const userRole = req.headers.get("x-user-role");
    
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
    }).populate("assignees", "name email");

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
        if (assignee && assignee.email) {
          const email = assignee.email;
          if (!tasksByUser.has(email)) {
            tasksByUser.set(email, { user: assignee, tasks: [] });
          }
          tasksByUser.get(email)!.tasks.push(task);
        }
      });
    });

    // Send emails
    const emailPromises = [];
    for (const [email, data] of tasksByUser.entries()) {
      emailPromises.push(
        sendOverdueReminderEmail(email, data.user.name, data.tasks)
      );
    }

    await Promise.allSettled(emailPromises);

    return NextResponse.json({ 
      message: "Overdue reminders sent successfully", 
      usersNotified: tasksByUser.size,
      tasksOverdue: overdueTasks.length
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
