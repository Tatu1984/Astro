/**
 * Ashtakoot Milan — eight-koota Vedic compatibility scoring.
 *
 * Total max = 36 (Varna 1 + Vasya 2 + Tara 3 + Yoni 4 + Graha Maitri 5 +
 * Gana 6 + Bhakoot 7 + Nadi 8). 18+ generally acceptable for marriage,
 * 24+ excellent, 28+ outstanding.
 *
 * Static tables here are the standard ones used in most Vedic software.
 * Inputs: each partner's natal Moon nakshatra index (0..26) and rasi
 * sign index (0..11). All other inputs derive from those.
 */

// ---- Static data ----------------------------------------------------

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

type Varna = "Brahmin" | "Kshatriya" | "Vaishya" | "Shudra";
const VARNA_RANK: Record<Varna, number> = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };

// Sign index 0..11 → varna
const SIGN_VARNA: Varna[] = [
  "Kshatriya", "Vaishya", "Shudra", "Brahmin",
  "Kshatriya", "Vaishya", "Shudra", "Brahmin",
  "Kshatriya", "Vaishya", "Shudra", "Brahmin",
];

type Planet = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";
const SIGN_LORD: Planet[] = [
  "Mars",    // Aries
  "Venus",   // Taurus
  "Mercury", // Gemini
  "Moon",    // Cancer
  "Sun",     // Leo
  "Mercury", // Virgo
  "Venus",   // Libra
  "Mars",    // Scorpio
  "Jupiter", // Sagittarius
  "Saturn",  // Capricorn
  "Saturn",  // Aquarius
  "Jupiter", // Pisces
];

// Vasya groups: each signs's "controllable" / vasya set. From traditional tables.
const VASYA: number[][] = [
  /* Aries  */ [4, 7], // Leo, Scorpio
  /* Taurus */ [3, 6], // Cancer, Libra
  /* Gemini */ [5],    // Virgo
  /* Cancer */ [7, 8], // Scorpio, Sagittarius
  /* Leo    */ [9],    // Capricorn
  /* Virgo  */ [11, 2],// Pisces, Gemini
  /* Libra  */ [9, 5], // Capricorn, Virgo
  /* Scorpio*/ [3],    // Cancer
  /* Sagit  */ [11],   // Pisces
  /* Capri  */ [0],    // Aries
  /* Aquar  */ [0],    // Aries
  /* Pisces */ [9],    // Capricorn
];

// 27 nakshatras with yoni animal, gana, nadi.
type Yoni =
  | "Horse" | "Elephant" | "Sheep" | "Snake" | "Dog" | "Cat" | "Rat" | "Cow"
  | "Buffalo" | "Tiger" | "Hare" | "Monkey" | "Mongoose" | "Lion";
type Gana = "Deva" | "Manushya" | "Rakshasa";
type Nadi = "Adi" | "Madhya" | "Antya";

interface NakshatraInfo {
  yoni: Yoni;
  yoniGenderMale: boolean;
  gana: Gana;
  nadi: Nadi;
}

