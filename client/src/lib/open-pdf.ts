/** Ensure blob is typed as PDF for inline browser viewing. */
export function asPdfBlob(blob: Blob): Blob {
  if (blob.type === "application/pdf") return blob;
  return new Blob([blob], { type: "application/pdf" });
}

/**
 * Open a PDF in a new browser tab using the built-in viewer (print, download, zoom).
 * Opens a blank tab synchronously first to avoid popup blockers.
 */
export function openPdfBlob(blob: Blob, title?: string): void {
  const url = URL.createObjectURL(asPdfBlob(blob));
  const tab = window.open("", "_blank", "noopener,noreferrer");
  if (tab) {
    if (title) tab.document.title = title;
    tab.location.href = url;
  } else {
    window.location.assign(url);
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
