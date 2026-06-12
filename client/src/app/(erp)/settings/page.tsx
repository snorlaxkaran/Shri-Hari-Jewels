"use client";

import PageHeader from "@/app/(components)/PageHeader";

export default function SettingsPage() {
  const sections = [
    {
      title: "Store Information",
      fields: [
        { label: "Store Name", value: "Shree Hari Jewels", type: "text" },
        { label: "GST Number", value: "27AABCS1234F1Z5", type: "text" },
        { label: "Address", value: "MG Road, Mumbai, Maharashtra", type: "text" },
        { label: "Phone", value: "+91 22 1234 5678", type: "tel" },
      ],
    },
    {
      title: "Business Settings",
      fields: [
        { label: "Default Purity", value: "22K", type: "select" },
        { label: "GST Rate (%)", value: "3", type: "number" },
        { label: "Low Stock Alert", value: "5", type: "number" },
        { label: "Currency", value: "INR (₹)", type: "text" },
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your store configuration"
      />

      <div className="space-y-6 max-w-2xl">
        {sections.map((section) => (
          <div key={section.title} className="surface-card p-5">
            <h2 className="text-sm font-semibold mb-4 text-zinc-900">
              {section.title}
            </h2>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.label}>
                  <label className="text-xs block mb-1 text-zinc-500 font-medium">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    defaultValue={field.value}
                    className="input-field w-full px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button className="btn-primary px-6 py-2.5 text-sm">
          Save Changes
        </button>
      </div>
    </div>
  );
}
