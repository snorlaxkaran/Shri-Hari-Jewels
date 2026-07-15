import Link from "next/link";

export default function ShopNotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f7] px-4 text-center">
      <div className="max-w-md">
        <p className="text-4xl mb-6">🔍</p>
        <h1 className="text-2xl font-light text-zinc-800">Store Not Found</h1>
        <p className="mt-4 text-zinc-600">
          This jewellery store does not exist or is no longer available.
        </p>
        <Link href="/login" className="mt-8 inline-block text-sm text-zinc-500 underline">
          Go to ERP login
        </Link>
      </div>
    </div>
  );
}
