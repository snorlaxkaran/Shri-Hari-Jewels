import { Suspense } from "react";
import ProductsPageContent from "./ProductsPageContent";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="sf-empty"><p className="sf-empty-desc">Loading catalogue…</p></div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
