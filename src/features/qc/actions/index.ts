"use server";

import { requireAdmin, requireRole } from "@/lib/auth-guard";
import {
  PrescreenDecisionInput,
  ReceivePackageInput,
  SubmitQcInspectionInput,
  RespondQcCorrectionInput,
} from "../schemas";
import {
  processPrescreenService,
  receivePackageService,
  startQcService,
  submitQcInspectionService,
  respondQcCorrectionService,
  getQcQueueService,
  getItemQcDetailsService,
  simulateOnlineIntakeService,
} from "../services";

export async function processPrescreenAction(input: PrescreenDecisionInput) {
  try {
    const admin = await requireAdmin();
    const result = await processPrescreenService(admin.id, input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memproses pre-screening" };
  }
}

export async function receivePackageAction(input: ReceivePackageInput) {
  try {
    const admin = await requireAdmin();
    const result = await receivePackageService(admin.id, input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mencatat penerimaan paket" };
  }
}

export async function simulateOnlineIntakeAction(itemId: string) {
  try {
    const admin = await requireAdmin();
    const result = await simulateOnlineIntakeService(admin.id, itemId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal melakukan simulasi online intake" };
  }
}

export async function startQcAction(itemId: string) {
  try {
    const admin = await requireAdmin();
    const result = await startQcService(admin.id, itemId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memulai pemeriksaan QC" };
  }
}

export async function submitQcInspectionAction(input: SubmitQcInspectionInput) {
  try {
    const admin = await requireAdmin();
    const result = await submitQcInspectionService(admin.id, input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyimpan hasil QC" };
  }
}

export async function respondQcCorrectionAction(input: RespondQcCorrectionInput) {
  try {
    const partner = await requireRole(["MITRA"]);
    const result = await respondQcCorrectionService(
      partner.id,
      input.itemId,
      input.response
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menanggapi koreksi QC" };
  }
}

export async function getQcQueueAction() {
  try {
    await requireAdmin();
    const queue = await getQcQueueService();
    return { success: true, data: queue };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memuat antrean QC" };
  }
}

export async function getItemQcDetailsAction(itemId: string) {
  try {
    await requireRole(["ADMIN", "MITRA"]);
    const details = await getItemQcDetailsService(itemId);
    return { success: true, data: details };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memuat detail QC" };
  }
}
