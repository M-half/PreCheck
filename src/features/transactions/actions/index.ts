"use server";

import { requireAuth, requireAdmin, requireRole } from "@/lib/auth-guard";
import {
  CheckoutInput,
  FileComplaintInput,
  ResolveComplaintInput,
} from "../schemas";
import {
  checkoutService,
  processPaymentSuccessService,
  updateFulfillmentStatusService,
  completeOrderService,
  fileComplaintService,
  resolveComplaintService,
} from "../services";
import { listUserOrders, findOrderById } from "../repositories";

export async function checkoutAction(input: CheckoutInput) {
  try {
    const buyer = await requireRole(["PEMBELI"]);
    const result = await checkoutService(buyer.id, input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal melakukan checkout" };
  }
}

// Simulasi Pembayaran Sandbox (Bisa langsung dipanggil dari UI/Postman)
export async function simulatePaymentSuccessAction(orderId: string, paymentType = "qris") {
  try {
    await requireAuth();
    const fakeMidtransId = `MID-SBX-${Date.now()}`;
    const result = await processPaymentSuccessService(orderId, fakeMidtransId, paymentType);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memproses simulasi pembayaran" };
  }
}

export async function updateFulfillmentStatusAction(
  orderId: string,
  action: "PACK" | "SHIP" | "DELIVER",
  trackingNumber?: string
) {
  try {
    const admin = await requireAdmin();
    const result = await updateFulfillmentStatusService(admin.id, orderId, action, trackingNumber);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memperbarui status pengiriman" };
  }
}

export async function completeOrderAction(orderId: string) {
  try {
    const buyer = await requireRole(["PEMBELI"]);
    const result = await completeOrderService(buyer.id, orderId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyelesaikan pesanan" };
  }
}

export async function fileComplaintAction(input: FileComplaintInput) {
  try {
    const buyer = await requireRole(["PEMBELI"]);
    const result = await fileComplaintService(buyer.id, input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal mengajukan komplain" };
  }
}

export async function resolveComplaintAction(input: ResolveComplaintInput) {
  try {
    const admin = await requireAdmin();
    const result = await resolveComplaintService(admin.id, input);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyelesaikan komplain" };
  }
}

export async function getMyOrdersAction() {
  try {
    const user = await requireAuth();
    const role = user.role === "PEMBELI" ? "BUYER" : user.role === "MITRA" ? "PARTNER" : "ADMIN";
    const orders = await listUserOrders(user.id, role);
    return { success: true, data: orders };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memuat daftar pesanan" };
  }
}

export async function getOrderDetailsAction(orderId: string) {
  try {
    await requireAuth();
    const order = await findOrderById(orderId);
    return { success: true, data: order };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memuat detail pesanan" };
  }
}
