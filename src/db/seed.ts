import db from "./index";
import {
  users,
  partnerProfiles,
  items,
  itemSubmissions,
  itemReceipts,
  itemQcs,
  itemMeasurements,
  itemAuthenticityChecks,
  itemDoubleVerifications,
  priceProposals,
  auditLogs,
} from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Starting PreCheck database seeding...");

  // 1. Password Hash
  const defaultPasswordHash = await bcrypt.hash("Precheck123!", 10);

  // 2. Clean up existing test data
  console.log("Cleaning up old seed data...");
  await db.delete(auditLogs);
  await db.delete(priceProposals);
  await db.delete(itemDoubleVerifications);
  await db.delete(itemAuthenticityChecks);
  await db.delete(itemMeasurements);
  await db.delete(itemQcs);
  await db.delete(itemReceipts);
  await db.delete(itemSubmissions);
  await db.delete(items);
  await db.delete(partnerProfiles);
  await db.delete(users);

  // 3. Create Users
  console.log("Creating seed users...");
  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@precheck.id",
      fullName: "Admin PreCheck Operasional",
      passwordHash: defaultPasswordHash,
      role: "ADMIN",
      phone: "081234567890",
      status: "ACTIVE",
    })
    .returning();

  const [partner] = await db
    .insert(users)
    .values({
      email: "mitra@precheck.id",
      fullName: "Siti Rahmawati (Mitra Preloved)",
      passwordHash: defaultPasswordHash,
      role: "MITRA",
      phone: "081298765432",
      status: "ACTIVE",
    })
    .returning();

  const [buyer] = await db
    .insert(users)
    .values({
      email: "pembeli@precheck.id",
      fullName: "Budi Santoso",
      passwordHash: defaultPasswordHash,
      role: "PEMBELI",
      phone: "081345678901",
      status: "ACTIVE",
    })
    .returning();

  // 4. Create Partner Profile (Verified)
  console.log("Creating partner profile...");
  await db.insert(partnerProfiles).values({
    userId: partner.id,
    nik: "3201234567890001",
    fullName: "Siti Rahmawati",
    ktpPhotoUrl: "/uploads/ktp/demo-ktp.jpg",
    selfiePhotoUrl: "/uploads/ktp/demo-selfie.jpg",
    address: "Jl. Dago Asri No. 42, Coblong, Kota Bandung",
    bankName: "BCA",
    bankAccountNumber: "5420123456",
    bankAccountHolderName: "Siti Rahmawati",
    verificationStatus: "VERIFIED",
    verifiedAt: new Date(),
    verifiedBy: admin.id,
  });

  // 5. Create Sample Item 1: Status LISTED (Ready in Public Catalog)
  console.log("Creating sample item 1: Jaket Denim Uniqlo (Status: LISTED)...");
  const [item1] = await db
    .insert(items)
    .values({
      itemCode: "PCK-2026-0001",
      partnerId: partner.id,
      category: "PAKAIAN_DEWASA",
      subcategory: "Outerwear",
      name: "Uniqlo Trucker Denim Jacket",
      brand: "Uniqlo",
      labelSize: "L",
      material: "100% Katun Denim",
      color: "Indigo Blue",
      currentStatus: "LISTED",
      currentPrice: 280000,
      commissionRate: 20,
      estimatedShippingFee: 15000,
      finalPayoutAmount: 209000, // 280.000 - 56.000 (20%) - 15.000 = 209.000
      isReserved: false,
      listedAt: new Date(),
    })
    .returning();

  // Submission for Item 1
  await db.insert(itemSubmissions).values({
    itemId: item1.id,
    conditionDescription: "Jarang dipakai, warna masih sangat pekat tidak ada sobek",
    completeness: "Kancing utuh semua bawaan asli",
    knownDefects: "Ada pudar sangat tipis di lipatan kerah dalam",
    expectedPrice: 270000,
    partnerPhotos: [
      "/images/seed/denim-front.jpg",
      "/images/seed/denim-back.jpg",
      "/images/seed/denim-label.jpg",
      "/images/seed/denim-defect.jpg",
    ],
    agreementVersion: "v1.0",
    prescreenDecidedAt: new Date(),
    prescreenDecidedBy: admin.id,
    prescreenNotes: "Lolos seleksi visual awal",
  });

  // Receipt for Item 1
  await db.insert(itemReceipts).values({
    itemId: item1.id,
    trackingNumber: "JNE-882910291",
    receivedBy: admin.id,
    packageCondition: "Baik, kemasan rapi berbalut bubble wrap",
    packageAnomalies: "Tidak ada anomali",
  });

  // QC for Item 1 (Grade B)
  await db.insert(itemQcs).values({
    itemId: item1.id,
    inspectorId: admin.id,
    grade: "B",
    fabricConditionNotes: "Kain katun denim tebal dan kokoh, pudar pemakaian wajar di kerah dalam",
    stainsFound: "Tidak ada noda",
    odorFound: "Tidak berbau, bersih",
    holesOrTearsFound: "Nol lubang/sobek",
    seamsCondition: "Jahitan rantai original rapi",
    fastenersCondition: "Seluruh kancing logam berfungsi baik dan lengkap",
    completenessChecked: "Lengkap sesuai deskripsi",
    cleanlinessChecked: "Bersih siap pakai",
    lightTreatmentNotes: "Dibersihkan lint roller dan disteam halus",
    qcPhotos: [
      "/images/seed/denim-qc-front.jpg",
      "/images/seed/denim-qc-back.jpg",
      "/images/seed/denim-qc-brand-tag.jpg",
      "/images/seed/denim-qc-wash-tag.jpg",
      "/images/seed/denim-qc-measure.jpg",
    ],
    decision: "LAYAK",
    reason: "Kondisi terawat, sesuai kriteria Grade B pakaian preloved layak tayang.",
  });

  // Measurements for Item 1
  await db.insert(itemMeasurements).values({
    itemId: item1.id,
    measuredBy: admin.id,
    chestWidthCm: 56,
    bodyLengthCm: 68,
    shoulderWidthCm: 48,
    sleeveLengthCm: 62,
    notes: "Pengukuran datar (flat measurement)",
  });

  // Authenticity Check for Item 1
  await db.insert(itemAuthenticityChecks).values({
    itemId: item1.id,
    checkedBy: admin.id,
    indicatorResult: "INDICATOR_TERPENUHI",
    visualEvidencePhotos: ["/images/seed/denim-qc-brand-tag.jpg"],
    notes: "Label care tag Uniqlo, cetakan kode RN dan jahitan identik dengan standar ritel.",
  });

  // Double Verification for Item 1
  await db.insert(itemDoubleVerifications).values({
    itemId: item1.id,
    verifiedBy: admin.id,
    brandMatch: true,
    labelSizeMatch: true,
    materialMatch: true,
    colorMatch: true,
    conditionMatch: true,
    defectsMatch: true,
    completenessMatch: true,
    measurementsMatch: true,
    authenticityMatch: true,
    notes: "Klaim mitra 100% selaras dengan temuan fisik di platform.",
  });

  // Price Proposal for Item 1 (Accepted)
  await db.insert(priceProposals).values({
    itemId: item1.id,
    proposedByUserId: admin.id,
    proposedByRole: "ADMIN",
    proposalType: "INITIAL",
    proposedPrice: 280000,
    commissionRate: 20,
    estimatedShippingFee: 15000,
    estimatedPayout: 209000,
    reason: "Harga pasar preloved Grade B jaket denim Uniqlo berkisar Rp250rb-Rp300rb.",
    status: "ACCEPTED",
    respondedAt: new Date(),
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });

  // 6. Create Sample Item 2: Status PRICING (Waiting Partner Response)
  console.log("Creating sample item 2: Kemeja Flannel Zara (Status: PRICING)...");
  const [item2] = await db
    .insert(items)
    .values({
      itemCode: "PCK-2026-0002",
      partnerId: partner.id,
      category: "PAKAIAN_DEWASA",
      subcategory: "Atasan",
      name: "Zara Man Plaid Flannel Shirt",
      brand: "Zara",
      labelSize: "M",
      material: "100% Katun",
      color: "Red/Navy Plaid",
      currentStatus: "PRICING",
      commissionRate: 20,
      estimatedShippingFee: 15000,
    })
    .returning();

  await db.insert(itemSubmissions).values({
    itemId: item2.id,
    conditionDescription: "Kondisi sangat mulus, baru 2x pakai",
    completeness: "Kancing cadangan masih ada",
    knownDefects: "Tidak ada",
    expectedPrice: 190000,
    partnerPhotos: ["/images/seed/zara-front.jpg", "/images/seed/zara-back.jpg"],
    agreementVersion: "v1.0",
    prescreenDecidedAt: new Date(),
    prescreenDecidedBy: admin.id,
  });

  await db.insert(itemQcs).values({
    itemId: item2.id,
    inspectorId: admin.id,
    grade: "A",
    fabricConditionNotes: "Kain lembut tanpa pudar, warna kontras tajam",
    stainsFound: "Tidak ada",
    odorFound: "Segar",
    holesOrTearsFound: "Tidak ada",
    seamsCondition: "Sempurna",
    cleanlinessChecked: "Sangat bersih",
    qcPhotos: ["/images/seed/zara-qc1.jpg", "/images/seed/zara-qc2.jpg"],
    decision: "LAYAK",
    reason: "Grade A sangat baik, memenuhi syarat tayang.",
  });

  await db.insert(itemMeasurements).values({
    itemId: item2.id,
    measuredBy: admin.id,
    chestWidthCm: 52,
    bodyLengthCm: 72,
    shoulderWidthCm: 45,
    sleeveLengthCm: 63,
  });

  await db.insert(itemAuthenticityChecks).values({
    itemId: item2.id,
    checkedBy: admin.id,
    indicatorResult: "INDICATOR_TERPENUHI",
    notes: "Tag kerah Zara Man dan wash tag terverifikasi visual.",
  });

  await db.insert(priceProposals).values({
    itemId: item2.id,
    proposedByUserId: admin.id,
    proposedByRole: "ADMIN",
    proposalType: "INITIAL",
    proposedPrice: 185000,
    commissionRate: 20,
    estimatedShippingFee: 15000,
    estimatedPayout: 133000, // 185.000 - 37.000 - 15.000
    reason: "Kondisi Grade A prima, rekomendasi harga kompetitif cepat laku.",
    status: "PENDING_PARTNER",
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });

  console.log("✅ Seed completed successfully!");
  console.log("-----------------------------------------");
  console.log("Test Credentials:");
  console.log("ADMIN  : admin@precheck.id   | Precheck123!");
  console.log("MITRA  : mitra@precheck.id   | Precheck123!");
  console.log("PEMBELI: pembeli@precheck.id | Precheck123!");
  console.log("-----------------------------------------");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
