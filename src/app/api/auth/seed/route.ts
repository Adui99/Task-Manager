import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await dbConnect();
    
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return NextResponse.json({ message: "Admin account or users already exist. Seed is only for fresh databases." }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    const password_hash = await bcrypt.hash(adminPassword, 10);

    const admin = new User({
      name: "System Admin",
      email: adminEmail,
      password_hash,
      role: "admin",
    });

    await admin.save();

    return NextResponse.json({ message: "Root Admin created successfully", email: adminEmail });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
