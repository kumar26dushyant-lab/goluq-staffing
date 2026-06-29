import {
  Phone,
  MessageSquare,
  TrendingUp,
  Building2,
  Network,
  type LucideIcon,
} from "lucide-react";
import type { RoleId } from "../state/useAppState";

export interface Role {
  id: RoleId;
  icon: LucideIcon;
  // labels/blurbs come from i18n: t(`roles.${id}.label`) / t(`roles.${id}.blurb`)
}

export const ROLES: Role[] = [
  { id: "voice", icon: Phone },
  { id: "support", icon: MessageSquare },
  { id: "sales", icon: TrendingUp },
  { id: "reception", icon: Building2 },
  { id: "workforce", icon: Network },
];
