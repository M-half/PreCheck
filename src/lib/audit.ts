import db from "@/db";
import { auditLogs } from "@/db/schema";

export interface LogAuditParams {
  actorId?: string;
  actorRole?: "MITRA" | "PEMBELI" | "ADMIN";
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string;
  ipAddress?: string;
}

export async function logAudit(params: LogAuditParams) {
  try {
    await db.insert(auditLogs).values({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      reason: params.reason,
      ipAddress: params.ipAddress,
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
