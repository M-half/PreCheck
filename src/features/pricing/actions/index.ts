"use server";

import { requireAdmin, requireRole } from "@/lib/auth-guard";
import {
  RecommendPriceInput,
  PartnerPriceResponseInput,
  AdminReviewCounterInput,
} from "../schemas";
import {
  recommendPriceService,
  respondPriceProposalService,
  reviewCounterPriceService,
} from "../services";

export async function recommendPriceAction(input: RecommendPriceInput) {
  try {
    const admin = await requireAdmin();
    const result = await recommendPriceService(admin.id, input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengirim rekomendasi harga" };
  }
}

export async function respondPriceProposalAction(input: PartnerPriceResponseInput) {
  try {
    const partner = await requireRole(["MITRA"]);
    const result = await respondPriceProposalService(partner.id, input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal merespons usulan harga" };
  }
}

export async function reviewCounterPriceAction(input: AdminReviewCounterInput) {
  try {
    const admin = await requireAdmin();
    const result = await reviewCounterPriceService(admin.id, input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal meninjau harga counter" };
  }
}
