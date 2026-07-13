import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import { verifyAuth } from "@/lib/auth";
import { z } from "zod";
import rateLimit from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

const reorderSchema = z.object({
  items: z.array(
    z.object({
      _id: z.string(),
      status: z.enum(["todo", "in-progress", "done"]),
      order: z.number(),
    })
  )
});

export async function PUT(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    try { await limiter.check(100, ip); } catch { return NextResponse.json({ message: "Too many requests" }, { status: 429 }); }

    await dbConnect();
    const session = await verifyAuth();
    const role = session?.role;
    const userId = session?.userId;

    if (role !== "admin" && role !== "vice_admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.format() }, { status: 400 });
    }

    const { items } = parsed.data; 
    
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { status: item.status, order: item.order } }
      }
    }));

    if (bulkOps.length > 0) {
      await Task.bulkWrite(bulkOps);
      await logAudit("REORDER_TASKS", userId || "system", { count: items.length }, ip);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT /api/tasks/reorder error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
