import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Message from "@/models/Message";
import * as jose from "jose";

// Lấy user id từ token
async function getUserId() {
  const session = await verifyAuth();
  return session?.userId || null;
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get("userId");

    if (!otherUserId) {
      return NextResponse.json({ message: "Missing userId" }, { status: 400 });
    }

    const messages = await Message.find({
      $or: [
        { sender_id: userId, receiver_id: otherUserId },
        { sender_id: otherUserId, receiver_id: userId }
      ]
    }).sort({ createdAt: 1 });

    // Mark as read
    await Message.updateMany(
      { sender_id: otherUserId, receiver_id: userId, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { receiverId, content } = await req.json();

    if (!receiverId || !content?.trim()) {
      return NextResponse.json({ message: "Missing receiverId or content" }, { status: 400 });
    }

    const message = await Message.create({
      sender_id: userId,
      receiver_id: receiverId,
      content: content.trim()
    });

    return NextResponse.json(message);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
