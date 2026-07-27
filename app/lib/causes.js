import {
  Leaf,
  GraduationCap,
  Heart,
  Scale,
  Home as HomeIcon,
  Hammer,
  Landmark,
  Cloud,
} from "lucide-react";

export const CAUSES = [
  { name: "Environment", color: "#2ecc71", Icon: Leaf },
  { name: "Education", color: "#4cc9f0", Icon: GraduationCap },
  { name: "Health", color: "#ff4d6d", Icon: Heart },
  { name: "Justice", color: "#ffd60a", Icon: Scale },
  { name: "Housing", color: "#f77f00", Icon: HomeIcon },
  { name: "Labor", color: "#adb5bd", Icon: Hammer },
  { name: "Democracy", color: "#9d4edd", Icon: Landmark },
  { name: "Climate", color: "#06d6a0", Icon: Cloud },
];

export function causeFor(name) {
  return CAUSES.find((c) => c.name === name) || CAUSES[0];
}

export function tierFor(count) {
  if (count >= 50) return "movement";
  if (count >= 25) return "surging";
  if (count >= 10) return "milestone";
  return null;
}
