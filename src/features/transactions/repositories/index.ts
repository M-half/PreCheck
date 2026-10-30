import db from "@/db";
import {
  items,
  orders,
  payments,
  complaints,
  ledgerEntries,
} from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import type { CheckoutInput } from "../schemas";

export async function createOrderReservation(
  buyerId: string,
  input: CheckoutInput
) {
  return await db.transaction(async (tx) => {
    // 1. Concurrency safe lock: only update if LISTED and NOT reserved
    const [lockedItem] = await tx
      .update(items)
      .set({
        isReserved: true,
        reservedAt: new Date(),
        reservedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        currentStatus: "RESERVED",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(items.id, input.itemId),
          eq(items.currentStatus, "LISTED"),
          eq(items.isReserved, false)
        )
      )
      .returning();

    if (!lockedItem) {
      throw new Error(
        "Pakaian ini sedang direservasi atau sudah tidak tersedia untuk dibeli."
      );
    }

    if (lockedItem.partnerId === buyerId) {
      throw new Error("Mitra tidak diperbolehkan membeli pakaian miliknya sendiri (BR-035).");
    }

    if (!lockedItem.currentPrice) {
      throw new Error("Harga jual pakaian belum ditentukan.");
    }

    // 2. Generate unique order number: ORD-YEARMMDD-RANDOM
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

    const [newOrder] = await tx
      .insert(orders)
      .values({
        orderNumber,
        itemId: lockedItem.id,
        buyerId,
        partnerId: lockedItem.partnerId,
        agreedPrice: lockedItem.currentPrice,
        shippingFee: 0, // Free shipping for buyer (A-008)
        totalAmount: lockedItem.currentPrice,
        status: "PENDING_PAYMENT",
        courierName: input.courierName,
        shippingAddress: input.shippingAddress,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .returning();

    return { order: newOrder, item: lockedItem };
  });
}

export async function recordSuccessfulPayment(params: {
  orderId: string;
  midtransTransactionId: string;
  paymentType: string;
  grossAmount: number;
  rawPayload?: Record<string, unknown>;
}) {
  return await db.transaction(async (tx) => {
    // 1. Update order to PAID
    const [updatedOrder] = await tx
      .update(orders)
      .set({
        status: "PAID",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, params.orderId))
      .returning();

    if (!updatedOrder) throw new Error("Order tidak ditemukan.");

    // 2. Update item to SOLD
    await tx
      .update(items)
      .set({
        currentStatus: "SOLD",
        updatedAt: new Date(),
      })
      .where(eq(items.id, updatedOrder.itemId));

    // 3. Insert payment record
    const [payment] = await tx
      .insert(payments)
      .values({
        orderId: params.orderId,
        midtransTransactionId: params.midtransTransactionId,
        paymentType: params.paymentType,
        grossAmount: params.grossAmount,
        transactionStatus: "settlement",
        rawWebhookPayload: params.rawPayload,
        paidAt: new Date(),
      })
      .returning();

    // 4. Append-Only Ledger Entry: PAYMENT_RECEIVED
    const entryCode = `LDG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await tx.insert(ledgerEntries).values({
      entryCode,
      orderId: updatedOrder.id,
      itemId: updatedOrder.itemId,
      partnerId: updatedOrder.partnerId,
      entryType: "PAYMENT_RECEIVED",
      amount: params.grossAmount,
      balanceType: "CREDIT",
      description: `Pembayaran masuk dari pembeli untuk pesanan #${updatedOrder.orderNumber}`,
    });

    return { order: updatedOrder, payment };
  });
}

export async function createLedgerEntry(params: {
  orderId?: string;
  itemId?: string;
  partnerId?: string;
  entryType: typeof ledgerEntries.$inferInsert.entryType;
  amount: number;
  balanceType: "DEBIT" | "CREDIT";
  description: string;
}) {
  const entryCode = `LDG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const [created] = await db
    .insert(ledgerEntries)
    .values({
      entryCode,
      ...params,
    })
    .returning();

  return created;
}

export async function findOrderById(orderId: string) {
  return await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      item: {
        with: {
          qc: true,
          measurements: true,
        },
      },
      buyer: true,
      partner: true,
      payment: true,
      complaint: true,
    },
  });
}

export async function listUserOrders(userId: string, role: "BUYER" | "PARTNER" | "ADMIN") {
  if (role === "BUYER") {
    return await db.query.orders.findMany({
      where: eq(orders.buyerId, userId),
      with: { item: true, payment: true },
      orderBy: [desc(orders.createdAt)],
    });
  }
  if (role === "PARTNER") {
    return await db.query.orders.findMany({
      where: eq(orders.partnerId, userId),
      with: { item: true, payment: true },
      orderBy: [desc(orders.createdAt)],
    });
  }
  return await db.query.orders.findMany({
    with: { item: true, buyer: true, partner: true, payment: true },
    orderBy: [desc(orders.createdAt)],
  });
}
