import { z } from "zod";

export const checkoutSchema = z.object({
  itemId: z.string().uuid(),
  shippingAddress: z.string().min(10, "Alamat pengiriman lengkap wajib diisi"),
  courierName: z.string().default("JNE Regular (Simulasi)"),
});

export const simulatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  paymentType: z.string().default("qris"),
});

export const shipOrderSchema = z.object({
  orderId: z.string().uuid(),
  trackingNumber: z.string().min(4, "Nomor resi kurir wajib diisi"),
});

export const fileComplaintSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum([
    "UKURAN_AKTUAL_TIDAK_SESUAI",
    "NODA_ATAU_CACAT_TIDAK_TERUNGKAP",
    "BAU_TIDAK_SEDAP",
    "TERINDIKASI_TIDAK_ASLI",
    "LAINNYA",
  ]),
  description: z.string().min(10, "Deskripsikan keluhan Anda secara detail"),
  evidenceMediaUrls: z
    .array(z.string().url())
    .min(1, "Wajib menyertakan minimal 1 bukti foto/video"),
});

export const resolveComplaintSchema = z.object({
  complaintId: z.string().uuid(),
  decision: z.enum(["ACCEPT_REFUND", "REJECT"]),
  adminDecisionReason: z.string().min(10, "Alasan keputusan komplain wajib dijelaskan"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;
export type ShipOrderInput = z.infer<typeof shipOrderSchema>;
export type FileComplaintInput = z.infer<typeof fileComplaintSchema>;
export type ResolveComplaintInput = z.infer<typeof resolveComplaintSchema>;
