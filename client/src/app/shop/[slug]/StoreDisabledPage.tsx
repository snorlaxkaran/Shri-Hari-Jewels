import Link from "next/link";

export default function StoreDisabledPage({
  businessName,
  slug,
}: {
  businessName: string;
  slug: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f7] px-4 text-center">
      <div className="max-w-md">
        <p className="text-4xl mb-6">💎</p>
        <h1 className="text-2xl font-light text-zinc-800">{businessName}</h1>
        <p className="mt-4 text-zinc-600 leading-relaxed">
          Our online store is being set up and will be available soon.
          Please check back later or visit us in person.
        </p>
        <p className="mt-8 text-xs text-zinc-400 font-mono">/{slug}</p>
      </div>
    </div>
  );
}
