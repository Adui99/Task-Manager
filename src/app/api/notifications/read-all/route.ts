import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const session = await verifyAuth();
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const result = await Notification.updateMany(
      { user_id: userId, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({ message: "All notifications marked as read", count: result.modifiedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
