import type { Metadata } from "next";

import { cloudConfessionsConfig } from "@/lib/cloud-confessions/config";

export const metadata: Metadata = {
  title: `${cloudConfessionsConfig.name} | Cactus`,
  description: cloudConfessionsConfig.description,
};

export default function CloudConfessionsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
