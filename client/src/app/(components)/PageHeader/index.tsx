type PageHeaderProps = {
  title: string;
  subtitle?: string;
  resourceCount?: string | number;
  action?: React.ReactNode;
  toolbar?: React.ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  resourceCount,
  action,
  toolbar,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-row">
        <div className="page-header-main">
          <h1 className="page-title">{title}</h1>
          {(subtitle || resourceCount !== undefined) && (
            <p className="page-header-meta">
              {resourceCount !== undefined && (
                <span className="page-header-count">
                  {typeof resourceCount === "number"
                    ? resourceCount.toLocaleString()
                    : resourceCount}{" "}
                  resources
                </span>
              )}
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="page-header-actions">{action}</div>}
      </div>
      {toolbar}
    </header>
  );
}
