import nodemailer from "nodemailer";
import {
  ITEM_PRICE_DOLLARS,
  ORDERABLE_ITEM_IDS,
} from "@/lib/orders-schema";

/**
 * Same face as the site (`globals.css` → `.font-baby-doll` uses "Baby Doll").
 * Email HTML cannot load /fonts/... from a relative URL — use @font-face with an absolute URL
 * (set RECEIPT_FONT_BASE_URL or NEXT_PUBLIC_SITE_URL; on Vercel, VERCEL_URL is used automatically).
 * Many webmail apps (e.g. Gmail) still ignore custom fonts and use the fallbacks.
 */
const RECEIPT_EMAIL_FONT_FAMILY =
  "'Baby Doll','Trebuchet MS','Segoe UI',system-ui,sans-serif";

/** Display labels for receipt line items (kebab id → menu name). */
const ITEM_LABELS: Record<string, string> = {
  "nasi-kulit-ayam": "Nasi Kulit Ayam",
  "nasi-ayam-geprek": "Nasi Ayam Geprek",
  "nasi-oseng-sapi": "Nasi Oseng Sapi",
};

export type OrderReceiptEmailInput =
  | {
      kind: "food";
      orderId: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      totalPrice: number;
      quantities: Record<string, number>;
      chilis: Record<string, string[]>;
    }
  | {
      kind: "rsvp";
      orderId: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      totalPrice: number;
    };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function receiptPublicOrigin(): string | null {
  const explicit =
    process.env.RECEIPT_FONT_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return null;
}

/** Injects @font-face so clients that support remote fonts can load Baby Doll from your deployed site. */
function receiptFontFaceHead(): string {
  const origin = receiptPublicOrigin();
  if (!origin) return "";
  const fontUrl = `${origin}/fonts/baby-doll.ttf`;
  return `<style type="text/css">
@font-face {
  font-family: 'Baby Doll';
  src: url('${escapeHtml(fontUrl)}') format('truetype');
  font-weight: 400;
  font-style: normal;
}
</style>`;
}

function formatChiliBreakdown(chiliList: string[]): string {
  if (chiliList.length === 0) return "—";
  const counts: Record<string, number> = {};
  for (const name of chiliList) counts[name] = (counts[name] ?? 0) + 1;
  return Object.entries(counts)
    .map(([name, count]) => `${name} (${count})`)
    .join(", ");
}

function formatMoney(n: number): string {
  return `$${n}`;
}

/** Plain-text body for the receipt email. */
export function buildReceiptPlainText(input: OrderReceiptEmailInput): string {
  const when = new Date().toUTCString();
  const header =
    input.kind === "food"
      ? "Nibbles & nOOk — order receipt"
      : "Nibbles & nOOk — RSVP receipt";

  const lines: string[] = [
    header,
    "",
    `Receipt #${input.orderId}`,
    `Date (UTC): ${when}`,
    "",
    "Customer",
    `  Name:  ${input.customerName}`,
    `  Email: ${input.customerEmail}`,
    `  Phone: ${input.customerPhone}`,
    "",
  ];

  if (input.kind === "food") {
    lines.push("Items", "");
    for (const id of ORDERABLE_ITEM_IDS) {
      const qty = input.quantities[id] ?? 0;
      if (qty <= 0) continue;
      const label = ITEM_LABELS[id] ?? id;
      const unit = ITEM_PRICE_DOLLARS[id] ?? 0;
      const chilis = input.chilis[id] ?? [];
      lines.push(`  ${label} × ${qty} @ ${formatMoney(unit)} = ${formatMoney(qty * unit)}`);
      lines.push(`    Chili: ${formatChiliBreakdown(chilis)}`);
    }
    lines.push("", `Total: ${formatMoney(input.totalPrice)}`);
    lines.push("", "Thank you! We'll see you at the pop-up.");
  } else {
    lines.push(
      "RSVP",
      `  Fee: ${formatMoney(input.totalPrice)}`,
      "",
      "Your RSVP fee counts as pop-up credit on the day of the event.",
      "",
      "Thank you! You're on the list."
    );
  }

  return lines.join("\n");
}

