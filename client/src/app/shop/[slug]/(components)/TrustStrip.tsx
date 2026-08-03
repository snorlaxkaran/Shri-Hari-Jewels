export default function TrustStrip() {
  const items = [
    "BIS Hallmarked gold",
    "Certified diamonds",
    "Free insured shipping",
    "Lifetime exchange",
  ];

  return (
    <div className="sf-trust-strip">
      <div className="sf-shell sf-trust-strip-inner">
        {items.map((item, index) => (
          <span key={item} className="sf-trust-item">
            {index > 0 && <span className="sf-trust-dot" aria-hidden />}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
