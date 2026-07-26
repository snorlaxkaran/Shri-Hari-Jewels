import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About · Jewellery ERP",
  description:
    "Learn about the Jewellery ERP and online store platform for Indian jewellery businesses.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
