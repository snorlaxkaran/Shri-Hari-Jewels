import type { HallmarkBatchDetail } from "@/lib/types";
import { formatDate } from "@/lib/format";

export const printHallmarkSubmissionSlip = (
  batch: HallmarkBatchDetail,
  shopName: string,
): void => {
  const totalWeight = batch.items.reduce((sum, item) => sum + item.weightGrams, 0);
  const submittedDate = batch.sentAt
    ? formatDate(batch.sentAt)
    : formatDate(new Date().toISOString());

  const rowsHtml = batch.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.itemCode)}</td>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.metal)}</td>
          <td>${escapeHtml(item.purity)}</td>
          <td>${item.weightGrams.toFixed(2)}g</td>
        </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Hallmark Submission ${escapeHtml(batch.batchNo)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 12px; letter-spacing: 0.04em; }
    .meta { margin-bottom: 16px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
    th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; }
    td { font-size: 11px; }
    .total { margin-top: 12px; font-weight: 700; }
    .signatures { margin-top: 36px; display: flex; justify-content: space-between; }
    .signatures div { width: 42%; border-top: 1px solid #333; padding-top: 6px; }
  </style>
</head>
<body>
  <h1>HALLMARK SUBMISSION SLIP</h1>
  <div class="meta">
    <div><strong>Batch No:</strong> ${escapeHtml(batch.batchNo)}</div>
    <div><strong>Center:</strong> ${escapeHtml(batch.hallmarkCenter)}</div>
    <div><strong>Date:</strong> ${escapeHtml(submittedDate)}</div>
    <div><strong>Pieces:</strong> ${batch.items.length}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Item Code</th>
        <th>Product</th>
        <th>Metal</th>
        <th>Purity</th>
        <th>Weight</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <p class="total">Total weight: ${totalWeight.toFixed(2)}g</p>
  <div class="signatures">
    <div>Submitted by: ${escapeHtml(shopName)}</div>
    <div>Signature / Date</div>
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!popup) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
