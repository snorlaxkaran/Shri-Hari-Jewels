export type NicErrorDetail = {
  ErrorCode?: string;
  ErrorMessage?: string;
};

export class EinvoiceError extends Error {
  readonly code: string;
  readonly details: NicErrorDetail[];

  constructor(message: string, code = "EINVOICE_ERROR", details: NicErrorDetail[] = []) {
    super(message);
    this.name = "EinvoiceError";
    this.code = code;
    this.details = details;
  }
}

export const formatNicErrorDetails = (details: NicErrorDetail[]): string => {
  if (details.length === 0) return "Unknown IRP validation error.";
  return details
    .map((entry) => {
      const code = entry.ErrorCode?.trim();
      const msg = entry.ErrorMessage?.trim() ?? "Validation failed";
      return code ? `${code}: ${msg}` : msg;
    })
    .join("; ");
};

export const parseNicErrorDetails = (raw: unknown): NicErrorDetail[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((entry): entry is NicErrorDetail => typeof entry === "object");
  }
  if (typeof raw === "string") {
    try {
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as unknown;
      return parseNicErrorDetails(parsed);
    } catch {
      try {
        const parsed = JSON.parse(raw) as unknown;
        return parseNicErrorDetails(parsed);
      } catch {
        return [{ ErrorMessage: raw }];
      }
    }
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.ErrorMessage === "string" || typeof obj.ErrorCode === "string") {
      return [obj as NicErrorDetail];
    }
  }
  return [];
};

export class EinvoiceCancellationError extends EinvoiceError {
  constructor(message: string) {
    super(message, "EINVOICE_CANCEL_WINDOW");
  }
}
