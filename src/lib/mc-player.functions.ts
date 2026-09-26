import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Ranking = {
  kit: string;
  label: string;
  tier: number;
  pos: number;
  peakTier: number | null;
  peakPos: number | null;
  attained: number | null;
  retired: boolean;
};

export type Badge = { title: string; desc: string };

export type SiteResult = {
  id: string;
  label: string;
  url: string;
  status: "ranked" | "unranked" | "error";
  region: string | null;
  points: number | null;
  overall: number | null;
  rankings: Ranking[];
  badges: Badge[];
};

export type PlayerProfile = {
  uuid: string;
  dashedUuid: string;
  name: string;
  skinUrl: string | null;
  capeUrl: string | null;
  slim: boolean;
  renders: { full: string; bust: string; head: string; skin: string };
  sites: SiteResult[];
  timeline: { site: string; kit: string; label: string; tier: number; pos: number; attained: number }[];
  links: { label: string; url: string }[];
};

const KIT_LABELS: Record<string, string> = {
  vanilla: "Vanilla",
  sword: "Sword",
  axe: "Axe",
  pot: "Pot",
  neth_pot: "Neth Pot",
  nethop: "Neth Pot",
  nethpot: "Neth Pot",
  uhc: "UHC",
  smp: "SMP",
  mace: "Mace",
  crystal: "Crystal",
  diamond_smp: "Diamond SMP",
  elytra: "Elytra",
  minecart: "Minecart",
  manhunt: "Manhunt",
  bedwars: "Bed Wars",
  speedbridge: "Speed Bridge",
  og_vanilla: "OG Vanilla",
  creeper: "Creeper",
  trident: "Trident",
  bow: "Bow",
  cart: "Cart",
  dia_smp: "Diamond SMP",
};

