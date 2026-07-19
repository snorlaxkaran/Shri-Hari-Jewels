"use client";

import { useParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";

export default function SharedInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const pdfUrl = `${API_BASE_URL}/api/public/invoices/${encodeURIComponent(token)}/pdf`;

  return (
    <main
      style={{
        margin: 0,
        minHeight: "100vh",
        background: "#525659",
      }}
    >
      <embed
        src={pdfUrl}
        type="application/pdf"
        style={{
          display: "block",
          width: "100%",
          height: "100vh",
          border: 0,
        }}
      />
    </main>
  );
}
