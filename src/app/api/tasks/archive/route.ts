import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";

export async function POST(req: Request) {
  // This endpoint is designed to be called by Stitch Data Pipeline or Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  try {
    // Find "done" tasks updated more than 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await Task.updateMany(
      { 
        status: "done", 
        archived: false,
        updatedAt: { $lt: sevenDaysAgo }
      },
      { $set: { archived: true } }
    );

    return NextResponse.json({ 
      success: true, 
      archivedCount: result.modifiedCount 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
