import { z } from "zod";

export const adultClothingSubcategories = [
  "Kaos",
  "Kemeja",
  "Blus",
  "Sweater",
  "Hoodie",
  "Celana Panjang",
  "Jeans",
  "Rok",
  "Celana Pendek",
  "Jaket",
  "Blazer",
  "Cardigan",
  "Terusan / Dress",
  "Busana Muslim",
  "Batik",
  "Jersey / Sportswear",
] as const;

export const createSubmissionSchema = z.object({
  subcategory: z.enum(adultClothingSubcategories, {
    message: "Pilih subkategori pakaian dewasa yang valid.",
  }),
  name: z.string().min(3, "Nama pakaian minimal 3 karakter").max(100),
  brand: z.string().min(1, "Merek wajib diisi"),
  labelSize: z.string().min(1, "Ukuran label wajib diisi (mis. S, M, L, XL, 32)"),
  material: z.string().optional(),
  color: z.string().min(2, "Warna pakaian wajib diisi"),
  conditionDescription: z
    .string()
    .min(10, "Deskripsikan kondisi pakaian secara jujur (minimal 10 karakter)"),
  completeness: z.string().optional(),
  knownDefects: z
    .string()
    .optional()
    .default("Tidak ada cacat yang diketahui"),
  expectedPrice: z
    .number()
    .int()
    .min(0, "Harga harapan tidak boleh negatif")
    .optional(),
  // Minimal 4 foto mandiri: depan, belakang, label, dan cacat/detail
  partnerPhotos: z
    .array(z.string().url("URL foto tidak valid"))
    .min(4, "Wajib mengunggah minimal 4 foto (tampak depan, belakang, label, dan cacat/detail)"),
  partnerMeasurements: z
    .object({
      chestWidthCm: z.number().int().positive().optional(),
      bodyLengthCm: z.number().int().positive().optional(),
      waistWidthCm: z.number().int().positive().optional(),
    })
    .optional(),
  agreementAccepted: z.literal(true, {
    message: "Anda wajib menyetujui pernyataan kebenaran kondisi dan kepemilikan barang.",
  }),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
