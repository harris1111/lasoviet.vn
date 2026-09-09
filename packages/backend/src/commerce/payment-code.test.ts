import { describe, expect, it } from "vitest";
import {
  CROCKFORD_ALPHABET,
  calculatePaymentCodeChecksum,
  extractSyntacticPaymentCodes,
  extractValidPaymentCodes,
  generatePaymentCode,
  isValidPaymentCode,
  normalizePaymentCodeInput,
} from "./payment-code.js";

describe("Payment Code Contract", () => {
  it("generates codes that are exactly 12 characters, use approved alphabet, and validate", () => {
    for (let i = 0; i < 50; i++) {
      const code = generatePaymentCode();
      expect(code).toHaveLength(12);
      expect(code.startsWith("LSV")).toBe(true);
      const payload = code.slice(3);
      for (const char of payload) {
        expect(CROCKFORD_ALPHABET.includes(char)).toBe(true);
      }
      expect(isValidPaymentCode(code)).toBe(true);
    }
  });

  it("produces eight data characters when given leading zero bytes", () => {
    const zeroBytes = new Uint8Array([0, 0, 0, 0, 0]);
    const code = generatePaymentCode(() => zeroBytes);
    expect(code).toHaveLength(12);
    expect(code).toBe("LSV000000000");
    expect(isValidPaymentCode(code)).toBe(true);

    const partialZeroBytes = new Uint8Array([0, 0, 1, 2, 3]);
    const partialCode = generatePaymentCode(() => partialZeroBytes);
    expect(partialCode).toHaveLength(12);
    expect(partialCode.startsWith("LSV000")).toBe(true);
    expect(isValidPaymentCode(partialCode)).toBe(true);
  });

  it("survives lowercase, spaces, punctuation, and full-content normalization", () => {
    const code = generatePaymentCode();
    const noisy = `  lsv-${code.slice(3, 7).toLowerCase()} _ ${code.slice(7).toLowerCase()}!  `;
    const normalized = normalizePaymentCodeInput(noisy);
    expect(normalized).toBe(code);
    expect(isValidPaymentCode(normalized)).toBe(true);

    const extracted = extractValidPaymentCodes(noisy);
    expect(extracted).toEqual([code]);
  });

  it("exposes the expected syntactic candidate from the specified sample content", () => {
    const sample = "CT DEN:513423 LSVK7M2P9QX4 CHUYEN TIEN";
    const candidates = extractSyntacticPaymentCodes(sample);
    expect(candidates).toContain("LSVK7M2P9QX4");
  });

  it("invalidates the code when the checksum character is changed", () => {
    const code = generatePaymentCode();
    const originalChecksum = code[11];
    const data = code.slice(3, 11);
    const calculated = calculatePaymentCodeChecksum(data);
    expect(originalChecksum).toBe(calculated);

    // Pick any other character from Crockford alphabet
    const altChar = originalChecksum === "0" ? "1" : "0";
    const corruptedCode = `${code.slice(0, 11)}${altChar}`;
    expect(isValidPaymentCode(corruptedCode)).toBe(false);

    // Also verify non-Crockford character (e.g. 'I', 'L', 'O', 'U')
    const invalidChar = `${code.slice(0, 11)}U`;
    expect(isValidPaymentCode(invalidChar)).toBe(false);
  });

  it("detects multiple distinct valid codes and never collapses them to one", () => {
    const code1 = generatePaymentCode(() => new Uint8Array([1, 2, 3, 4, 5]));
    const code2 = generatePaymentCode(() => new Uint8Array([10, 20, 30, 40, 50]));
    expect(code1).not.toBe(code2);
    expect(isValidPaymentCode(code1)).toBe(true);
    expect(isValidPaymentCode(code2)).toBe(true);

    const combinedText = `Transfer 1: ${code1}, Transfer 2: ${code2}`;
    const extracted = extractValidPaymentCodes(combinedText);
    expect(extracted).toHaveLength(2);
    expect(extracted).toContain(code1);
    expect(extracted).toContain(code2);

    // Repeated same code in input is de-duplicated
    const repeatedText = `${code1} and again ${code1}`;
    const extractedRepeated = extractValidPaymentCodes(repeatedText);
    expect(extractedRepeated).toHaveLength(1);
    expect(extractedRepeated[0]).toBe(code1);
  });
});
