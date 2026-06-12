type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5 text-zinc-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
