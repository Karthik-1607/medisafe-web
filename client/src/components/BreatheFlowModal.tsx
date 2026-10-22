import React, { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, RotateCcw, Volume2, VolumeX, Wind, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreatheFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type PatternKey = "soft" | "box" | "resonance";

interface PatternConfig {
  name: string;
  tagline: string;
  timingLabel: string;
  phases: {
    key: "inhale" | "hold" | "exhale" | "rest";
    label: string;
    hint: string;
    duration: number;
  }[];
}

const patterns: Record<PatternKey, PatternConfig> = {
  soft: {
    name: "Soft landing",
    tagline: "Ease into stillness",
    timingLabel: "4 in · 2 hold · 6 out",
    phases: [
      { key: "inhale", label: "Breathe in", hint: "Let the breath arrive", duration: 4 },
      { key: "hold", label: "Stay here", hint: "A small moment of stillness", duration: 2 },
      { key: "exhale", label: "Breathe out", hint: "Soften and let go", duration: 6 },
    ],
  },
  box: {
    name: "Steady box",
    tagline: "Find your center",
    timingLabel: "4 in · 4 hold · 4 out · 4 rest",
    phases: [
      { key: "inhale", label: "Breathe in", hint: "Gather a little space", duration: 4 },
      { key: "hold", label: "Hold softly", hint: "Stay with the quiet", duration: 4 },
      { key: "exhale", label: "Breathe out", hint: "Release the day", duration: 4 },
      { key: "rest", label: "Rest", hint: "Nothing to do here", duration: 4 },
    ],
  },
  resonance: {
    name: "Open resonance",
    tagline: "A natural, even flow",
    timingLabel: "5 in · 0 hold · 5 out",
    phases: [
      { key: "inhale", label: "Breathe in", hint: "Fill gently from the center", duration: 5 },
      { key: "exhale", label: "Breathe out", hint: "Make the exhale spacious", duration: 5 },
    ],
  },
};

export function BreatheFlowModal({ isOpen, onClose, onComplete }: BreatheFlowModalProps) {
  const [patternKey, setPatternKey] = useState<PatternKey>("soft");
  const [isRunning, setIsRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [cycle, setCycle] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseStartedAtRef = useRef<number>(0);

  const pattern = patterns[patternKey];
  const currentPhase = pattern.phases[phaseIndex] || pattern.phases[0];
  const cycleDuration = pattern.phases.reduce((acc, p) => acc + p.duration, 0);

  // Remaining seconds for display
  const phaseRemaining = Math.max(1, Math.ceil(currentPhase.duration - phaseElapsed));

  // Cycle progress calculation
  const elapsedBeforePhase = pattern.phases
    .slice(0, phaseIndex)
    .reduce((sum, p) => sum + p.duration, 0);
  const progressPercent =
    isRunning || phaseElapsed > 0
      ? Math.min(100, ((elapsedBeforePhase + phaseElapsed) / cycleDuration) * 100)
      : 0;

  // Sound sync
  useEffect(() => {
    if (!audioRef.current) return;
    if (soundOn && isRunning && isOpen) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [soundOn, isRunning, isOpen]);

  // Audio cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      setIsRunning(false);
      setPhaseIndex(0);
      setPhaseElapsed(0);
      setCycle(1);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  }, [isOpen]);

  // Animation frame loop
  useEffect(() => {
    if (!isRunning || !isOpen) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    phaseStartedAtRef.current = performance.now() - phaseElapsed * 1000;

    const tick = (now: number) => {
      const elapsed = (now - phaseStartedAtRef.current) / 1000;

      if (elapsed >= currentPhase.duration) {
        // Move to next phase
        const nextIndex = phaseIndex + 1;
        if (nextIndex < pattern.phases.length) {
          setPhaseIndex(nextIndex);
          setPhaseElapsed(0);
          phaseStartedAtRef.current = now;
        } else {
          // Completed one full cycle
          setCycle((c) => c + 1);
          setPhaseIndex(0);
          setPhaseElapsed(0);
          phaseStartedAtRef.current = now;
          if (onComplete) {
            onComplete();
          }
        }
      } else {
        setPhaseElapsed(elapsed);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, isOpen, phaseIndex, currentPhase.duration, pattern.phases.length, onComplete]);

  if (!isOpen) return null;

  const handleStartPause = () => {
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    setPhaseIndex(0);
    setPhaseElapsed(0);
    setCycle(1);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handlePatternChange = (key: PatternKey) => {
    setPatternKey(key);
    setIsRunning(false);
    setPhaseIndex(0);
    setPhaseElapsed(0);
  };

  // Dynamic orb scaling & styling matching BreatheFlow reference design
  const getOrbPhaseClass = () => {
    if (!isRunning && phaseElapsed === 0) return "scale-[0.84] opacity-90";
    switch (currentPhase.key) {
      case "inhale":
        return "scale-[1.12] shadow-[0_0_0_24px_rgba(172,222,192,0.07),0_0_75px_rgba(160,227,187,0.45)] transition-all duration-[4000ms] ease-out";
      case "hold":
        return "scale-[1.12] shadow-[0_0_0_24px_rgba(172,222,192,0.11),0_0_80px_rgba(160,227,187,0.5)] transition-all duration-500";
      case "exhale":
        return "scale-[0.82] shadow-[0_0_0_12px_rgba(172,222,192,0.04),0_0_35px_rgba(160,227,187,0.2)] transition-all duration-[6000ms] ease-in-out";
      case "rest":
        return "scale-[0.76] opacity-75 shadow-[0_0_0_6px_rgba(172,222,192,0.03)] transition-all duration-[4000ms]";
      default:
        return "scale-[0.84]";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <audio ref={audioRef} src="/breatheflow-ambient.mp3" loop preload="metadata" />

      {/* Floating Modal Frame: Clean rounded corners, glassmorphism, perfectly centered */}
      <div
        className={cn(
          "relative w-full max-w-[580px] bg-[#0c1f21] text-[#f4f4ed]",
          "rounded-[28px] border border-[rgba(226,247,233,0.18)] shadow-[0_30px_90px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.08)]",
          "overflow-hidden my-auto"
        )}
      >
        {/* Ambient atmospheric glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(180,235,192,0.14),transparent_68%)] pointer-events-none blur-xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(174,144,205,0.12),transparent_66%)] pointer-events-none blur-xl" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between px-6 sm:px-7 pt-6 pb-2">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-end gap-[3px] h-[17px] -rotate-[8deg]">
              <i className="block w-[3px] h-[8px] rounded-full bg-[#b8e0c1] opacity-60" />
              <i className="block w-[3px] h-[13px] rounded-full bg-[#b8e0c1] opacity-85" />
              <i className="block w-[3px] h-[17px] rounded-full bg-[#b8e0c1]" />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-[#f4f4ed]">
              Breathe<span className="font-normal text-[#f4f4ed]/65">Flow</span>
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#b8e0c1] bg-[#b8e0c1]/10 px-2 py-0.5 rounded-full border border-[#b8e0c1]/20 ml-1.5">
              Cycle {String(cycle).padStart(2, "0")}
            </span>
          </div>

          {/* Action buttons (Sound & Close) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundOn((s) => !s)}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all border",
                soundOn
                  ? "border-[#b8e0c1]/70 text-[#d6f1d6] bg-[#b8e0c1]/15 shadow-[0_0_14px_rgba(184,224,193,0.25)]"
                  : "border-white/10 text-white/50 hover:text-white/80 bg-white/5"
              )}
              title={soundOn ? "Turn ambient sound off" : "Turn ambient sound on"}
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 px-6 sm:px-8 py-5 space-y-6">
          {/* Central Breath Stage with Orbits and Orb */}
          <div className="relative flex flex-col items-center justify-center min-h-[250px] sm:min-h-[280px]">
            {/* Outer Orbit */}
            <div className="absolute w-[270px] h-[270px] rounded-full border border-[rgba(184,224,193,0.12)] animate-[spin_28s_linear_infinite] pointer-events-none" />
            {/* Inner Dashed Orbit */}
            <div className="absolute w-[215px] h-[215px] rounded-full border border-dashed border-[rgba(184,224,193,0.18)] animate-[spin_20s_linear_infinite_reverse] pointer-events-none" />

            {/* Glowing Breathing Orb */}
            <div
              className={cn(
                "relative w-[158px] h-[158px] rounded-full flex items-center justify-center transition-all",
                "bg-[radial-gradient(circle_at_37%_30%,#d4f0cf_0%,#a8d5bd_19%,#6fa7a2_52%,#3b6d70_76%,rgba(59,109,112,0.25)_100%)]",
                "shadow-[0_0_0_18px_rgba(172,222,192,0.055),0_0_55px_rgba(160,227,187,0.31),inset_-16px_-24px_36px_rgba(24,62,67,0.35)]",
                getOrbPhaseClass()
              )}
            >
              {/* Orb Inner Core */}
              <div className="absolute inset-[22%] border border-[rgba(237,255,235,0.42)] rounded-full opacity-60 pointer-events-none" />
              {/* Orb Light Shine */}
              <div className="absolute top-[11%] left-[20%] w-[29%] h-[22%] rounded-full bg-[rgba(247,255,233,0.54)] blur-[7px] -rotate-[22deg] pointer-events-none" />
            </div>

            {/* Readout Text Inside Stage */}
            <div className="absolute text-center pointer-events-none">
              <p className="font-serif text-[23px] sm:text-[25px] font-normal text-[#f7fff1] tracking-tight drop-shadow-sm">
                {isRunning ? currentPhase.label : "Ready when you are"}
              </p>
              <p className="text-[36px] sm:text-[40px] font-semibold text-[#d6f1d6] tracking-tighter leading-none mt-1 font-mono">
                {isRunning ? `${phaseRemaining}s` : "—"}
              </p>
              <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-[#f4f4ed]/50 mt-1.5 max-w-[210px]">
                {isRunning ? currentPhase.hint : "Start with one easy breath"}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-semibold text-[#f4f4ed]/45 uppercase tracking-[0.08em]">
              <span>Session progress</span>
              <span className="text-[#b8e0c1]">{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-[4px] w-full bg-[rgba(229,248,228,0.11)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#8fc6bc] to-[#d4f0cf] shadow-[0_0_14px_rgba(184,224,193,0.45)] transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Controls: Begin / Pause session & Reset */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleStartPause}
              className="flex-1 min-h-[46px] flex items-center justify-center gap-2.5 px-5 rounded-[14px] bg-gradient-to-r from-[#d1efcf] to-[#add9c2] text-[#173333] font-bold text-xs tracking-wide shadow-[0_9px_26px_rgba(151,217,174,0.18)] hover:brightness-105 active:scale-[0.99] transition-all"
            >
              <span className="w-5 h-5 rounded-full border border-[#173333]/25 flex items-center justify-center text-[9px]">
                {isRunning ? <Pause size={10} /> : <Play size={10} fill="currentColor" />}
              </span>
              <span>{isRunning ? "Pause session" : "Begin session"}</span>
            </button>

            <button
              onClick={handleReset}
              className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center border border-[rgba(226,247,233,0.18)] text-[#f4f4ed]/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Reset session"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Rhythm Selector Options */}
          <div className="pt-3 border-t border-[rgba(226,247,233,0.14)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#b8e0c1] mb-2">
              Choose your rhythm
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(patterns) as PatternKey[]).map((key) => {
                const item = patterns[key];
                const isSelected = patternKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePatternChange(key)}
                    className={cn(
                      "p-3 rounded-[14px] text-left border transition-all",
                      isSelected
                        ? "border-[#b8e0c1]/70 bg-[rgba(54,91,81,0.5)] shadow-[inset_0_1px_rgba(235,255,232,0.14)]"
                        : "border-[rgba(226,247,233,0.14)] bg-[rgba(14,34,36,0.35)] hover:bg-[rgba(22,56,56,0.46)] hover:border-[rgba(226,247,233,0.25)]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#f4f4ed] block">{item.name}</span>
                      {isSelected && <Check size={12} className="text-[#b8e0c1]" />}
                    </div>
                    <span className="text-[10px] font-medium text-[#b8e0c1] block mt-0.5">
                      {item.timingLabel}
                    </span>
                    <span className="text-[9px] text-[#f4f4ed]/45 block mt-0.5">
                      {item.tagline}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 sm:px-7 py-3 border-t border-[rgba(226,247,233,0.12)] bg-[#091a1d]/60 flex items-center justify-between text-[11px] text-[#f4f4ed]/45">
          <span className="flex items-center gap-1.5">
            <Wind size={13} className="text-[#b8e0c1]" />
            A quieter minute for right now
          </span>
          <button
            onClick={() => {
              if (onComplete) onComplete();
              onClose();
            }}
            className="text-[#b8e0c1] hover:text-white font-semibold transition-colors"
          >
            Finish & Save
          </button>
        </div>
      </div>
    </div>
  );
}
