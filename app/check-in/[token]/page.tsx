import { redirect } from "next/navigation";

interface CheckInPageProps {
  params: Promise<{ token: string }>;
}

export default async function CheckInPage({ params }: CheckInPageProps) {
  const { token } = await params;
  redirect(`/ticket/${token}`);
}
