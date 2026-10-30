import {
  type CatalogFilterParams,
  getProductDetailByCode,
  publishItem,
  queryPublicCatalog,
  takedownItem,
} from "../repositories";
export type { CatalogFilterParams };
import db from "@/db";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export async function publishItemService(adminId: string, itemId: string) {
  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
  });

  if (!item) throw new Error("Data barang tidak ditemukan.");
  if (item.currentStatus !== "PRICED") {
    throw new Error(
      `Hanya barang berstatus 'PRICED' (harga telah disetujui) yang dapat ditayangkan ke katalog. Status saat ini: '${item.currentStatus}'.`
    );
  }

  const updated = await publishItem(itemId);

  await logAudit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "ITEM_PUBLISHED_TO_CATALOG",
    entityType: "ITEM",
    entityId: itemId,
    newValue: { status: "LISTED", price: updated.currentPrice },
    reason: "Admin menayangkan pakaian ke katalog publik (tayang sampai terjual)",
  });

  return updated;
}

export async function withdrawItemService(actorId: string, actorRole: "ADMIN" | "MITRA", itemId: string, reason?: string) {
  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
  });

  if (!item) throw new Error("Data barang tidak ditemukan.");
  if (actorRole === "MITRA" && item.partnerId !== actorId) {
    throw new Error("Anda tidak memiliki hak akses atas barang ini.");
  }

  if (item.isReserved || item.currentStatus === "RESERVED") {
    throw new Error("Barang sedang direservasi oleh pembeli dan tidak dapat ditarik.");
  }

  const updated = await takedownItem(itemId);

  await logAudit({
    actorId,
    actorRole,
    action: "ITEM_WITHDRAWN_FROM_CATALOG",
    entityType: "ITEM",
    entityId: itemId,
    oldValue: { status: item.currentStatus },
    newValue: { status: "WITHDRAWN" },
    reason: reason || "Penarikan barang dari katalog",
  });

  return updated;
}

export async function getPublicCatalogService(params: CatalogFilterParams) {
  return await queryPublicCatalog(params);
}

export async function getProductDetailService(itemCode: string) {
  const product = await getProductDetailByCode(itemCode);
  if (!product) {
    throw new Error("Produk pakaian tidak ditemukan.");
  }

  return {
    ...product,
    authenticityDisclaimer:
      "Catatan Keaslian: Pemeriksaan indikator keaslian PreCheck dilakukan secara visual pada tag, jahitan, dan kode produksi oleh tim pemeriksa internal platform, dan bukan sertifikasi resmi atau jaminan dari pihak ketiga.",
  };
}
