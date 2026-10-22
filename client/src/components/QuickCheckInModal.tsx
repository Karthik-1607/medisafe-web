import React, { useState } from "react";
import { ArrowUpRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface QuickCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  onSuccess: () => void;
}

export function QuickCheckInModal({
  isOpen,
  onClose,
  patientId,
  onSuccess,
}: QuickCheckInModalProps) {
  const [selectedScore, setSelectedScore] = useState<number>(4);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const checkInMutation = trpc.patients.checkIn.useMutation();

  if (!isOpen) return null;

  const moods = [
    { score: 1, label: "Struggling", emoji: "🌧️", tone: "rose", desc: "Very heavy or distressed" },
    { score: 2, label: "Heavy", emoji: "☁️", tone: "sand", desc: "Low energy or weighed down" },
    { score: 3, label: "Steady", emoji: "🍃", tone: "blue", desc: "Holding ground, balanced" },
    { score: 4, label: "Light", emoji: "🌿", tone: "mint", desc: "Good headspace, relaxed" },
    { score: 5, label: "Hopeful", emoji: "☀️", tone: "mint", desc: "Energized, optimistic" },
  ];

  const feelingTags = [
    "Calm",
    "Anxious",
    "Grateful",
    "Tired",
    "Hopeful",
    "Overwhelmed",
    "Restless",
    "Motivated",
    "Peaceful",
    "Lonely",
  ];

  const toggleFeeling = (tag: string) => {
    setSelectedFeelings((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentMood = moods.find((m) => m.score === selectedScore) || moods[2];
    try {
      await checkInMutation.mutateAsync({
        patientId,
        moodScore: selectedScore,
        moodLabel: currentMood.label,
        moodTone: currentMood.tone,
        note: note.trim() || undefined,
        feelings: selectedFeelings,
      });
      toast.success(`Check-in recorded: feeling ${currentMood.label}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save check-in");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="surface-card w-full max-w-lg p-6 sm:p-8 space-y-6 rounded-2xl border border-[#dce8e1] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#e5ece6] pb-4">
          <div>
            <span className="eyebrow">Daily check-in</span>
            <h3 className="section-title text-lg mt-1">How are you feeling right now?</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#849690] hover:text-[#173330] text-lg font-bold p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#556964] mb-2 uppercase tracking-wider">
              Choose your mood
            </label>
            <div className="grid grid-cols-5 gap-2">
              {moods.map((m) => (
                <button
                  key={m.score}
                  type="button"
                  onClick={() => setSelectedScore(m.score)}
                  className={cn(
                    "flex flex-col items-center p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                    selectedScore === m.score
                      ? "border-[#2d6e62] bg-[#eef7f4] ring-2 ring-[#2d6e62]/20 font-bold scale-105"
                      : "border-[#e0eae3] bg-[#fbfdfa] hover:bg-[#f3f7f4]"
                  )}
                >
                  <span className="text-2xl mb-1">{m.emoji}</span>
                  <span className="text-[11px] text-[#173330]">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#556964] mb-2 uppercase tracking-wider">
              What words describe today? (Tap to select)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {feelingTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleFeeling(tag)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border transition-all cursor-pointer",
                    selectedFeelings.includes(tag)
                      ? "bg-[#2d6e62] text-white border-[#2d6e62] font-semibold"
                      : "bg-[#f5f8f5] text-[#556964] border-[#d8e3dc] hover:bg-[#ebf2ee]"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#556964] mb-1.5 uppercase tracking-wider">
              A gentle note for your log (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notice what’s here without judgment..."
              rows={3}
              className="w-full rounded-xl border border-[#d8e3dc] bg-white p-3 text-xs text-[#173330] placeholder-[#90a29c] focus:outline-none focus:ring-2 focus:ring-[#2d6e62]/30"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-[#61746f] hover:bg-[#eef2ee]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={checkInMutation.isPending}
              className="action-button flex items-center gap-1.5"
            >
              {checkInMutation.isPending ? "Saving..." : "Log Check-in"}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
