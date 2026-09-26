import type { PlayerProfile, Ranking, SiteResult } from "@/lib/mc-player.functions";

export function tierLabel(tier: number, pos: number) {
  return `${pos === 0 ? "H" : "L"}T${tier}`;
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function TierPill({ ranking }: { ranking: Ranking }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${
        ranking.pos === 0
          ? "bg-primary/15 text-primary ring-1 ring-primary/40"
          : "bg-secondary text-muted-foreground ring-1 ring-border"
      }`}
    >
      {tierLabel(ranking.tier, ranking.pos)}
      {ranking.retired ? <span className="ml-1 opacity-60">R</span> : null}
    </span>
  );
}

function SiteCard({ site }: { site: SiteResult }) {
  return (
    <section className="panel flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h3 className="font-mono text-sm font-semibold tracking-wide uppercase">{site.label}</h3>
          {site.region ? (
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {site.region}
            </span>
          ) : null}
        </div>
        <a
          href={site.url}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          view
        </a>
      </header>

      {site.status === "ranked" ? (
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap gap-4 font-mono text-xs text-muted-foreground">
            {site.points !== null ? (
              <span>
                points <span className="text-foreground">{site.points}</span>
              </span>
            ) : null}
            {site.overall !== null ? (
              <span>
                overall <span className="text-foreground">#{site.overall}</span>
              </span>
            ) : null}
          </div>

          <ul className="flex flex-col divide-y divide-border">
            {site.rankings.map((r) => (
              <li key={r.kit} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{r.label}</p>
                  {r.attained ? (
                    <p className="font-mono text-[11px] text-muted-foreground">{formatDate(r.attained)}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {r.peakTier !== null && (r.peakTier !== r.tier || (r.peakPos ?? 0) !== r.pos) ? (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      peak {tierLabel(r.peakTier, r.peakPos ?? 0)}
                    </span>
                  ) : null}
                  <TierPill ranking={r} />
                </div>
              </li>
            ))}
          </ul>

          {site.badges.length > 0 ? (
            <div className="mt-auto flex flex-wrap gap-1.5 border-t border-border pt-3">
              {site.badges.slice(0, 6).map((b) => (
                <span
                  key={b.title}
                  title={b.desc}
                  className="rounded-full bg-accent/60 px-2 py-0.5 text-[11px] text-accent-foreground ring-1 ring-border"
                >
                  {b.title}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="font-mono text-xs text-muted-foreground">
            {site.status === "error" ? "Site unreachable right now" : "Not ranked"}
          </p>
        </div>
      )}
    </section>
  );
}

export function ProfileView({ profile }: { profile: PlayerProfile }) {
  const ranked = profile.sites.filter((s) => s.status === "ranked");
  const bestTier = ranked
    .flatMap((s) => s.rankings)
    .reduce<Ranking | null>((best, r) => (!best || r.tier < best.tier || (r.tier === best.tier && r.pos < best.pos) ? r : best), null);

  return (
    <div className="flex flex-col gap-6">
      <section className="panel flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="relative mx-auto shrink-0 sm:mx-0">
          <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-3xl" />
          <img
            src={profile.renders.full}
            alt={`${profile.name} skin`}
            width={160}
            height={320}
            loading="eager"
            className="pixelated h-[260px] w-auto drop-shadow-[0_18px_28px_rgba(0,0,0,0.6)]"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <h2 className="text-glow font-mono text-3xl font-bold tracking-tight sm:text-4xl">{profile.name}</h2>
            <p className="mt-1 font-mono text-xs break-all text-muted-foreground">{profile.dashedUuid}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Best tier" value={bestTier ? tierLabel(bestTier.tier, bestTier.pos) : "—"} />
            <Stat label="Ranked on" value={`${ranked.length}/${profile.sites.length}`} />
            <Stat label="Skin model" value={profile.slim ? "Slim" : "Classic"} />
            <Stat label="Cape" value={profile.capeUrl ? "Yes" : "None"} />
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            {profile.skinUrl ? (
              <a
                href={profile.skinUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Download skin
              </a>
            ) : null}
            {profile.links.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border bg-secondary px-3 py-1.5 font-mono text-xs text-secondary-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {profile.capeUrl ? (
          <img
            src={profile.capeUrl}
            alt="Cape texture"
            className="pixelated mx-auto h-24 w-auto rounded-md border border-border bg-surface-raised p-1 sm:mx-0"
          />
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {profile.sites.map((s) => (
          <SiteCard key={s.id} site={s} />
        ))}
      </div>

      <section className="panel p-5">
        <h3 className="font-mono text-sm font-semibold tracking-wide uppercase">Tier history</h3>
        {profile.timeline.length > 0 ? (
          <ol className="mt-4 flex flex-col border-l border-border pl-4">
            {profile.timeline.map((t, i) => (
              <li key={`${t.site}-${t.kit}-${i}`} className="relative py-2">
                <span className="absolute top-4 -left-[21px] h-2 w-2 rounded-full bg-primary ring-4 ring-background" />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-xs text-muted-foreground">{formatDate(t.attained)}</span>
                  <span className="text-sm">
                    {tierLabel(t.tier, t.pos)} <span className="text-muted-foreground">in</span> {t.label}
                  </span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {t.site}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 font-mono text-xs text-muted-foreground">No tier history recorded on any site.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2">
      <dt className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-semibold">{value}</dd>
    </div>
  );
}
