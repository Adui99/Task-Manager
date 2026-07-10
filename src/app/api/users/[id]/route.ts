import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { headers } from "next/headers";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const headerList = await headers();
  const role = headerList.get("x-user-role");

  if (role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    
    // Check target user before deleting
    const targetUser = await User.findById(id);
    if (!targetUser) return NextResponse.json({ message: "User not found" }, { status: 404 });
    
    if (targetUser.role === "admin") {
      return NextResponse.json({ message: "Không thể xóa tài khoản Admin. Vui lòng trao quyền Admin cho người khác trước khi xóa." }, { status: 403 });
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const headerList = await headers();
  const role = headerList.get("x-user-role");

  if (role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    
    // Check target user
    const targetUser = await User.findById(id);
    if (!targetUser) return NextResponse.json({ message: "User not found" }, { status: 404 });
    
    if (body.skills !== undefined) {
       // Convert from comma separated string to array if it is a string
       const newSkills = typeof body.skills === "string" 
         ? body.skills.split(",").map((s: string) => s.trim()).filter((s: string) => s)
         : body.skills;
       targetUser.skills = newSkills;
    }

    await targetUser.save();
    return NextResponse.json(targetUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
