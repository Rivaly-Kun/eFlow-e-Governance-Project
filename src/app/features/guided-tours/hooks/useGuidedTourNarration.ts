import { useEffect, useState } from "react";
import { isTourNarrationSupported, speakTourStep, stopTourNarration } from "../services/tourNarrationService";
import type { GuidedTourStep } from "../types";

export function useGuidedTourNarration(step: GuidedTourStep, enabled: boolean) {
  const supported = isTourNarrationSupported();
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    setIsSpeaking(false);
    if (!enabled || !supported) {
      stopTourNarration();
      return;
    }

    const timer = window.setTimeout(() => {
      speakTourStep(step, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    }, 320);

    return () => {
      window.clearTimeout(timer);
      stopTourNarration();
    };
  }, [enabled, step, supported]);

  return { supported, isSpeaking };
}
