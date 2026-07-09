import CheckInClient from "./CheckInClient";

interface CheckInPageProps {
  params: Promise<{ token: string }>;
}

export default async function CheckInPage({ params }: CheckInPageProps) {
  const { token } = await params;
  return <CheckInClient token={token} />;
}
