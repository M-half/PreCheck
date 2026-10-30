import {
  RecommendPriceInput,
  recommendPriceSchema,
  PartnerPriceResponseInput,
  partnerPriceResponseSchema,
  AdminReviewCounterInput,
  adminReviewCounterSchema,
  ProposePriceRevisionInput,
  proposePriceRevisionSchema,
} from "../schemas";
import {
  findOpenProposalForItem,
  findProposalById,
  createProposalRecord,
  updateProposalStatus,
  applyAgreedPriceToItem,
  setItemStatus,
} from "../repositories";
import db from "@/db";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export function calculatePayout(
  price: number,
  commissionRate = 20,
  shippingFee = 15000
) {
  const commissionAmount = Math.floor(price * (commissionRate / 100));
  const estimatedPayout = price - commissionAmount - shippingFee;
  return {
    price,
    commissionRate,
    commissionAmount,
    shippingFee,
    estimatedPayout,
  };
}

export async function recommendPriceService(
  adminId: string,
  rawInput: RecommendPriceInput
) {
  const input = recommendPriceSchema.parse(rawInput);
  const item = await db.query.items.findFirst({
    where: eq(items.id, input.itemId),
  });

  if (!item) throw new Error("Data barang tidak ditemukan.");
  if (item.currentStatus !== "QC_PASSED" && item.currentStatus !== "PRICING") {
    throw new Error(
      `Rekomendasi harga hanya dapat diberikan setelah barang berstatus 'QC_PASSED'. Status saat ini '${item.currentStatus}'.`
    );
  }

  // BR-062: No more than one open price proposal per item at a time
  const openProposal = await findOpenProposalForItem(input.itemId);
  if (openProposal) {
    throw new Error(
      "Sudah ada usulan harga yang sedang aktif menunggu tanggapan untuk barang ini."
    );
  }

  const { estimatedPayout } = calculatePayout(
    input.proposedPrice,
    input.commissionRate,
    input.estimatedShippingFee
  );

  if (estimatedPayout <= 0) {
    throw new Error(
      "Perkiraan payout mitra harus lebih besar dari Rp0 setelah dipotong komisi dan estimasi ongkir (BR-055)."
    );
  }

  // 3 calendar days expiration
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const proposal = await createProposalRecord({
    itemId: input.itemId,
    proposedByUserId: adminId,
    proposedByRole: "ADMIN",
    proposalType: "INITIAL",
    proposedPrice: input.proposedPrice,
    commissionRate: input.commissionRate,
    estimatedShippingFee: input.estimatedShippingFee,
    estimatedPayout,
    reason: input.reason,
    status: "PENDING_PARTNER",
    expiresAt,
  });

  await setItemStatus(input.itemId, "PRICING");

  await logAudit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "PRICE_RECOMMENDATION_SENT",
    entityType: "PRICE_PROPOSAL",
    entityId: proposal.id,
    newValue: {
      price: input.proposedPrice,
      payout: estimatedPayout,
      reason: input.reason,
    },
    reason: "Admin mengirim rekomendasi harga awal ke mitra",
  });

  return proposal;
}

