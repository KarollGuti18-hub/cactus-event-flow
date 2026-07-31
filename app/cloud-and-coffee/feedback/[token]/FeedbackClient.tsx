"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

import {
  FEEDBACK_RATINGS,
  feedbackHeadlineForRating,
  parseFeedbackRating,
  type FeedbackRating,
} from "@/lib/cloud-confessions/feedback";

interface FeedbackClientProps {
  token: string;
  initialRating?: string;
}

type PageStatus = "form" | "saving" | "done" | "error";

export default function FeedbackClient({
  token,
  initialRating,
}: FeedbackClientProps) {
  const parsedInitial = parseFeedbackRating(initialRating);
  const [rating, setRating] = useState<FeedbackRating | null>(parsedInitial);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<PageStatus>("form");
  const [errorMessage, setErrorMessage] = useState("");

  const headline = useMemo(() => {
    if (!rating) return "¿Cómo te fue en Cloud & Coffee?";
    return feedbackHeadlineForRating(rating);
  }, [rating]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) {
      setErrorMessage("Elige una carita para continuar.");
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    try {
      const response = await fetch("/api/cloud-and-coffee/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rating,
          comment: comment.trim(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus("form");
        setErrorMessage(data.error ?? "No pudimos guardar tu feedback.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("form");
      setErrorMessage("Error de red. Intenta de nuevo.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-cactus-bg text-white">
      <header className="border-b border-white/8 px-5 py-5 sm:px-8">
        <Image
          src="/logo-c4c7ops-white.png"
          alt="C4C7OPS"
          width={160}
          height={42}
          priority
          className="h-8 w-auto object-contain"
        />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        {status === "done" ? (
          <div className="rounded-3xl border border-white/8 bg-cactus-bg-card p-8 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cactus-green">
              Gracias
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Recibimos tu feedback
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              Cloud & Coffee · Coffee · Conversations · Cloud
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/8 bg-cactus-bg-card p-7 sm:p-8"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cactus-green">
              Cloud & Coffee
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">
              {headline}
            </h1>
            <p className="mt-3 text-sm text-white/50">
              {rating
                ? "¿Quieres contarnos algo más?"
                : "Elige una carita. Toma un segundo."}
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              {FEEDBACK_RATINGS.map((item) => {
                const selected = rating === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-label={item.label}
                    aria-pressed={selected}
                    onClick={() => setRating(item.value)}
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl transition sm:h-16 sm:w-16 sm:text-3xl ${
                      selected
                        ? "border-cactus-green bg-cactus-green/20"
                        : "border-white/10 bg-white/4 hover:border-cactus-green/40"
                    }`}
                  >
                    {item.emoji}
                  </button>
                );
              })}
            </div>

            {rating ? (
              <label className="mt-7 block">
                <span className="sr-only">Comentario</span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Creo que…"
                  className="w-full resize-y rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-cactus-green/50"
                />
              </label>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 text-sm text-red-300">{errorMessage}</p>
            ) : null}

            <button
              type="submit"
              disabled={!rating || status === "saving"}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-cactus-green px-5 py-3.5 text-sm font-bold text-white transition hover:bg-cactus-green-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "saving" ? "Enviando…" : "Enviar feedback"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
