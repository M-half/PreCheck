import { z } from "zod";

export const recommendPriceSchema = z.object({
  itemId: z.string().uuid(),
  proposedPrice: z
    .number()
    .int("Harga harus bilangan bulat Rupiah")
    .min(50000, "Harga jual minimum adalah Rp50.000 (BR-055)"),
  commissionRate: z.number().int().min(5).max(50).default(20),
  estimatedShippingFee: z.number().int().min(0).default(15000),
  reason: z.string().min(5, "Alasan rekomendasi harga wajib diisi"),
});

export const partnerPriceResponseSchema = z.object({
  proposalId: z.string().uuid(),
  action: z.enum(["ACCEPT", "COUNTER", "REJECT"]),
  counterPrice: z
    .number()
    .int("Harga counter harus bilangan bulat")
    .min(50000, "Harga counter minimum Rp50.000")
    .optional(),
  notes: z.string().optional(),
});

export const adminReviewCounterSchema = z.object({
  proposalId: z.string().uuid(),
  decision: z.enum(["ACCEPT_COUNTER", "REJECT_WITH_FINAL"]),
  finalPrice: z.number().int().min(50000).optional(),
  reason: z.string().min(5, "Alasan keputusan review counter wajib diisi"),
});

export const proposePriceRevisionSchema = z.object({
  itemId: z.string().uuid(),
  proposedPrice: z.number().int().min(50000),
  reason: z.string().min(5, "Alasan usulan revisi harga wajib diisi"),
});

export type RecommendPriceInput = z.infer<typeof recommendPriceSchema>;
export type PartnerPriceResponseInput = z.infer<typeof partnerPriceResponseSchema>;
export type AdminReviewCounterInput = z.infer<typeof adminReviewCounterSchema>;
export type ProposePriceRevisionInput = z.infer<typeof proposePriceRevisionSchema>;
