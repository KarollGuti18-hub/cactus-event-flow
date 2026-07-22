import { redirect } from "next/navigation";

interface CloudConfessionsCheckInPageProps {
  params: Promise<{ token: string }>;
}

export default async function CloudConfessionsCheckInPage({
  params,
}: CloudConfessionsCheckInPageProps) {
  const { token } = await params;
  redirect(`/cloud-and-coffee/ticket/${token}`);
}
