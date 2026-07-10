type PageHeaderProps = {
  title: string;
  subtitle?: string;
  resourceCount?: string | number;
  action?: React.ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  resourceCount,
  action,
}: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h1 className="page-title">{title}</h1>
          {(subtitle || resourceCount !== undefined) && (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              {resourceCount !== undefined && (
                <span
                  style={{
                    marginRight: 10,
                    color: "var(--text-secondary)",
                  }}
                >
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
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {action}
        </div>
      </div>
    </div>
  );
}