function prettyKit(kit: string) {
  return (
    KIT_LABELS[kit] ??
    kit
      .split(/[_-]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ")
  );
}

function dashUuid(raw: string) {
  const u = raw.replace(/-/g, "");
  return `${u.slice(0, 8)}-${u.slice(8, 12)}-${u.slice(12, 16)}-${u.slice(16, 20)}-${u.slice(20)}`;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "mc-player-lookup" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function resolveProfile(name: string): Promise<{ uuid: string; name: string } | null> {
  const mojang = (await fetchJson(
    `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`,
  )) as { id?: string; name?: string } | null;
  if (mojang?.id && mojang.name) return { uuid: mojang.id.replace(/-/g, ""), name: mojang.name };

  const playerdb = (await fetchJson(
    `https://playerdb.co/api/player/minecraft/${encodeURIComponent(name)}`,
  )) as { data?: { player?: { id?: string; username?: string } } } | null;
  const p = playerdb?.data?.player;
  if (p?.id && p.username) return { uuid: p.id.replace(/-/g, ""), name: p.username };

  return null;
}

async function fetchTextures(uuid: string): Promise<{ skinUrl: string | null; capeUrl: string | null; slim: boolean }> {
  const session = (await fetchJson(
    `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`,
  )) as { properties?: { name: string; value: string }[] } | null;
  const prop = session?.properties?.find((x) => x.name === "textures");
  if (!prop) return { skinUrl: null, capeUrl: null, slim: false };
  try {
    const decoded = JSON.parse(atob(prop.value)) as {
      textures?: {
        SKIN?: { url?: string; metadata?: { model?: string } };
        CAPE?: { url?: string };
      };
    };
    return {
      skinUrl: decoded.textures?.SKIN?.url ?? null,
      capeUrl: decoded.textures?.CAPE?.url ?? null,
      slim: decoded.textures?.SKIN?.metadata?.model === "slim",
    };
  } catch {
    return { skinUrl: null, capeUrl: null, slim: false };
  }
}

type RawSiteProfile = {
  name?: string;
  region?: string | null;
  points?: number | null;
  overall?: number | null;
  rankings?: Record<
    string,
    {
      tier?: number;
      pos?: number;
      peak_tier?: number | null;
      peak_pos?: number | null;
      attained?: number | null;
      retired?: boolean;
    }
  > | null;
  badges?: { title?: string; desc?: string }[] | null;
};

const SITES = [
  { id: "mctiers", label: "MCTiers", api: "https://mctiers.com/api/profile/", web: "https://mctiers.com/profile/" },
  { id: "subtiers", label: "SubTiers", api: "https://subtiers.net/api/profile/", web: "https://subtiers.net/profile/" },
  { id: "pvptiers", label: "PvPTiers", api: "https://pvptiers.com/api/profile/", web: "https://pvptiers.com/profile/" },
] as const;

async function fetchSite(site: (typeof SITES)[number], uuid: string): Promise<SiteResult> {
  const base: SiteResult = {
    id: site.id,
    label: site.label,
    url: `${site.web}${uuid}`,
    status: "unranked",
    region: null,
    points: null,
    overall: null,
    rankings: [],
    badges: [],
  };

  let raw: RawSiteProfile | null = null;
  try {
    const res = await fetch(`${site.api}${uuid}`, {
      headers: { accept: "application/json", "user-agent": "mc-player-lookup" },
      signal: AbortSignal.timeout(9000),
    });
    if (res.status === 404) return base;
    if (!res.ok) return { ...base, status: "error" };
    raw = (await res.json()) as RawSiteProfile;
  } catch {
    return { ...base, status: "error" };
  }

  const rankings: Ranking[] = Object.entries(raw?.rankings ?? {})
    .filter(([, v]) => typeof v?.tier === "number")
    .map(([kit, v]) => ({
      kit,
      label: prettyKit(kit),
      tier: v.tier as number,
      pos: v.pos ?? 0,
      peakTier: v.peak_tier ?? null,
      peakPos: v.peak_pos ?? null,
      attained: v.attained ?? null,
      retired: Boolean(v.retired),
    }))
    .sort((a, b) => a.tier - b.tier || a.pos - b.pos || a.label.localeCompare(b.label));

  return {
    ...base,
    status: rankings.length > 0 ? "ranked" : "unranked",
    region: raw?.region ?? null,
    points: typeof raw?.points === "number" ? raw.points : null,
    overall: typeof raw?.overall === "number" ? raw.overall : null,
    rankings,
    badges: (raw?.badges ?? [])
      .filter((b): b is Badge => Boolean(b?.title))
      .map((b) => ({ title: b.title, desc: b.desc ?? "" })),
  };
}

export const getPlayer = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z
          .string()
          .trim()
          .min(1, "Enter a username")
          .max(36, "That name is too long")
          .regex(/^[a-zA-Z0-9_.-]+$/, "Usernames only use letters, numbers and underscores"),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true; profile: PlayerProfile } | { ok: false; error: string }> => {
    const resolved = await resolveProfile(data.name);
    if (!resolved) {
      return { ok: false, error: `No Minecraft account found for "${data.name}".` };
    }

    const [textures, ...sites] = await Promise.all([
      fetchTextures(resolved.uuid),
      ...SITES.map((s) => fetchSite(s, resolved.uuid)),
    ]);

    const timeline = sites
      .flatMap((s) =>
        s.rankings
          .filter((r) => typeof r.attained === "number" && r.attained! > 0)
          .map((r) => ({
            site: s.label,
            kit: r.kit,
            label: r.label,
            tier: r.tier,
            pos: r.pos,
            attained: r.attained as number,
          })),
      )
      .sort((a, b) => b.attained - a.attained);

    return {
      ok: true,
      profile: {
        uuid: resolved.uuid,
        dashedUuid: dashUuid(resolved.uuid),
        name: resolved.name,
        skinUrl: textures.skinUrl,
        capeUrl: textures.capeUrl,
        slim: textures.slim,
        renders: {
          full: `https://visage.surgeplay.com/full/512/${resolved.uuid}`,
          bust: `https://visage.surgeplay.com/bust/256/${resolved.uuid}`,
          head: `https://visage.surgeplay.com/head/128/${resolved.uuid}`,
          skin: `https://visage.surgeplay.com/skin/${resolved.uuid}`,
        },
        sites,
        timeline,
        links: [
          { label: "NameMC", url: `https://namemc.com/profile/${resolved.uuid}` },
          { label: "Laby.net", url: `https://laby.net/@${resolved.name}` },
          { label: "Crafty", url: `https://crafty.gg/players/${resolved.uuid}` },
        ],
      },
    };
  });
