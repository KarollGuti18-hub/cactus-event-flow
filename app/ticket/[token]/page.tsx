import TicketClient from "./TicketClient";

interface TicketPageProps {
  params: Promise<{ token: string }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { token } = await params;
  return <TicketClient token={token} />;
}
