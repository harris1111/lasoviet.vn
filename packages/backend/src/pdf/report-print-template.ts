export type PdfFontAsset = {
  family: "Be Vietnam Pro";
  weight: 400 | 600;
  source: Uint8Array;
  unicodeRange: string;
};

function fontFace(font: PdfFontAsset): string {
  const source = Buffer.from(font.source).toString("base64");
  return `@font-face{font-family:"${font.family}";font-style:normal;font-weight:${font.weight};font-display:block;src:url(data:font/woff2;base64,${source}) format("woff2");unicode-range:${font.unicodeRange};}`;
}

export function createReportPrintHtml(
  immutableHtml: string,
  fonts: readonly PdfFontAsset[],
): string {
  const styles = [
    ...fonts.map(fontFace),
    "@page{size:A4;margin:18mm 16mm}",
    "html,body{font-family:\"Be Vietnam Pro\",sans-serif;font-size:11pt;line-height:1.58;color:#141414}",
    "h1,h2,h3{font-weight:600;break-after:avoid-page}",
    "p,li{orphans:3;widows:3}",
    "img,table,blockquote{break-inside:avoid}",
  ].join("");

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>${styles}</style></head><body>${immutableHtml}</body></html>`;
}
