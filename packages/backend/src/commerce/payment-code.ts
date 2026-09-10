import { randomBytes } from "node:crypto";

export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const CHAR_TO_VALUE: ReadonlyMap<string, number> = new Map(
  Array.from(CROCKFORD_ALPHABET).map((char, index) => [char, index]),
);

export function calculatePaymentCodeChecksum(dataChars: string): string {
  if (dataChars.length !== 8) {
    throw new Error("Payment code data must be exactly 8 characters");
  }
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const char = dataChars[i];
    if (char === undefined) {
      throw new Error("Missing character at index " + i);
    }
    const val = CHAR_TO_VALUE.get(char);
    if (val === undefined) {
      throw new Error(`Invalid Crockford character in data: ${char}`);
    }
    sum += (i + 1) * val;
  }
  const checksumChar = CROCKFORD_ALPHABET[sum % 32];
  if (checksumChar === undefined) {
    throw new Error("Checksum calculation overflow");
  }
  return checksumChar;
}

export function generatePaymentCode(
  randomBytesFn: (size: number) => Uint8Array = (size) => randomBytes(size),
): string {
  const bytes = randomBytesFn(5);
  if (bytes.length !== 5) {
    throw new Error("Payment code generator requires exactly 5 bytes");
  }

  let bigint = 0n;
  for (let i = 0; i < 5; i++) {
    const byte = bytes[i];
    if (byte === undefined) {
      throw new Error("Missing byte at index " + i);
    }
    bigint = (bigint << 8n) | BigInt(byte);
  }

  let dataChars = "";
  for (let i = 7; i >= 0; i--) {
    const shift = BigInt(i * 5);
    const idx = Number((bigint >> shift) & 31n);
    const char = CROCKFORD_ALPHABET[idx];
    if (char === undefined) {
      throw new Error("Alphabet index out of range: " + idx);
    }
    dataChars += char;
  }

  const checksum = calculatePaymentCodeChecksum(dataChars);
  return `LSV${dataChars}${checksum}`;
}

export function normalizePaymentCodeInput(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function isValidPaymentCode(code: string): boolean {
  if (typeof code !== "string" || code.length !== 12) {
    return false;
  }
  if (!code.startsWith("LSV")) {
    return false;
  }
  const data = code.slice(3, 11);
  const checksum = code[11];
  if (checksum === undefined || !CHAR_TO_VALUE.has(checksum)) {
    return false;
  }
  for (let i = 0; i < 8; i++) {
    const char = data[i];
    if (char === undefined || !CHAR_TO_VALUE.has(char)) {
      return false;
    }
  }
  try {
    const expectedChecksum = calculatePaymentCodeChecksum(data);
    return checksum === expectedChecksum;
  } catch {
    return false;
  }
}

export function extractSyntacticPaymentCodes(rawOrNormalized: string): string[] {
  const normalized = normalizePaymentCodeInput(rawOrNormalized);
  const regex = /(?=(LSV[0-9A-Z]{9}))/g;
  const matches: string[] = [];
  for (const match of normalized.matchAll(regex)) {
    if (match[1]) {
      matches.push(match[1]);
    }
  }
  return matches;
}

export function extractValidPaymentCodes(rawOrNormalized: string): string[] {
  const candidates = extractSyntacticPaymentCodes(rawOrNormalized);
  const distinctValid = new Set<string>();
  for (const candidate of candidates) {
    if (isValidPaymentCode(candidate)) {
      distinctValid.add(candidate);
    }
  }
  return Array.from(distinctValid);
}
