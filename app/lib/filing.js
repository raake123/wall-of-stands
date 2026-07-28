// Taking a stand to the Corporation.
//
// There is no public write API for GCC grievances, so the free route is a
// WhatsApp deep link: we compose the complaint, the person taps send from
// their own number. Nothing is sent automatically and nothing costs anything.

export const GCC_WHATSAPP = "919445551913";
export const GCC_LABEL = "Greater Chennai Corporation";
export const GCC_NUMBER_HUMAN = "9445551913";

export function daysSince(ts) {
  if (!ts) return null;
  const ms = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
}

function onDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The message the resident sends. Written as a plain grievance an officer can
 * act on — the app's own framing stays out of it, apart from one line saying
 * where the numbers come from.
 */
export function buildComplaint(stand, { supporters = 0, voices = 0 } = {}) {
  const where = [stand.area, stand.city, stand.state]
    .filter(Boolean)
    .join(", ") || stand.location_label || "";

  const lines = [
    "Public grievance",
    "",
    `Issue: ${stand.text}`,
  ];
  if (where) lines.push(`Location: ${where}`);
  if (stand.category) lines.push(`Category: ${stand.category}`);
  lines.push(`First reported: ${onDate(stand.created_at)}`);
  lines.push(
    `Residents backing this: ${supporters}${voices ? ` (${voices} recorded statements)` : ""}`
  );

  if (stand.details && stand.details.trim()) {
    lines.push("", "Details:", stand.details.trim());
  }

  lines.push(
    "",
    "This complaint is backed by named residents of the area who have each",
    "individually registered their support. Kindly share a complaint reference",
    "number so the outcome can be tracked."
  );

  return lines.join("\n");
}

export function whatsappLink(text) {
  return `https://wa.me/${GCC_WHATSAPP}?text=${encodeURIComponent(text)}`;
}
