/**
 * Diagnose and optionally release stuck Reserved units.
 *
 * Usage:
 *   npx tsx scripts/diagnose-reserved-units.ts RG-26-0001-001 D1-001
 *   npx tsx scripts/diagnose-reserved-units.ts --release RG-26-0001-001 D1-001
 */
import { prisma } from "../src/lib/db.js";
import { releaseStuckReservations } from "../src/lib/sales/release-orphaned-reservations.js";
import { getPendingSaleTimeoutMs } from "../src/lib/sales/expire-reservations.js";

const args = process.argv.slice(2);
const release = args.includes("--release");
const codes = args.filter((a) => !a.startsWith("--"));

const diagnose = async (itemCodes: string[]) => {
  const timeoutMin = Math.round(getPendingSaleTimeoutMs() / 60_000);
  console.log(`Pending UPI timeout: ${timeoutMin} minutes\n`);

  const units = await prisma.inventoryUnit.findMany({
    where: itemCodes.length ? { itemCode: { in: itemCodes } } : { status: "Reserved" },
    include: {
      sale: true,
      product: { select: { name: true, sku: true } },
    },
    orderBy: { itemCode: "asc" },
    take: itemCodes.length ? undefined : 50,
  });

  if (units.length === 0) {
    console.log("No matching units found.");
    return;
  }

  for (const u of units) {
    const sale = u.sale;
    const ageMin = sale
      ? Math.round((Date.now() - sale.soldAt.getTime()) / 60_000)
      : null;

    const webItems = await prisma.webOrderItem.findMany({
      select: { reservedUnitIds: true, webOrder: { select: { orderNo: true, status: true } } },
    });
    const webOrders = webItems.filter((item) => {
      if (!Array.isArray(item.reservedUnitIds)) return false;
      return (item.reservedUnitIds as string[]).includes(u.id);
    });

    console.log("---");
    console.log(`Item: ${u.itemCode} (${u.product.name})`);
    console.log(`Status: ${u.status}`);
    console.log(`Staff hold: ${u.heldForCustomerName ?? "—"}`);
    if (sale) {
      console.log(
        `Sale: ${sale.paymentMode} / ${sale.paymentStatus} / customer ${sale.customerName}`,
      );
      console.log(`Sale age: ${ageMin} min (auto-release after ${timeoutMin} min)`);
    } else {
      console.log("Sale: none (orphaned reservation — should be releasable)");
    }
    if (webOrders.length > 0) {
      for (const w of webOrders) {
        const order = await prisma.webOrder.findFirst({
          where: { orderNo: w.webOrder.orderNo },
          select: {
            orderNo: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
            customerName: true,
          },
        });
        if (order) {
          const orderAgeMin = Math.round(
            (Date.now() - order.createdAt.getTime()) / 60_000,
          );
          console.log(
            `Web order: ${order.orderNo} · ${order.status} · ${order.paymentStatus} · ${order.customerName} · ${orderAgeMin} min ago`,
          );
        }
      }
    }
  }
};

const main = async () => {
  await diagnose(codes.length ? codes : []);

  if (release) {
    console.log("\n=== Releasing stuck reservations ===");
    const result = await releaseStuckReservations();
    console.log(JSON.stringify(result, null, 2));
    if (codes.length) {
      console.log("\nAfter release:");
      await diagnose(codes);
    }
  } else if (codes.length) {
    console.log("\nTo free these items:");
    console.log("- Web order hold: cancel the order under Storefront → Orders");
    console.log("- UPI hold: wait 15 min or cancel from Sales");
    console.log("- Staff hold: Inventory → ⋮ → Release hold");
    console.log("\nRun with --release to auto-release eligible stuck units.");
  }
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
