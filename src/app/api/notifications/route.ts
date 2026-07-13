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

    const notifications = await Notification.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50 notifications

    return NextResponse.json(notifications);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
