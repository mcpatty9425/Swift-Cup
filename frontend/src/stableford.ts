// Stableford maths + playing handicap + countback. Pure functions (used offline).
import type { Player } from "./api";

export type CourseHole = { par: number; si: number };
export type Course = { round: 2 | 3; name: string; par: number; rating: number; slope: number; holes: CourseHole[] };
export type ScoreSettings = { method: "AS_ENTERED" | "COURSE"; allowance: number };
export type Override = { round: number; player_id: string; ph: number };
export type HoleEntry = { g: number | null; pu: boolean; t: number };
export type Holes = Record<string, HoleEntry>;

/** Handicap text -> index. "+2" means plus handicap (-2). Empty -> null. */
export function parseIndex(h: string | undefined | null): number | null {
  if (!h) return null;
  const s = String(h).trim();
  if (!s) return null;
  const plus = s.startsWith("+");
  const v = parseFloat(s.replace("+", ""));
  if (Number.isNaN(v)) return null;
  return plus ? -v : v;
}

export function calcPlayingHandicap(index: number | null, course: Course, settings: ScoreSettings): number {
  if (index === null) return 0;
  const base = settings.method === "COURSE" ? (index * course.slope) / 113 + (course.rating - course.par) : index;
  return Math.round((base * settings.allowance) / 100);
}

export function playingHandicap(
  player: Player,
  course: Course,
  settings: ScoreSettings,
  overrides: Override[],
): { ph: number; overridden: boolean; calculated: number } {
  const calculated = calcPlayingHandicap(parseIndex(player.handicap), course, settings);
  const o = overrides.find((x) => x.player_id === player.id && x.round === course.round);
  return o ? { ph: o.ph, overridden: true, calculated } : { ph: calculated, overridden: false, calculated };
}

/** Strokes received on a hole. Plus handicaps give strokes back from the easiest holes. */
export function strokesOn(ph: number, si: number): number {
  if (ph >= 0) return Math.floor(ph / 18) + (si <= ph % 18 ? 1 : 0);
  const p = -ph;
  return -(Math.floor(p / 18) + (si > 18 - (p % 18) ? 1 : 0)) || 0;
}

export function holePoints(e: HoleEntry | undefined, hole: CourseHole, ph: number): number | null {
  if (!e) return null;
  if (e.pu) return 0;
  if (e.g == null) return null;
  const net = e.g - strokesOn(ph, hole.si);
  return Math.max(0, 2 + hole.par - net);
}

export function isPlayed(e: HoleEntry | undefined): boolean {
  return !!e && (e.pu || e.g != null);
}

export type CardTotals = {
  points: number;
  completed: number;
  gross: number;
  perHole: (number | null)[];
  back9: number;
  last6: number;
  last3: number;
  last1: number;
};

export function cardTotals(holes: Holes | undefined, course: Course, ph: number): CardTotals {
  const perHole = course.holes.map((h, i) => holePoints(holes?.[String(i + 1)], h, ph));
  const sum = (from: number) => perHole.slice(from).reduce<number>((a, b) => a + (b ?? 0), 0);
  let gross = 0;
  course.holes.forEach((_, i) => {
    const e = holes?.[String(i + 1)];
    if (e && !e.pu && e.g != null) gross += e.g;
  });
  return {
    points: sum(0),
    completed: course.holes.filter((_, i) => isPlayed(holes?.[String(i + 1)])).length,
    gross,
    perHole,
    back9: sum(9),
    last6: sum(12),
    last3: sum(15),
    last1: sum(17),
  };
}

/** Positive when a ranks better than b (higher points, then countback). */
export function compareBetter(
  a: { total: number; cb: number[] },
  b: { total: number; cb: number[] },
): number {
  if (a.total !== b.total) return a.total - b.total;
  for (let i = 0; i < a.cb.length; i++) if (a.cb[i] !== b.cb[i]) return a.cb[i] - b.cb[i];
  return 0;
}
