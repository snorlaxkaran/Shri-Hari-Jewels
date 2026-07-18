import type { ReportPdfColumn } from "./report-pdf.js";
import {
  getAgeingStockReport,
  getCadReport,
  getCategoryReport,
  getCustomerReport,
  getDepartmentReport,
  getGstReport,
  getLocationWiseReport,
  getStaffPerformanceReport,
  getStockSnapshotReport,
  getStockValuationReport,
  type ReportQueryFilters,
} from "./service.js";

export type ReportTableData = {
  title: string;
  columns: ReportPdfColumn[];
  rows: string[][];
  filename: string;
};

type ReportContext = {
  organizationId: string;
  from: Date;
  to: Date;
  branchId?: string;
  filters: ReportQueryFilters;
};

export const buildReportTable = async (
  reportKey: string,
  ctx: ReportContext,
): Promise<ReportTableData> => {
  const { organizationId, from, to, branchId, filters } = ctx;

  switch (reportKey) {
    case "gst": {
      const report = await getGstReport(organizationId, from, to, branchId, filters);
      return {
        title: "GST Report",
        filename: "gst-report",
        columns: [
          { header: "Item Code" },
          { header: "Product" },
          { header: "Customer" },
          { header: "List Price", align: "right" },
          { header: "Discount", align: "right" },
          { header: "Taxable", align: "right" },
          { header: "Sold At" },
        ],
        rows: report.lines.map((l) => [
          l.itemCode,
          l.productName,
          l.customerName,
          String(l.listPrice),
          String(l.discount),
          String(l.taxableValue),
          new Date(l.soldAt).toLocaleDateString("en-IN"),
        ]),
      };
    }
    case "stock-valuation": {
      const report = await getStockValuationReport(organizationId, branchId, filters);
      return {
        title: "Stock Valuation",
        filename: "stock-valuation",
        columns: [
          { header: "SKU" },
          { header: "Name" },
          { header: "Category" },
          { header: "Metal" },
          { header: "Stock", align: "right" },
          { header: "Total Value", align: "right" },
        ],
        rows: report.products.map((p) => [
          p.sku,
          p.name,
          p.category,
          p.metal,
          String(p.stock),
          String(p.totalValue),
        ]),
      };
    }
    case "staff-performance": {
      const staff = await getStaffPerformanceReport(
        organizationId,
        from,
        to,
        branchId,
        filters,
      );
      return {
        title: "Staff Performance",
        filename: "staff-performance",
        columns: [
          { header: "Staff" },
          { header: "Sales Count", align: "right" },
          { header: "Revenue", align: "right" },
        ],
        rows: staff.map((s) => [s.name, String(s.salesCount), String(s.revenue)]),
      };
    }
    case "ageing-stock": {
      const minDays = filters.minDays ?? 90;
      const items = await getAgeingStockReport(
        organizationId,
        minDays,
        branchId,
        filters,
      );
      return {
        title: `Ageing Stock (${minDays}+ days)`,
        filename: "ageing-stock",
        columns: [
          { header: "Item Code" },
          { header: "Product" },
          { header: "Category" },
          { header: "Days", align: "right" },
          { header: "Price", align: "right" },
        ],
        rows: items.map((i) => [
          i.itemCode,
          i.productName,
          i.category,
          String(i.daysInStock),
          String(i.price),
        ]),
      };
    }
    case "category": {
      const report = await getCategoryReport(organizationId, from, to, branchId, filters);
      return {
        title: "Category Report",
        filename: "category-report",
        columns: [
          { header: "Category" },
          { header: "Sales", align: "right" },
          { header: "Revenue", align: "right" },
          { header: "Stock Units", align: "right" },
          { header: "Stock Value", align: "right" },
        ],
        rows: report.rows.map((r) => [
          r.category,
          String(r.salesCount),
          String(r.revenue),
          String(r.stockUnits),
          String(r.stockValue),
        ]),
      };
    }
    case "department": {
      const report = await getDepartmentReport(organizationId, from, to, branchId, filters);
      return {
        title: "Department Report",
        filename: "department-report",
        columns: [
          { header: "Department (Metal)" },
          { header: "Sales", align: "right" },
          { header: "Revenue", align: "right" },
          { header: "Stock Units", align: "right" },
          { header: "Stock Value", align: "right" },
        ],
        rows: report.rows.map((r) => [
          r.department,
          String(r.salesCount),
          String(r.revenue),
          String(r.stockUnits),
          String(r.stockValue),
        ]),
      };
    }
    case "customer": {
      const report = await getCustomerReport(organizationId, from, to, branchId, filters);
      return {
        title: "Customer Report",
        filename: "customer-report",
        columns: [
          { header: "Customer" },
          { header: "Mobile" },
          { header: "Purchases", align: "right" },
          { header: "Total Spend", align: "right" },
          { header: "Last Visit" },
        ],
        rows: report.customers.map((c) => [
          c.customerName,
          c.customerPhone,
          String(c.purchaseCount),
          String(c.totalSpend),
          new Date(c.lastVisit).toLocaleDateString("en-IN"),
        ]),
      };
    }
    case "location-wise": {
      const report = await getLocationWiseReport(organizationId, from, to, filters);
      return {
        title: "Location-wise Report",
        filename: "location-wise-report",
        columns: [
          { header: "Branch" },
          { header: "Address" },
          { header: "Sales", align: "right" },
          { header: "Revenue", align: "right" },
          { header: "Stock Units", align: "right" },
          { header: "Stock Value", align: "right" },
        ],
        rows: report.branches.map((b) => [
          b.branchName,
          b.address ?? "",
          String(b.salesCount),
          String(b.revenue),
          String(b.stockUnits),
          String(b.stockValue),
        ]),
      };
    }
    case "cad": {
      const report = await getCadReport(organizationId, branchId, filters);
      return {
        title: "CAD Pipeline Report",
        filename: "cad-report",
        columns: [
          { header: "Design Code" },
          { header: "Name" },
          { header: "Stage" },
          { header: "CAD Ready" },
          { header: "Days in Stage", align: "right" },
        ],
        rows: report.designs.map((d) => [
          d.code,
          d.name,
          d.stage,
          d.cadReady ? "Yes" : "No",
          String(d.daysInStage),
        ]),
      };
    }
    case "stock-report": {
      const report = await getStockSnapshotReport(organizationId, branchId, filters);
      if (report.groupBySku) {
        const skuItems = report.items as Array<{
          sku: string;
          name: string;
          category: string;
          metal: string;
          branchName: string;
          stock: number;
          totalValue: number;
        }>;
        return {
          title: "Stock Snapshot (by SKU)",
          filename: "stock-report",
          columns: [
            { header: "SKU" },
            { header: "Name" },
            { header: "Category" },
            { header: "Metal" },
            { header: "Branch" },
            { header: "Stock", align: "right" },
            { header: "Value", align: "right" },
          ],
          rows: skuItems.map((i) => [
            i.sku,
            i.name,
            i.category,
            i.metal,
            i.branchName,
            String(i.stock),
            String(i.totalValue),
          ]),
        };
      }
      const unitItems = report.items as Array<{
        itemCode: string;
        sku: string;
        name: string;
        category: string;
        metal: string;
        branchName: string;
        unitPrice: number;
      }>;
      return {
        title: "Stock Snapshot",
        filename: "stock-report",
        columns: [
          { header: "Item Code" },
          { header: "SKU" },
          { header: "Name" },
          { header: "Category" },
          { header: "Metal" },
          { header: "Branch" },
          { header: "Price", align: "right" },
        ],
        rows: unitItems.map((i) => [
          i.itemCode,
          i.sku,
          i.name,
          i.category,
          i.metal,
          i.branchName,
          String(i.unitPrice),
        ]),
      };
    }
    default:
      throw new Error(`Unknown report: ${reportKey}`);
  }
};

export const REPORT_KEYS = [
  "gst",
  "stock-valuation",
  "staff-performance",
  "ageing-stock",
  "category",
  "department",
  "customer",
  "location-wise",
  "cad",
  "stock-report",
] as const;

export type ReportKey = (typeof REPORT_KEYS)[number];

export const isReportKey = (value: string): value is ReportKey =>
  (REPORT_KEYS as readonly string[]).includes(value);
