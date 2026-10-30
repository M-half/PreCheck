import { NextResponse } from "next/server";
import crypto from "crypto";
import { processPaymentSuccessService } from "@/features/transactions/services";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      transaction_id,
      payment_type,
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-demo-key-123";

    // Verify SHA-512 signature if provided
    if (signature_key) {
      const payloadToHash = `${order_id}${status_code}${gross_amount}${serverKey}`;
      const expectedSignature = crypto
        .createHash("sha512")
        .update(payloadToHash)
        .digest("hex");

      if (signature_key !== expectedSignature && process.env.NODE_ENV === "production") {
        return NextResponse.json({ message: "Invalid Midtrans signature" }, { status: 403 });
      }
    }

    // Settlement or capture = success
    if (transaction_status === "settlement" || transaction_status === "capture") {
      await processPaymentSuccessService(
        order_id,
        transaction_id || `MID-${Date.now()}`,
        payment_type || "qris",
        body
      );
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Midtrans webhook error:", error);
    return NextResponse.json(
      { message: error.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
