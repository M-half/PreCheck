import { z } from "zod";

export const prescreenDecisionSchema = z.object({
  itemId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().min(5, "Alasan / catatan pre-screening minimal 5 karakter"),
});

export const receivePackageSchema = z.object({
  itemId: z.string().uuid(),
  trackingNumber: z.string().optional(),
  packageCondition: z.string().min(3, "Kondisi kemasan wajib dicatat"),
  packageAnomalies: z.string().optional(),
  notes: z.string().optional(),
});

export const submitQcInspectionSchema = z.object({
  itemId: z.string().uuid(),
  grade: z.enum(["A", "B", "C"], {
    message: "Grade QC harus A, B, atau C (di bawah C = Tidak Layak).",
  }),
  
  // Checklist
  fabricConditionNotes: z.string().min(5, "Catatan kondisi kain wajib diisi"),
  stainsFound: z.string().optional().default("Tidak ada noda"),
  odorFound: z.string().optional().default("Tidak berbau"),
  holesOrTearsFound: z.string().optional().default("Tidak ada"),
  seamsCondition: z.string().min(3, "Kondisi jahitan wajib diisi"),
  fastenersCondition: z.string().optional(),
  completenessChecked: z.string().optional(),
  cleanlinessChecked: z.string().min(3, "Catatan kebersihan wajib diisi"),
  lightTreatmentNotes: z.string().optional(),

  // Minimal 5 platform standard photos (front, back, brand label, size label, measure photo)
  qcPhotos: z
    .array(z.string().url())
    .min(5, "Dokumentasi QC platform wajib memuat minimal 5 foto terstandarisasi"),

  // Actual Measurements (cm)
  measurements: z.object({
    chestWidthCm: z.number().int().positive().optional(),
    bodyLengthCm: z.number().int().positive().optional(),
    shoulderWidthCm: z.number().int().positive().optional(),
    sleeveLengthCm: z.number().int().positive().optional(),
    waistWidthCm: z.number().int().positive().optional(),
    inseamCm: z.number().int().positive().optional(),
    thighWidthCm: z.number().int().positive().optional(),
    notes: z.string().optional(),
  }),

  // Visual Authenticity Check
  authenticity: z.object({
    indicatorResult: z.enum([
      "INDICATOR_TERPENUHI",
      "TIDAK_DAPAT_DIPASTIKAN",
      "TERINDIKASI_TIDAK_ASLI",
    ]),
    visualEvidencePhotos: z.array(z.string().url()).optional(),
    notes: z.string().min(5, "Catatan indikator visual keaslian wajib diisi"),
  }),

  // Double Verification Matrix
  doubleVerification: z.object({
    brandMatch: z.boolean(),
    labelSizeMatch: z.boolean(),
    materialMatch: z.boolean(),
    colorMatch: z.boolean(),
    conditionMatch: z.boolean(),
    defectsMatch: z.boolean(),
    completenessMatch: z.boolean(),
    measurementsMatch: z.boolean(),
    authenticityMatch: z.boolean(),
    notes: z.string().optional(),
  }),

  // QC Final Decision
  decision: z.enum(["LAYAK", "LAYAK_DENGAN_KOREKSI", "TIDAK_LAYAK"]),
  reason: z.string().min(10, "Alasan keputusan QC wajib dijelaskan secara rinci"),
});

export const respondQcCorrectionSchema = z.object({
  itemId: z.string().uuid(),
  response: z.enum(["ACCEPTED", "REJECTED"]),
});

export type PrescreenDecisionInput = z.infer<typeof prescreenDecisionSchema>;
export type ReceivePackageInput = z.infer<typeof receivePackageSchema>;
export type SubmitQcInspectionInput = z.infer<typeof submitQcInspectionSchema>;
export type RespondQcCorrectionInput = z.infer<typeof respondQcCorrectionSchema>;
