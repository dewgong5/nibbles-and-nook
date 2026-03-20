import { NextRequest, NextResponse } from "next/server";
import { sendOrderReceiptEmail } from "@/lib/order-receipt-email";
import { supabase } from "@/lib/supabase";
import {
  aggregateChilisToQtyRow,
  ALLOWED_MIME_TYPES,
  CHILI_NAMES,
  ITEM_PRICE_DOLLARS,
  MAX_FILE_SIZE,
  ORDERABLE_ITEM_IDS,
  validatePersonal,
} from "@/lib/orders-schema";

const MAX_QUANTITY_PER_ITEM = 50;

function validateQuantities(data: unknown): data is Record<string, number> {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  for (const id of ORDERABLE_ITEM_IDS) {
    const val = d[id];
    if (typeof val !== "number" || !Number.isInteger(val)) return false;
    if (val < 0 || val > MAX_QUANTITY_PER_ITEM) return false;
  }
  for (const key of Object.keys(d)) {
    if (!ORDERABLE_ITEM_IDS.includes(key)) return false;
  }
  return true;
}

function validateChilis(
  data: unknown,
  quantities: Record<string, number>
): data is Record<string, string[]> {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  for (const id of ORDERABLE_ITEM_IDS) {
    const raw = d[id];
    if (!Array.isArray(raw)) return false;
    const qty = quantities[id] ?? 0;
    if (raw.length !== qty) return false;
    for (const entry of raw) {
      if (typeof entry !== "string" || !CHILI_NAMES.has(entry)) return false;
    }
  }

  for (const key of Object.keys(d)) {
    if (!ORDERABLE_ITEM_IDS.includes(key)) return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const personalRaw = formData.get("personal") as string;
    const quantitiesRaw = formData.get("quantities") as string;
    const chilisRaw = formData.get("chilis") as string;
    const proof = formData.get("proof") as File | null;

    if (!personalRaw || !quantitiesRaw || !chilisRaw || !proof) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let personal: unknown;
    let quantities: unknown;
    let chilis: unknown;
    try {
      personal = JSON.parse(personalRaw);
      quantities = JSON.parse(quantitiesRaw);
      chilis = JSON.parse(chilisRaw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!validatePersonal(personal)) {
      return NextResponse.json({ error: "Invalid personal info" }, { status: 400 });
    }

    if (!validateQuantities(quantities)) {
      return NextResponse.json({ error: "Invalid order quantities" }, { status: 400 });
    }

    const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
    if (totalItems <= 0) {
      return NextResponse.json({ error: "Order must contain at least one item" }, { status: 400 });
    }

    if (!validateChilis(chilis, quantities)) {
      return NextResponse.json({ error: "Invalid chili selections" }, { status: 400 });
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
    const storagePath = `${safeName}_${timestamp}.${ext}`;

    const fileBuffer = Buffer.from(await proof.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("order-proofs")
      .upload(storagePath, fileBuffer, {
        contentType: proof.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload failed:", uploadError);
      return NextResponse.json(
        { error: "File upload failed" },
        { status: 500 }
      );
    }

    const totalPrice = ORDERABLE_ITEM_IDS.reduce(
      (sum, id) => sum + (quantities[id] ?? 0) * ITEM_PRICE_DOLLARS[id],
      0
    );

    const qtyColumns = aggregateChilisToQtyRow(chilis);

    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      customer_name: personal.name.trim(),
      customer_email: personal.email.trim().toLowerCase(),
      customer_phone: personal.phone.trim(),
      total_price: totalPrice,
      proof_original_filename: originalFilename.slice(0, 512),
      proof_file_path: storagePath,
      paid_rsvp: false,
      ...qtyColumns,
    });

    if (orderError) {
      console.error("Order insert failed:", orderError);
      await supabase.storage.from("order-proofs").remove([storagePath]);
      return NextResponse.json(
        { error: "Order save failed" },
        { status: 500 }
      );
    }

    void sendOrderReceiptEmail({
      kind: "food",
      orderId,
      customerName: personal.name.trim(),
      customerEmail: personal.email.trim().toLowerCase(),
      customerPhone: personal.phone.trim(),
      totalPrice,
      quantities,
      chilis,
    }).then((r) => {
      if (!r.ok) console.warn("[api/order] Receipt email:", r.error);
    });

    return NextResponse.json({ ok: true, order_id: orderId });
  } catch (e) {
    console.error("Order submission error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
