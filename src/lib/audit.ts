import AuditLog from "@/models/AuditLog";
import dbConnect from "@/lib/mongodb";

export async function logAudit(action: string, userId?: string, details?: any, ipAddress?: string) {
  try {
    await dbConnect();
    await AuditLog.create({
      action,
      userId,
      details,
      ipAddress,
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