export async function respondPriceProposalService(
  partnerId: string,
  rawInput: PartnerPriceResponseInput
) {
  const input = partnerPriceResponseSchema.parse(rawInput);
  const proposal = await findProposalById(input.proposalId);

  if (!proposal || !proposal.item) throw new Error("Usulan harga atau data barang tidak ditemukan.");
  if (proposal.item.partnerId !== partnerId) {
    throw new Error("Anda tidak memiliki hak akses atas barang ini.");
  }
  if (proposal.status !== "PENDING_PARTNER") {
    throw new Error(
      `Usulan harga sudah tidak dalam status menunggu tanggapan mitra (status saat ini: '${proposal.status}').`
    );
  }

  if (new Date() > proposal.expiresAt) {
    await updateProposalStatus(proposal.id, "EXPIRED", "Kedaluwarsa 3 hari kalender");
    await setItemStatus(proposal.itemId, "WITHDRAWN");
    throw new Error("Batas waktu tanggapan 3 hari kalender telah kedaluwarsa. Barang ditarik (WITHDRAWN).");
  }

  if (input.action === "ACCEPT") {
    await updateProposalStatus(proposal.id, "ACCEPTED", input.notes || "Mitra menyetujui harga");
    const updatedItem = await applyAgreedPriceToItem({
      itemId: proposal.itemId,
      agreedPrice: proposal.proposedPrice,
      commissionRate: proposal.commissionRate,
      estimatedShippingFee: proposal.estimatedShippingFee,
      finalPayout: proposal.estimatedPayout,
      newStatus: "PRICED",
    });

    await logAudit({
      actorId: partnerId,
      actorRole: "MITRA",
      action: "PRICE_PROPOSAL_ACCEPTED",
      entityType: "ITEM",
      entityId: proposal.itemId,
      newValue: { price: proposal.proposedPrice, status: "PRICED" },
      reason: "Mitra menyetujui rekomendasi harga, barang siap ditayangkan",
    });

    return { proposalStatus: "ACCEPTED", item: updatedItem };
  }

  if (input.action === "COUNTER") {
    if (!input.counterPrice) {
      throw new Error("Nominal harga alternatif wajib diisi saat mengajukan counter.");
    }

    const { estimatedPayout } = calculatePayout(
      input.counterPrice,
      proposal.commissionRate,
      proposal.estimatedShippingFee
    );

    if (estimatedPayout <= 0) {
      throw new Error("Harga counter menghasilkan payout <= 0. Masukkan nominal yang lebih besar.");
    }

    const updatedProposal = await updateProposalStatus(
      proposal.id,
      "COUNTERED",
      `Mitra mengajukan harga alternatif: Rp${input.counterPrice.toLocaleString("id-ID")}. Catatan: ${input.notes || "-"}`
    );

    await logAudit({
      actorId: partnerId,
      actorRole: "MITRA",
      action: "PRICE_PROPOSAL_COUNTERED",
      entityType: "PRICE_PROPOSAL",
      entityId: proposal.id,
      newValue: { counterPrice: input.counterPrice, notes: input.notes },
      reason: "Mitra mengajukan satu kali alternatif harga ke Admin",
    });

    return { proposalStatus: "COUNTERED", proposal: updatedProposal };
  }

  // Action: REJECT
  await updateProposalStatus(proposal.id, "REJECTED", input.notes || "Mitra menolak rekomendasi harga");
  const withdrawnItem = await setItemStatus(proposal.itemId, "WITHDRAWN");

  await logAudit({
    actorId: partnerId,
    actorRole: "MITRA",
    action: "PRICE_PROPOSAL_REJECTED",
    entityType: "ITEM",
    entityId: proposal.itemId,
    newValue: { status: "WITHDRAWN" },
    reason: "Mitra menolak rekomendasi harga. Barang ditarik dan disiapkan untuk retur.",
  });

  return { proposalStatus: "REJECTED", item: withdrawnItem };
}

export async function reviewCounterPriceService(
  adminId: string,
  rawInput: AdminReviewCounterInput
) {
  const input = adminReviewCounterSchema.parse(rawInput);
  const proposal = await findProposalById(input.proposalId);

  if (!proposal) throw new Error("Usulan harga tidak ditemukan.");
  if (proposal.status !== "COUNTERED") {
    throw new Error("Hanya usulan berstatus 'COUNTERED' yang dapat ditinjau.");
  }

  if (input.decision === "ACCEPT_COUNTER") {
    // Parse counter price from response notes or use proposed
    await updateProposalStatus(proposal.id, "ACCEPTED", input.reason);
    const updatedItem = await applyAgreedPriceToItem({
      itemId: proposal.itemId,
      agreedPrice: proposal.proposedPrice,
      commissionRate: proposal.commissionRate,
      estimatedShippingFee: proposal.estimatedShippingFee,
      finalPayout: proposal.estimatedPayout,
      newStatus: "PRICED",
    });

    return { decision: "ACCEPT_COUNTER", item: updatedItem };
  }

  // Reject with final recommendation
  if (!input.finalPrice) {
    throw new Error("Nominal harga final wajib diisi jika menolak counter.");
  }

  const { estimatedPayout } = calculatePayout(
    input.finalPrice,
    proposal.commissionRate,
    proposal.estimatedShippingFee
  );

  await updateProposalStatus(proposal.id, "REJECTED", input.reason);

  const finalProposal = await createProposalRecord({
    itemId: proposal.itemId,
    proposedByUserId: adminId,
    proposedByRole: "ADMIN",
    proposalType: "FINAL",
    proposedPrice: input.finalPrice,
    commissionRate: proposal.commissionRate,
    estimatedShippingFee: proposal.estimatedShippingFee,
    estimatedPayout,
    reason: input.reason,
    status: "PENDING_PARTNER",
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });

  return { decision: "REJECT_WITH_FINAL", finalProposal };
}
