import type { CSSProperties } from "react";

export type LaMarkName = "coin" | "wallet" | "gift" | "medal" | "pack-nhap-mon" | "pack-khoi-doc" | "pack-kham-pha" | "pack-tang-thu";

/** Inline Lá glyph for amounts. Follows the surrounding text colour; decorative, the word "Lá" always stays in the text. */
export function LaGlyph() {
  return <span className="la-glyph" aria-hidden="true" />;
}

/** Larger Lá illustrations (wallet, gift, top-up packs, success medal). Always decorative. */
export function LaMark({ name, size = 40, busy = false }: { name: LaMarkName | `pack-${string}`; size?: number; busy?: boolean }) {
  return <span className={`la-mark la-mark-${name}${busy ? " la-mark-busy" : ""}`} style={{ "--la-size": `${size}px` } as CSSProperties} aria-hidden="true" />;
}

const PACK_MARK: Record<string, LaMarkName> = {
  "LA-ENTRY-300": "pack-nhap-mon", "LA-START-1100": "pack-khoi-doc", "LA-DISCOVER-3000": "pack-kham-pha", "LA-LIBRARY-8000": "pack-tang-thu",
};
export function packMarkName(packId: string): LaMarkName { return PACK_MARK[packId] ?? "coin"; }
