import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    const session = await verifyAuth();
    const userId = session?.userId;

    if (userId) {
      await logAudit("LOGOUT", userId, {}, ip);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("auth_token");
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
