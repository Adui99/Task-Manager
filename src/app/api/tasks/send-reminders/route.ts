import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import User from "@/models/User";
import { sendOverdueReminderEmail } from "@/lib/sendEmail";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "admin" && userRole !== "vice_admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { taskIds } = await req.json();
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ message: "No task IDs provided" }, { status: 400 });
    }

    const tasks = await Task.find({ _id: { $in: taskIds } }).populate("assignees", "name email");

    const tasksByUser = new Map<string, { user: any, tasks: any[] }>();

    tasks.forEach(task => {
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

    const emailPromises = [];
    for (const [email, data] of tasksByUser.entries()) {
      emailPromises.push(
        sendOverdueReminderEmail(email, data.user.name, data.tasks)
      );
    }

    await Promise.allSettled(emailPromises);

    return NextResponse.json({ 
      message: "Reminders sent successfully", 
      usersNotified: tasksByUser.size,
      tasksOverdue: tasks.length
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
