import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { verifyAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  await dbConnect();
  const session = await verifyAuth();
  const role = session?.role;

  if (!role) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const users = await User.find({}).select("-password_hash");
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  await dbConnect();
  const session = await verifyAuth();
  const role = session?.role;

  if (role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { name, email, password, role: newRole, skills } = await req.json();

    if (newRole === "admin") {
      return NextResponse.json({ message: "Không thể tạo thêm tài khoản Admin vì Admin là duy nhất" }, { status: 403 });
    }

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "Email đã tồn tại" }, { status: 400 });
    }

    // Process skills if it's comma separated string
    let parsedSkills = [];
    if (typeof skills === 'string' && skills.trim().length > 0) {
      parsedSkills = skills.split(',').map(s => s.trim());
    } else if (Array.isArray(skills)) {
      parsedSkills = skills;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password_hash,
      role: newRole || "user",
      skills: parsedSkills,
    });

    await user.save();
    const userObj = user.toObject();
    delete (userObj as any).password_hash;
    return NextResponse.json(userObj, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
