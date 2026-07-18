import { prisma } from "../db.js";
import { organizationBranchFilter } from "../branches/access.js";

export type GlobalSearchResult = {
  type:
    | "product"
    | "customer"
    | "sale"
    | "invoice"
    | "order"
    | "design"
    | "motif"
    | "productionRun"
    | "workOrder";
  id: string;
  label: string;
  sublabel?: string;
  href: string;
};

const SEARCH_TYPES = 9;

export const globalSearch = async (
  organizationId: string,
  query: string,
  branchId?: string,
  limit = 20,
): Promise<GlobalSearchResult[]> => {
  const q = query.trim();
  if (q.length < 2) return [];

  const perType = Math.ceil(limit / SEARCH_TYPES);
  const results: GlobalSearchResult[] = [];

  const [
    products,
    customers,
    sales,
    invoices,
    orders,
    designs,
    motifs,
    productionRuns,
    workOrders,
  ] = await Promise.all([
    prisma.product.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
        OR: [
          { sku: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, sku: true, name: true },
      take: perType,
    }),
    prisma.customer.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { mobile: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, mobile: true },
      take: perType,
    }),
    prisma.sale.findMany({
      where: {
        ...organizationBranchFilter(organizationId, branchId),
        OR: [
          { itemCode: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { customerPhone: { contains: q } },
          { customerName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, itemCode: true, productName: true },
      take: perType,
    }),
    prisma.invoice.findMany({
      where: {
        ...organizationBranchFilter(organizationId, branchId),
        OR: [
          { invoiceNo: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { items: { some: { itemCode: { contains: q, mode: "insensitive" } } } },
        ],
      },
      select: { id: true, invoiceNo: true, customerName: true },
      take: perType,
    }),
    prisma.order.findMany({
      where: {
        ...organizationBranchFilter(organizationId, branchId),
        OR: [
          { orderNo: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { customer: { select: { name: true } } },
      take: perType,
    }),
    prisma.design.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, code: true, name: true },
      take: perType,
    }),
    prisma.motif.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        branch: { organizationId },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { subCategory: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, subCategory: true },
      take: perType,
    }),
    prisma.productionRun.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
        runNo: { contains: q, mode: "insensitive" },
      },
      select: { id: true, runNo: true, design: { select: { code: true } } },
      take: perType,
    }),
    prisma.workOrder.findMany({
      where: {
        ...organizationBranchFilter(organizationId, branchId),
        workOrderNo: { contains: q, mode: "insensitive" },
      },
      select: { id: true, workOrderNo: true, description: true },
      take: perType,
    }),
  ]);

  for (const p of products) {
    results.push({
      type: "product",
      id: p.id,
      label: p.name,
      sublabel: p.sku,
      href: `/inventory?search=${encodeURIComponent(p.sku)}`,
    });
  }
  for (const c of customers) {
    results.push({
      type: "customer",
      id: c.id,
      label: c.name,
      sublabel: c.mobile,
      href: `/customers?id=${c.id}`,
    });
  }
  for (const s of sales) {
    results.push({
      type: "sale",
      id: s.id,
      label: s.itemCode,
      sublabel: s.productName,
      href: `/sales`,
    });
  }
  for (const i of invoices) {
    results.push({
      type: "invoice",
      id: i.id,
      label: i.invoiceNo,
      sublabel: i.customerName,
      href: `/invoices`,
    });
  }
  for (const o of orders) {
    results.push({
      type: "order",
      id: o.id,
      label: o.orderNo,
      sublabel: o.customer.name,
      href: `/orders`,
    });
  }
  for (const d of designs) {
    results.push({
      type: "design",
      id: d.id,
      label: d.code,
      sublabel: d.name ?? undefined,
      href: `/designs?search=${encodeURIComponent(d.code)}`,
    });
  }
  for (const m of motifs) {
    results.push({
      type: "motif",
      id: m.id,
      label: m.name,
      sublabel: m.subCategory,
      href: `/motifs`,
    });
  }
  for (const r of productionRuns) {
    results.push({
      type: "productionRun",
      id: r.id,
      label: r.runNo,
      sublabel: r.design.code,
      href: `/production-runs/${r.id}`,
    });
  }
  for (const w of workOrders) {
    results.push({
      type: "workOrder",
      id: w.id,
      label: w.workOrderNo,
      sublabel: w.description ?? undefined,
      href: `/work-orders`,
    });
  }

  return results.slice(0, limit);
};
