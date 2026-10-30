"use server";

import { requireAdmin, requireRole } from "@/lib/auth-guard";
import {
  CatalogFilterParams,
  publishItemService,
  withdrawItemService,
  getPublicCatalogService,
  getProductDetailService,
} from "./../services";

export async function publishItemAction(itemId: string) {
  try {
    const admin = await requireAdmin();
    const result = await publishItemService(admin.id, itemId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menayangkan barang ke katalog" };
  }
}

export async function withdrawItemAction(itemId: string, reason?: string) {
  try {
    const user = await requireRole(["ADMIN", "MITRA"]);
    const result = await withdrawItemService(user.id, user.role as "ADMIN" | "MITRA", itemId, reason);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menarik barang dari katalog" };
  }
}

// Public queries can be called without auth
export async function getPublicCatalogAction(params: CatalogFilterParams) {
  try {
    const catalog = await getPublicCatalogService(params);
    return { success: true, data: catalog };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memuat katalog" };
  }
}

export async function getProductDetailAction(itemCode: string) {
  try {
    const product = await getProductDetailService(itemCode);
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memuat detail produk" };
  }
}
