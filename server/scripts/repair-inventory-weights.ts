import "dotenv/config";
import { repairCompletedRunInventorySkus } from "../src/lib/production-runs/run-completion.js";

const repaired = await repairCompletedRunInventorySkus();
console.log(
  repaired > 0
    ? `Repaired ${repaired} inventory product(s) (SKU and/or weight).`
    : "All production-run inventory products already have correct SKU and weight.",
);
