// Structured location: we keep area / city / state / country as separate fields
// instead of one free-text label, so "inside this area" is an exact comparison
// rather than fuzzy string matching.

function norm(v) {
  if (!v) return "";
  return String(v)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Spacing in place names is inconsistent in real addresses — people write
// "Tamilnadu" and "Tamil Nadu", "NewDelhi" and "New Delhi". Compare with the
// spaces collapsed so those count as the same place.
function key(v) {
  return norm(v).replace(/\s/g, "");
}

// Nominatim returns a big `address` object whose keys vary by place. Pick the
// most specific sensible value for each level.
export function parseNominatim(data) {
  const a = (data && data.address) || {};
  const area =
    a.suburb ||
    a.neighbourhood ||
    a.quarter ||
    a.residential ||
    a.village ||
    a.hamlet ||
    a.city_district ||
    a.town ||
    "";
  const city =
    a.city ||
    a.town ||
    a.municipality ||
    a.county ||
    a.state_district ||
    a.city_district ||
    "";
  const state = a.state || a.region || "";
  const country = a.country || "";
  return {
    area: area || "",
    city: city && norm(city) !== norm(area) ? city : city || "",
    state: state || "",
    country: country || "",
  };
}

export function emptyLocation() {
  return { area: "", city: "", state: "", country: "" };
}

// Full human-readable chain: "Ayapakkam, Ambattur, Chennai, Tamil Nadu, India"
export function formatLocation(loc) {
  if (!loc) return "";
  const seen = new Set();
  return [loc.area, loc.city, loc.state, loc.country]
    .map((p) => (p || "").trim())
    .filter((p) => {
      if (!p) return false;
      const k = norm(p);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .join(", ");
}

export function hasLocation(loc) {
  return Boolean(loc && (loc.area || loc.city || loc.state));
}

// Someone is "inside" a stand's area when their area matches the stand's area
// within the same city. When either side has no area recorded we fall back to a
// city (plus state) match, which is the next most meaningful boundary.
export function isInsideArea(standLoc, personLoc) {
  if (!standLoc || !personLoc) return false;

  const sArea = key(standLoc.area);
  const pArea = key(personLoc.area);
  const sCity = key(standLoc.city);
  const pCity = key(personLoc.city);
  const sState = key(standLoc.state);
  const pState = key(personLoc.state);

  // Different states are always different places.
  if (sState && pState && sState !== pState) return false;

  // Real addresses disagree about which level a place name belongs to:
  // "Ambattur" is a neighbourhood to one source and a city/zone to another.
  // So we compare place names across levels rather than area-to-area only.
  const standPlaces = [sArea, sCity].filter(Boolean);
  const personPlaces = [pArea, pCity].filter(Boolean);
  if (!standPlaces.length || !personPlaces.length) return false;

  // When both sides name an area, that area must be what matches — otherwise
  // two different neighbourhoods of one big city would count as the same place.
  if (sArea && pArea) {
    return standPlaces.includes(pArea) || personPlaces.includes(sArea);
  }

  // Otherwise the city is the most specific boundary either side gave us.
  return standPlaces.some((x) => personPlaces.includes(x));
}

// Pull the location fields off a row that stores them inline.
export function locOf(row, prefix = "") {
  if (!row) return emptyLocation();
  return {
    area: row[prefix + "area"] || "",
    city: row[prefix + "city"] || "",
    state: row[prefix + "state"] || "",
    country: row[prefix + "country"] || "",
  };
}

// Reverse-geocode a browser position into our structured shape.
export async function reverseGeocode(latitude, longitude) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${latitude}&lon=${longitude}`
  );
  const data = await res.json();
  return parseNominatim(data);
}

// Wraps navigator.geolocation + reverse geocoding into one promise.
export function detectLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location isn't supported in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          resolve(await reverseGeocode(pos.coords.latitude, pos.coords.longitude));
        } catch {
          reject(new Error("Couldn't look up your area. Try again."));
        }
      },
      (err) => {
        reject(
          new Error(
            err.code === 1
              ? "Location permission denied. Allow it in your browser's site settings."
              : "Couldn't get your location. Try again."
          )
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  });
}
