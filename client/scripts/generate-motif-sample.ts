import * as XLSX from "xlsx";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MOTIF_EXCEL_HEADERS = [
  "Motif Metal",
  "Motif Name",
  "Desc",
  "Price",
  "Motif Weight",
  "Stone1",
  "Stone2",
  "Stone3",
  "Subcategory",
  "ImageFile",
];

const sampleRows = [
  ["Gold", "Crescent Moon", "Delicate crescent moon charm for pendants", 1250, 3.2, "Zircon", "", "", "Contemporary", "crescent-moon.jpg"],
  ["Silver", "Lotus Bloom", "Traditional lotus floral motif", 890, 2.8, "Pearl", "Enamel", "", "Traditional", "lotus-bloom.jpg"],
  ["Gold", "Peacock Feather", "Detailed peacock feather with enamel work", 2100, 4.5, "Enamel", "Zircon", "Glass", "Traditional", "peacock-feather.jpg"],
  ["Platinum", "Art Deco Line", "Minimal geometric art deco line motif", 3200, 2.1, "", "", "", "Contemporary", "art-deco-line.jpg"],
  ["Gold", "Temple Bell", "South Indian temple bell motif", 1850, 5.0, "", "", "", "Traditional", "temple-bell.jpg"],
  ["Silver", "Tribal Sun", "Bold tribal sun disc with black onyx", 760, 3.6, "Black Onyx", "", "", "Tribal", "tribal-sun.jpg"],
  ["Gold", "Bridal Paisley", "Ornate bridal paisley with pearl accents", 2450, 4.8, "Pearl", "Zircon", "Emerald", "Bridal", "bridal-paisley.jpg"],
  ["Gold", "Elephant Head", "Ganesha-inspired elephant head motif", 1980, 4.2, "Enamel", "Zircon", "", "Traditional", "elephant-head.jpg"],
  ["Silver", "Wave Curl", "Fluid contemporary wave curl", 680, 2.4, "Glass", "", "", "Contemporary", "wave-curl.jpg"],
  ["Gold", "Mango Mala", "Classic mango mala unit motif", 920, 3.0, "", "", "", "Traditional", "mango-mala.jpg"],
  ["Platinum", "Diamond Leaf", "Platinum leaf with emerald center", 4100, 2.9, "Emerald", "Zircon", "", "Contemporary", "diamond-leaf.jpg"],
  ["Gold", "Nazar Charm", "Evil eye protection charm", 1100, 2.6, "Glass", "Enamel", "", "Tribal", "nazar-charm.jpg"],
  ["Silver", "Floral Vine", "Interlocking floral vine segment", 840, 3.1, "Pearl", "", "", "Bridal", "floral-vine.jpg"],
  ["Gold", "Coin Disc", "Plain gold coin disc base", 750, 2.0, "", "", "", "Traditional", "coin-disc.jpg"],
  ["Gold", "Star Burst", "Radiating star burst with zircon tips", 1380, 3.4, "Zircon", "Zircon", "Zircon", "Contemporary", "star-burst.jpg"],
  ["Silver", "Fish Scale", "Overlapping fish scale texture tile", 620, 1.8, "", "", "", "Tribal", "fish-scale.jpg"],
  ["Gold", "Royal Crown", "Mini crown motif for rings", 1680, 3.7, "Pearl", "Zircon", "", "Bridal", "royal-crown.jpg"],
  ["Platinum", "Infinity Loop", "Polished infinity symbol link", 2900, 2.2, "", "", "", "Contemporary", "infinity-loop.jpg"],
  ["Gold", "Om Symbol", "Sacred Om symbol motif", 1420, 3.5, "Enamel", "", "", "Traditional", "om-symbol.jpg"],
  ["Silver", "Feather Quill", "Lightweight feather quill charm", 590, 2.3, "Black Onyx", "", "", "Contemporary", "feather-quill.jpg"],
  ["Gold", "Heart Locket", "Heart shaped locket front plate", 1760, 4.0, "Pearl", "Glass", "", "Bridal", "heart-locket.jpg"],
  ["Gold", "Snake Coil", "Serpent coil tribal band motif", 1540, 4.1, "Emerald", "Black Onyx", "", "Tribal", "snake-coil.jpg"],
  ["Silver", "Geometric Hex", "Hexagonal contemporary frame", 710, 2.5, "Zircon", "", "", "Contemporary", "geometric-hex.jpg"],
  ["Gold", "Jhumka Dome", "Classic jhumka dome cap piece", 1320, 3.8, "Pearl", "Enamel", "Zircon", "Traditional", "jhumka-dome.jpg"],
  ["Platinum", "Slim Bar", "Minimal platinum bar link", 2600, 1.9, "", "", "", "Contemporary", "slim-bar.jpg"],
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/samples");
mkdirSync(outDir, { recursive: true });

const sheetData = [MOTIF_EXCEL_HEADERS, ...sampleRows];
const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Motifs");

const outPath = join(outDir, "motif-import-sample.xlsx");
writeFileSync(outPath, XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
console.log(`Wrote ${outPath}`);
