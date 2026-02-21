import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ITEM_PRICE_CENTS: Record<string, number> = {
  "nasi-bakar-3-rasa": 14,
  "cendol": 5,
  "nasi-bakar-and-cendol": 16,
  "nasi-ulam-betawi": 17,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];
const MAX_FIELD_LENGTH = 255;
const MAX_QUANTITY_PER_ITEM = 50;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePersonal(data: unknown): data is { name: string; email: string; phone: string } {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.name === "string" && d.name.trim().length > 0 && d.name.length <= MAX_FIELD_LENGTH &&
    typeof d.email === "string" && EMAIL_REGEX.test(d.email) && d.email.length <= MAX_FIELD_LENGTH &&
    typeof d.phone === "string" && d.phone.trim().length > 0 && d.phone.length <= MAX_FIELD_LENGTH
  );
}

function validateQuantities(data: unknown): data is Record<string, number> {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  for (const [key, val] of Object.entries(d)) {
    if (typeof val !== "number" || !Number.isInteger(val)) return false;
    if (val < 0 || val > MAX_QUANTITY_PER_ITEM) return false;
    if (!(key in ITEM_PRICE_CENTS)) return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const personalRaw = formData.get("personal") as string;
    const quantitiesRaw = formData.get("quantities") as string;
    const proof = formData.get("proof") as File | null;

    if (!personalRaw || !quantitiesRaw || !proof) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let personal: unknown;
    let quantities: unknown;
    try {
      personal = JSON.parse(personalRaw);
      quantities = JSON.parse(quantitiesRaw);
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

    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      customer_name: personal.name.trim(),
      customer_email: personal.email.trim().toLowerCase(),
      customer_phone: personal.phone.trim(),
      proof_original_filename: originalFilename.slice(0, 512),
      proof_file_path: storagePath,
    });

    if (orderError) {
      console.error("Order insert failed:", orderError);
      await supabase.storage.from("order-proofs").remove([storagePath]);
      return NextResponse.json(
        { error: "Order save failed" },
        { status: 500 }
      );
    }

    const orderItems = Object.entries(quantities)
      .filter(([id, qty]) => qty > 0 && id in ITEM_PRICE_CENTS)
      .map(([id, qty]) => ({
        order_id: orderId,
        item_id: id,
        quantity: qty,
        unit_price_cents: ITEM_PRICE_CENTS[id],
      }));

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Order items insert failed:", itemsError);
      }
    }

    return NextResponse.json({ ok: true, order_id: orderId });
  } catch (e) {
    console.error("Order submission error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
