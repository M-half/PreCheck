import {
  PrescreenDecisionInput,
  prescreenDecisionSchema,
  ReceivePackageInput,
  receivePackageSchema,
  SubmitQcInspectionInput,
  submitQcInspectionSchema,
} from "../schemas";
import {
  getItemFullQcDetails,
  getQcQueueItems,
  markItemInQc,
  saveCorrectionResponse,
  saveFullQcInspection,
  savePackageReceipt,
  savePrescreenDecision,
} from "../repositories";
import { logAudit } from "@/lib/audit";

export async function processPrescreenService(
  adminId: string,
  rawInput: PrescreenDecisionInput
) {
  const input = prescreenDecisionSchema.parse(rawInput);
  const item = await getItemFullQcDetails(input.itemId);

  if (!item) throw new Error("Data barang tidak ditemukan.");
  if (item.currentStatus !== "SUBMITTED") {
    throw new Error(
      `Status barang saat ini '${item.currentStatus}'. Pre-screening hanya untuk status 'SUBMITTED'.`
    );
  }

  const updated = await savePrescreenDecision(adminId, input);

  await logAudit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: `ITEM_PRESCREEN_${input.decision}`,
    entityType: "ITEM",
    entityId: input.itemId,
    oldValue: { status: item.currentStatus },
    newValue: { status: updated.currentStatus },
    reason: input.notes,
  });

  return updated;
}

export async function receivePackageService(
  adminId: string,
  rawInput: ReceivePackageInput
) {
  const input = receivePackageSchema.parse(rawInput);
  const item = await getItemFullQcDetails(input.itemId);

  if (!item) throw new Error("Data barang tidak ditemukan.");
  const allowed = ["AWAITING_SHIPMENT", "IN_TRANSIT"];
  if (!allowed.includes(item.currentStatus)) {
    throw new Error(
      `Penerimaan paket hanya dapat dicatat untuk status 'AWAITING_SHIPMENT' atau 'IN_TRANSIT'. Saat ini '${item.currentStatus}'.`
    );
  }

  const result = await savePackageReceipt(adminId, input);

  await logAudit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "ITEM_PACKAGE_RECEIVED",
    entityType: "ITEM",
    entityId: input.itemId,
    newValue: { status: "RECEIVED", condition: input.packageCondition },
    reason: input.notes || "Admin mencatat penerimaan paket barang di platform",
  });

  return result;
}

export async function startQcService(adminId: string, itemId: string) {
  const item = await getItemFullQcDetails(itemId);
  if (!item) throw new Error("Data barang tidak ditemukan.");
  if (item.currentStatus !== "RECEIVED") {
    throw new Error(
      `QC hanya dapat dimulai jika status barang 'RECEIVED'. Saat ini '${item.currentStatus}'.`
    );
  }

  const updated = await markItemInQc(itemId);

  await logAudit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "ITEM_QC_STARTED",
    entityType: "ITEM",
    entityId: itemId,
    oldValue: { status: "RECEIVED" },
    newValue: { status: "IN_QC" },
    reason: "Pemeriksaan fisik dan pengukuran pakaian dimulai",
  });

  return updated;
}

export async function submitQcInspectionService(
  inspectorId: string,
  rawInput: SubmitQcInspectionInput
) {
  const input = submitQcInspectionSchema.parse(rawInput);
  const item = await getItemFullQcDetails(input.itemId);

  if (!item) throw new Error("Data barang tidak ditemukan.");
  if (item.currentStatus !== "IN_QC") {
    throw new Error(
      `Pemeriksaan QC hanya dapat disimpan saat status 'IN_QC'. Saat ini '${item.currentStatus}'.`
    );
  }

  // BR-058 Constraint: Terindikasi tidak asli wajib TIDAK_LAYAK
  if (
    input.authenticity.indicatorResult === "TERINDIKASI_TIDAK_ASLI" &&
    input.decision !== "TIDAK_LAYAK"
  ) {
    throw new Error(
      "Barang yang 'TERINDIKASI_TIDAK_ASLI' wajib diputuskan 'TIDAK_LAYAK' (BR-058)."
    );
  }

  const result = await saveFullQcInspection(inspectorId, input);

  await logAudit({
    actorId: inspectorId,
    actorRole: "ADMIN",
    action: `ITEM_QC_DECISION_${input.decision}`,
    entityType: "ITEM",
    entityId: input.itemId,
    oldValue: { status: "IN_QC" },
    newValue: {
      status: result.item.currentStatus,
      grade: input.grade,
      decision: input.decision,
    },
    reason: input.reason,
  });

  return result;
}

export async function respondQcCorrectionService(
  partnerId: string,
  itemId: string,
  response: "ACCEPTED" | "REJECTED"
) {
  const item = await getItemFullQcDetails(itemId);
  if (!item) throw new Error("Data barang tidak ditemukan.");
  if (item.partnerId !== partnerId) {
    throw new Error("Anda tidak memiliki akses ke barang ini.");
  }
  if (item.currentStatus !== "QC_CORRECTION_PENDING") {
    throw new Error(
      `Tanggapan koreksi hanya dapat dilakukan saat status 'QC_CORRECTION_PENDING'. Saat ini '${item.currentStatus}'.`
    );
  }

  const updated = await saveCorrectionResponse(itemId, response);

  await logAudit({
    actorId: partnerId,
    actorRole: "MITRA",
    action: `QC_CORRECTION_${response}`,
    entityType: "ITEM",
    entityId: itemId,
    oldValue: { status: "QC_CORRECTION_PENDING" },
    newValue: { status: updated.currentStatus },
    reason: `Mitra ${response === "ACCEPTED" ? "menyetujui" : "menolak"} koreksi deskripsi QC platform`,
  });

  return updated;
}

export async function getQcQueueService() {
  return await getQcQueueItems();
}

export async function getItemQcDetailsService(itemId: string) {
  return await getItemFullQcDetails(itemId);
}

// Simulasi Cepat Online Check (Untuk kemudahan testing lokal / tanpa kirim fisik)
export async function simulateOnlineIntakeService(adminId: string, itemId: string) {
  return await receivePackageService(adminId, {
    itemId,
    packageCondition: "Baik (Simulasi Online PreCheck)",
    packageAnomalies: "Tidak ada anomali",
    trackingNumber: "SIM-ONLINE-888",
    notes: "Barang disimulasikan langsung tiba untuk pemeriksaan QC online.",
  });
}
