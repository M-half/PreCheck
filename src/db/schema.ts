import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// ENUMS
// ==========================================

export const roleEnum = pgEnum("user_role", ["MITRA", "PEMBELI", "ADMIN"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED", "CLOSED"]);

export const partnerVerificationStatusEnum = pgEnum("partner_verification_status", [
  "NOT_SUBMITTED",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "VERIFICATION_REJECTED",
]);

export const itemStatusEnum = pgEnum("item_status", [
  "DRAFT",
  "SUBMITTED",
  "PRESCREEN_REJECTED",
  "AWAITING_SHIPMENT",
  "IN_TRANSIT",
  "EXPIRED_SHIPMENT",
  "RECEIVED",
  "IN_QC",
  "QC_CORRECTION_PENDING",
  "QC_PASSED",
  "QC_FAILED",
  "PRICING",
  "PRICED",
  "LISTED",
  "RESERVED",
  "SOLD",
  "WITHDRAWN",
  "RETURN_SHIPPING",
  "RETURNED",
  "BUYER_RETURN",
  "CANCELLED",
]);

export const qcGradeEnum = pgEnum("qc_grade", ["A", "B", "C"]);
export const qcDecisionEnum = pgEnum("qc_decision", [
  "LAYAK",
  "LAYAK_DENGAN_KOREKSI",
  "TIDAK_LAYAK",
]);

export const authenticityIndicatorEnum = pgEnum("authenticity_indicator", [
  "INDICATOR_TERPENUHI",
  "TIDAK_DAPAT_DIPASTIKAN",
  "TERINDIKASI_TIDAK_ASLI",
]);

export const priceProposalStatusEnum = pgEnum("price_proposal_status", [
  "PENDING_PARTNER",
  "PENDING_ADMIN",
  "ACCEPTED",
  "COUNTERED",
  "REJECTED",
  "EXPIRED",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "PAID",
  "PACKING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "DISPUTED",
  "REFUNDED",
  "EXPIRED",
  "CANCELLED",
]);

export const complaintStatusEnum = pgEnum("complaint_status", [
  "PENDING_REVIEW",
  "ACCEPTED",
  "REJECTED",
]);

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "PAYMENT_RECEIVED",
  "PLATFORM_COMMISSION",
  "COURIER_SHIPPING_FEE",
  "PARTNER_PAYOUT",
  "BUYER_REFUND",
  "PARTNER_DEBT",
]);

