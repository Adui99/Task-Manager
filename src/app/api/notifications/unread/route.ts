import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const session = await verifyAuth();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const unreadCount = await Notification.countDocuments({
      user_id: userId,
      read: false
    });

    return NextResponse.json({ count: unreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
