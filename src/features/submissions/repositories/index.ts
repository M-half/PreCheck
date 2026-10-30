import db from "@/db";
import { items, itemSubmissions } from "@/db/schema";
import { eq, and, notInArray, count, desc } from "drizzle-orm";
import type { CreateSubmissionInput } from "../schemas";

export async function countActiveSubmissionsByPartner(partnerId: string): Promise<number> {
  const terminalStatuses: (typeof items.$inferSelect.currentStatus)[] = [
    "SOLD",
    "RETURNED",
    "CANCELLED",
    "PRESCREEN_REJECTED",
  ];

  const result = await db
    .select({ val: count() })
    .from(items)
    .where(
      and(
        eq(items.partnerId, partnerId),
        notInArray(items.currentStatus, terminalStatuses)
      )
    );

  return result[0]?.val ?? 0;
}

export async function createConsignmentItem(
  partnerId: string,
  input: CreateSubmissionInput
) {
  // Generate item code PCK-YEAR-RANDOM
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const year = new Date().getFullYear();
  const itemCode = `PCK-${year}-${randomSuffix}`;

  return await db.transaction(async (tx) => {
    const [newItem] = await tx
      .insert(items)
      .values({
        itemCode,
        partnerId,
        category: "PAKAIAN_DEWASA",
        subcategory: input.subcategory,
        name: input.name,
        brand: input.brand,
        labelSize: input.labelSize,
        material: input.material,
        color: input.color,
        currentStatus: "SUBMITTED",
      })
      .returning();

    const [newSubmission] = await tx
      .insert(itemSubmissions)
      .values({
        itemId: newItem.id,
        conditionDescription: input.conditionDescription,
        completeness: input.completeness,
        knownDefects: input.knownDefects,
        expectedPrice: input.expectedPrice,
        partnerPhotos: input.partnerPhotos,
        partnerMeasurements: input.partnerMeasurements,
        agreementVersion: "v1.0",
      })
      .returning();

    return { item: newItem, submission: newSubmission };
  });
}

export async function findItemWithSubmission(itemId: string) {
  return await db.query.items.findFirst({
    where: eq(items.id, itemId),
    with: {
      submission: true,
      partner: {
        columns: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });
}

export async function getPartnerItems(partnerId: string) {
  return await db.query.items.findMany({
    where: eq(items.partnerId, partnerId),
    with: {
      submission: true,
      qc: true,
      priceProposals: true,
    },
    orderBy: [desc(items.createdAt)],
  });
}

export async function updateItemStatus(
  itemId: string,
  newStatus: typeof items.$inferInsert.currentStatus
) {
  const [updated] = await db
    .update(items)
    .set({
      currentStatus: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId))
    .returning();

  return updated;
}
