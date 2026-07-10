import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import { headers } from "next/headers";

export async function POST(req: Request) {
  await dbConnect();
  const headerList = await headers();
  const role = headerList.get("x-user-role");

  if (role !== "admin" && role !== "vice_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { taskIds } = await req.json();
    if (!taskIds || !Array.isArray(taskIds)) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const result = await Task.deleteMany({ _id: { $in: taskIds } });
    return NextResponse.json({ message: "Deleted successfully", count: result.deletedCount });
  } catch (error: any) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
