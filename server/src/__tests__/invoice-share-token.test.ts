import { describe, expect, it } from "vitest";
import {
  createInvoiceShareToken,
  verifyInvoiceShareToken,
} from "../lib/invoices/share-token.js";

describe("invoice share token", () => {
  it("creates and verifies a token", () => {
    const { token } = createInvoiceShareToken("inv-123", 3600);
    expect(verifyInvoiceShareToken(token)).toEqual({ invoiceId: "inv-123" });
  });

  it("rejects tampered tokens", () => {
    const { token } = createInvoiceShareToken("inv-123", 3600);
    expect(verifyInvoiceShareToken(`${token}x`)).toBeNull();
  });
});
