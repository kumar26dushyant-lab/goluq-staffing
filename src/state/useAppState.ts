import { useReducer } from "react";

export type Step = "greeting" | "industry" | "launch" | "simulation" | "booking";
export type RoleId = "voice" | "support" | "sales" | "reception" | "workforce";
export type IndustryId = "clinic" | "diagnostic" | "coaching" | "ca" | "travel";

export interface AppState {
  step: Step;
  role?: RoleId;
  industry?: IndustryId;
  simComplete: boolean;
}

type Action =
  | { type: "PICK_ROLE"; role: RoleId }
  | { type: "PICK_INDUSTRY"; industry: IndustryId }
  | { type: "LAUNCH" }
  | { type: "SIM_DONE" }
  | { type: "ADVANCE_TO_BOOKING" }
  | { type: "BACK" }
  | { type: "RESET" };

const STEP_ORDER: Step[] = ["greeting", "industry", "launch", "simulation", "booking"];

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "PICK_ROLE":
      return { ...state, role: action.role, step: "industry" };
    case "PICK_INDUSTRY":
      // Both chosen → reveal the Go Luq launch step
      return { ...state, industry: action.industry, step: "launch" };
    case "LAUNCH":
      return { ...state, step: "simulation", simComplete: false };
    case "SIM_DONE":
      return { ...state, simComplete: true };
    case "ADVANCE_TO_BOOKING":
      return { ...state, step: "booking" };
    case "BACK": {
      const idx = STEP_ORDER.indexOf(state.step);
      const prev = STEP_ORDER[Math.max(0, idx - 1)];
      return { ...state, step: prev };
    }
    case "RESET":
      return { step: "greeting", simComplete: false };
    default:
      return state;
  }
}

const initial: AppState = { step: "greeting", simComplete: false };

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, initial);
  return { state, dispatch } as const;
}

export { STEP_ORDER };
