import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import User from "@/models/User";
import { sendTaskAssignmentEmail, sendAdminOverdueEmail } from "@/lib/sendEmail";
import { z } from "zod";
import rateLimit from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  deadline: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  sendEmail: z.boolean().optional(),
});

export async function GET() {
  try {
    await dbConnect();

    // Auto-complete tasks with 100% progress if 5 minutes have passed since last update
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await Task.updateMany(
      { progress: 100, status: { $ne: "done" }, updatedAt: { $lte: fiveMinutesAgo } },
      { $set: { status: "done" } }
    );

    // Auto-delete tasks that have been "done" for over 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await Task.deleteMany({
      status: "done",
      updatedAt: { $lte: sevenDaysAgo }
    });

    // Auto-archive 'done' tasks that are 3 days past their deadline (phòng backup)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await Task.updateMany(
      { status: "done", deadline: { $lte: threeDaysAgo }, archived: false },
      { $set: { archived: true } }
    );

    // Notify admin for 'todo' and 'in-progress' tasks that are 3 days past their deadline
    const overdueTasks = await Task.find({
      status: { $ne: "done" },
      deadline: { $lte: threeDaysAgo },
      adminNotifiedOverdue: { $ne: true },
      archived: false
    });

    if (overdueTasks.length > 0) {
      const admins = await User.find({ role: { $in: ["admin", "vice_admin"] } });
      const adminEmails = admins.map(admin => admin.email).filter(Boolean);
      
      if (adminEmails.length > 0) {
        await sendAdminOverdueEmail(adminEmails as string[], overdueTasks);
        
        const overdueTaskIds = overdueTasks.map(t => t._id);
        await Task.updateMany(
          { _id: { $in: overdueTaskIds } },
          { $set: { adminNotifiedOverdue: true } }
        );
      }
    }

    // Auto-migrate old tasks with assignee_id to assignees array
    await Task.collection.updateMany(
      { assignee_id: { $exists: true, $ne: null } },
      [
        { $set: { assignees: ["$assignee_id"] } },
        { $unset: "assignee_id" }
      ]
    );

    const tasks = await Task.find({ archived: false })
      .populate("assignees", "name email avatar")
      .populate("comments.user_id", "name email avatar")
      .sort({ order: 1 });
    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    try {
      await limiter.check(100, ip); // Max 100 tasks per minute per IP
    } catch {
      return NextResponse.json({ message: "Too many requests" }, { status: 429 });
    }

    await dbConnect();
    const session = await verifyAuth();
    const role = session?.role;
    const userId = session?.userId;

    if (role !== "admin" && role !== "vice_admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = taskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.format() }, { status: 400 });
    }

    const { sendEmail, ...taskData } = parsed.data;
    const taskCount = await Task.countDocuments({ status: "todo", archived: false });
    
    const task = new Task({
      ...taskData,
      deadline: taskData.deadline || undefined,
      status: "todo",
      order: taskCount,
    });

    await task.save();

    await logAudit("CREATE_TASK", userId || "system", { taskId: task._id, title: task.title }, ip);

    if (sendEmail && task.assignees && task.assignees.length > 0) {
      const assignees = await User.find({ _id: { $in: task.assignees } });
      for (const assignee of assignees) {
        if (assignee.email) {
          await sendTaskAssignmentEmail(assignee.email, task.title).catch(console.error);
        }
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