// ==========================================
// 1. USERS & PARTNER PROFILES
// ==========================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: roleEnum("role").notNull().default("PEMBELI"),
  phone: text("phone"),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const partnerProfiles = pgTable("partner_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  nik: text("nik").unique(),
  fullName: text("full_name"),
  ktpPhotoUrl: text("ktp_photo_url"),
  selfiePhotoUrl: text("selfie_photo_url"),
  address: text("address"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountHolderName: text("bank_account_holder_name"),
  verificationStatus: partnerVerificationStatusEnum("verification_status")
    .notNull()
    .default("NOT_SUBMITTED"),
  rejectionReason: text("rejection_reason"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 2. ITEMS & CONSIGNMENT LIFECYCLE
// ==========================================

export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemCode: text("item_code").notNull().unique(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => users.id),
  category: text("category").notNull().default("PAKAIAN_DEWASA"),
  subcategory: text("subcategory").notNull(), // Atasan, Bawahan, Outerwear, Dress, dll
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  labelSize: text("label_size").notNull(),
  material: text("material"),
  color: text("color").notNull(),
  currentStatus: itemStatusEnum("current_status").notNull().default("DRAFT"),
  
  // Pricing & Consignment Terms (stored in Integer Rupiah)
  currentPrice: integer("current_price"),
  commissionRate: integer("commission_rate").default(20), // 20 means 20%
  estimatedShippingFee: integer("estimated_shipping_fee").default(15000), // Default Rp15.000
  finalPayoutAmount: integer("final_payout_amount"),
  
  // Stock Reservation (Stock is always 1 in R1)
  isReserved: boolean("is_reserved").notNull().default(false),
  reservedAt: timestamp("reserved_at", { withTimezone: true }),
  reservedUntil: timestamp("reserved_until", { withTimezone: true }),
  
  listedAt: timestamp("listed_at", { withTimezone: true }),
  lastPriceRevisionAt: timestamp("last_price_revision_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const itemSubmissions = pgTable("item_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" })
    .unique(),
  conditionDescription: text("condition_description").notNull(),
  completeness: text("completeness"),
  knownDefects: text("known_defects"),
  expectedPrice: integer("expected_price"), // Opsional dari mitra
  partnerPhotos: jsonb("partner_photos").notNull(), // Min 4 photos [front, back, label, defects]
  partnerMeasurements: jsonb("partner_measurements"), // Opsional ukuran dari mitra
  agreementAcceptedAt: timestamp("agreement_accepted_at", { withTimezone: true }).defaultNow().notNull(),
  agreementVersion: text("agreement_version").notNull().default("v1.0"),
  prescreenNotes: text("prescreen_notes"),
  prescreenDecidedAt: timestamp("prescreen_decided_at", { withTimezone: true }),
  prescreenDecidedBy: uuid("prescreen_decided_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const itemReceipts = pgTable("item_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" })
    .unique(),
  trackingNumber: text("tracking_number"),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  receivedBy: uuid("received_by").references(() => users.id),
  packageCondition: text("package_condition").notNull(), // Baik / Rusak / Basah
  packageAnomalies: text("package_anomalies"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 3. QC, MEASUREMENTS & DOUBLE VERIFICATION
// ==========================================

export const itemQcs = pgTable("item_qcs", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" })
    .unique(),
  inspectorId: uuid("inspector_id")
    .notNull()
    .references(() => users.id),
  grade: qcGradeEnum("grade").notNull(), // A, B, C
  
  // Checklist attributes
  fabricConditionNotes: text("fabric_condition_notes").notNull(),
  stainsFound: text("stains_found"),
  odorFound: text("odor_found"),
  holesOrTearsFound: text("holes_or_tears_found"),
  seamsCondition: text("seams_condition").notNull(),
  fastenersCondition: text("fasteners_condition"), // zippers, buttons
  completenessChecked: text("completeness_checked"),
  cleanlinessChecked: text("cleanliness_checked").notNull(),
  lightTreatmentNotes: text("light_treatment_notes"), // steam, lint roller
  
  // Platform standard photos (min 5: front, back, brand label, size label, measure photo, defect close-up)
  qcPhotos: jsonb("qc_photos").notNull(),
  
  decision: qcDecisionEnum("decision").notNull(),
  reason: text("reason").notNull(),
  
  // Correction Flow for LAYAK_DENGAN_KOREKSI
  partnerCorrectionResponse: text("partner_correction_response"), // ACCEPTED, REJECTED
  correctionRespondedAt: timestamp("correction_responded_at", { withTimezone: true }),
  
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const itemMeasurements = pgTable("item_measurements", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" })
    .unique(),
  measuredBy: uuid("measured_by")
    .notNull()
    .references(() => users.id),
  chestWidthCm: integer("chest_width_cm"), // Lebar dada
  bodyLengthCm: integer("body_length_cm"), // Panjang badan
  shoulderWidthCm: integer("shoulder_width_cm"), // Lebar bahu
  sleeveLengthCm: integer("sleeve_length_cm"), // Panjang lengan
  waistWidthCm: integer("waist_width_cm"), // Lingkar / lebar pinggang
  inseamCm: integer("inseam_cm"), // Panjang pesak / inseam
  thighWidthCm: integer("thigh_width_cm"), // Lebar paha
  notes: text("notes"),
  measuredAt: timestamp("measured_at", { withTimezone: true }).defaultNow().notNull(),
});

export const itemAuthenticityChecks = pgTable("item_authenticity_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" })
    .unique(),
  checkedBy: uuid("checked_by")
    .notNull()
    .references(() => users.id),
  indicatorResult: authenticityIndicatorEnum("indicator_result").notNull(),
  visualEvidencePhotos: jsonb("visual_evidence_photos"),
  notes: text("notes").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
});

export const itemDoubleVerifications = pgTable("item_double_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" })
    .unique(),
  verifiedBy: uuid("verified_by")
    .notNull()
    .references(() => users.id),
  brandMatch: boolean("brand_match").notNull(),
  labelSizeMatch: boolean("label_size_match").notNull(),
  materialMatch: boolean("material_match").notNull(),
  colorMatch: boolean("color_match").notNull(),
  conditionMatch: boolean("condition_match").notNull(),
  defectsMatch: boolean("defects_match").notNull(),
  completenessMatch: boolean("completeness_match").notNull(),
  measurementsMatch: boolean("measurements_match").notNull(),
  authenticityMatch: boolean("authenticity_match").notNull(),
  notes: text("notes"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 4. PRICE PROPOSALS & NEGOTIATION
// ==========================================

export const priceProposals = pgTable("price_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  proposedByUserId: uuid("proposed_by_user_id")
    .notNull()
    .references(() => users.id),
  proposedByRole: roleEnum("proposed_by_role").notNull(), // ADMIN or MITRA
  proposalType: text("proposal_type").notNull().default("INITIAL"), // INITIAL, REVISION, COUNTER
  proposedPrice: integer("proposed_price").notNull(),
  commissionRate: integer("commission_rate").notNull().default(20),
  estimatedShippingFee: integer("estimated_shipping_fee").notNull().default(15000),
  estimatedPayout: integer("estimated_payout").notNull(),
  reason: text("reason").notNull(),
  status: priceProposalStatusEnum("status").notNull().default("PENDING_PARTNER"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  responseNotes: text("response_notes"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // 3 calendar days
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 5. ORDERS, PAYMENTS & COMPLAINTS
// ==========================================

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => users.id),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => users.id),
  agreedPrice: integer("agreed_price").notNull(), // Price at the time of reservation
  shippingFee: integer("shipping_fee").notNull().default(0), // Free shipping for buyer (A-008)
  totalAmount: integer("total_amount").notNull(),
  status: orderStatusEnum("status").notNull().default("PENDING_PAYMENT"),
  
  courierName: text("courier_name").default("JNE Regular (Simulasi)"),
  trackingNumber: text("tracking_number"),
  shippingAddress: text("shipping_address").notNull(),
  
  reservedAt: timestamp("reserved_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // 24 hours reservation
  paidAt: timestamp("paid_at", { withTimezone: true }),
  packedAt: timestamp("packed_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" })
    .unique(),
  midtransTransactionId: text("midtrans_transaction_id"),
  paymentType: text("payment_type").default("qris"),
  grossAmount: integer("gross_amount").notNull(),
  transactionStatus: text("transaction_status").notNull().default("pending"),
  fraudStatus: text("fraud_status"),
  signatureKey: text("signature_key"),
  rawWebhookPayload: jsonb("raw_webhook_payload"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const complaints = pgTable("complaints", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" })
    .unique(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(), // e.g. "Ukuran Aktual Berbeda", "Noda Permanen Tak Terungkap"
  description: text("description").notNull(),
  evidenceMediaUrls: jsonb("evidence_media_urls").notNull(),
  status: complaintStatusEnum("status").notNull().default("PENDING_REVIEW"),
  adminDecisionReason: text("admin_decision_reason"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" })
    .unique(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => users.id),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => users.id),
  rating: integer("rating").notNull(), // 1 to 5
  comment: text("comment"),
  isModerated: boolean("is_moderated").notNull().default(false),
  moderationReason: text("moderation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 6. LEDGER, AUDIT & STAGNANT TRACKING
// ==========================================

export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryCode: text("entry_code").notNull().unique(),
  orderId: uuid("order_id").references(() => orders.id),
  itemId: uuid("item_id").references(() => items.id),
  partnerId: uuid("partner_id").references(() => users.id),
  entryType: ledgerEntryTypeEnum("entry_type").notNull(),
  amount: integer("amount").notNull(), // Integer Rupiah
  balanceType: text("balance_type").notNull(), // DEBIT or CREDIT
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  actorRole: roleEnum("actor_role"),
  action: text("action").notNull(), // e.g. "QC_DECISION", "PRICE_RECOMMENDATION", "PARTNER_VERIFY"
  entityType: text("entity_type").notNull(), // e.g. "ITEM", "USER", "ORDER", "PAYMENT"
  entityId: text("entity_id").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stagnantMarkers = pgTable("stagnant_markers", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  markerDays: integer("marker_days").notNull(), // 30, 60, or 90
  markedAt: timestamp("marked_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedByAdmin: boolean("reviewed_by_admin").notNull().default(false),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// RELATIONS
// ==========================================

export const usersRelations = relations(users, ({ one, many }) => ({
  partnerProfile: one(partnerProfiles, {
    fields: [users.id],
    references: [partnerProfiles.userId],
  }),
  itemsSubmitted: many(items),
  buyerOrders: many(orders, { relationName: "buyerOrders" }),
  partnerOrders: many(orders, { relationName: "partnerOrders" }),
  auditLogs: many(auditLogs),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  partner: one(users, {
    fields: [items.partnerId],
    references: [users.id],
  }),
  submission: one(itemSubmissions, {
    fields: [items.id],
    references: [itemSubmissions.itemId],
  }),
  receipt: one(itemReceipts, {
    fields: [items.id],
    references: [itemReceipts.itemId],
  }),
  qc: one(itemQcs, {
    fields: [items.id],
    references: [itemQcs.itemId],
  }),
  measurements: one(itemMeasurements, {
    fields: [items.id],
    references: [itemMeasurements.itemId],
  }),
  authenticityCheck: one(itemAuthenticityChecks, {
    fields: [items.id],
    references: [itemAuthenticityChecks.itemId],
  }),
  doubleVerification: one(itemDoubleVerifications, {
    fields: [items.id],
    references: [itemDoubleVerifications.itemId],
  }),
  priceProposals: many(priceProposals),
  orders: many(orders),
  stagnantMarkers: many(stagnantMarkers),
}));

export const priceProposalsRelations = relations(priceProposals, ({ one }) => ({
  item: one(items, {
    fields: [priceProposals.itemId],
    references: [items.id],
  }),
  proposedByUser: one(users, {
    fields: [priceProposals.proposedByUserId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  item: one(items, {
    fields: [orders.itemId],
    references: [items.id],
  }),
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
    relationName: "buyerOrders",
  }),
  partner: one(users, {
    fields: [orders.partnerId],
    references: [users.id],
    relationName: "partnerOrders",
  }),
  payment: one(payments, {
    fields: [orders.id],
    references: [payments.orderId],
  }),
  complaint: one(complaints, {
    fields: [orders.id],
    references: [complaints.orderId],
  }),
  review: one(reviews, {
    fields: [orders.id],
    references: [reviews.orderId],
  }),
  ledgerEntries: many(ledgerEntries),
}));
