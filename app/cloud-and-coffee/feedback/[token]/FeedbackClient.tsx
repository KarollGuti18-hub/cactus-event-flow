"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

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

type PageStatus = "form" | "saving_comment" | "done";
type RatingSaveStatus = "idle" | "saving" | "saved" | "error";

export default function FeedbackClient({
  token,
  initialRating,
}: FeedbackClientProps) {
  const parsedInitial = parseFeedbackRating(initialRating);
  const [rating, setRating] = useState<FeedbackRating | null>(parsedInitial);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<PageStatus>("form");
  const [ratingSave, setRatingSave] = useState<RatingSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const commentRef = useRef(comment);
  commentRef.current = comment;

  const headline = useMemo(() => {
    if (!rating) return "¿Cómo te fue en Cloud & Coffee?";
    return feedbackHeadlineForRating(rating);
  }, [rating]);

  async function saveFeedback(input: {
    nextRating: FeedbackRating;
    nextComment: string;
    source: string;
  }): Promise<boolean> {
    const response = await fetch("/api/cloud-and-coffee/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        rating: input.nextRating,
        comment: input.nextComment,
        source: input.source,
      }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(data.error ?? "No pudimos guardar tu feedback.");
    }
    return true;
  }

  useEffect(() => {
    if (!parsedInitial) return;

    let cancelled = false;
    setRatingSave("saving");
    setErrorMessage("");

    void saveFeedback({
      nextRating: parsedInitial,
      nextComment: "",
      source: "email_click",
    })
      .then(() => {
        if (!cancelled) setRatingSave("saved");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRatingSave("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No pudimos guardar tu calificación.",
        );
      });

    return () => {
      cancelled = true;
    };
    // Solo al montar con rating del correo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedInitial, token]);

  async function handleSelectRating(next: FeedbackRating) {
    setRating(next);
    setRatingSave("saving");
    setErrorMessage("");
    try {
      await saveFeedback({
        nextRating: next,
        nextComment: commentRef.current.trim(),
        source: "page",
      });
      setRatingSave("saved");
    } catch (error) {
      setRatingSave("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos guardar tu calificación.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) {
      setErrorMessage("Elige una carita para continuar.");
      return;
    }

    const trimmed = comment.trim();
    if (!trimmed) {
      setStatus("done");
      return;
    }

    setStatus("saving_comment");
    setErrorMessage("");

    try {
      await saveFeedback({
        nextRating: rating,
        nextComment: trimmed,
        source: "page",
      });
      setStatus("done");
    } catch (error) {
      setStatus("form");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos guardar tu comentario.",
      );
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
                ? "¿Quieres contarnos algo más? Es opcional."
                : "Elige una carita. Se guarda al instante."}
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
                    onClick={() => {
                      void handleSelectRating(item.value);
                    }}
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

            {rating && ratingSave === "saved" ? (
              <p className="mt-4 text-center text-xs text-cactus-green">
                Calificación guardada
              </p>
            ) : null}
            {rating && ratingSave === "saving" ? (
              <p className="mt-4 text-center text-xs text-white/40">
                Guardando…
              </p>
            ) : null}

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

            {rating ? (
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={status === "saving_comment"}
                  className="inline-flex w-full items-center justify-center rounded-full bg-cactus-green px-5 py-3.5 text-sm font-bold text-white transition hover:bg-cactus-green-light disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {status === "saving_comment"
                    ? "Enviando…"
                    : comment.trim()
                      ? "Enviar comentario"
                      : "Listo"}
                </button>
              </div>
            ) : null}
          </form>
        )}
      </main>
    </div>
  );
}