// Indexed 0..26
const NAK: NakshatraInfo[] = [
  { yoni: "Horse",    yoniGenderMale: true,  gana: "Deva",     nadi: "Adi"    }, // Ashwini
  { yoni: "Elephant", yoniGenderMale: true,  gana: "Manushya", nadi: "Madhya" }, // Bharani
  { yoni: "Sheep",    yoniGenderMale: false, gana: "Rakshasa", nadi: "Antya"  }, // Krittika
  { yoni: "Snake",    yoniGenderMale: true,  gana: "Manushya", nadi: "Antya"  }, // Rohini
  { yoni: "Snake",    yoniGenderMale: false, gana: "Deva",     nadi: "Madhya" }, // Mrigashira
  { yoni: "Dog",      yoniGenderMale: false, gana: "Manushya", nadi: "Adi"    }, // Ardra
  { yoni: "Cat",      yoniGenderMale: false, gana: "Deva",     nadi: "Adi"    }, // Punarvasu
  { yoni: "Sheep",    yoniGenderMale: true,  gana: "Deva",     nadi: "Madhya" }, // Pushya
  { yoni: "Cat",      yoniGenderMale: true,  gana: "Rakshasa", nadi: "Antya"  }, // Ashlesha
  { yoni: "Rat",      yoniGenderMale: true,  gana: "Rakshasa", nadi: "Antya"  }, // Magha
  { yoni: "Rat",      yoniGenderMale: false, gana: "Manushya", nadi: "Madhya" }, // Purva Phalguni
  { yoni: "Cow",      yoniGenderMale: true,  gana: "Manushya", nadi: "Adi"    }, // Uttara Phalguni
  { yoni: "Buffalo",  yoniGenderMale: true,  gana: "Deva",     nadi: "Adi"    }, // Hasta
  { yoni: "Tiger",    yoniGenderMale: false, gana: "Rakshasa", nadi: "Madhya" }, // Chitra
  { yoni: "Buffalo",  yoniGenderMale: false, gana: "Deva",     nadi: "Antya"  }, // Swati
  { yoni: "Tiger",    yoniGenderMale: true,  gana: "Rakshasa", nadi: "Antya"  }, // Vishakha
  { yoni: "Hare",     yoniGenderMale: false, gana: "Deva",     nadi: "Madhya" }, // Anuradha
  { yoni: "Hare",     yoniGenderMale: true,  gana: "Rakshasa", nadi: "Adi"    }, // Jyeshtha
  { yoni: "Dog",      yoniGenderMale: true,  gana: "Rakshasa", nadi: "Adi"    }, // Mula
  { yoni: "Monkey",   yoniGenderMale: true,  gana: "Manushya", nadi: "Madhya" }, // Purva Ashadha
  { yoni: "Mongoose", yoniGenderMale: false, gana: "Manushya", nadi: "Antya"  }, // Uttara Ashadha
  { yoni: "Monkey",   yoniGenderMale: false, gana: "Deva",     nadi: "Antya"  }, // Shravana
  { yoni: "Lion",     yoniGenderMale: false, gana: "Rakshasa", nadi: "Madhya" }, // Dhanishta
  { yoni: "Horse",    yoniGenderMale: false, gana: "Rakshasa", nadi: "Adi"    }, // Shatabhisha
  { yoni: "Lion",     yoniGenderMale: true,  gana: "Manushya", nadi: "Adi"    }, // Purva Bhadrapada
  { yoni: "Cow",      yoniGenderMale: false, gana: "Manushya", nadi: "Madhya" }, // Uttara Bhadrapada
  { yoni: "Elephant", yoniGenderMale: false, gana: "Deva",     nadi: "Antya"  }, // Revati
];

// Yoni compatibility — score from 0 (bitter enemy) to 4 (same yoni).
// Bitter-enemy pairs (score 0): standard list.
const YONI_BITTER_ENEMIES: Array<[Yoni, Yoni]> = [
  ["Cat", "Rat"],
  ["Dog", "Hare"],
  ["Snake", "Mongoose"],
  ["Lion", "Elephant"],
  ["Horse", "Buffalo"],
  ["Cow", "Tiger"],
  ["Sheep", "Monkey"],
];