/** Simple HTML body (tables + inline styles for mail clients). */
export function buildReceiptHtml(input: OrderReceiptEmailInput): string {
  const when = escapeHtml(new Date().toUTCString());
  const title =
    input.kind === "food" ? "Order receipt" : "RSVP receipt";
  const brand = "Nibbles &amp; nOOk";
  const ff = RECEIPT_EMAIL_FONT_FAMILY;

  const customerBlock = `
    <p style="margin:0 0 12px;font-family:${ff};font-size:15px;color:#333;">
      <strong>${escapeHtml(input.customerName)}</strong><br/>
      ${escapeHtml(input.customerEmail)}<br/>
      ${escapeHtml(input.customerPhone)}
    </p>`;

  let bodyMain = "";
  if (input.kind === "food") {
    const rows: string[] = [];
    for (const id of ORDERABLE_ITEM_IDS) {
      const qty = input.quantities[id] ?? 0;
      if (qty <= 0) continue;
      const label = ITEM_LABELS[id] ?? id;
      const unit = ITEM_PRICE_DOLLARS[id] ?? 0;
      const lineTotal = qty * unit;
      const chiliText = formatChiliBreakdown(input.chilis[id] ?? []);
      rows.push(`
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e8dcc8;font-family:${ff};font-size:14px;color:#333;">
            ${escapeHtml(label)} × ${qty}<br/>
            <span style="font-size:12px;color:#666;">Chili: ${escapeHtml(chiliText)}</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #e8dcc8;text-align:right;font-family:${ff};font-size:14px;color:#333;">
            ${escapeHtml(formatMoney(unit))} each<br/>
            <strong>${escapeHtml(formatMoney(lineTotal))}</strong>
          </td>
        </tr>`);
    }
    bodyMain = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
        ${rows.join("")}
      </table>
      <p style="margin:16px 0 0;font-family:${ff};font-size:18px;color:#D44A3D;"><strong>Total: ${escapeHtml(formatMoney(input.totalPrice))}</strong></p>
      <p style="margin:12px 0 0;font-family:${ff};font-size:14px;color:#333;">Thank you! We'll see you at the pop-up.</p>`;
  } else {
    bodyMain = `
      <p style="margin:12px 0;font-family:${ff};font-size:15px;color:#333;">RSVP fee: <strong>${escapeHtml(formatMoney(input.totalPrice))}</strong></p>
      <p style="margin:12px 0;font-family:${ff};font-size:14px;color:#555;">Your RSVP fee counts as pop-up credit on the day of the event.</p>
      <p style="margin:12px 0;font-family:${ff};font-size:14px;color:#333;">Thank you! You're on the list.</p>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${receiptFontFaceHead()}
</head>
<body style="margin:0;padding:24px;background:#fff4dd;font-family:${ff};">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e8dcc8;border-radius:12px;padding:24px;font-family:${ff};">
    <h1 style="margin:0 0 8px;font-family:${ff};font-size:22px;color:#D44A3D;">${brand}</h1>
    <p style="margin:0 0 16px;font-family:${ff};font-size:15px;color:#666;">${title}</p>
    <p style="margin:0 0 8px;font-family:${ff};font-size:13px;color:#888;">Receipt #${escapeHtml(input.orderId)}</p>
    <p style="margin:0 0 16px;font-family:${ff};font-size:13px;color:#888;">${when}</p>
    ${customerBlock}
    ${bodyMain}
  </div>
</body>
</html>`;
}

export type SendReceiptResult =
  | { ok: true }
  | { ok: false; error: string };

function receiptSubject(input: OrderReceiptEmailInput): string {
  const short = input.orderId.slice(0, 8);
  return input.kind === "food"
    ? `Your Nibbles & nOOk order receipt (#${short}...)`
    : `Your Nibbles & nOOk RSVP receipt (#${short}...)`;
}

/**
 * Sends from Gmail using an App Password (not your normal Gmail password).
 * Set GMAIL_USER + GMAIL_APP_PASSWORD in .env.local — see Google Account → Security → App passwords.
 */
async function sendViaGmail(
  input: OrderReceiptEmailInput,
  user: string,
  appPassword: string
): Promise<SendReceiptResult> {
  const subject = receiptSubject(input);
  const text = buildReceiptPlainText(input);
  const html = buildReceiptHtml(input);

  try {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass: appPassword.replace(/\s/g, ""),
      },
    });

    await transport.sendMail({
      from: `"Nibbles & nOOk" <${user}>`,
      to: input.customerEmail,
      subject,
      text,
      html,
    });

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[order-receipt-email] Gmail SMTP failed:", message);
    return { ok: false, error: message };
  }
}

/** Resend API — optional if you use a transactional provider + verified domain. */
async function sendViaResend(
  input: OrderReceiptEmailInput,
  apiKey: string,
  from: string
): Promise<SendReceiptResult> {
  const subject = receiptSubject(input);
  const text = buildReceiptPlainText(input);
  const html = buildReceiptHtml(input);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.customerEmail],
        subject,
        text,
        html,
      }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        body && typeof body === "object" && "message" in body
          ? String((body as { message: unknown }).message)
          : res.statusText;
      console.error("[order-receipt-email] Resend error:", res.status, msg);
      return { ok: false, error: msg || "resend_failed" };
    }

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[order-receipt-email] Resend request failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Sends the receipt to the customer.
 *
 * **Gmail (your case):** set `GMAIL_USER=nibblesandnook.dev@gmail.com` and
 * `GMAIL_APP_PASSWORD` from Google → Security → 2-Step Verification → App passwords.
 * No Google Cloud project or service account is required for this path.
 *
 * **Resend (optional):** set `RESEND_API_KEY` and `RECEIPT_EMAIL_FROM` instead.
 * If Gmail vars are set, Gmail is used; otherwise Resend; otherwise receipt is skipped.
 */
export async function sendOrderReceiptEmail(
  input: OrderReceiptEmailInput
): Promise<SendReceiptResult> {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();

  let result: SendReceiptResult;
  let provider: "gmail" | "resend" | "none";

  if (gmailUser && gmailPass) {
    provider = "gmail";
    result = await sendViaGmail(input, gmailUser, gmailPass);
  } else {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RECEIPT_EMAIL_FROM?.trim();

    if (apiKey && from) {
      provider = "resend";
      result = await sendViaResend(input, apiKey, from);
    } else {
      provider = "none";
      console.warn(
        "[order-receipt-email] No mail configured. Set GMAIL_USER + GMAIL_APP_PASSWORD, or RESEND_API_KEY + RECEIPT_EMAIL_FROM."
      );
      result = { ok: false, error: "email_not_configured" };
    }
  }
  console.log(
    "[order-receipt-email]",
    result.ok ? "sent" : "failed",
    {
      kind: input.kind,
      orderId: input.orderId,
      to: input.customerEmail,
      provider,
      ...(result.ok ? {} : { error: result.error }),
    }
  );

  return result;
}
