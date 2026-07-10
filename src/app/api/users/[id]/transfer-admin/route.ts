import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { headers } from "next/headers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const headerList = await headers();
  const role = headerList.get("x-user-role");
  const currentUserId = headerList.get("x-user-id");

  // Only admin can transfer admin rights
  if (role !== "admin") {
    return NextResponse.json({ message: "Forbidden. Chỉ Admin mới có quyền trao quyền Admin." }, { status: 403 });
  }

  try {
    const { id } = await params; // target user ID
    
    // Check if target user exists
    const targetUser = await User.findById(id);
    if (!targetUser) return NextResponse.json({ message: "User not found" }, { status: 404 });
    
    if (targetUser.role === "admin") {
      return NextResponse.json({ message: "Người này đã là Admin." }, { status: 400 });
    }

    // Demote current admin to vice_admin
    await User.findByIdAndUpdate(currentUserId, { role: "vice_admin" });

    // Promote target user to admin
    await User.findByIdAndUpdate(id, { role: "admin" });

    return NextResponse.json({ message: "Chuyển quyền Admin thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
