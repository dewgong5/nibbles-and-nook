import { NextRequest, NextResponse } from "next/server";
import { sendOrderReceiptEmail } from "@/lib/order-receipt-email";
import { supabase } from "@/lib/supabase";
import {
  ALLOWED_MIME_TYPES,
  DEFAULT_RSVP_PRICE_DOLLARS,
  emptyQtyColumns,
  MAX_FILE_SIZE,
  validatePersonal,
} from "@/lib/orders-schema";

/** Whole dollars; set RSVP_PRICE_DOLLARS in .env to override. */
function rsvpPriceDollars(): number {
  const n = Number(process.env.RSVP_PRICE_DOLLARS);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_RSVP_PRICE_DOLLARS;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const personalRaw = formData.get("personal") as string;
    const proof = formData.get("proof") as File | null;

    if (!personalRaw || !proof) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let personal: unknown;
    try {
      personal = JSON.parse(personalRaw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!validatePersonal(personal)) {
      return NextResponse.json({ error: "Invalid personal info" }, { status: 400 });
    }

    if (proof.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }

    if (proof.type && !ALLOWED_MIME_TYPES.includes(proof.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const orderId = crypto.randomUUID();
    const originalFilename = proof.name || "proof";
    const ext = originalFilename.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
    const safeName = personal.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const storagePath = `rsvp_${safeName}_${timestamp}.${ext}`;

    const fileBuffer = Buffer.from(await proof.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("order-proofs")
      .upload(storagePath, fileBuffer, {
        contentType: proof.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload failed:", uploadError);
      return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }

    const totalPrice = rsvpPriceDollars();

    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      customer_name: personal.name.trim(),
      customer_email: personal.email.trim().toLowerCase(),
      customer_phone: personal.phone.trim(),
      total_price: totalPrice,
      proof_original_filename: originalFilename.slice(0, 512),
      proof_file_path: storagePath,
      paid_rsvp: true,
      ...emptyQtyColumns(),
    });

    if (orderError) {
      console.error("RSVP insert failed:", orderError);
      await supabase.storage.from("order-proofs").remove([storagePath]);
      return NextResponse.json({ error: "RSVP save failed" }, { status: 500 });
    }

    void sendOrderReceiptEmail({
      kind: "rsvp",
      orderId,
      customerName: personal.name.trim(),
      customerEmail: personal.email.trim().toLowerCase(),
      customerPhone: personal.phone.trim(),
      totalPrice,
    }).then((r) => {
      if (!r.ok) console.warn("[api/rsvp] Receipt email:", r.error);
    });

    return NextResponse.json({ ok: true, order_id: orderId });
  } catch (e) {
    console.error("RSVP submission error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
