/** Ensure blob is typed as PDF for inline browser viewing. */
export function asPdfBlob(blob: Blob): Blob {
  if (blob.type === "application/pdf") return blob;
  return new Blob([blob], { type: "application/pdf" });
}

/**
 * Open a blank tab during the user click (before any await) so pop-up blockers
 * allow the PDF viewer tab. Pass the returned window to openPdfBlob.
 *
 * Do not use noopener here — it returns null and we lose the tab reference.
 */
export function preparePdfViewerTab(): Window | null {
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  return tab;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const renderPdfInTab = (tab: Window, url: string, title?: string): void => {
  const pageTitle = escapeHtml(title ?? "Document");
  tab.document.open();
  tab.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${pageTitle}</title>
  <style>
    html, body { margin: 0; height: 100%; background: #525659; }
    embed { display: block; width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <embed src="${url}" type="application/pdf" />
</body>
</html>`);
  tab.document.close();
};

/**
 * Open a PDF in a new browser tab using the built-in viewer (print, download, zoom).
 * Pass `existingTab` from preparePdfViewerTab() when loading after an async fetch.
 */
export function openPdfBlob(
  blob: Blob,
  title?: string,
  existingTab?: Window | null,
): void {
  const url = URL.createObjectURL(asPdfBlob(blob));
  const tab = existingTab ?? window.open("about:blank", "_blank");

  if (tab && !tab.closed) {
    if (!existingTab) tab.opener = null;
    try {
      renderPdfInTab(tab, url, title);
    } catch {
      tab.location.href = url;
    }
  } else {
    const opened = window.open(url, "_blank");
    if (!opened) {
      downloadPdfBlob(
        blob,
        title?.endsWith(".pdf") ? title : `${title ?? "document"}.pdf`,
      );
    }
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

/** Save a PDF blob to disk (explicit download). */
export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(asPdfBlob(blob));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function canSharePdfFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    const probe = new File(["%PDF-1.4"], "probe.pdf", { type: "application/pdf" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Share a PDF file (e.g. to WhatsApp on mobile) or download it when sharing
 * is unavailable. Blob URLs cannot be shared externally.
 */
export async function sharePdfBlob(
  blob: Blob,
  filename: string,
  text?: string,
): Promise<"shared" | "downloaded"> {
  const pdfBlob = asPdfBlob(blob);
  const file = new File([pdfBlob], filename, { type: "application/pdf" });

  if (canSharePdfFiles()) {
    try {
      await navigator.share({
        files: [file],
        title: filename.replace(/\.pdf$/i, ""),
        text,
      });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
    }
  }

  downloadPdfBlob(pdfBlob, filename);
  return "downloaded";
}

/** Navigate a pre-opened tab (or new tab) to a shareable document URL. */
export function openShareUrlInTab(shareUrl: string, tab?: Window | null): void {
  const viewer = tab ?? window.open("about:blank", "_blank");
  if (viewer && !viewer.closed) {
    if (!tab) viewer.opener = null;
    viewer.location.href = shareUrl;
    return;
  }
  window.open(shareUrl, "_blank");
}

/** Open WhatsApp chat with a pre-filled message (attach the PDF manually). */
export function openWhatsAppChat(phone: string, message: string): void {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  window.open(
    `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer",
  );
}
