import CloudConfessionsTicketClient from "./TicketClient";

interface CloudConfessionsTicketPageProps {
  params: Promise<{ token: string }>;
}

export default async function CloudConfessionsTicketPage({
  params,
}: CloudConfessionsTicketPageProps) {
  const { token } = await params;
  return <CloudConfessionsTicketClient token={token} />;
}