function isBitterEnemy(a: Yoni, b: Yoni): boolean {
  return YONI_BITTER_ENEMIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

// Friendship table for the 7 grahas. Standard "naisargika" friendships.
// 'F' = friend, 'N' = neutral, 'E' = enemy.
type FriendshipMark = "F" | "N" | "E";
const PLANETS: Planet[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const FRIENDS: Record<Planet, Record<Planet, FriendshipMark>> = {
  Sun:     { Sun: "F", Moon: "F", Mars: "F", Mercury: "N", Jupiter: "F", Venus: "E", Saturn: "E" },
  Moon:    { Sun: "F", Moon: "F", Mars: "N", Mercury: "F", Jupiter: "N", Venus: "N", Saturn: "N" },
  Mars:    { Sun: "F", Moon: "F", Mars: "F", Mercury: "E", Jupiter: "F", Venus: "N", Saturn: "N" },
  Mercury: { Sun: "F", Moon: "E", Mars: "N", Mercury: "F", Jupiter: "N", Venus: "F", Saturn: "N" },
  Jupiter: { Sun: "F", Moon: "F", Mars: "F", Mercury: "E", Jupiter: "F", Venus: "E", Saturn: "N" },
  Venus:   { Sun: "E", Moon: "E", Mars: "N", Mercury: "F", Jupiter: "N", Venus: "F", Saturn: "F" },
  Saturn:  { Sun: "E", Moon: "E", Mars: "E", Mercury: "F", Jupiter: "N", Venus: "F", Saturn: "F" },
};

// ---- Scoring functions ---------------------------------------------

interface AshtakootInput {
  signIdx: number;       // 0..11 (Moon's rasi)
  nakshatraIdx: number;  // 0..26
}

function scoreVarna(a: AshtakootInput, b: AshtakootInput): number {
  const va = SIGN_VARNA[a.signIdx];
  const vb = SIGN_VARNA[b.signIdx];
  // Traditional rule: full mark if boy's varna ≥ girl's. We don't track
  // gender; treat as "1 if equal or higher of either side meets the
  // requirement", which in practice gives 1 for same/adjacent varnas.
  return Math.abs(VARNA_RANK[va] - VARNA_RANK[vb]) <= 1 ? 1 : 0;
}

function scoreVasya(a: AshtakootInput, b: AshtakootInput): number {
  const aVasya = VASYA[a.signIdx] ?? [];
  const bVasya = VASYA[b.signIdx] ?? [];
  const aHasB = aVasya.includes(b.signIdx);
  const bHasA = bVasya.includes(a.signIdx);
  if (aHasB && bHasA) return 2;
  if (aHasB || bHasA) return 1;
  return 0.5; // gentle "neutral" credit; pure 0 is too punitive
}

function scoreTara(a: AshtakootInput, b: AshtakootInput): number {
  // Count nakshatras forward from one to the other; mod 9. Positions
  // 3, 5, 7 (1-indexed) are inauspicious — score 0 each direction.
  // Otherwise 1.5 per direction = max 3.
  function tara(from: number, to: number): number {
    const idx = ((to - from + 27) % 27) + 1; // 1..27
    const mod = ((idx - 1) % 9) + 1; // 1..9
    const inauspicious = mod === 3 || mod === 5 || mod === 7;
    return inauspicious ? 0 : 1.5;
  }
  return tara(a.nakshatraIdx, b.nakshatraIdx) + tara(b.nakshatraIdx, a.nakshatraIdx);
}

function scoreYoni(a: AshtakootInput, b: AshtakootInput): number {
  const yA = NAK[a.nakshatraIdx];
  const yB = NAK[b.nakshatraIdx];
  if (yA.yoni === yB.yoni) return 4; // same yoni
  if (isBitterEnemy(yA.yoni, yB.yoni)) return 0;
  // Otherwise neutral middle — give 2 by convention. (Friend/enemy
  // tables exist but the simplification is acceptable for v1.)
  return 2;
}

function scoreGrahaMaitri(a: AshtakootInput, b: AshtakootInput): number {
  const lordA = SIGN_LORD[a.signIdx];
  const lordB = SIGN_LORD[b.signIdx];
  if (lordA === lordB) return 5;
  const aTob = FRIENDS[lordA][lordB];
  const bToa = FRIENDS[lordB][lordA];
  if (aTob === "F" && bToa === "F") return 5;
  if ((aTob === "F" && bToa === "N") || (aTob === "N" && bToa === "F")) return 4;
  if (aTob === "N" && bToa === "N") return 3;
  if ((aTob === "F" && bToa === "E") || (aTob === "E" && bToa === "F")) return 1;
  if ((aTob === "N" && bToa === "E") || (aTob === "E" && bToa === "N")) return 0.5;
  return 0; // both enemies
}

function scoreGana(a: AshtakootInput, b: AshtakootInput): number {
  const ga = NAK[a.nakshatraIdx].gana;
  const gb = NAK[b.nakshatraIdx].gana;
  if (ga === gb) return 6;
  // Deva-Manushya = 5; Deva-Rakshasa = 1; Manushya-Rakshasa = 0
  const set = new Set([ga, gb]);
  if (set.has("Deva") && set.has("Manushya")) return 5;
  if (set.has("Manushya") && set.has("Rakshasa")) return 0;
  if (set.has("Deva") && set.has("Rakshasa")) return 1;
  return 0;
}

function scoreBhakoot(a: AshtakootInput, b: AshtakootInput): number {
  // Position of one sign from the other. Inauspicious counts: 6, 8, 5,
  // 9, 2, 12 (mutually).
  const fwd = ((b.signIdx - a.signIdx + 12) % 12) + 1; // 1..12
  const bad = [2, 5, 6, 8, 9, 12];
  return bad.includes(fwd) ? 0 : 7;
}

function scoreNadi(a: AshtakootInput, b: AshtakootInput): number {
  // Same nadi → 0 (incompatible); different → 8.
  return NAK[a.nakshatraIdx].nadi === NAK[b.nakshatraIdx].nadi ? 0 : 8;
}

// ---- Public entry --------------------------------------------------

export interface AshtakootResult {
  kootas: {
    varna: { score: number; max: 1; a: string; b: string };
    vasya: { score: number; max: 2 };
    tara: { score: number; max: 3 };
    yoni: { score: number; max: 4; a: string; b: string };
    grahaMaitri: { score: number; max: 5; a: string; b: string };
    gana: { score: number; max: 6; a: string; b: string };
    bhakoot: { score: number; max: 7 };
    nadi: { score: number; max: 8; a: string; b: string };
  };
  total: number;
  totalMax: 36;
  verdict: "outstanding" | "excellent" | "acceptable" | "marginal" | "incompatible";
}

function verdictFor(total: number): AshtakootResult["verdict"] {
  if (total >= 28) return "outstanding";
  if (total >= 24) return "excellent";
  if (total >= 18) return "acceptable";
  if (total >= 12) return "marginal";
  return "incompatible";
}

export function computeAshtakoot(a: AshtakootInput, b: AshtakootInput): AshtakootResult {
  const varna = scoreVarna(a, b);
  const vasya = scoreVasya(a, b);
  const tara = scoreTara(a, b);
  const yoni = scoreYoni(a, b);
  const grahaMaitri = scoreGrahaMaitri(a, b);
  const gana = scoreGana(a, b);
  const bhakoot = scoreBhakoot(a, b);
  const nadi = scoreNadi(a, b);

  const total = varna + vasya + tara + yoni + grahaMaitri + gana + bhakoot + nadi;

  return {
    kootas: {
      varna:       { score: varna,       max: 1, a: SIGN_VARNA[a.signIdx], b: SIGN_VARNA[b.signIdx] },
      vasya:       { score: vasya,       max: 2 },
      tara:        { score: tara,        max: 3 },
      yoni:        { score: yoni,        max: 4, a: NAK[a.nakshatraIdx].yoni, b: NAK[b.nakshatraIdx].yoni },
      grahaMaitri: { score: grahaMaitri, max: 5, a: SIGN_LORD[a.signIdx], b: SIGN_LORD[b.signIdx] },
      gana:        { score: gana,        max: 6, a: NAK[a.nakshatraIdx].gana, b: NAK[b.nakshatraIdx].gana },
      bhakoot:     { score: bhakoot,     max: 7 },
      nadi:        { score: nadi,        max: 8, a: NAK[a.nakshatraIdx].nadi, b: NAK[b.nakshatraIdx].nadi },
    },
    total,
    totalMax: 36,
    verdict: verdictFor(total),
  };
}

// Useful for callers that only have nakshatras and need to derive sign
// from longitude. Not used internally.
export function signIdxFromLong(longitudeDeg: number): number {
  return Math.floor((((longitudeDeg % 360) + 360) % 360) / 30);
}

export const ASHTAKOOT_SIGN_NAMES = SIGNS;
