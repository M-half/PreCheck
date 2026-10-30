import db from "@/db";
import { items, priceProposals } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

export async function findOpenProposalForItem(itemId: string) {
  return await db.query.priceProposals.findFirst({
    where: and(
      eq(priceProposals.itemId, itemId),
      inArray(priceProposals.status, [
        "PENDING_PARTNER",
        "PENDING_ADMIN",
        "COUNTERED",
      ])
    ),
  });
}

export async function findProposalById(proposalId: string) {
  return await db.query.priceProposals.findFirst({
    where: eq(priceProposals.id, proposalId),
    with: {
      item: true,
    },
  });
}

export async function createProposalRecord(params: {
  itemId: string;
  proposedByUserId: string;
  proposedByRole: "ADMIN" | "MITRA";
  proposalType: string;
  proposedPrice: number;
  commissionRate: number;
  estimatedShippingFee: number;
  estimatedPayout: number;
  reason: string;
  status: "PENDING_PARTNER" | "PENDING_ADMIN";
  expiresAt: Date;
}) {
  const [created] = await db
    .insert(priceProposals)
    .values(params)
    .returning();

  return created;
}

export async function updateProposalStatus(
  proposalId: string,
  status: typeof priceProposals.$inferInsert.status,
  responseNotes?: string
) {
  const [updated] = await db
    .update(priceProposals)
    .set({
      status,
      responseNotes,
      respondedAt: new Date(),
    })
    .where(eq(priceProposals.id, proposalId))
    .returning();

  return updated;
}

export async function applyAgreedPriceToItem(params: {
  itemId: string;
  agreedPrice: number;
  commissionRate: number;
  estimatedShippingFee: number;
  finalPayout: number;
  newStatus?: typeof items.$inferInsert.currentStatus;
}) {
  const [updated] = await db
    .update(items)
    .set({
      currentPrice: params.agreedPrice,
      commissionRate: params.commissionRate,
      estimatedShippingFee: params.estimatedShippingFee,
      finalPayoutAmount: params.finalPayout,
      currentStatus: params.newStatus ?? "PRICED",
      lastPriceRevisionAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(items.id, params.itemId))
    .returning();

  return updated;
}

export async function setItemStatus(
  itemId: string,
  status: typeof items.$inferInsert.currentStatus
) {
  const [updated] = await db
    .update(items)
    .set({
      currentStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId))
    .returning();

  return updated;
}
