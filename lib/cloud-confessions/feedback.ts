export const FEEDBACK_RATINGS = [
  { value: 5, emoji: "🤩", label: "Excelente" },
  { value: 4, emoji: "🙂", label: "Bien" },
  { value: 3, emoji: "😐", label: "Regular" },
  { value: 2, emoji: "😔", label: "Mal" },
  { value: 1, emoji: "😡", label: "Muy mal" },
] as const;

export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number]["value"];

export function parseFeedbackRating(value: unknown): FeedbackRating | null {
  const n = typeof value === "number" ? value : Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return null;
}

export function feedbackHeadlineForRating(rating: FeedbackRating): string {
  if (rating >= 4) return "Nos alegra que te haya gustado Cloud & Coffee.";
  if (rating === 3) return "Gracias por tu feedback sobre Cloud & Coffee.";
  return "Lamentamos que Cloud & Coffee no haya sido lo que esperabas.";
}
