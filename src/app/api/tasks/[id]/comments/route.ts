import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import { verifyAuth } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const session = await verifyAuth();
    const userId = session?.userId;

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ message: "Content is required" }, { status: 400 });
    }

    const { id } = await params;
    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

    task.comments.push({
      user_id: new mongoose.Types.ObjectId(userId) as any,
      content,
      createdAt: new Date(),
    });

    await task.save();
    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
