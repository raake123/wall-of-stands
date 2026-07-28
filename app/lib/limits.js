// One place for every cap the app enforces, so the number shown to a person and
// the number checked in code can never drift apart.

export const MAX_PHOTOS = 5;
export const MAX_VIDEO_SECONDS = 15;
export const MAX_VIDEO_BYTES = 15 * 1024 * 1024;
export const VOICES_PER_STAND = 2;
export const VOICE_SECONDS = 15;
export const MAX_VOICES_PER_STAND = 150;

export const TEXT_LIMIT = 120;
export const TAGLINE_LIMIT = 80;
export const DETAILS_LIMIT = 2000;

// How long a stand can sit with no support and no voices before it counts as
// abandoned and its storage is reclaimed.
export const ABANDON_DAYS = 30;

// How many neighbours one approved member may vouch for. Kept small on
// purpose: an invite has to feel like something you spend on someone you
// actually know, not a link you paste into a group.
export const INVITES_PER_MEMBER = 3;

/**
 * A stand is "strong" once a fifth of the area's approved members have joined
 * it. A fixed number can't work: 50 is unreachable on launch day and trivial
 * later, so the bar moves with the community instead.
 */
export function supportTarget(approvedMembers) {
  return Math.max(10, Math.round((approvedMembers || 0) * 0.2));
}
