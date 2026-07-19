"use client";

import { useParams } from "next/navigation";

export default function SharedTransferDocumentPage() {
  const { token } = useParams<{ token: string }>();
  const pdfUrl = `/api/transfer-share/${encodeURIComponent(token)}/pdf`;

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
