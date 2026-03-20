/** Fallback RSVP fee (whole dollars). Override with RSVP_PRICE_DOLLARS on the server. */
export const DEFAULT_RSVP_PRICE_DOLLARS = 5;

/** Matches OrderFlow ORDERABLE_ITEMS (prices in whole dollars). */
export const ITEM_PRICE_DOLLARS: Record<string, number> = {
  "nasi-kulit-ayam": 11,
  "nasi-ayam-geprek": 13,
  "nasi-oseng-sapi": 15,
};

export const ORDERABLE_ITEM_IDS = Object.keys(ITEM_PRICE_DOLLARS);

/** Matches OrderFlow CHILI_OPTIONS — maps to DB column suffixes. */
export const CHILI_TO_SUFFIX: Record<string, string> = {
  "Cabe Ijo": "cabe_ijo",
  "Sambal Matah": "sambal_matah",
  "Sambal Bawang": "sambal_bawang",
  "Sambal Terasi": "sambal_terasi",
};

export const CHILI_NAMES = new Set(Object.keys(CHILI_TO_SUFFIX));

/** Item id (kebab) → DB column prefix after qty_. */
export const ITEM_ID_TO_DB_PREFIX: Record<string, string> = {
  "nasi-kulit-ayam": "nasi_kulit_ayam",
  "nasi-ayam-geprek": "nasi_ayam_geprek",
  "nasi-oseng-sapi": "nasi_oseng_sapi",
};

export type QtyRow = Record<string, number>;

export function emptyQtyColumns(): QtyRow {
  const row: QtyRow = {};
  for (const itemId of ORDERABLE_ITEM_IDS) {
    const prefix = ITEM_ID_TO_DB_PREFIX[itemId];
    for (const suffix of Object.values(CHILI_TO_SUFFIX)) {
      row[`qty_${prefix}_${suffix}`] = 0;
    }
  }
  return row;
}

export function aggregateChilisToQtyRow(chilis: Record<string, string[]>): QtyRow {
  const row = emptyQtyColumns();
  for (const itemId of ORDERABLE_ITEM_IDS) {
    const prefix = ITEM_ID_TO_DB_PREFIX[itemId];
    const list = chilis[itemId] ?? [];
    for (const name of list) {
      const suffix = CHILI_TO_SUFFIX[name];
      if (!suffix) continue;
      const key = `qty_${prefix}_${suffix}`;
      row[key] = (row[key] ?? 0) + 1;
    }
  }
  return row;
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
