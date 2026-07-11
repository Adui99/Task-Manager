import { NextResponse } from "next/server";
import { headers } from "next/headers";
import dbConnect from "@/lib/mongodb";
import Message from "@/models/Message";
import * as jose from "jose";

async function getUserId() {
  const reqHeaders = await headers();
  const token = reqHeaders.get("cookie")?.split("token=")[1]?.split(";")[0];
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret_key_123");
    const { payload } = await jose.jwtVerify(token, secret);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    await dbConnect();
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const unreadCount = await Message.countDocuments({
      receiver_id: userId,
      read: false
    });

    return NextResponse.json({ count: unreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
