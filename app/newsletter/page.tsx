import type { Metadata } from "next";

import NewsletterClient from "./NewsletterClient";

export const metadata: Metadata = {
  title: "Newsletter · C4C7OPS",
  description: "Suscríbete a próximas invitaciones de C4c7Ops.",
};

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; firstname?: string }>;
}) {
  const query = await searchParams;
  return (
    <NewsletterClient
      initialEmail={query.email ?? ""}
      initialName={query.firstname ?? ""}
    />
  );
}
