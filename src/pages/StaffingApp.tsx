import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAppState } from "../state/useAppState";
import { TopBar } from "../components/TopBar";
import { Greeting } from "../screens/Greeting";
import { Industry } from "../screens/Industry";
import { Launch } from "../screens/Launch";
import { Simulation } from "../screens/Simulation";
import { Booking } from "../screens/Booking";

/** Route "/" — the 5-step talking staffing flow. Screens swap via AnimatePresence. */
export function StaffingApp() {
  const { state, dispatch } = useAppState();
  const reduced = useReducedMotion();

  const variants = reduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 24, filter: "blur(8px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -16, filter: "blur(8px)" },
      };

  return (
    <div className="relative min-h-dvh">
      <TopBar showBack={state.step !== "greeting"} onBack={() => dispatch({ type: "BACK" })} />

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {state.step === "greeting" && (
              <Greeting onPickRole={(role) => dispatch({ type: "PICK_ROLE", role })} />
            )}

            {state.step === "industry" && (
              <Industry onPick={(industry) => dispatch({ type: "PICK_INDUSTRY", industry })} />
            )}

            {state.step === "launch" && state.role && state.industry && (
              <Launch
                role={state.role}
                industry={state.industry}
                onLaunch={() => dispatch({ type: "LAUNCH" })}
              />
            )}

            {state.step === "simulation" && state.role && state.industry && (
              <Simulation
                role={state.role}
                industry={state.industry}
                onComplete={() => dispatch({ type: "ADVANCE_TO_BOOKING" })}
              />
            )}

            {state.step === "booking" && state.role && state.industry && (
              <Booking
                role={state.role}
                industry={state.industry}
                onReset={() => dispatch({ type: "RESET" })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
