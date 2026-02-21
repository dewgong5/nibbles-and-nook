import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ITEM_PRICE_CENTS: Record<string, number> = {
  "pork-bakmie": 1400,
  "earl-grey-tiramisu": 1200,
  "chestnut-tiramisu": 1200,
  "choipan": 1300,
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const personalRaw = formData.get("personal") as string;
    const quantitiesRaw = formData.get("quantities") as string;
    const proof = formData.get("proof") as File | null;

    if (!personalRaw || !quantitiesRaw || !proof) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const personal = JSON.parse(personalRaw);
    const quantities: Record<string, number> = JSON.parse(quantitiesRaw);

    const orderId = crypto.randomUUID();
    const originalFilename = proof.name || "proof";
    const ext = originalFilename.split(".").pop() || "bin";
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
      customer_name: personal.name,
      customer_email: personal.email,
      customer_phone: personal.phone,
      proof_original_filename: originalFilename,
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
