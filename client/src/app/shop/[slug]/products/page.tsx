import { Suspense } from "react";
import ProductsPageContent from "./ProductsPageContent";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-20 text-center text-zinc-500">Loading...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
