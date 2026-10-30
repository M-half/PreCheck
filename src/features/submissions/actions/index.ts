"use server";

import { requireVerifiedPartner } from "@/lib/auth-guard";
import { CreateSubmissionInput } from "../schemas";
import {
  submitItemConsignmentService,
  cancelSubmissionService,
  listPartnerSubmissionsService,
} from "../services";

export async function submitItemAction(input: CreateSubmissionInput) {
  try {
    const { user } = await requireVerifiedPartner();
    const result = await submitItemConsignmentService(user.id, input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengajukan barang" };
  }
}

export async function cancelItemAction(itemId: string) {
  try {
    const { user } = await requireVerifiedPartner();
    const result = await cancelSubmissionService(user.id, itemId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal membatalkan pengajuan" };
  }
}

export async function getMySubmissionsAction() {
  try {
    const { user } = await requireVerifiedPartner();
    const items = await listPartnerSubmissionsService(user.id);
    return { success: true, data: items };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memuat daftar pengajuan" };
  }
}
