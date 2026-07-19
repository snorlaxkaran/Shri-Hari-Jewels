import { describe, expect, it } from "vitest";
import {
  createDocumentShareToken,
  createInvoiceShareToken,
  verifyDocumentShareToken,
} from "../lib/invoices/share-token.js";

describe("invoice share token", () => {
  it("creates and verifies invoice tokens", () => {
    const { token } = createInvoiceShareToken("inv-123", 3600);
    expect(verifyDocumentShareToken(token)).toEqual({
      kind: "invoice",
      documentId: "inv-123",
    });
  });

  it("creates and verifies transfer tokens", () => {
    const { token } = createDocumentShareToken("transfer", "tr-456", 3600);
    expect(verifyDocumentShareToken(token)).toEqual({
      kind: "transfer",
      documentId: "tr-456",
    });
  });

  it("rejects tampered tokens", () => {
    const { token } = createInvoiceShareToken("inv-123", 3600);
    expect(verifyDocumentShareToken(`${token}x`)).toBeNull();
  });
});
