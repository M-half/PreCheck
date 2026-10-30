import {
  CheckoutInput,
  checkoutSchema,
  FileComplaintInput,
  fileComplaintSchema,
  ResolveComplaintInput,
  resolveComplaintSchema,
} from "../schemas";
import {
  createLedgerEntry,
  createOrderReservation,
  findOrderById,
  recordSuccessfulPayment,
} from "../repositories";
import db from "@/db";
import { orders, items, complaints } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export async function checkoutService(buyerId: string, rawInput: CheckoutInput) {
  const input = checkoutSchema.parse(rawInput);
  const result = await createOrderReservation(buyerId, input);

  await logAudit({
    actorId: buyerId,
    actorRole: "PEMBELI",
    action: "ORDER_CHECKOUT_RESERVED",
    entityType: "ORDER",
    entityId: result.order.id,
    newValue: {
      orderNumber: result.order.orderNumber,
      totalAmount: result.order.totalAmount,
      expiresAt: result.order.expiresAt,
    },
    reason: "Pembeli melakukan checkout pakaian preloved dengan reservasi 24 jam",
  });

  return result;
}

export async function processPaymentSuccessService(
  orderId: string,
  midtransTransactionId: string,
  paymentType = "qris",
  rawPayload?: Record<string, unknown>
) {
  const order = await findOrderById(orderId);
  if (!order) throw new Error("Order tidak ditemukan.");
  if (order.status !== "PENDING_PAYMENT") {
    // Idempotency: If already paid, return existing order
    return { order, alreadyProcessed: true };
  }

  const result = await recordSuccessfulPayment({
    orderId,
    midtransTransactionId,
    paymentType,
    grossAmount: order.totalAmount,
    rawPayload,
  });

  await logAudit({
    action: "PAYMENT_SETTLED",
    entityType: "ORDER",
    entityId: orderId,
    newValue: { status: "PAID", paymentType, grossAmount: order.totalAmount },
    reason: "Pembayaran berhasil diverifikasi melalui Midtrans Sandbox",
  });

  return result;
}

