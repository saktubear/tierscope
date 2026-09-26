import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getPlayer } from "@/lib/mc-player.functions";
import { ProfileView } from "@/components/player-profile";

const TITLE = "TierScope — Minecraft player & PvP tier lookup";
const DESCRIPTION =
  "Search any Minecraft username to see their skin, UUID, cape and PvP tiers from MCTiers, SubTiers and PvPTiers in one place.";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const SUGGESTIONS = ["ItzRealMe", "Swight", "Marlowww", "Technoblade"];

function Home() {
  const q = Route.useSearch().q ?? "";
  const navigate = useNavigate({ from: Route.fullPath });
  const [input, setInput] = useState(q);
  const lookup = useServerFn(getPlayer);

  useEffect(() => setInput(q), [q]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["player", q.toLowerCase()],
    enabled: q.trim().length > 0,
    staleTime: 60_000,
    retry: false,
    queryFn: () => lookup({ data: { name: q.trim() } }),
  });

  const submit = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    navigate({ search: { q: trimmed } });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          MCTiers · SubTiers · PvPTiers
        </span>
        <h1 className="text-glow font-mono text-4xl font-bold tracking-tight sm:text-5xl">TierScope</h1>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Type a Minecraft username to pull up their skin, account details and PvP tiers from every major tier list.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="mt-2 flex w-full max-w-md items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Username, e.g. ItzRealMe"
            spellCheck={false}
            autoComplete="off"
            aria-label="Minecraft username"
            className="h-11 flex-1 rounded-md border border-input bg-surface px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isFetching}
            className="h-11 rounded-md bg-primary px-5 font-mono text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isFetching ? "…" : "Search"}
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              className="rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {isFetching ? (
        <div className="panel animate-pulse p-6 text-center font-mono text-sm text-muted-foreground">
          Looking up {q}…
        </div>
      ) : null}

      {!isFetching && error ? (
        <div className="panel border-destructive/50 p-6 text-center font-mono text-sm text-destructive">
          Something went wrong with that lookup. Try again.
        </div>
      ) : null}

      {!isFetching && data && !data.ok ? (
        <div className="panel p-6 text-center font-mono text-sm text-muted-foreground">{data.error}</div>
      ) : null}

      {!isFetching && data && data.ok ? <ProfileView profile={data.profile} /> : null}

      <footer className="mt-auto pt-6 text-center font-mono text-[11px] text-muted-foreground">
        Tier data from mctiers.com, subtiers.net and pvptiers.com. Skins via Mojang and Visage.
      </footer>
    </main>
  );
}
