CREATE TYPE "public"."authenticity_indicator" AS ENUM('INDICATOR_TERPENUHI', 'TIDAK_DAPAT_DIPASTIKAN', 'TERINDIKASI_TIDAK_ASLI');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('PENDING_REVIEW', 'ACCEPTED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('DRAFT', 'SUBMITTED', 'PRESCREEN_REJECTED', 'AWAITING_SHIPMENT', 'IN_TRANSIT', 'EXPIRED_SHIPMENT', 'RECEIVED', 'IN_QC', 'QC_CORRECTION_PENDING', 'QC_PASSED', 'QC_FAILED', 'PRICING', 'PRICED', 'LISTED', 'RESERVED', 'SOLD', 'WITHDRAWN', 'RETURN_SHIPPING', 'RETURNED', 'BUYER_RETURN', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('PAYMENT_RECEIVED', 'PLATFORM_COMMISSION', 'COURIER_SHIPPING_FEE', 'PARTNER_PAYOUT', 'BUYER_REFUND', 'PARTNER_DEBT');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING_PAYMENT', 'PAID', 'PACKING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'REFUNDED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."partner_verification_status" AS ENUM('NOT_SUBMITTED', 'PENDING_VERIFICATION', 'VERIFIED', 'VERIFICATION_REJECTED');--> statement-breakpoint
CREATE TYPE "public"."price_proposal_status" AS ENUM('PENDING_PARTNER', 'PENDING_ADMIN', 'ACCEPTED', 'COUNTERED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."qc_decision" AS ENUM('LAYAK', 'LAYAK_DENGAN_KOREKSI', 'TIDAK_LAYAK');--> statement-breakpoint
CREATE TYPE "public"."qc_grade" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('MITRA', 'PEMBELI', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'CLOSED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" "user_role",
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"description" text NOT NULL,
	"evidence_media_urls" jsonb NOT NULL,
	"status" "complaint_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"admin_decision_reason" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaints_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "item_authenticity_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"checked_by" uuid NOT NULL,
	"indicator_result" "authenticity_indicator" NOT NULL,
	"visual_evidence_photos" jsonb,
	"notes" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_authenticity_checks_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "item_double_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"verified_by" uuid NOT NULL,
	"brand_match" boolean NOT NULL,
	"label_size_match" boolean NOT NULL,
	"material_match" boolean NOT NULL,
	"color_match" boolean NOT NULL,
	"condition_match" boolean NOT NULL,
	"defects_match" boolean NOT NULL,
	"completeness_match" boolean NOT NULL,
	"measurements_match" boolean NOT NULL,
	"authenticity_match" boolean NOT NULL,
	"notes" text,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_double_verifications_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "item_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"measured_by" uuid NOT NULL,
	"chest_width_cm" integer,
	"body_length_cm" integer,
	"shoulder_width_cm" integer,
	"sleeve_length_cm" integer,
	"waist_width_cm" integer,
	"inseam_cm" integer,
	"thigh_width_cm" integer,
	"notes" text,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_measurements_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "item_qcs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"inspector_id" uuid NOT NULL,
	"grade" "qc_grade" NOT NULL,
	"fabric_condition_notes" text NOT NULL,
	"stains_found" text,
	"odor_found" text,
	"holes_or_tears_found" text,
	"seams_condition" text NOT NULL,
	"fasteners_condition" text,
	"completeness_checked" text,
	"cleanliness_checked" text NOT NULL,
	"light_treatment_notes" text,
	"qc_photos" jsonb NOT NULL,
	"decision" "qc_decision" NOT NULL,
	"reason" text NOT NULL,
	"partner_correction_response" text,
	"correction_responded_at" timestamp with time zone,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_qcs_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "item_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"tracking_number" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"received_by" uuid,
	"package_condition" text NOT NULL,
	"package_anomalies" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_receipts_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "item_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"condition_description" text NOT NULL,
	"completeness" text,
	"known_defects" text,
	"expected_price" integer,
	"partner_photos" jsonb NOT NULL,
	"partner_measurements" jsonb,
	"agreement_accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"agreement_version" text DEFAULT 'v1.0' NOT NULL,
	"prescreen_notes" text,
	"prescreen_decided_at" timestamp with time zone,
	"prescreen_decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_submissions_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_code" text NOT NULL,
	"partner_id" uuid NOT NULL,
	"category" text DEFAULT 'PAKAIAN_DEWASA' NOT NULL,
	"subcategory" text NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"label_size" text NOT NULL,
	"material" text,
	"color" text NOT NULL,
	"current_status" "item_status" DEFAULT 'DRAFT' NOT NULL,
	"current_price" integer,
	"commission_rate" integer DEFAULT 20,
	"estimated_shipping_fee" integer DEFAULT 15000,
	"final_payout_amount" integer,
	"is_reserved" boolean DEFAULT false NOT NULL,
	"reserved_at" timestamp with time zone,
	"reserved_until" timestamp with time zone,
	"listed_at" timestamp with time zone,
	"last_price_revision_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_item_code_unique" UNIQUE("item_code")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_code" text NOT NULL,
	"order_id" uuid,
	"item_id" uuid,
	"partner_id" uuid,
	"entry_type" "ledger_entry_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_type" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_entry_code_unique" UNIQUE("entry_code")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"item_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"agreed_price" integer NOT NULL,
	"shipping_fee" integer DEFAULT 0 NOT NULL,
	"total_amount" integer NOT NULL,
	"status" "order_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"courier_name" text DEFAULT 'JNE Regular (Simulasi)',
	"tracking_number" text,
	"shipping_address" text NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"packed_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "partner_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nik" text,
	"full_name" text,
	"ktp_photo_url" text,
	"selfie_photo_url" text,
	"address" text,
	"bank_name" text,
	"bank_account_number" text,
	"bank_account_holder_name" text,
	"verification_status" "partner_verification_status" DEFAULT 'NOT_SUBMITTED' NOT NULL,
	"rejection_reason" text,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "partner_profiles_nik_unique" UNIQUE("nik")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"midtrans_transaction_id" text,
	"payment_type" text DEFAULT 'qris',
	"gross_amount" integer NOT NULL,
	"transaction_status" text DEFAULT 'pending' NOT NULL,
	"fraud_status" text,
	"signature_key" text,
	"raw_webhook_payload" jsonb,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "price_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"proposed_by_user_id" uuid NOT NULL,
	"proposed_by_role" "user_role" NOT NULL,
	"proposal_type" text DEFAULT 'INITIAL' NOT NULL,
	"proposed_price" integer NOT NULL,
	"commission_rate" integer DEFAULT 20 NOT NULL,
	"estimated_shipping_fee" integer DEFAULT 15000 NOT NULL,
	"estimated_payout" integer NOT NULL,
	"reason" text NOT NULL,
	"status" "price_proposal_status" DEFAULT 'PENDING_PARTNER' NOT NULL,
	"responded_at" timestamp with time zone,
	"response_notes" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"is_moderated" boolean DEFAULT false NOT NULL,
	"moderation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "stagnant_markers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"marker_days" integer NOT NULL,
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by_admin" boolean DEFAULT false NOT NULL,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" DEFAULT 'PEMBELI' NOT NULL,
	"phone" text,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_authenticity_checks" ADD CONSTRAINT "item_authenticity_checks_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_authenticity_checks" ADD CONSTRAINT "item_authenticity_checks_checked_by_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_double_verifications" ADD CONSTRAINT "item_double_verifications_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_double_verifications" ADD CONSTRAINT "item_double_verifications_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_measurements" ADD CONSTRAINT "item_measurements_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_measurements" ADD CONSTRAINT "item_measurements_measured_by_users_id_fk" FOREIGN KEY ("measured_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_qcs" ADD CONSTRAINT "item_qcs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_qcs" ADD CONSTRAINT "item_qcs_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_receipts" ADD CONSTRAINT "item_receipts_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_receipts" ADD CONSTRAINT "item_receipts_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_submissions" ADD CONSTRAINT "item_submissions_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_submissions" ADD CONSTRAINT "item_submissions_prescreen_decided_by_users_id_fk" FOREIGN KEY ("prescreen_decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_partner_id_users_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_partner_id_users_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_partner_id_users_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_profiles" ADD CONSTRAINT "partner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_profiles" ADD CONSTRAINT "partner_profiles_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_proposals" ADD CONSTRAINT "price_proposals_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_proposals" ADD CONSTRAINT "price_proposals_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_partner_id_users_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stagnant_markers" ADD CONSTRAINT "stagnant_markers_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;