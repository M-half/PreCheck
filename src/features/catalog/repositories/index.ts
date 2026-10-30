import db from "@/db";
import { items, itemQcs, itemMeasurements, itemAuthenticityChecks } from "@/db/schema";
import { eq, and, gte, lte, ilike, or, desc, SQL } from "drizzle-orm";

export interface CatalogFilterParams {
  category?: string;
  subcategory?: string;
  brand?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export async function queryPublicCatalog(params: CatalogFilterParams) {
  const conditions: SQL[] = [eq(items.currentStatus, "LISTED")];

  if (params.subcategory) {
    conditions.push(eq(items.subcategory, params.subcategory));
  }
  if (params.brand) {
    conditions.push(ilike(items.brand, `%${params.brand}%`));
  }
  if (params.color) {
    conditions.push(ilike(items.color, `%${params.color}%`));
  }
  if (params.minPrice) {
    conditions.push(gte(items.currentPrice, params.minPrice));
  }
  if (params.maxPrice) {
    conditions.push(lte(items.currentPrice, params.maxPrice));
  }
  if (params.searchQuery) {
    const q = `%${params.searchQuery}%`;
    conditions.push(
      or(
        ilike(items.name, q),
        ilike(items.brand, q),
        ilike(items.subcategory, q),
        ilike(items.material, q)
      )!
    );
  }

  return await db.query.items.findMany({
    where: and(...conditions),
    with: {
      qc: {
        columns: {
          grade: true,
          qcPhotos: true,
          decision: true,
          reason: true,
        },
      },
      measurements: true,
      authenticityCheck: {
        columns: {
          indicatorResult: true,
          notes: true,
        },
      },
    },
    orderBy: [desc(items.listedAt)],
    limit: params.limit ?? 24,
    offset: params.offset ?? 0,
  });
}

export async function getProductDetailByCode(itemCode: string) {
  return await db.query.items.findFirst({
    where: eq(items.itemCode, itemCode),
    with: {
      qc: true,
      measurements: true,
      authenticityCheck: true,
      doubleVerification: true,
      partner: {
        columns: {
          id: true,
          fullName: true,
        },
      },
    },
  });
}

export async function publishItem(itemId: string) {
  const [updated] = await db
    .update(items)
    .set({
      currentStatus: "LISTED",
      listedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId))
    .returning();

  return updated;
}

export async function takedownItem(itemId: string) {
  const [updated] = await db
    .update(items)
    .set({
      currentStatus: "WITHDRAWN",
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId))
    .returning();

  return updated;
}
