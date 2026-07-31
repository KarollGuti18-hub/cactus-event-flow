import type { Metadata } from "next";

import FeedbackClient from "./FeedbackClient";

export const metadata: Metadata = {
  title: "Feedback · Cloud & Coffee | C4C7OPS",
  description: "Cuéntanos cómo te fue en Cloud & Coffee.",
};

export default async function CloudCoffeeFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ rating?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  return <FeedbackClient token={token} initialRating={query.rating} />;
}