export async function updateFulfillmentStatusService(
  adminId: string,
  orderId: string,
  action: "PACK" | "SHIP" | "DELIVER",
  trackingNumber?: string
) {
  const order = await findOrderById(orderId);
  if (!order) throw new Error("Order tidak ditemukan.");

  if (action === "PACK") {
    if (order.status !== "PAID") throw new Error("Order belum berstatus PAID.");
    const [updated] = await db
      .update(orders)
      .set({ status: "PACKING", packedAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  if (action === "SHIP") {
    if (order.status !== "PACKING") throw new Error("Order belum berstatus PACKING.");
    if (!trackingNumber) throw new Error("Nomor resi wajib diisi saat pengiriman.");
    const [updated] = await db
      .update(orders)
      .set({
        status: "SHIPPED",
        trackingNumber,
        shippedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  if (action === "DELIVER") {
    if (order.status !== "SHIPPED") throw new Error("Order belum berstatus SHIPPED.");
    const [updated] = await db
      .update(orders)
      .set({
        status: "DELIVERED",
        deliveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  throw new Error("Aksi pengiriman tidak valid.");
}

export async function completeOrderService(buyerId: string, orderId: string) {
  const order = await findOrderById(orderId);
  if (!order) throw new Error("Order tidak ditemukan.");
  if (order.buyerId !== buyerId) throw new Error("Anda bukan pemilik pesanan ini.");
  if (order.status !== "DELIVERED") {
    throw new Error("Pesanan hanya dapat diselesaikan setelah status DELIVERED.");
  }

  return await db.transaction(async (tx) => {
    // 1. Update order status
    const [completedOrder] = await tx
      .update(orders)
      .set({
        status: "COMPLETED",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    // 2. Calculate final financial breakdown
    const price = order.agreedPrice;
    const commissionRate = order.item.commissionRate ?? 20;
    const commissionAmount = Math.floor(price * (commissionRate / 100));
    const shippingFee = order.item.estimatedShippingFee ?? 15000;
    const payoutAmount = price - commissionAmount - shippingFee;

    // 3. Append-Only Ledger Entries
    // Platform Commission
    await createLedgerEntry({
      orderId,
      itemId: order.itemId,
      partnerId: order.partnerId,
      entryType: "PLATFORM_COMMISSION",
      amount: commissionAmount,
      balanceType: "CREDIT",
      description: `Komisi platform (${commissionRate}%) dari penjualan #${order.orderNumber}`,
    });

    // Courier Fee
    await createLedgerEntry({
      orderId,
      itemId: order.itemId,
      partnerId: order.partnerId,
      entryType: "COURIER_SHIPPING_FEE",
      amount: shippingFee,
      balanceType: "DEBIT",
      description: `Biaya ongkos kirim ke pembeli ditanggung mitra untuk #${order.orderNumber}`,
    });

    // Partner Payout Obligation
    await createLedgerEntry({
      orderId,
      itemId: order.itemId,
      partnerId: order.partnerId,
      entryType: "PARTNER_PAYOUT",
      amount: payoutAmount,
      balanceType: "DEBIT",
      description: `Hak payout mitra atas penjualan pakaian #${order.orderNumber}`,
    });

    return completedOrder;
  });
}

export async function fileComplaintService(
  buyerId: string,
  rawInput: FileComplaintInput
) {
  const input = fileComplaintSchema.parse(rawInput);
  const order = await findOrderById(input.orderId);

  if (!order) throw new Error("Order tidak ditemukan.");
  if (order.buyerId !== buyerId) throw new Error("Anda bukan pembeli pesanan ini.");
  if (order.status !== "DELIVERED") {
    throw new Error("Komplain hanya dapat diajukan setelah pesanan DELIVERED.");
  }

  // 2x24 hours check
  if (order.deliveredAt) {
    const elapsedHours =
      (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60);
    if (elapsedHours > 48) {
      throw new Error("Batas waktu komplain 2x24 jam setelah barang diterima telah lewat.");
    }
  }

  return await db.transaction(async (tx) => {
    const [complaint] = await tx
      .insert(complaints)
      .values({
        orderId: input.orderId,
        buyerId,
        reason: input.reason,
        description: input.description,
        evidenceMediaUrls: input.evidenceMediaUrls,
        status: "PENDING_REVIEW",
      })
      .returning();

    await tx
      .update(orders)
      .set({ status: "DISPUTED", updatedAt: new Date() })
      .where(eq(orders.id, input.orderId));

    return complaint;
  });
}

export async function resolveComplaintService(
  adminId: string,
  rawInput: ResolveComplaintInput
) {
  const input = resolveComplaintSchema.parse(rawInput);
  const complaint = await db.query.complaints.findFirst({
    where: eq(complaints.id, input.complaintId),
  });

  if (!complaint) throw new Error("Data komplain tidak ditemukan.");
  if (complaint.status !== "PENDING_REVIEW") {
    throw new Error("Komplain sudah diselesaikan sebelumnya.");
  }

  const order = await findOrderById(complaint.orderId);
  if (!order) throw new Error("Order tidak ditemukan.");

  return await db.transaction(async (tx) => {
    if (input.decision === "ACCEPT_REFUND") {
      // Refund buyer in full
      await tx
        .update(complaints)
        .set({
          status: "ACCEPTED",
          adminDecisionReason: input.adminDecisionReason,
          resolvedBy: adminId,
          resolvedAt: new Date(),
        })
        .where(eq(complaints.id, input.complaintId));

      await tx
        .update(orders)
        .set({
          status: "REFUNDED",
          refundedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      await tx
        .update(items)
        .set({ currentStatus: "BUYER_RETURN", updatedAt: new Date() })
        .where(eq(items.id, order.itemId));

      // Append-Only Ledger Entry: BUYER_REFUND
      await createLedgerEntry({
        orderId: order.id,
        itemId: order.itemId,
        partnerId: order.partnerId,
        entryType: "BUYER_REFUND",
        amount: order.totalAmount,
        balanceType: "DEBIT",
        description: `Refund penuh kepada pembeli atas komplain disetujui (#${order.orderNumber}): ${input.adminDecisionReason}`,
      });

      return { decision: "REFUNDED", orderId: order.id };
    }

    // Reject complaint
    await tx
      .update(complaints)
      .set({
        status: "REJECTED",
        adminDecisionReason: input.adminDecisionReason,
        resolvedBy: adminId,
        resolvedAt: new Date(),
      })
      .where(eq(complaints.id, input.complaintId));

    await tx
      .update(orders)
      .set({
        status: "COMPLETED",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    return { decision: "REJECTED_AND_COMPLETED", orderId: order.id };
  });
}
