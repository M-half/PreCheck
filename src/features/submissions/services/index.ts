import { CreateSubmissionInput, createSubmissionSchema } from "../schemas";
import {
  countActiveSubmissionsByPartner,
  createConsignmentItem,
  findItemWithSubmission,
  getPartnerItems,
  updateItemStatus,
} from "../repositories";
import { logAudit } from "@/lib/audit";

export async function submitItemConsignmentService(
  partnerId: string,
  rawInput: CreateSubmissionInput
) {
  // 1. Validate input schema
  const parsed = createSubmissionSchema.parse(rawInput);

  // 2. Enforce BR-010: Max 10 active submissions per partner
  const activeCount = await countActiveSubmissionsByPartner(partnerId);
  if (activeCount >= 10) {
    throw new Error(
      "Batas kuota pengajuan aktif tercapai (maksimal 10 barang aktif). Selesaikan atau tunggu proses pengajuan sebelumnya selesai."
    );
  }

  // 3. Persist item and submission
  const result = await createConsignmentItem(partnerId, parsed);

  // 4. Audit Log
  await logAudit({
    actorId: partnerId,
    actorRole: "MITRA",
    action: "ITEM_SUBMISSION_CREATED",
    entityType: "ITEM",
    entityId: result.item.id,
    newValue: {
      itemCode: result.item.itemCode,
      name: result.item.name,
      brand: result.item.brand,
      status: result.item.currentStatus,
    },
    reason: "Mitra mengajukan pakaian preloved untuk konsinyasi PreCheck",
  });

  return result;
}

export async function cancelSubmissionService(partnerId: string, itemId: string) {
  const item = await findItemWithSubmission(itemId);
  if (!item) {
    throw new Error("Data barang tidak ditemukan.");
  }

  if (item.partnerId !== partnerId) {
    throw new Error("Anda tidak memiliki akses ke barang ini.");
  }

  // BR-013: Mitra dapat mengubah atau membatalkan pengajuan selama barang belum berstatus IN_TRANSIT
  const cancellableStatuses = ["DRAFT", "SUBMITTED", "AWAITING_SHIPMENT"];
  if (!cancellableStatuses.includes(item.currentStatus)) {
    throw new Error(
      `Pengajuan tidak dapat dibatalkan karena barang sudah dalam status '${item.currentStatus}'.`
    );
  }

  const updated = await updateItemStatus(itemId, "CANCELLED");

  await logAudit({
    actorId: partnerId,
    actorRole: "MITRA",
    action: "ITEM_SUBMISSION_CANCELLED",
    entityType: "ITEM",
    entityId: itemId,
    oldValue: { status: item.currentStatus },
    newValue: { status: "CANCELLED" },
    reason: "Mitra membatalkan pengajuan konsinyasi secara mandiri",
  });

  return updated;
}

export async function listPartnerSubmissionsService(partnerId: string) {
  return await getPartnerItems(partnerId);
}
