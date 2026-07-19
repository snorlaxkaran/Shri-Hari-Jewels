import { NextRequest, NextResponse } from "next/server";

const PRODUCTION_API_BASE_URL = "https://shri-hari-jewels-api.onrender.com";

const resolveApiBaseUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured?.trim()) return configured.trim();
  if (process.env.NODE_ENV === "production") return PRODUCTION_API_BASE_URL;
  return "http://localhost:4000";
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const upstream = await fetch(
    `${resolveApiBaseUrl()}/api/public/invoices/${encodeURIComponent(token)}/pdf`,
    { cache: "no-store" },
  );

  if (!upstream.ok) {
    const message =
      upstream.status === 404
        ? "Invoice link expired or invalid."
        : "Could not load invoice PDF.";
    return NextResponse.json({ error: message }, { status: upstream.status });
  }

  const pdf = await upstream.arrayBuffer();
  const filename =
    upstream.headers
      .get("content-disposition")
      ?.match(/filename="([^"]+)"/)?.[1] ?? "invoice.pdf";

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
