const NOISE = new Set(["road", "street", "st", "rd", "nagar", "main", "cross", "india", "tamil", "nadu"]);

function tokens(label) {
  if (!label) return [];
  return label
    .toLowerCase()
    .split(/[,\-/]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && !NOISE.has(part));
}

// A person counts as "inside" a stand's area when any meaningful part of their
// location matches the stand's — e.g. "Ayapakkam, Kolladi" vs "Ambattur, Ayapakkam".
export function isInsideArea(standLocation, personLocation) {
  const a = tokens(standLocation);
  const b = tokens(personLocation);
  if (!a.length || !b.length) return false;
  return a.some((x) => b.some((y) => x === y || x.includes(y) || y.includes(x)));
}

export function shortArea(label) {
  if (!label) return "";
  const parts = label.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[0] || label;
}
