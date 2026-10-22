import React, { useEffect, useState } from "react";
import { Check, Wind, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreathingResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function BreathingResetModal({
  isOpen,
  onClose,
  onComplete,
}: BreathingResetModalProps) {
  const [phase, setPhase] = useState<"Inhale" | "Hold" | "Exhale">("Inhale");
  const [secondsLeft, setSecondsLeft] = useState<number>(4);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      setPhase("Inhale");
      setSecondsLeft(4);
      setCyclesCompleted(0);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Switch phase
        setPhase((currentPhase) => {
          if (currentPhase === "Inhale") return "Hold";
          if (currentPhase === "Hold") return "Exhale";
          // Exhale finished -> increment cycle
          setCyclesCompleted((c) => c + 1);
          return "Inhale";
        });
        return 4;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const phaseInstruction = {
    Inhale: "Breathe in gently through your nose...",
    Hold: "Hold with ease, softening your shoulders...",
    Exhale: "Slowly release the breath through your mouth...",
  }[phase];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="surface-card w-full max-w-md p-6 sm:p-8 space-y-6 rounded-2xl border border-[#dce8e1] shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#e5ece6] pb-3">
          <span className="eyebrow flex items-center gap-1.5">
            <Wind size={14} className="text-[#327064]" />
            Mindful Pause · Box Breathing
          </span>
          <button
            onClick={onClose}
            className="text-[#849690] hover:text-[#173330] text-lg font-bold p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="py-6 flex flex-col items-center">
          <div
            className={cn(
              "w-40 h-40 rounded-full flex flex-col items-center justify-center border-4 border-[#2d6e62]/30 bg-[#eff7f4] transition-all duration-1000 shadow-inner",
              phase === "Inhale" && "scale-110 border-[#2d6e62] bg-[#dbeee8]",
              phase === "Hold" && "scale-110 border-[#83b7aa] bg-[#e4f2ed]",
              phase === "Exhale" && "scale-90 border-[#97c4b9]/50 bg-[#f4faf7]"
            )}
          >
            <span className="text-3xl font-extrabold text-[#173330] tracking-tight">
              {secondsLeft}s
            </span>
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#2f665a] mt-1">
              {phase}
            </span>
          </div>

          <p className="mt-6 text-sm font-semibold text-[#173330] min-h-[24px]">
            {phaseInstruction}
          </p>

          <p className="mt-2 text-xs text-[#71847e]">
            {cyclesCompleted} cycle{cyclesCompleted === 1 ? "" : "s"} completed · take as much time as you need
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2 border-t border-[#e5ece6]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold text-[#61746f] hover:bg-[#eef2ee]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onComplete();
              onClose();
            }}
            className="action-button flex items-center gap-1.5"
          >
            <Check size={16} /> Finish Pause
          </button>
        </div>
      </div>
    </div>
  );
}
