import { useState, useCallback } from "react";

const STORAGE_KEY = "spe-tour-completed";

export type TourPhase = "prompt" | "touring" | "inactive";

export interface TourState {
  phase: TourPhase;
  currentStep: number;
}

function hasCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function markCompleted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch { /* iframe sandbox */ }
}

export function useTourState() {
  const [phase, setPhase] = useState<TourPhase>("inactive");
  const [currentStep, setCurrentStep] = useState(0);

  /** Show the "Would you like a tour?" prompt (only if not already completed). */
  const promptTour = useCallback(() => {
    if (!hasCompleted()) {
      setPhase("prompt");
    }
  }, []);

  /** User accepted the tour prompt — begin step 0. */
  const acceptTour = useCallback(() => {
    setCurrentStep(0);
    setPhase("touring");
  }, []);

  /** Force-start tour (e.g. from "Take the Tour" link). */
  const startTour = useCallback(() => {
    setCurrentStep(0);
    setPhase("touring");
  }, []);

  const nextStep = useCallback((totalSteps: number) => {
    setCurrentStep((prev) => {
      if (prev >= totalSteps - 1) {
        setPhase("inactive");
        markCompleted();
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const dismissTour = useCallback(() => {
    setPhase("inactive");
    setCurrentStep(0);
    markCompleted();
  }, []);

  return {
    phase,
    currentStep,
    promptTour,
    acceptTour,
    startTour,
    nextStep,
    prevStep,
    dismissTour,
  };
}
