import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import { headers } from "next/headers";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import rateLimit from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

const updateTaskSchema = z.object({
  title: z.string().max(500).optional(),
  description: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  deadline: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["todo", "in-progress", "done"]).optional(),
  order: z.number().optional(),
  archived: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    try { await limiter.check(100, ip); } catch { return NextResponse.json({ message: "Too many requests" }, { status: 429 }); }

    await dbConnect();
    const headerList = await headers();
    const role = headerList.get("x-user-role");
    const userId = headerList.get("x-user-id");

    if (role !== "admin" && role !== "vice_admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const { id } = await params;
    
    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

    const updatedTask = await Task.findByIdAndUpdate(id, data, { new: true });
    
    await logAudit("UPDATE_TASK", userId || "system", { taskId: id, updates: Object.keys(data) }, ip);

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error("PUT /api/tasks/[id] error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    try { await limiter.check(100, ip); } catch { return NextResponse.json({ message: "Too many requests" }, { status: 429 }); }

    await dbConnect();
    const headerList = await headers();
    const role = headerList.get("x-user-role");
    const userId = headerList.get("x-user-id");

    if (role !== "admin" && role !== "vice_admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const task = await Task.findByIdAndDelete(id);
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });
    
    await logAudit("DELETE_TASK", userId || "system", { taskId: id, title: task.title }, ip);

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
