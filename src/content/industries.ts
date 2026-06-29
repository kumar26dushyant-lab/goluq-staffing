import {
  Stethoscope,
  FlaskConical,
  BookOpen,
  Calculator,
  Car,
  type LucideIcon,
} from "lucide-react";
import type { IndustryId } from "../state/useAppState";

export interface Industry {
  id: IndustryId;
  icon: LucideIcon;
  // label from i18n: t(`industries.${id}`)
}

export const INDUSTRIES: Industry[] = [
  { id: "clinic", icon: Stethoscope },
  { id: "diagnostic", icon: FlaskConical },
  { id: "coaching", icon: BookOpen },
  { id: "ca", icon: Calculator },
  { id: "travel", icon: Car },
];
