export interface GlossaryEntry {
  term: string;
  plain: string;
  long?: string;
  aliases?: string[];
}

const ENTRIES: GlossaryEntry[] = [
  // Planets / luminaries / nodes
  { term: "Sun", plain: "core identity, ego, vitality", aliases: ["sun"] },
  { term: "Moon", plain: "emotions, instincts, inner needs", aliases: ["moon"] },
  { term: "Mercury", plain: "communication, thinking, learning", aliases: ["mercury"] },
  { term: "Venus", plain: "love, beauty, money, values", aliases: ["venus"] },
  { term: "Mars", plain: "drive, action, anger, desire", aliases: ["mars"] },
  { term: "Jupiter", plain: "growth, luck, belief, expansion", aliases: ["jupiter"] },
  { term: "Saturn", plain: "discipline, limits, lessons, time", aliases: ["saturn"] },
  { term: "Uranus", plain: "sudden change, freedom, awakening", aliases: ["uranus"] },
  { term: "Neptune", plain: "dreams, intuition, illusion, spirituality", aliases: ["neptune"] },
  { term: "Pluto", plain: "deep transformation, power, rebirth", aliases: ["pluto"] },
  {
    term: "Rahu",
    plain: "north node — what your soul is reaching toward",
    aliases: ["rahu", "north node", "northnode", "mean node", "meannode"],
  },
  {
    term: "Ketu",
    plain: "south node — what you're letting go of",
    aliases: ["ketu", "south node", "southnode"],
  },
  { term: "Chiron", plain: "wound that becomes wisdom", aliases: ["chiron"] },

  // Zodiac signs
  { term: "Aries", plain: "bold, direct, fast-moving energy", aliases: ["aries"] },
  { term: "Taurus", plain: "steady, sensual, patient builder", aliases: ["taurus"] },
  { term: "Gemini", plain: "curious, talkative, quick-witted", aliases: ["gemini"] },
  { term: "Cancer", plain: "caring, sensitive, home-loving", aliases: ["cancer"] },
  { term: "Leo", plain: "warm, expressive, wants to shine", aliases: ["leo"] },
  { term: "Virgo", plain: "precise, practical, helpful, analytical", aliases: ["virgo"] },
  { term: "Libra", plain: "fair, social, values balance and beauty", aliases: ["libra"] },
  { term: "Scorpio", plain: "intense, private, deeply emotional", aliases: ["scorpio"] },
  { term: "Sagittarius", plain: "adventurous, philosophical, freedom-seeking", aliases: ["sagittarius"] },
  { term: "Capricorn", plain: "ambitious, disciplined, long-game player", aliases: ["capricorn"] },
  { term: "Aquarius", plain: "independent, original, future-minded", aliases: ["aquarius"] },
  { term: "Pisces", plain: "imaginative, empathic, dreamy, fluid", aliases: ["pisces"] },

  // Houses 1..12
  { term: "1st house", plain: "your self, body, how you appear", aliases: ["first house", "house 1", "h1"] },
  { term: "2nd house", plain: "money, possessions, self-worth", aliases: ["second house", "house 2", "h2"] },
  { term: "3rd house", plain: "communication, siblings, short trips", aliases: ["third house", "house 3", "h3"] },
  { term: "4th house", plain: "home, family, roots, mother", aliases: ["fourth house", "house 4", "h4"] },
  { term: "5th house", plain: "creativity, romance, children, play", aliases: ["fifth house", "house 5", "h5"] },
  { term: "6th house", plain: "work, health, daily routine, service", aliases: ["sixth house", "house 6", "h6"] },
  { term: "7th house", plain: "partnerships, marriage, open enemies", aliases: ["seventh house", "house 7", "h7"] },
  { term: "8th house", plain: "shared resources, intimacy, transformation", aliases: ["eighth house", "house 8", "h8"] },
  { term: "9th house", plain: "travel, philosophy, higher learning", aliases: ["ninth house", "house 9", "h9"] },
  { term: "10th house", plain: "career, public role, reputation", aliases: ["tenth house", "house 10", "h10"] },
  { term: "11th house", plain: "friends, networks, hopes, gains", aliases: ["eleventh house", "house 11", "h11"] },
  { term: "12th house", plain: "solitude, dreams, hidden things, surrender", aliases: ["twelfth house", "house 12", "h12"] },

  // Aspects
  { term: "Conjunction", plain: "two planets fused, energies blend", aliases: ["conjunction"] },
  { term: "Opposition", plain: "two planets across — tension, balance to find", aliases: ["opposition"] },
  { term: "Square", plain: "two planets at 90° — friction that pushes growth", aliases: ["square"] },
  { term: "Trine", plain: "two planets in flow — easy support", aliases: ["trine"] },
  { term: "Sextile", plain: "two planets cooperating — gentle opportunity", aliases: ["sextile"] },
  { term: "Quincunx", plain: "two planets adjusting — awkward but workable", aliases: ["quincunx", "inconjunct"] },

  // Motion states
  {
    term: "Retrograde",
    plain: "planet appears to move backward — review, redo, reflect",
    aliases: ["retrograde", "retrogrades", "retro", "℞"],
  },
  { term: "Direct", plain: "planet moving forward normally again", aliases: ["direct"] },
  { term: "Stationary", plain: "planet pausing before changing direction", aliases: ["stationary", "station"] },
  { term: "Combust", plain: "planet too close to the Sun, weakened", aliases: ["combust", "combustion"] },
  { term: "Cazimi", plain: "planet exact with Sun, briefly empowered", aliases: ["cazimi"] },

  // Events
  { term: "Ingress", plain: "a planet enters a new sign", aliases: ["ingress"] },
  {
    term: "Station",
    plain: "moment a planet turns retrograde or direct",
    aliases: ["station"],
  },
  { term: "Eclipse", plain: "powerful new/full moon near the lunar nodes", aliases: ["eclipse", "solar eclipse", "lunar eclipse"] },
  { term: "New Moon", plain: "Sun and Moon meet — fresh starts", aliases: ["new moon", "newmoon"] },
  { term: "Full Moon", plain: "Sun opposite Moon — peaks, releases", aliases: ["full moon", "fullmoon"] },

  // Vedic concepts
  {
    term: "Lagna",
    plain: "your rising sign — the lens you see life through",
    long: "The Lagna (or Ascendant) is the zodiac sign rising on the eastern horizon at your moment of birth. It colours your whole chart, your physical body, your basic outlook, and how others first encounter you. In Vedic astrology it is treated as more important than the Sun sign for personality and life direction.",
    aliases: ["lagna", "ascendant", "asc", "rising", "rising sign"],
  },
  { term: "Rashi", plain: "moon sign — your emotional baseline", aliases: ["rashi", "moon sign", "moonsign"] },
  {
    term: "Nakshatra",
    plain: "lunar mansion — finer-grained moon placement",
    long: "Vedic astrology divides the zodiac into 27 lunar mansions called nakshatras, each about 13°20' wide. The nakshatra your Moon falls in shapes deep emotional patterns, instincts, and karmic themes — finer-grained than just the moon sign.",
    aliases: ["nakshatra", "nakshatras", "lunar mansion"],
  },
  { term: "Navamsa", plain: "D9 chart — marriage, dharma, soul-fruit", aliases: ["navamsa", "d9", "navamsha"] },
  {
    term: "Dasha",
    plain: "planetary period — which planet is running your life right now",
    long: "Dashas are time-windows ruled by a particular planet. The most common system, Vimshottari, runs a 120-year cycle through 9 planets. Whichever planet's dasha you are in colours the themes of that period — its house, sign, and condition in your natal chart shape what shows up.",
    aliases: ["dasha", "dashas", "mahadasha"],
  },
  { term: "Antardasha", plain: "sub-period inside a bigger dasha", aliases: ["antardasha", "antar dasha", "bhukti"] },
  { term: "Vimshottari", plain: "the standard 120-year dasha cycle", aliases: ["vimshottari", "vimsottari"] },
  { term: "Yogini", plain: "a 36-year dasha cycle of 8 yoginis", aliases: ["yogini", "yogini dasha"] },
  {
    term: "Mangal Dosha",
    plain: "Mars in certain houses — said to strain marriage",
    long: "Mangal Dosha (also called Manglik) is the placement of Mars in the 1st, 4th, 7th, 8th or 12th house. Tradition says it can stress marriage, especially if both partners aren't matched on it. Modern astrologers treat it as one factor among many, not a death sentence.",
    aliases: ["mangal dosha", "manglik", "mangalik", "mars dosha"],
  },
  {
    term: "Ashtakoot",
    plain: "8-point Vedic match score (out of 36)",
    long: "Ashtakoot Milan, also called Guna Milan, scores compatibility between two birth charts on 8 categories totalling 36 points. 18+ is generally considered acceptable; 24+ is good. It's the classical Vedic match-making metric used before arranged marriages.",
    aliases: ["ashtakoot", "ashtakoot milan", "guna milan", "ashtakuta", "kuta"],
  },
  { term: "Yoga", plain: "named planetary combination producing a specific result", aliases: ["yoga"] },
  { term: "Dignity", plain: "how strong a planet is in its sign", aliases: ["dignity"] },
  { term: "Exalted", plain: "planet at peak strength in a particular sign", aliases: ["exalted", "exaltation"] },
  { term: "Debilitated", plain: "planet weakened in its opposite-of-exalted sign", aliases: ["debilitated", "debilitation"] },
  { term: "Own Sign", plain: "planet in a sign it rules — comfortable, strong", aliases: ["own sign", "swakshetra", "moolatrikona"] },
  { term: "House Lord", plain: "the planet that rules a given house", aliases: ["house lord", "lord of house", "ruler"] },
  { term: "Synastry", plain: "comparing two charts to read a relationship", aliases: ["synastry"] },
  { term: "Tithi", plain: "lunar day — Moon-Sun angle in 12° steps", aliases: ["tithi"] },
  { term: "Muhurta", plain: "an auspicious time window for an action", aliases: ["muhurta", "muhurat"] },
];

function buildLookup(): Map<string, GlossaryEntry> {
  const map = new Map<string, GlossaryEntry>();
  for (const e of ENTRIES) {
    map.set(e.term.toLowerCase(), e);
    if (e.aliases) {
      for (const a of e.aliases) map.set(a.toLowerCase(), e);
    }
  }
  return map;
}

const LOOKUP = buildLookup();

export const GLOSSARY: Record<string, GlossaryEntry> = Object.fromEntries(
  ENTRIES.map((e) => [e.term, e]),
);

export function lookupGlossary(term: string): GlossaryEntry | undefined {
  if (!term) return undefined;
  const direct = LOOKUP.get(term.toLowerCase().trim());
  if (direct) return direct;
  // House numbers like "h7", "house 7", "7th"
  const m = term.toLowerCase().trim().match(/^(?:h|house\s*)?(\d{1,2})(?:st|nd|rd|th)?$/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 12) {
      const ord = `${n}${ordinalSuffix(n)} house`;
      return LOOKUP.get(ord);
    }
  }
  return undefined;
}

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export const GLOSSARY_ENTRY_COUNT = ENTRIES.length;
