import React, { useState } from "react";
import { ArrowRight, Check, Heart, Shield, Sparkles, User, Stethoscope, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface PatientOnboardingModalProps {
  isOpen: boolean;
  patientId: number;
  initialName: string;
  onComplete: () => void;
}

export function PatientOnboardingModal({
  isOpen,
  patientId,
  initialName,
  onComplete,
}: PatientOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [age, setAge] = useState<number>(24);
  const [dateOfBirth, setDateOfBirth] = useState("2002-05-15");
  const [gender, setGender] = useState("Prefer not to say");
  const [contact, setContact] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [condition, setCondition] = useState("Depression & Low Mood Support");
  const [doctorId, setDoctorId] = useState<number>(1);

  const updateProfileMutation = trpc.patients.updateProfile.useMutation();

  if (!isOpen) return null;

  const conditions = [
    {
      id: "Depression & Low Mood Support",
      label: "Depression & Low Mood",
      desc: "Support for emotional heaviness, low motivation, and rediscovering gentle momentum",
      icon: "☀️",
    },
    {
      id: "Anxiety & Stress Management",
      label: "Anxiety & Stress",
      desc: "Tools and clinical tracking for worry, physical tension, and racing thoughts",
      icon: "🌿",
    },
    {
      id: "Substance Recovery & Relapse Prevention",
      label: "Recovery & Sobriety",
      desc: "Craving management, understanding triggers, and confidential recovery pathways",
      icon: "🕊️",
    },
    {
      id: "Sleep & Everyday Resilience",
      label: "Sleep & Daily Wellness",
      desc: "Restoring restful sleep routines, emotional balance, and calm daily habits",
      icon: "🌙",
    },
  ];

  const doctors = [
    {
      id: 1,
      name: "Dr. Meera Mehta",
      role: "Senior Psychiatrist & Medical Director",
      desc: "Specializes in clinical depression, anxiety disorders & evidence-based care plans",
    },
    {
      id: 2,
      name: "Dr. Rajesh Sharma",
      role: "Addiction & Behavioral Health Specialist",
      desc: "Focuses on substance recovery, trigger mapping & long-term sobriety support",
    },
    {
      id: 3,
      name: "Dr. Sneha Rao",
      role: "Clinical Psychologist & Psychotherapist",
      desc: "Cognitive behavioral therapy (CBT), emotional regulation & burnout recovery",
    },
  ];

  const handleFinish = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        patientId: Number(patientId) || 1,
        name: initialName,
        age: Number(age) || 24,
        dateOfBirth: dateOfBirth || undefined,
        gender,
        contact: contact.trim() || undefined,
        condition,
        doctorId: Number(doctorId) || 1,
        status: "Active",
      });
      toast.success("Welcome to MediSafe! Your personalized profile is ready.");
      onComplete();
    } catch (err: any) {
      console.warn("Patient onboarding error, proceeding to care space:", err);
      toast.info("Entering your care space...");
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="surface-card w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200 border border-[#dce8e1]">
        {/* Header */}
        <div className="border-b border-[#e3ebe5] pb-4 flex items-center justify-between">
          <div>
            <span className="eyebrow flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#327064]" />
              Confidential Intake · Step {step} of 3
            </span>
            <h2 className="section-title text-xl mt-1">Welcome to MediSafe, {initialName}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all duration-300",
                    step === s ? "bg-[#2d6e62] w-6" : step > s ? "bg-[#7db5a8]" : "bg-[#d8e3dc]"
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onComplete}
              title="Close and enter portal"
              className="p-1 rounded-full text-[#6b7c77] hover:text-[#183933] hover:bg-[#eaf0ec] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Step 1: Personal & Contact Details */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="muted-copy text-xs leading-relaxed">
              To provide safe and personalized care, please enter your basic demographic and contact details.
              This information is protected under healthcare privacy standards.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4c615c] mb-1">Age</label>
                <input
                  type="number"
                  min="13"
                  max="110"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#d6e2dc] p-2.5 text-xs bg-white text-[#173330] focus:outline-none focus:ring-2 focus:ring-[#2d6e62]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4c615c] mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-xl border border-[#d6e2dc] p-2.5 text-xs bg-white text-[#173330] focus:outline-none focus:ring-2 focus:ring-[#2d6e62]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4c615c] mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-[#d6e2dc] p-2.5 text-xs bg-white text-[#173330] focus:outline-none focus:ring-2 focus:ring-[#2d6e62]"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4c615c] mb-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full rounded-xl border border-[#d6e2dc] p-2.5 text-xs bg-white text-[#173330] focus:outline-none focus:ring-2 focus:ring-[#2d6e62]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4c615c] mb-1">
                Emergency Contact (Name & Phone)
              </label>
              <input
                type="text"
                placeholder="e.g. Parent / Spouse: +91 98765 00000"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full rounded-xl border border-[#d6e2dc] p-2.5 text-xs bg-white text-[#173330] focus:outline-none focus:ring-2 focus:ring-[#2d6e62]"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="action-button flex items-center gap-2"
              >
                Care Focus & Goals <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Primary Care Goal */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="muted-copy text-xs leading-relaxed">
              What is your primary care or wellbeing focus right now? This customizes your daily check-ins, clinical assessments, and AI companion.
            </p>

            <div className="space-y-2.5">
              {conditions.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setCondition(c.id)}
                  className={cn(
                    "p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                    condition === c.id
                      ? "border-[#2d6e62] bg-[#f0f7f4] ring-1 ring-[#2d6e62]"
                      : "border-[#e0eae3] hover:bg-[#f6faf7]"
                  )}
                >
                  <span className="text-2xl">{c.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-[#173330]">{c.label}</h4>
                    <p className="text-[11px] text-[#6e807b] mt-0.5">{c.desc}</p>
                  </div>
                  {condition === c.id && <Check size={16} className="text-[#2d6e62] shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-bold text-[#61746f] hover:bg-[#eef2ee] rounded-lg"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="action-button flex items-center gap-2"
              >
                Choose Care Team <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Care Team Provider Linking */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="muted-copy text-xs leading-relaxed">
              Select your supervising doctor. Your assessments, uploaded records, and clinical notes will be accessible to this clinician.
            </p>

            <div className="space-y-2.5">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setDoctorId(doc.id)}
                  className={cn(
                    "p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                    doctorId === doc.id
                      ? "border-[#2d6e62] bg-[#f0f7f4] ring-1 ring-[#2d6e62]"
                      : "border-[#e0eae3] hover:bg-[#f6faf7]"
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-[#dbeee9] text-[#21574e] flex items-center justify-center font-bold text-xs shrink-0">
                    <Stethoscope size={16} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-[#173330]">{doc.name}</h4>
                    <span className="text-[10px] font-bold text-[#32695f] uppercase tracking-wider block">
                      {doc.role}
                    </span>
                    <p className="text-[11px] text-[#6e807b] mt-0.5">{doc.desc}</p>
                  </div>
                  {doctorId === doc.id && <Check size={16} className="text-[#2d6e62] shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-bold text-[#61746f] hover:bg-[#eef2ee] rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onComplete}
                  className="text-xs text-[#718580] hover:text-[#1d3d37] underline"
                >
                  Skip for now
                </button>
              </div>
              <button
                type="button"
                onClick={handleFinish}
                disabled={updateProfileMutation.isPending}
                className="action-button flex items-center gap-2"
              >
                {updateProfileMutation.isPending ? "Setting up..." : "Complete Setup & Enter Care Space"}
                <Check size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
