import type { ReactNode } from "react";

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: 1 | 2;
};

/** ERPNext-style form section with titled break */
export default function FormSection({
  title,
  description,
  children,
  columns = 1,
}: FormSectionProps) {
  return (
    <section className="form-section-block">
      <div className="form-section-head">
        <h2 className="form-section-title">{title}</h2>
        {description ? <p className="form-section-desc">{description}</p> : null}
      </div>
      <div
        className="form-section-body"
        data-columns={columns > 1 ? "2" : "1"}
      >
        {children}
      </div>
    </section>
  );
}
