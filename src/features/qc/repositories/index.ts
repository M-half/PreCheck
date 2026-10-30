import db from "@/db";
import {
  items,
  itemSubmissions,
  itemReceipts,
  itemQcs,
  itemMeasurements,
  itemAuthenticityChecks,
  itemDoubleVerifications,
} from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import type {
  PrescreenDecisionInput,
  ReceivePackageInput,
  SubmitQcInspectionInput,
} from "../schemas";

export async function savePrescreenDecision(
  adminId: string,
  input: PrescreenDecisionInput
) {
  const newStatus =
    input.decision === "APPROVED" ? "AWAITING_SHIPMENT" : "PRESCREEN_REJECTED";

  return await db.transaction(async (tx) => {
    await tx
      .update(itemSubmissions)
      .set({
        prescreenNotes: input.notes,
        prescreenDecidedAt: new Date(),
        prescreenDecidedBy: adminId,
      })
      .where(eq(itemSubmissions.itemId, input.itemId));

    const [updatedItem] = await tx
      .update(items)
      .set({
        currentStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(items.id, input.itemId))
      .returning();

    return updatedItem;
  });
}

export async function savePackageReceipt(adminId: string, input: ReceivePackageInput) {
  return await db.transaction(async (tx) => {
    const [receipt] = await tx
      .insert(itemReceipts)
      .values({
        itemId: input.itemId,
        trackingNumber: input.trackingNumber,
        receivedBy: adminId,
        packageCondition: input.packageCondition,
        packageAnomalies: input.packageAnomalies,
        notes: input.notes,
      })
      .returning();

    const [updatedItem] = await tx
      .update(items)
      .set({
        currentStatus: "RECEIVED",
        updatedAt: new Date(),
      })
      .where(eq(items.id, input.itemId))
      .returning();

    return { receipt, item: updatedItem };
  });
}

export async function markItemInQc(itemId: string) {
  const [updated] = await db
    .update(items)
    .set({
      currentStatus: "IN_QC",
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId))
    .returning();

  return updated;
}

export async function saveFullQcInspection(
  inspectorId: string,
  input: SubmitQcInspectionInput
) {
  let nextStatus: typeof items.$inferInsert.currentStatus = "QC_PASSED";
  if (input.decision === "LAYAK_DENGAN_KOREKSI") {
    nextStatus = "QC_CORRECTION_PENDING";
  } else if (input.decision === "TIDAK_LAYAK") {
    nextStatus = "QC_FAILED";
  }

  return await db.transaction(async (tx) => {
    // 1. Save QC Record
    const [qc] = await tx
      .insert(itemQcs)
      .values({
        itemId: input.itemId,
        inspectorId,
        grade: input.grade,
        fabricConditionNotes: input.fabricConditionNotes,
        stainsFound: input.stainsFound,
        odorFound: input.odorFound,
        holesOrTearsFound: input.holesOrTearsFound,
        seamsCondition: input.seamsCondition,
        fastenersCondition: input.fastenersCondition,
        completenessChecked: input.completenessChecked,
        cleanlinessChecked: input.cleanlinessChecked,
        lightTreatmentNotes: input.lightTreatmentNotes,
        qcPhotos: input.qcPhotos,
        decision: input.decision,
        reason: input.reason,
      })
      .returning();

    // 2. Save Measurements
    const [measurements] = await tx
      .insert(itemMeasurements)
      .values({
        itemId: input.itemId,
        measuredBy: inspectorId,
        chestWidthCm: input.measurements.chestWidthCm,
        bodyLengthCm: input.measurements.bodyLengthCm,
        shoulderWidthCm: input.measurements.shoulderWidthCm,
        sleeveLengthCm: input.measurements.sleeveLengthCm,
        waistWidthCm: input.measurements.waistWidthCm,
        inseamCm: input.measurements.inseamCm,
        thighWidthCm: input.measurements.thighWidthCm,
        notes: input.measurements.notes,
      })
      .returning();

    // 3. Save Authenticity Check
    const [authenticity] = await tx
      .insert(itemAuthenticityChecks)
      .values({
        itemId: input.itemId,
        checkedBy: inspectorId,
        indicatorResult: input.authenticity.indicatorResult,
        visualEvidencePhotos: input.authenticity.visualEvidencePhotos,
        notes: input.authenticity.notes,
      })
      .returning();

    // 4. Save Double Verification
    const [doubleVerification] = await tx
      .insert(itemDoubleVerifications)
      .values({
        itemId: input.itemId,
        verifiedBy: inspectorId,
        ...input.doubleVerification,
      })
      .returning();

    // 5. Update Item Status
    const [updatedItem] = await tx
      .update(items)
      .set({
        currentStatus: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(items.id, input.itemId))
      .returning();

    return {
      qc,
      measurements,
      authenticity,
      doubleVerification,
      item: updatedItem,
    };
  });
}

export async function saveCorrectionResponse(
  itemId: string,
  response: "ACCEPTED" | "REJECTED"
) {
  const nextStatus = response === "ACCEPTED" ? "QC_PASSED" : "QC_FAILED";

  return await db.transaction(async (tx) => {
    await tx
      .update(itemQcs)
      .set({
        partnerCorrectionResponse: response,
        correctionRespondedAt: new Date(),
      })
      .where(eq(itemQcs.itemId, itemId));

    const [updatedItem] = await tx
      .update(items)
      .set({
        currentStatus: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId))
      .returning();

    return updatedItem;
  });
}

export async function getQcQueueItems() {
  return await db.query.items.findMany({
    where: inArray(items.currentStatus, [
      "SUBMITTED",
      "AWAITING_SHIPMENT",
      "IN_TRANSIT",
      "RECEIVED",
      "IN_QC",
      "QC_CORRECTION_PENDING",
      "QC_PASSED",
    ]),
    with: {
      submission: true,
      receipt: true,
      qc: true,
      partner: {
        columns: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: [desc(items.createdAt)],
  });
}

export async function getItemFullQcDetails(itemId: string) {
  return await db.query.items.findFirst({
    where: eq(items.id, itemId),
    with: {
      submission: true,
      receipt: true,
      qc: true,
      measurements: true,
      authenticityCheck: true,
      doubleVerification: true,
      priceProposals: true,
      partner: true,
    },
  });
}
