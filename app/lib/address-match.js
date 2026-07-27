// Compares the address printed on an ID against the address the browser's GPS
// resolves to. These two never agree literally: an Aadhaar card writes
// "3rd Cross St, Ayapakkam, Ambattur, Tiruvallur, Tamil Nadu - 600077" where a
// map returns "Ayapakkam, Chennai, Tamil Nadu 600077, India" — different
// administrative levels, different abbreviations, and different transliterated
// spellings of the same Tamil place name. So this scores similarity rather than
// testing equality, and the score is advice for a human reviewer, not a gate.

const ABBREV = {
  st: "street", rd: "road", nr: "near", opp: "opposite", apt: "apartment",
  flr: "floor", bldg: "building", ngr: "nagar", clny: "colony", col: "colony",
  ext: "extension", ph: "phase", sec: "sector", blk: "block", no: "number",
  hno: "number", dist: "district", po: "postoffice", vill: "village",
  tq: "taluk", teh: "tehsil", mkt: "market", w: "west", e: "east",
  n: "north", s: "south", tn: "tamilnadu", ka: "karnataka", mh: "maharashtra",
};

const STOP = new Set([
  "india", "near", "opposite", "house", "number", "door", "flat", "plot",
  "room", "floor", "building", "post", "office", "via", "and", "the", "at",
  "in", "of", "son", "daughter", "wife", "care", "so", "do", "wo", "co",
]);

function pinOf(text) {
  const m = String(text || "").match(/\b(\d{6})\b/);
  return m ? m[1] : null;
}

function tokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .filter((w) => !/^\d+$/.test(w)) // house/PIN numbers handled separately
    .map((w) => ABBREV[w] || w)
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

// Tolerates transliteration differences: Ayapakkam / Ayyapakkam, Tiruvallur /
// Thiruvallur, Velacheri / Velachery.
function similarToken(a, b) {
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5 && (a.startsWith(b.slice(0, 5)) || b.startsWith(a.slice(0, 5)))) {
    return true;
  }
  const tol = Math.max(a.length, b.length) <= 6 ? 1 : 2;
  return levenshtein(a, b) <= tol;
}

/**
 * @returns {{score:number, reasons:string[]}} score 0-100
 */
export function addressMatchScore(idAddress, gpsAddress) {
  const A = tokens(idAddress);
  const B = tokens(gpsAddress);
  const pa = pinOf(idAddress);
  const pb = pinOf(gpsAddress);

  let score = 0;
  const reasons = [];

  if (pa && pb) {
    if (pa === pb) {
      score += 40;
      reasons.push("PIN code matches");
    } else {
      reasons.push(`PIN differs (${pa} vs ${pb})`);
    }
  }

  if (!A.length || !B.length) {
    return { score, reasons: reasons.length ? reasons : ["Not enough address text to compare"] };
  }

  const matched = A.filter((a) => B.some((b) => similarToken(a, b)));
  const fraction = matched.length / Math.min(A.length, B.length);
  score += Math.round(60 * Math.min(fraction, 1));

  if (matched.length) {
    reasons.push("Shared: " + [...new Set(matched)].slice(0, 5).join(", "));
  } else {
    reasons.push("No place names in common");
  }

  return { score: Math.min(score, 100), reasons };
}

export function matchVerdict(score) {
  if (score >= 70) return { label: "Strong match", tone: "good" };
  if (score >= 40) return { label: "Partial match", tone: "warn" };
  return { label: "Weak match", tone: "bad" };
}
