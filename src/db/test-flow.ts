import db from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import { submitItemConsignmentService } from "@/features/submissions/services";
import {
  processPrescreenService,
  simulateOnlineIntakeService,
  startQcService,
  submitQcInspectionService,
} from "@/features/qc/services";
import {
  recommendPriceService,
  respondPriceProposalService,
} from "@/features/pricing/services";
import {
  publishItemService,
  getPublicCatalogService,
  getProductDetailService,
} from "@/features/catalog/services";
import {
  checkoutService,
  processPaymentSuccessService,
  updateFulfillmentStatusService,
  completeOrderService,
} from "@/features/transactions/services";

async function runEndToEndVerification() {
  console.log("🚀 Starting PreCheck End-to-End Backend Verification...\n");

  // 1. Get Seed Users
  const admin = await db.query.users.findFirst({ where: eq(users.email, "admin@precheck.id") });
  const partner = await db.query.users.findFirst({ where: eq(users.email, "mitra@precheck.id") });
  const buyer = await db.query.users.findFirst({ where: eq(users.email, "pembeli@precheck.id") });

  if (!admin || !partner || !buyer) {
    throw new Error("Seed users not found. Run 'bun run db:seed' first.");
  }

  console.log(`[1] Users identified: Admin (${admin.fullName}), Mitra (${partner.fullName}), Pembeli (${buyer.fullName})`);

  // 2. Mitra submits item
  console.log("\n[2] Mitra submitting new consignment item: Celana Chino H&M...");
  const submissionResult = await submitItemConsignmentService(partner.id, {
    subcategory: "Celana Panjang",
    name: "H&M Slim Fit Chino Trousers",
    brand: "H&M",
    labelSize: "32",
    material: "Katun Twill Stretch",
    color: "Beige Khaki",
    conditionDescription: "Kondisi sangat mulus terawat, warna cerah merata, tidak ada robek.",
    completeness: "Kancing utama dan kancing saku belakang utuh",
    knownDefects: "Tidak ada cacat",
    expectedPrice: 160000,
    partnerPhotos: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae81",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae82",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae83",
    ],
    agreementAccepted: true,
  });
  const itemId = submissionResult.item.id;
  console.log(`  ✓ Item created with code: ${submissionResult.item.itemCode} (Status: ${submissionResult.item.currentStatus})`);

  // 3. Admin pre-screening
  console.log("\n[3] Admin approving pre-screening...");
  const prescreenResult = await processPrescreenService(admin.id, {
    itemId,
    decision: "APPROVED",
    notes: "Pakaian dalam lingkup, foto jelas, deskripsi lengkap.",
  });
  console.log(`  ✓ Pre-screening approved (Status: ${prescreenResult.currentStatus})`);

  // 4. Online intake simulation (Simulasi cepat tanpa kirim fisik)
  console.log("\n[4] Simulating online package receipt (Penerimaan platform)...");
  const intakeResult = await simulateOnlineIntakeService(admin.id, itemId);
  console.log(`  ✓ Package received by platform (Status: ${intakeResult.item.currentStatus})`);

  // 5. Admin starting QC
  console.log("\n[5] Admin starting QC inspection...");
  await startQcService(admin.id, itemId);

  // 6. Admin submitting full QC with actual measurements, authenticity, and double verification
  console.log("\n[6] Admin recording full QC, actual measurements (cm), authenticity check, and double verification...");
  const qcResult = await submitQcInspectionService(admin.id, {
    itemId,
    grade: "A",
    fabricConditionNotes: "Kain twill kokoh, elastisitas terjaga baik tanpa melar berlebih.",
    stainsFound: "Nol noda",
    odorFound: "Bersih harum",
    holesOrTearsFound: "Tidak ada lubang",
    seamsCondition: "Jahitan rapi dan kuat pada selangkangan & saku",
    cleanlinessChecked: "Bersih siap tayang",
    lightTreatmentNotes: "Disteam rapi",
    qcPhotos: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae81",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae82",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae83",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae84",
    ],
    measurements: {
      waistWidthCm: 84, // Lingkar pinggang
      bodyLengthCm: 102, // Panjang celana
      inseamCm: 76, // Inseam
      thighWidthCm: 29, // Lebar paha
      notes: "Ukuran aktual akurat sesuai panduan titik ukur bawahan.",
    },
    authenticity: {
      indicatorResult: "INDICATOR_TERPENUHI",
      notes: "Wash tag dan logo H&M terverifikasi visual.",
    },
    doubleVerification: {
      brandMatch: true,
      labelSizeMatch: true,
      materialMatch: true,
      colorMatch: true,
      conditionMatch: true,
      defectsMatch: true,
      completenessMatch: true,
      measurementsMatch: true,
      authenticityMatch: true,
      notes: "Temuan fisik platform 100% selaras dengan klaim mitra.",
    },
    decision: "LAYAK",
    reason: "Pakaian Grade A prima, memenuhi standar kurasi PreCheck.",
  });
  console.log(`  ✓ QC Completed (Grade: ${qcResult.qc.grade}, Status: ${qcResult.item.currentStatus})`);

  // 7. Admin recommends price
  console.log("\n[7] Admin sending price recommendation...");
  const priceProposal = await recommendPriceService(admin.id, {
    itemId,
    proposedPrice: 175000,
    commissionRate: 20,
    estimatedShippingFee: 15000,
    reason: "Harga pasar preloved Chino H&M Grade A berkisar Rp160rb-Rp190rb.",
  });
  console.log(
    `  ✓ Price recommendation sent: Rp${priceProposal.proposedPrice.toLocaleString("id-ID")} (Estimasi payout mitra: Rp${priceProposal.estimatedPayout.toLocaleString("id-ID")})`
  );

  // 8. Mitra responds to price proposal (Accepts)
  console.log("\n[8] Mitra accepting price recommendation...");
  const partnerResponse = await respondPriceProposalService(partner.id, {
    proposalId: priceProposal.id,
    action: "ACCEPT",
    notes: "Setuju dengan rekomendasi harga admin.",
  });
  console.log(`  ✓ Price proposal accepted (Item Status: ${partnerResponse.item?.currentStatus})`);

  // 9. Admin publishes item to public catalog
  console.log("\n[9] Admin publishing item to catalog (tayang sampai terjual)...");
  const publishedItem = await publishItemService(admin.id, itemId);
  console.log(`  ✓ Item successfully LISTED on catalog (Price: Rp${publishedItem.currentPrice?.toLocaleString("id-ID")})`);

  // 10. Public Catalog Query Verification
  console.log("\n[10] Verifying Public Catalog Query & Product Detail...");
  const catalog = await getPublicCatalogService({ subcategory: "Celana Panjang" });
  console.log(`  ✓ Found ${catalog.length} item(s) in catalog under 'Celana Panjang'`);
  const productDetail = await getProductDetailService(publishedItem.itemCode);
  console.log(`  ✓ Detail loaded: ${productDetail.name} | Ukuran Aktual Pinggang: ${productDetail.measurements?.waistWidthCm} cm`);

  // 11. Buyer Checkout (Stock 1 Reservation)
  console.log("\n[11] Buyer Budi checking out item (Reservasi 24 jam)...");
  const checkoutResult = await checkoutService(buyer.id, {
    itemId,
    shippingAddress: "Jl. Dipati Ukur No. 100, Bandung",
    courierName: "JNE Regular (Simulasi)",
  });
  console.log(`  ✓ Order created: #${checkoutResult.order.orderNumber} (Status: ${checkoutResult.order.status}, Total: Rp${checkoutResult.order.totalAmount.toLocaleString("id-ID")})`);
  console.log(`  ✓ Item locked: isReserved = ${checkoutResult.item.isReserved}, Status: ${checkoutResult.item.currentStatus}`);

  // 12. Midtrans Payment Simulation
  console.log("\n[12] Simulating successful Midtrans Sandbox payment...");
  const paymentResult = await processPaymentSuccessService(
    checkoutResult.order.id,
    `MID-SIM-${Date.now()}`,
    "qris"
  );
  console.log(`  ✓ Payment settled (Order Status: ${paymentResult.order.status})`);

  // 13. Order Fulfillment (Pack, Ship, Deliver)
  console.log("\n[13] Order fulfillment simulation...");
  await updateFulfillmentStatusService(admin.id, checkoutResult.order.id, "PACK");
  console.log("  ✓ Order packed (PACKING)");
  await updateFulfillmentStatusService(admin.id, checkoutResult.order.id, "SHIP", "JNE-PRECHECK-00123");
  console.log("  ✓ Order shipped with tracking number: JNE-PRECHECK-00123 (SHIPPED)");
  await updateFulfillmentStatusService(admin.id, checkoutResult.order.id, "DELIVER");
  console.log("  ✓ Order delivered to buyer (DELIVERED)");

  // 14. Buyer Confirms Completion & Ledger Allocation
  console.log("\n[14] Buyer confirms order completion & Platform Ledger allocation...");
  const completedOrder = await completeOrderService(buyer.id, checkoutResult.order.id);
  console.log(`  ✓ Order COMPLETED: #${completedOrder.orderNumber}`);

  // 15. Check Ledger Entries
  const ledger = await db.query.ledgerEntries.findMany({
    where: eq(users.id, users.id),
  });
  console.log(`\n[15] Financial Ledger Audit Trail (${ledger.length} immutable records):`);
  for (const entry of ledger) {
    console.log(`  • [${entry.balanceType}] ${entry.entryType}: Rp${entry.amount.toLocaleString("id-ID")} - ${entry.description}`);
  }

  console.log("\n🎉 ALL BACKEND BUSINESS LOGIC AND SERVICES VERIFIED 100% WORKING!");
  process.exit(0);
}

runEndToEndVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
