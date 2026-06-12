import { Construction } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";

type ComingSoonProps = {
  title: string;
  description?: string;
};

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div>
      <PageHeader title={title} subtitle="This module is not available yet" />
      <div className="surface-card p-12 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <Construction size={24} className="text-zinc-400" />
        </div>
        <h2 className="text-base font-semibold text-zinc-900 mb-2">Coming Soon</h2>
        <p className="text-sm text-zinc-500">
          {description ??
            "We're building this feature. It will be available in a future update."}
        </p>
      </div>
    </div>
  );
}
