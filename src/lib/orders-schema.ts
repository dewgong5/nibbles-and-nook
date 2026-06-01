/** Fallback RSVP fee (whole dollars). Override with RSVP_PRICE_DOLLARS on the server. */
export const DEFAULT_RSVP_PRICE_DOLLARS = 5;

export interface MenuItemDef {
  id: string;
  name: string;
  translated: string;
  priceCents: number;
  qtyColumn: string;
  portionNote?: { id: string; en: string };
}

export const MAIN_DISH_ITEMS: MenuItemDef[] = [
  {
    id: "nasi-bakar-ayam-kemangi",
    name: "Nasi Bakar Ayam Kemangi",
    translated: "Grilled Rice with Basil Chicken",
    priceCents: 1300,
    qtyColumn: "qty_nasi_bakar_ayam_kemangi",
  },
  {
    id: "nasi-bakar-cumi",
    name: "Nasi Bakar Cumi",
    translated: "Grilled Rice with Squid",
    priceCents: 1400,
    qtyColumn: "qty_nasi_bakar_cumi",
  },
  {
    id: "nasi-bakar-ikan",
    name: "Nasi Bakar Ikan (Tuna)",
    translated: "Grilled Rice with Tuna",
    priceCents: 1300,
    qtyColumn: "qty_nasi_bakar_ikan",
  },
];

export const BAKMI_ITEMS: MenuItemDef[] = [
  {
    id: "bakmi-no-pork-no-lard",
    name: "Bakmi (No Pork, No Lard)",
    translated: "Bakmi (No Pork, No Lard)",
    priceCents: 1600,
    qtyColumn: "qty_bakmi_no_pork_no_lard",
  },
];

export const SATE_ITEMS: MenuItemDef[] = [
  {
    id: "sate-quail-eggs",
    name: "Sate Telur Puyuh",
    translated: "Quail Egg Satay",
    priceCents: 250,
    qtyColumn: "qty_sate_quail_eggs",
  },
  {
    id: "sate-kulit",
    name: "Sate Kulit",
    translated: "Chicken Skin Satay",
    priceCents: 250,
    qtyColumn: "qty_sate_kulit",
  },
];

export const SAMBAL_ITEMS: MenuItemDef[] = [
  {
    id: "sambel-bawang",
    name: "Sambel Bawang",
    translated: "Garlic-Shallot Sambal",
    priceCents: 900,
    qtyColumn: "qty_sambel_bawang",
    portionNote: { id: "110 ml", en: "110 ml" },
  },
  {
    id: "sambel-ijo",
    name: "Sambel Ijo",
    translated: "Green Chili Sambal",
    priceCents: 900,
    qtyColumn: "qty_sambel_ijo",
    portionNote: { id: "110 ml", en: "110 ml" },
  },
  {
    id: "sambel-matah",
    name: "Sambel Matah",
    translated: "Balinese Raw Shallot Sambal",
    priceCents: 900,
    qtyColumn: "qty_sambel_matah",
    portionNote: { id: "110 ml", en: "110 ml" },
  },
];

export const PASTRY_ITEMS: MenuItemDef[] = [
  {
    id: "nama-donut-earl-grey",
    name: "Donut Earl Grey",
    translated: "Donut Earl Grey",
    priceCents: 450,
    qtyColumn: "qty_nama_donut_earl_grey",
  },
  {
    id: "nama-donut-mocha-nougat",
    name: "Donut Mocha Nougat",
    translated: "Donut Mocha Nougat",
    priceCents: 450,
    qtyColumn: "qty_nama_donut_mocha_nougat",
  },
  {
    id: "nama-donut-mango-pomelo-sago",
    name: "Donut Mango Pomelo Sago",
    translated: "Donut Mango Pomelo Sago",
    priceCents: 500,
    qtyColumn: "qty_nama_donut_mango_pomelo_sago",
  },
  {
    id: "butter-tteok",
    name: "Butter Tteok",
    translated: "Butter Tteok",
    priceCents: 550,
    qtyColumn: "qty_butter_tteok",
    portionNote: { id: "4 potong", en: "4 pieces" },
  },
];

export const ALL_MENU_ITEMS: MenuItemDef[] = [
  ...MAIN_DISH_ITEMS,
  ...BAKMI_ITEMS,
  ...SATE_ITEMS,
  ...SAMBAL_ITEMS,
  ...PASTRY_ITEMS,
];

/** Prices in cents (e.g. 250 = $2.50). */
export const ITEM_PRICE_CENTS: Record<string, number> = Object.fromEntries(
  ALL_MENU_ITEMS.map((item) => [item.id, item.priceCents])
);

export const ORDERABLE_ITEM_IDS = ALL_MENU_ITEMS.map((item) => item.id);

export const ITEM_ID_TO_QTY_COLUMN: Record<string, string> = Object.fromEntries(
  ALL_MENU_ITEMS.map((item) => [item.id, item.qtyColumn])
);

/** @deprecated Use ITEM_PRICE_CENTS — kept for receipts migrating from whole-dollar display. */
export const ITEM_PRICE_DOLLARS: Record<string, number> = Object.fromEntries(
  ALL_MENU_ITEMS.map((item) => [item.id, item.priceCents / 100])
);

export type QtyRow = Record<string, number>;

export function emptyQtyColumns(): QtyRow {
  const row: QtyRow = {};
  for (const item of ALL_MENU_ITEMS) {
    row[item.qtyColumn] = 0;
  }
  return row;
}

export function quantitiesToQtyRow(quantities: Record<string, number>): QtyRow {
  const row = emptyQtyColumns();
  for (const item of ALL_MENU_ITEMS) {
    row[item.qtyColumn] = quantities[item.id] ?? 0;
  }
  return row;
}

export function calculateOrderTotalCents(quantities: Record<string, number>): number {
  return ORDERABLE_ITEM_IDS.reduce(
    (sum, id) => sum + (quantities[id] ?? 0) * (ITEM_PRICE_CENTS[id] ?? 0),
    0
  );
}

export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];
export const MAX_FIELD_LENGTH = 255;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePersonal(data: unknown): data is { name: string; email: string; phone: string } {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.name === "string" && d.name.trim().length > 0 && d.name.length <= MAX_FIELD_LENGTH &&
    typeof d.email === "string" && EMAIL_REGEX.test(d.email) && d.email.length <= MAX_FIELD_LENGTH &&
    typeof d.phone === "string" && d.phone.trim().length > 0 && d.phone.length <= MAX_FIELD_LENGTH
  );
}
