import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Set page title on mount
useEffect(() => {
  document.title = "MindSafe — A softer way forward";
}, []);
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  FileUp,
  HeartPulse,
  Home as HomeIcon,
  Leaf,
  Languages,
  LineChart,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Mic,
  Moon,
  MoreHorizontal,
  Pill,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sunrise,
  Sun,
  Users,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredLanguage, languageLabels, storeLanguage, type Language } from "@/lib/language";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { canAccessSection, navFromLocation, portalHref, type PortalNavId, type PortalRole } from "@/lib/portalNav";

type Role = PortalRole;
type NavId = PortalNavId;

type NavItem = {
  label: NavId;
  icon: LucideIcon;
};

const patientNav: NavItem[] = [
  { label: "Overview", icon: HomeIcon },
  { label: "Companion", icon: MessageCircle },
  { label: "Assessments", icon: FileCheck2 },
  { label: "Wellness", icon: Sparkles },
  { label: "Care team", icon: HeartPulse },
  { label: "My Records", icon: FileText },
];

const doctorNav: NavItem[] = [
  { label: "Overview", icon: HomeIcon },
  { label: "Patients", icon: Users },
  { label: "Assessments", icon: FileCheck2 },
  { label: "Medication", icon: Pill },
  { label: "Alerts", icon: CircleAlert },
];

const portalLabels: Record<Language, { patient: string; clinician: string; overview: string; patientSpace: string; careRoom: string; greetingPatient: string; greetingDoctor: string; patientSubtitle: string; doctorSubtitle: string }> = {
  english: { patient: "Patient portal", clinician: "Doctor portal", overview: "Overview", patientSpace: "Your space", careRoom: "Care room", greetingPatient: "Good morning, Ananya.", greetingDoctor: "Good morning, Dr. Mehta.", patientSubtitle: "Let’s take today one step at a time.", doctorSubtitle: "Here’s the clearest view of your care room today." },
  telugu: { patient: "రోగి పోర్టల్", clinician: "వైద్యుల పోర్టల్", overview: "అవలోకనం", patientSpace: "మీ స్థలం", careRoom: "కేర్ రూమ్", greetingPatient: "శుభోదయం, అనన్య.", greetingDoctor: "శుభోదయం, డాక్టర్ మెహతా.", patientSubtitle: "ఈ రోజును ఒక్కో అడుగుగా తీసుకుందాం.", doctorSubtitle: "ఈరోజు మీ కేర్ రూమ్‌కి స్పష్టమైన దృశ్యం ఇది." },
  tenglish: { patient: "Patient portal", clinician: "Doctor portal", overview: "Overview", patientSpace: "Mee space", careRoom: "Care room", greetingPatient: "Good morning, Ananya.", greetingDoctor: "Good morning, Dr. Mehta.", patientSubtitle: "Ivala one step at a time velladam.", doctorSubtitle: "Mee care room ki ivala clearest view idi." },
};

const navLabels: Record<Language, Partial<Record<NavId, string>>> = {
  english: {},
  telugu: { Overview: "అవలోకనం", Companion: "సహచరుడు", Assessments: "అంచనాలు", Wellness: "వెల్‌నెస్", "Care team": "కేర్ టీమ్", "My Records": "నా రికార్డులు", Patients: "రోగులు", Medication: "మందులు", Alerts: "అలర్ట్‌లు" },
  tenglish: { Overview: "Overview", Companion: "Companion", Assessments: "Assessments", Wellness: "Wellness", "Care team": "Care team", "My Records": "Mee Records", Patients: "Patients", Medication: "Medication", Alerts: "Alerts" },
};

function localizedNavLabel(label: NavId, language: Language) {
  return navLabels[language][label] ?? label;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "MS";
  return parts.slice(0, 2).map((part) => part[0]!.toUpperCase()).join("");
}

/** Session intention survives reloads without leaving the browser. */
const INTENTION_STORAGE_KEY = "mindsafe.session-intention";

/** Time-of-day greeting in English or Telugu (Tenglish keeps English). */
function greetingForNow(language: Language): string {
  const telugu = language === "telugu";
  const hour = new Date().getHours();
  if (hour < 12) return telugu ? "శుభోదయం" : "Good morning";
  if (hour < 17) return telugu ? "శుభ మధ్యాహ్నం" : "Good afternoon";
  return telugu ? "శుభ సాయంత్రం" : "Good evening";
}

/** Minimal structural type for the Web Speech API (absent from lib.dom). */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="brand-mark" aria-hidden="true">
        <Leaf size={20} strokeWidth={2.2} />
      </div>
      <div>
        <div className="brand-name">mindsafe</div>
        <div className="brand-caption">a softer way forward</div>
      </div>
    </div>
  );
}

function Avatar({ initials, tone = "ink", size = "md" }: { initials: string; tone?: string; size?: "sm" | "md" | "lg" }) {
  return <div className={cn("avatar", `avatar-${tone}`, `avatar-${size}`)}>{initials}</div>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

function ActionButton({ children, onClick, secondary = false, className, type = "button", disabled = false }: { children: React.ReactNode; onClick?: () => void; secondary?: boolean; className?: string; type?: "button" | "submit" | "reset"; disabled?: boolean }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cn("action-button", secondary && "action-button-secondary", disabled && "opacity-60 cursor-not-allowed", className)}>
      {children}
    </button>
  );
}

function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="section-title mt-1">{title}</h2>
        {detail && <p className="muted-copy mt-1">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note, tone }: { icon: LucideIcon; label: string; value: string; note: string; tone: string }) {
  return (
    <div className="metric-card group">
      <div className={cn("metric-icon", tone)}><Icon size={18} strokeWidth={1.8} /></div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="metric-label">{label}</p>
          <p className="metric-value">{value}</p>
        </div>
        <span className="metric-note">{note}</span>
      </div>
    </div>
  );
}

function PatientOverview({ onNavigate }: { onNavigate: (nav: NavId) => void }) {
  return (
    <div className="space-y-8">
      <section className="hero-shell overflow-hidden">
        <div className="hero-grid" />
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.3fr_.7fr]">
          <div className="max-w-xl">
            <span className="hero-kicker"><span className="live-dot" /> Your companion is here</span>
            <h2 className="display-heading mt-5">A softer way<br /><em>forward.</em></h2>
            <p className="hero-copy mt-5 max-w-md">A quiet space to check in, notice how you feel, and take the next small step — at your own pace.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ActionButton onClick={() => onNavigate("Companion")}>Start a check-in <ArrowUpRight size={17} /></ActionButton>
              <button onClick={() => onNavigate("Assessments")} className="hero-text-link">View today’s plan <ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="hero-visual hidden min-h-[238px] items-center justify-center lg:flex">
            <div className="hero-ring hero-ring-outer" />
            <div className="hero-ring hero-ring-inner" />
            <div className="hero-breathing-orb"><Wind size={30} strokeWidth={1.3} /></div>
            <span className="hero-orbit-label label-top">breathe in</span>
            <span className="hero-orbit-label label-bottom">you are safe here</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Sunrise} label="Gentle streak" value="04 days" note="keep going" tone="mint" />
        <StatCard icon={LineChart} label="Mood this week" value="+18%" note="a little lighter" tone="blue" />
        <StatCard icon={Clock3} label="Companion time" value="1h 42m" note="of 2h today" tone="sand" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
        <div className="surface-card chart-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Eyebrow>Your progress</Eyebrow>
              <h2 className="section-title mt-1">A little more space to breathe.</h2>
              <p className="muted-copy mt-1">Your mood has been gently trending upward.</p>
            </div>
            <button className="select-pill">Last 30 days <ChevronRight size={14} /></button>
          </div>
          <div className="chart-wrap mt-8">
            <div className="chart-y-labels"><span>lighter</span><span>steady</span><span>heavier</span></div>
            <svg className="mood-chart" viewBox="0 0 760 220" role="img" aria-label="Mood trend chart">
              <defs>
                <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9ccdc2" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="#9ccdc2" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g className="chart-grid"><line x1="0" y1="20" x2="760" y2="20" /><line x1="0" y1="105" x2="760" y2="105" /><line x1="0" y1="190" x2="760" y2="190" /></g>
              <path className="chart-area" d="M0 171 C65 175 75 145 130 152 S195 116 245 137 S300 128 347 112 S405 147 456 116 S520 111 555 87 S610 94 655 58 S715 75 760 35 L760 220 L0 220 Z" fill="url(#moodFill)" />
              <path className="chart-line" d="M0 171 C65 175 75 145 130 152 S195 116 245 137 S300 128 347 112 S405 147 456 116 S520 111 555 87 S610 94 655 58 S715 75 760 35" />
              <circle cx="655" cy="58" r="5" className="chart-point" /><circle cx="655" cy="58" r="11" className="chart-point-halo" />
            </svg>
            <div className="chart-x-labels"><span>Sep 01</span><span>Sep 08</span><span>Sep 15</span><span>Sep 22</span><span>Today</span></div>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#e7ebe5] pt-4 text-xs text-[#71817d]"><span className="legend"><i className="legend-dot bg-[#79b8ad]" /> Mood check-ins</span><span className="legend"><i className="legend-dot bg-[#d9b88c]" /> Companion sessions</span><span className="ml-auto font-semibold text-[#39766d]">+18% from last month</span></div>
        </div>

        <div className="surface-card path-card">
          <div className="flex items-start justify-between"><div><Eyebrow>For your path</Eyebrow><h2 className="section-title mt-1">Three small things.</h2></div><div className="mini-spark"><Sparkles size={15} /></div></div>
          <p className="muted-copy mt-2">No perfect days required. Just a little showing up.</p>
          <div className="mt-7 space-y-2">
            <button onClick={() => toast.success("Check-in marked complete") } className="path-row path-row-done"><span className="path-check"><Check size={13} /></span><span><strong>Morning check-in</strong><small>Completed at 8:12 AM</small></span><span className="path-state">done</span></button>
            <button onClick={() => onNavigate("Companion")} className="path-row"><span className="path-number">2</span><span><strong>Talk for five minutes</strong><small>A gentle space to unload</small></span><ChevronRight size={16} className="ml-auto text-[#9aa9a4]" /></button>
            <button onClick={() => onNavigate("Wellness")} className="path-row"><span className="path-number">3</span><span><strong>Take a quiet pause</strong><small>Try a 3-minute breathing reset</small></span><ChevronRight size={16} className="ml-auto text-[#9aa9a4]" /></button>
          </div>
          <div className="path-footer"><span className="path-progress"><i /></span><span>1 of 3 complete</span></div>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Continue gently" title="Made for this moment" detail="A few places to begin, depending on what you need today." action={<button onClick={() => onNavigate("Wellness")} className="quiet-link">See all <ArrowUpRight size={15} /></button>} />
        <div className="grid gap-4 md:grid-cols-3">
          <button onClick={() => onNavigate("Companion")} className="feature-tile feature-tile-teal text-left"><span className="feature-icon"><MessageCircle size={18} /></span><span className="feature-kicker">When thoughts feel loud</span><strong>Talk it through</strong><span className="feature-arrow"><ArrowUpRight size={17} /></span></button>
          <button onClick={() => onNavigate("Wellness")} className="feature-tile feature-tile-sand text-left"><span className="feature-icon"><Wind size={18} /></span><span className="feature-kicker">A three-minute reset</span><strong>Come back to your breath</strong><span className="feature-arrow"><ArrowUpRight size={17} /></span></button>
          <button onClick={() => onNavigate("Assessments")} className="feature-tile feature-tile-ink text-left"><span className="feature-icon"><FileCheck2 size={18} /></span><span className="feature-kicker">Your care plan</span><strong>See what’s next</strong><span className="feature-arrow"><ArrowUpRight size={17} /></span></button>
        </div>
      </section>
    </div>
  );
}

function PatientCompanion() {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const firstName = meQuery.data?.name?.trim().split(/\s+/)[0] || "there";
  const patientInitials = initialsOf(meQuery.data?.name || "You");

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Array<{ from: "companion" | "patient"; text: string; degraded?: boolean }>>(() => [
    { from: "companion", text: `Hi ${firstName}. I’m here with you. What feels most present today?` },
  ]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // The session intention is a real save: it survives reloads.
  const [sessionIntention, setSessionIntention] = useState<string>(() => {
    try {
      return localStorage.getItem(INTENTION_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [intentionSaved, setIntentionSaved] = useState(() => Boolean(sessionIntention));

  const aiChatMutation = trpc.ai.chat.useMutation();

  const toggleVoiceInput = () => {
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      toast.info("Voice input isn't supported in this browser — type your message instead.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new (SpeechRecognitionCtor as new () => SpeechRecognitionLike)();
    recognition.lang = getStoredLanguage() === "telugu" ? "te-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => {
      setListening(false);
      toast.error("I couldn't hear that. Please try again.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || aiChatMutation.isPending) return;

    const userText = draft.trim();
    const updatedMessages = [...messages, { from: "patient" as const, text: userText }];
    setMessages(updatedMessages);
    setDraft("");

    try {
      const formattedForAi = updatedMessages.map((m) => ({
        role: m.from === "patient" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));
      const { reply, degraded } = await aiChatMutation.mutateAsync({ messages: formattedForAi });
      setMessages((prev) => [...prev, { from: "companion", text: reply, degraded }]);
      if (degraded) {
        toast.error("The companion service is unreachable — that reply was a fixed fallback notice.");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { from: "companion", degraded: true, text: "The companion service can't be reached right now, so no real reply was generated. Please try again in a moment." },
      ]);
      toast.error("The companion service is unreachable.");
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <section className="surface-card companion-card">
        <div className="flex items-center justify-between border-b border-[#e7ebe5] pb-5">
          <div className="flex items-center gap-3">
            <div className="companion-mini-orb"><Sparkles size={16} /></div>
            <div>
              <p className="font-semibold text-[#173330]">Your companion</p>
              <p className="text-xs text-[#788984]">A private, supportive space</p>
            </div>
          </div>
          <span className="privacy-pill"><LockKeyhole size={12} /> private</span>
        </div>
        <div className="chat-space">
          <div className="session-date"><span /> {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} <span /></div>
          {messages.map((message, index) => (
            <div key={`${message.from}-${index}`} className={cn("chat-row", message.from === "patient" && "chat-row-patient")}>
              <div className={cn("chat-avatar", message.from === "patient" ? "chat-avatar-patient" : "chat-avatar-companion")}>
                {message.from === "patient" ? patientInitials : <Sparkles size={14} />}
              </div>
              <div className={cn("chat-bubble", message.from === "patient" ? "chat-bubble-patient" : "chat-bubble-companion", message.degraded && "text-xs italic text-[#71817d]")}>
                {message.degraded && <span className="not-italic font-semibold">Offline notice: </span>}
                {message.text}
              </div>
            </div>
          ))}
          {aiChatMutation.isPending && (
            <div className="chat-row">
              <div className="chat-avatar chat-avatar-companion"><Sparkles size={14} /></div>
              <div className="chat-bubble chat-bubble-companion text-xs text-[#71817d] animate-pulse">
                MindSafe companion is thinking...
              </div>
            </div>
          )}
        </div>
        <form onSubmit={submit} className="chat-composer">
          <button
            type="button"
            className={cn("composer-icon", listening && "text-[#b3452f]")}
            onClick={toggleVoiceInput}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
            title={listening ? "Stop voice input" : "Speak your message"}
          >
            <Mic size={18} className={listening ? "animate-pulse" : ""} />
          </button>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write what’s on your mind…"
            aria-label="Message your companion"
            disabled={aiChatMutation.isPending}
          />
          <button className="send-button" type="submit" disabled={aiChatMutation.isPending}>
            <ArrowUpRight size={18} />
          </button>
        </form>
        <div className="mt-3 flex items-center justify-between text-[11px] text-[#8b9a95]">
          <span>Companion responses are supportive, not medical advice.</span>
          <span>{messages.length} message{messages.length === 1 ? "" : "s"} this session</span>
        </div>
      </section>
      <aside className="space-y-5">
        <div className="soft-panel soft-panel-blue">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>Session intention</Eyebrow>
              <h3 className="panel-title mt-1">You don’t have to solve it all.</h3>
            </div>
            <CircleHelp size={18} className="text-[#5b8e99]" />
          </div>
          <p className="muted-copy mt-3">Try naming one thing you can gently set down for tonight.</p>
          <input
            type="text"
            value={sessionIntention}
            onChange={(e) => { setSessionIntention(e.target.value); setIntentionSaved(false); }}
            placeholder="e.g. Setting aside work worries until morning..."
            className="mt-3 w-full rounded-lg border border-[#cbe1dc] bg-[#ffffff] px-3 py-2 text-xs text-[#173330] focus:outline-none"
          />
          <button
            className="panel-action mt-3"
            onClick={() => {
              const value = sessionIntention.trim();
              try {
                if (value) localStorage.setItem(INTENTION_STORAGE_KEY, value);
                else localStorage.removeItem(INTENTION_STORAGE_KEY);
              } catch {
                // Storage can be unavailable in private modes; the session
                // state below still reflects the save for this visit.
              }
              setIntentionSaved(true);
              toast.success(value ? `Intention saved: "${value}"` : "Intention cleared for this session");
            }}
          >
            {intentionSaved ? "✓ Intention saved" : "Save intention"} <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="surface-card">
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow>Recent sessions</Eyebrow>
              <h3 className="panel-title mt-1">A small record of showing up.</h3>
            </div>
            <MoreHorizontal size={18} className="text-[#9aa8a3]" />
          </div>
          <div className="mt-5 space-y-3">
            <div className="recent-session w-full text-left">
              <span className="recent-session-icon"><MessageCircle size={15} /></span>
              <span>
                <strong>No saved sessions yet</strong>
                <small>Sessions are not stored — only your assessments, notes, and records are saved.</small>
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function PatientAssessments() {
  const patientId = 1;
  const assessmentsQuery = trpc.assessments.listForPatient.useQuery({ patientId });
  const submitMutation = trpc.assessments.submit.useMutation();

  const [activeModal, setActiveModal] = useState<"PHQ-9" | "GAD-7" | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phq9Questions = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself — or that you are a failure",
    "Trouble concentrating on things, such as reading or watching TV",
    "Moving or speaking so slowly that other people could have noticed",
    "Thoughts that you would be better off dead, or of hurting yourself",
  ];

  const gad7Questions = [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it is hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid, as if something awful might happen",
  ];

  const questions = activeModal === "PHQ-9" ? phq9Questions : gad7Questions;

  const handleOpenModal = (title: string) => {
    if (title.includes("PHQ-9")) {
      setActiveModal("PHQ-9");
      setAnswers({});
    } else if (title.includes("GAD-7")) {
      setActiveModal("GAD-7");
      setAnswers({});
    } else {
      toast.info("This assessment will be unlocked by your doctor");
    }
  };

  const handleAnswer = (questionIdx: number, val: number) => {
    setAnswers((prev) => ({ ...prev, [questionIdx]: val }));
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      toast.error(`Please answer all ${questions.length} questions.`);
      return;
    }

    const score = Object.values(answers).reduce((a, b) => a + b, 0);
    const maxScore = questions.length * 3;

    let severity = "Minimal";
    if (activeModal === "PHQ-9") {
      if (score >= 20) severity = "Severe depression";
      else if (score >= 15) severity = "Moderately severe depression";
      else if (score >= 10) severity = "Moderate depression";
      else if (score >= 5) severity = "Mild depression";
      else severity = "Minimal / Mild";
    } else {
      if (score >= 15) severity = "Severe anxiety";
      else if (score >= 10) severity = "Moderate anxiety";
      else if (score >= 5) severity = "Mild anxiety";
      else severity = "Minimal anxiety";
    }

    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync({
        patientId,
        title: activeModal === "PHQ-9" ? "PHQ-9 Mood Check-in" : "GAD-7 Anxiety Check-in",
        type: activeModal || "Check-in",
        score,
        maxScore,
        severity,
        answersJson: JSON.stringify(answers),
      });
      toast.success(`${activeModal} completed successfully! Score: ${score}/${maxScore} (${severity})`);
      setActiveModal(null);
      setAnswers({});
      assessmentsQuery.refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit assessment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedList = assessmentsQuery.data || [];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Your care plan"
        title="Check in, without judgement."
        detail="These short, validated check-ins help your care team understand how to support you."
        action={<span className="privacy-pill"><LockKeyhole size={12} /> private to your care team</span>}
      />

      <div className="grid gap-4">
        {[
          { title: "PHQ-9 mood check-in", meta: "9 questions · about 5 minutes", status: "Ready when you are", icon: HeartPulse, tone: "mint" },
          { title: "GAD-7 anxiety check-in", meta: "7 questions · about 4 minutes", status: "Assigned by Dr. Mehta", icon: Activity, tone: "blue" },
          { title: "DAST-10 recovery check", meta: "10 questions · about 6 minutes", status: "Locked until your next visit", icon: ShieldCheck, tone: "sand" },
        ].map((item, index) => {
          const Icon = item.icon;
          const completed = completedList.find((c) => c.title.toLowerCase().includes(item.title.split(" ")[0].toLowerCase()));
          return (
            <div className="surface-card assessment-card" key={item.title}>
              <div className={cn("assessment-icon", item.tone)}><Icon size={20} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="card-title">{item.title}</h3>
                  {index === 0 && <span className="status-chip status-chip-mint">next up</span>}
                  {completed && <span className="status-chip status-chip-blue">Completed ({completed.score}/{completed.maxScore})</span>}
                </div>
                <p className="muted-copy mt-1">{item.meta}</p>
                <p className="assessment-status mt-4">
                  <span className={cn("status-dot", index === 2 ? "status-dot-sand" : "status-dot-mint")} />{" "}
                  {completed ? `Last submitted ${new Date(completed.completedAt).toLocaleDateString()} · ${completed.severity}` : item.status}
                </p>
              </div>
              <button
                onClick={() => handleOpenModal(item.title)}
                className={cn("assessment-button", index === 2 && "assessment-button-muted")}
              >
                {index === 2 ? <LockKeyhole size={15} /> : <Play size={15} fill="currentColor" />} {index === 2 ? "Locked" : completed ? "Retake" : "Begin"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Completed History */}
      {completedList.length > 0 && (
        <div className="surface-card p-6 space-y-4">
          <Eyebrow>Check-in History</Eyebrow>
          <h3 className="section-title">Submitted Assessments</h3>
          <div className="grid gap-3">
            {completedList.map((a) => (
              <div key={a.id} className="rounded-xl bg-[#f8fbf8] p-4 border border-[#e1eae3] flex items-center justify-between">
                <div>
                  <strong className="text-sm font-bold text-[#173330]">{a.title}</strong>
                  <p className="text-xs text-[#71817d]">
                    Submitted on {new Date(a.completedAt).toLocaleDateString()} · Score: {a.score}/{a.maxScore}
                  </p>
                </div>
                <span className="status-tag status-tag-mint">{a.severity || "Completed"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment Question Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#ffffff] rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#e2eae4] max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between border-b border-[#e7ebe5] pb-4">
              <div>
                <Eyebrow>Validated Check-in</Eyebrow>
                <h3 className="section-title mt-1">{activeModal === "PHQ-9" ? "PHQ-9 Depression Check-in" : "GAD-7 Anxiety Check-in"}</h3>
                <p className="muted-copy mt-1">Over the last 2 weeks, how often have you been bothered by any of the following problems?</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="icon-button"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmitAssessment} className="space-y-6">
              {questions.map((q, idx) => (
                <div key={idx} className="bg-[#f7faf8] p-4 rounded-xl border border-[#e2eae4] space-y-3">
                  <p className="text-xs font-bold text-[#173330]">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Not at all", val: 0 },
                      { label: "Several days", val: 1 },
                      { label: "More than half", val: 2 },
                      { label: "Nearly every day", val: 3 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => handleAnswer(idx, opt.val)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center",
                          answers[idx] === opt.val
                            ? "bg-[#39796c] text-white border-[#39796c]"
                            : "bg-white text-[#4e625c] border-[#dce7df] hover:bg-[#eef5f2]"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e7ebe5]">
                <button type="button" onClick={() => setActiveModal(null)} className="outline-action">Cancel</button>
                <ActionButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Check-in"} <Check size={16} />
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="wellness-callout">
        <div className="callout-icon"><Sparkles size={19} /></div>
        <div>
          <strong>There is no score to chase.</strong>
          <p>These are simply a few more words for how you’ve been feeling. Answer honestly; there are no wrong answers.</p>
        </div>
      </div>
    </div>
  );
}

function PatientWellness() {
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [breathingStep, setBreathingStep] = useState<"Inhale" | "Hold" | "Exhale" | "Rest">("Inhale");
  const [breathingCounter, setBreathingCounter] = useState(4);
  const [activeResource, setActiveResource] = useState<{ title: string; type: string; content: string } | null>(null);
  const [savedNotes, setSavedNotes] = useState<string[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showBreathingModal) {
      timer = setInterval(() => {
        setBreathingCounter((prev) => {
          if (prev <= 1) {
            setBreathingStep((step) => {
              if (step === "Inhale") return "Hold";
              if (step === "Hold") return "Exhale";
              if (step === "Exhale") return "Rest";
              return "Inhale";
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showBreathingModal]);

  const handleSaveQuote = () => {
    const quote = "You can be a work in progress and still be worthy of care today.";
    if (!savedNotes.includes(quote)) {
      setSavedNotes((prev) => [...prev, quote]);
      toast.success("Saved to your personal wellness notes!");
    } else {
      toast.info("Quote is already saved in your notes.");
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Your library"
        title="Small practices, real life."
        detail="Doctor-approved resources for the in-between moments."
        action={
          <button className="quiet-link" onClick={() => toast.info("Displaying full doctor-curated wellness catalog.")}>
            Browse library <ArrowUpRight size={15} />
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="wellness-feature">
          <div className="wellness-feature-art">
            <div className="sun-disc" />
            <div className="hill hill-one" />
            <div className="hill hill-two" />
            <span className="art-caption">pause / notice / return</span>
          </div>
          <div className="p-6">
            <span className="feature-kicker">Guided practice · 03 min</span>
            <h3 className="display-small mt-2">A quiet reset<br /><em>for right now.</em></h3>
            <p className="muted-copy mt-3 max-w-md">A short breathing practice for when your thoughts are moving faster than you are.</p>
            <button className="dark-action mt-6" onClick={() => { setShowBreathingModal(true); setBreathingStep("Inhale"); setBreathingCounter(4); }}>
              Start practice <Play size={15} fill="currentColor" />
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="surface-card quote-card">
            <div className="quote-mark">“</div>
            <p className="quote-text">You can be a work in progress and still be worthy of care today.</p>
            <div className="quote-footer">
              <span>Today’s note</span>
              <button onClick={handleSaveQuote}><Plus size={15} /> save</button>
            </div>
          </div>

          <div className="surface-card resource-list">
            <Eyebrow>Read / listen</Eyebrow>
            <h3 className="panel-title mt-1">For the next ten minutes.</h3>
            <div className="mt-4 space-y-2">
              <button
                className="resource-row w-full text-left"
                onClick={() =>
                  setActiveResource({
                    title: "When rest feels unfamiliar",
                    type: "Audio Guide · 6 min",
                    content:
                      "Rest is not something you must earn after doing everything. When your nervous system has been on high alert, slowing down can initially feel uncomfortable or unfamiliar. Notice if you feel guilt when taking a pause. Try sitting with your back supported, unclenching your jaw, and acknowledging that rest is an integral part of healing.",
                  })
                }
              >
                <span className="resource-type resource-type-audio"><Mic size={14} /></span>
                <span><strong>When rest feels unfamiliar</strong><small>Audio · 6 min</small></span>
                <ArrowUpRight size={15} />
              </button>

              <button
                className="resource-row w-full text-left"
                onClick={() =>
                  setActiveResource({
                    title: "Start where your feet are",
                    type: "Read · 4 min",
                    content:
                      "When anxiety or depression makes the future feel overwhelming, ground yourself in the immediate present. Look down at your feet. Notice the solid surface holding you. Name 5 physical objects around you, 4 sensations you feel, 3 sounds you hear, 2 scents, and 1 slow breath. Grounding brings your mind back to where your body already is.",
                  })
                }
              >
                <span className="resource-type resource-type-read"><BookOpen size={14} /></span>
                <span><strong>Start where your feet are</strong><small>Read · 4 min</small></span>
                <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breathing Exercise Modal */}
      {showBreathingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#ffffff] rounded-2xl max-w-md w-full p-8 shadow-xl border border-[#e2eae4] text-center space-y-6">
            <div className="flex justify-end">
              <button onClick={() => setShowBreathingModal(false)} className="icon-button"><X size={18} /></button>
            </div>
            <span className="hero-kicker mx-auto"><Wind size={16} /> 3-Minute Reset</span>
            <div className="my-8 flex flex-col items-center justify-center">
              <div className="w-36 h-36 rounded-full bg-[#e2f0ea] border-4 border-[#39796c] flex items-center justify-center shadow-inner animate-pulse">
                <span className="text-3xl font-extrabold text-[#173330]">{breathingCounter}s</span>
              </div>
              <h3 className="text-2xl font-bold text-[#173330] mt-6 uppercase tracking-wider">{breathingStep}</h3>
              <p className="muted-copy mt-2 text-xs">
                {breathingStep === "Inhale"
                  ? "Breathe in deeply through your nose..."
                  : breathingStep === "Hold"
                  ? "Hold your breath gently..."
                  : breathingStep === "Exhale"
                  ? "Slowly release through your mouth..."
                  : "Rest for a moment before repeating..."}
              </p>
            </div>
            <ActionButton onClick={() => { setShowBreathingModal(false); toast.success("Breathing reset complete. You did great."); }}>
              Finish Exercise <Check size={16} />
            </ActionButton>
          </div>
        </div>
      )}

      {/* Resource Reader Modal */}
      {activeResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#ffffff] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#e2eae4] space-y-5">
            <div className="flex items-start justify-between border-b border-[#e7ebe5] pb-4">
              <div>
                <Eyebrow>{activeResource.type}</Eyebrow>
                <h3 className="section-title mt-1">{activeResource.title}</h3>
              </div>
              <button onClick={() => setActiveResource(null)} className="icon-button"><X size={18} /></button>
            </div>
            <p className="text-sm text-[#355850] leading-relaxed bg-[#f8fbf8] p-4 rounded-xl border border-[#e2eae4]">
              {activeResource.content}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <ActionButton onClick={() => { toast.success("Resource marked as completed"); setActiveResource(null); }}>
                Done Reading <Check size={16} />
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientCareTeam() {
  const [, setLocation] = useLocation();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showApptModal, setShowApptModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [apptDate, setApptDate] = useState("2026-10-05");
  const [apptTime, setApptTime] = useState("10:30 AM");
  const [apptReason, setApptReason] = useState("");

  const createNoteMutation = trpc.notes.create.useMutation();
  const createApptMutation = trpc.appointments.create.useMutation();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    try {
      await createNoteMutation.mutateAsync({
        patientId: 1,
        doctorId: 1,
        doctorName: "Dr. Meera Mehta",
        note: `[Patient Message]: ${messageText.trim()}`,
      });
      toast.success("Message sent securely to Dr. Meera Mehta.");
      setMessageText("");
      setShowMessageModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message.");
    }
  };

  const handleBookAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createApptMutation.mutateAsync({
        patientId: 1,
        doctorId: 1,
        doctorName: "Dr. Meera Mehta",
        date: apptDate,
        time: apptTime,
        reason: apptReason.trim() || "Regular follow-up session",
      });
      toast.success(`Appointment booked with Dr. Mehta for ${apptDate} at ${apptTime}!`);
      setShowApptModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to book appointment.");
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Your care circle" title="Support, with a human touch." detail="The people and pathways connected to your care." />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card care-card">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>Your doctor</Eyebrow>
              <h3 className="panel-title mt-1">Dr. Meera Mehta</h3>
              <p className="muted-copy mt-1">Psychiatry · MindSafe Care</p>
            </div>
            <Avatar initials="MM" tone="blue" size="lg" />
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <button onClick={() => setShowMessageModal(true)} className="care-action">
              <MessageCircle size={16} /> Message
            </button>
            <button onClick={() => setShowApptModal(true)} className="care-action">
              <CalendarDays size={16} /> Appointments
            </button>
          </div>
          <div className="care-note mt-5">
            <ShieldCheck size={15} />
            <span>Your records are visible only to you and your assigned doctor.</span>
          </div>
        </div>

        <div className="surface-card emergency-card">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>Always within reach</Eyebrow>
              <h3 className="panel-title mt-1">Need urgent help?</h3>
            </div>
            <div className="emergency-symbol"><HeartPulse size={19} /></div>
          </div>
          <p className="muted-copy mt-3">If you may hurt yourself or someone else, please call your local emergency number now.</p>
          <button className="emergency-button mt-6" onClick={() => setLocation("/emergency")}>
            View emergency support <ArrowUpRight size={16} />
          </button>
          <div className="emergency-contact mt-5">
            <span className="contact-initial">RK</span>
            <span><strong>Riya Kapoor</strong><small>Emergency contact · notified only for serious safety alerts</small></span>
            <ChevronRight size={15} />
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#ffffff] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2eae4] space-y-4">
            <div className="flex items-start justify-between border-b border-[#e7ebe5] pb-3">
              <div>
                <Eyebrow>Secure Communication</Eyebrow>
                <h3 className="section-title mt-1">Message Dr. Meera Mehta</h3>
              </div>
              <button onClick={() => setShowMessageModal(false)} className="icon-button"><X size={18} /></button>
            </div>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                required
                placeholder="Write your message or question for Dr. Mehta..."
                className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#f8fbf8] text-[#173330] focus:outline-none"
              />
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowMessageModal(false)} className="outline-action">Cancel</button>
                <ActionButton type="submit"><MessageCircle size={15} /> Send Message</ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {showApptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#ffffff] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2eae4] space-y-4">
            <div className="flex items-start justify-between border-b border-[#e7ebe5] pb-3">
              <div>
                <Eyebrow>Schedule Session</Eyebrow>
                <h3 className="section-title mt-1">Book Appointment</h3>
              </div>
              <button onClick={() => setShowApptModal(false)} className="icon-button"><X size={18} /></button>
            </div>
            <form onSubmit={handleBookAppt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#355850] mb-1">Preferred Date</label>
                <input
                  type="date"
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#f8fbf8] text-[#173330]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#355850] mb-1">Preferred Time Slot</label>
                <select
                  value={apptTime}
                  onChange={(e) => setApptTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#f8fbf8] text-[#173330]"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#355850] mb-1">Reason / Notes (Optional)</label>
                <input
                  type="text"
                  value={apptReason}
                  onChange={(e) => setApptReason(e.target.value)}
                  placeholder="e.g. Monthly medication review & check-in"
                  className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#f8fbf8] text-[#173330]"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowApptModal(false)} className="outline-action">Cancel</button>
                <ActionButton type="submit"><CalendarDays size={15} /> Confirm Booking</ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientMyRecords() {
  const patientId = 1;
  const prescriptionsQuery = trpc.prescriptions.listForPatient.useQuery({ patientId });
  const recordsQuery = trpc.records.listForPatient.useQuery({ patientId });
  const uploadMutation = trpc.records.upload.useMutation();

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (!validTypes.includes(file.type.toLowerCase())) {
        toast.error("Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error("File size is too large. Maximum file size is 15MB.");
        return;
      }
      setUploadFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please select a file to upload.");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileData = reader.result as string;
        await uploadMutation.mutateAsync({
          patientId,
          fileName: uploadFile.name,
          fileType: uploadFile.type,
          fileSize: uploadFile.size,
          fileData,
          title: title.trim() || uploadFile.name,
          description: description.trim() || undefined,
        });
        toast.success("Medical record uploaded successfully!");
        setUploadFile(null);
        setTitle("");
        setDescription("");
        recordsQuery.refetch();
      };
      reader.onerror = () => {
        toast.error("Failed to read file.");
        setUploading(false);
      };
      reader.readAsDataURL(uploadFile);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload record.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="My Medical & Mental Health History"
        title="My Records"
        detail="View doctor prescriptions and upload your previous medical documents securely."
        action={<span className="privacy-pill"><LockKeyhole size={12} /> private & secure</span>}
      />

      {/* Prescriptions Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Eyebrow>Doctor Prescriptions</Eyebrow>
            <h3 className="section-title mt-1">Prescribed Treatments</h3>
          </div>
          <span className="status-chip status-chip-mint"><Pill size={12} /> Auto-linked from doctor</span>
        </div>

        {prescriptionsQuery.isLoading ? (
          <div className="surface-card p-6 text-center muted-copy">Loading prescriptions...</div>
        ) : prescriptionsQuery.data && prescriptionsQuery.data.length > 0 ? (
          <div className="grid gap-4">
            {prescriptionsQuery.data.map((p) => (
              <div key={p.id} className="surface-card p-6">
                <div className="flex items-start justify-between border-b border-[#e7ebe5] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Avatar initials="MM" tone="blue" size="sm" />
                      <div>
                        <h4 className="font-bold text-[#173330]">{p.doctorName}</h4>
                        <p className="text-xs text-[#71817d]">
                          Prescribed on {new Date(p.prescriptionDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className="status-tag status-tag-mint">Active Prescription</span>
                </div>

                {p.doctorNotes && (
                  <div className="mt-4 rounded-xl bg-[#f7faf8] p-3 text-xs text-[#4e625c] border border-[#e2eae4]">
                    <strong>Doctor Instructions:</strong> {p.doctorNotes}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8a9993]">Prescribed Medicines:</p>
                  {p.medicines.map((m) => (
                    <div key={m.id} className="rounded-xl bg-[#f4f8f6] p-4 border border-[#e1ece5] flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Pill size={16} className="text-[#39796c]" />
                          <strong className="text-sm font-bold text-[#173330]">{m.drugName}</strong>
                          <span className="text-xs font-semibold text-[#5a8c80] bg-[#e2f0ea] px-2 py-0.5 rounded-md">{m.dosage}</span>
                        </div>
                        {m.foodRestrictions && (
                          <p className="text-xs text-[#6e807a] mt-1">Instructions: {m.foodRestrictions}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#456b62]">Duration: {m.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-card p-6 text-center muted-copy">
            No prescriptions found. Prescriptions issued by your doctor will automatically appear here.
          </div>
        )}
      </section>

      {/* Upload Previous Record Section */}
      <section className="surface-card p-6">
        <div className="flex items-center justify-between border-b border-[#e7ebe5] pb-4">
          <div>
            <Eyebrow>Upload Medical Records</Eyebrow>
            <h3 className="section-title mt-1">Add Previous Record</h3>
            <p className="muted-copy mt-1">Upload PDF, JPG, JPEG, or PNG files of previous medical or mental health reports.</p>
          </div>
          <FileUp size={22} className="text-[#4e8b7d]" />
        </div>

        <form onSubmit={handleUpload} className="mt-5 space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-bold text-[#355850] mb-1">Select File (PDF, JPG, PNG)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              className="block w-full text-xs text-[#526f68] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#e0f0e9] file:text-[#2d655b] hover:file:bg-[#d2e8df] cursor-pointer"
            />
            {uploadFile && (
              <p className="mt-1 text-xs text-[#39796c] font-semibold">Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#355850] mb-1">Record Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blood Test Report, Therapy Summary"
              className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#f8fbf8] text-[#173330] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#355850] mb-1">Description / Notes (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Prescribed by Dr. Sharma in July 2026"
              className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#f8fbf8] text-[#173330] focus:outline-none"
            />
          </div>

          <ActionButton type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Record"} <FileUp size={16} />
          </ActionButton>
        </form>
      </section>

      {/* Uploaded Records List */}
      <section className="space-y-4">
        <div>
          <Eyebrow>Your File Library</Eyebrow>
          <h3 className="section-title mt-1">Uploaded Records</h3>
        </div>

        {recordsQuery.isLoading ? (
          <div className="surface-card p-6 text-center muted-copy">Loading records...</div>
        ) : recordsQuery.data && recordsQuery.data.length > 0 ? (
          <div className="grid gap-3">
            {recordsQuery.data.map((r) => (
              <div key={r.id} className="surface-card p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn("p-3 rounded-xl flex-shrink-0", r.fileType.includes("pdf") ? "bg-[#e2eff2] text-[#4e8191]" : "bg-[#f4ead9] text-[#9d7951]")}>
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-[#173330] text-sm truncate">{r.title || r.fileName}</h4>
                    <p className="text-xs text-[#71817d] truncate">
                      {r.fileName} · Uploaded on {new Date(r.uploadDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                    {r.description && <p className="text-xs text-[#4e625c] mt-1">{r.description}</p>}
                  </div>
                </div>
                <button
                  onClick={() => window.open(r.fileUrl, "_blank")}
                  className="outline-action flex-shrink-0"
                >
                  <Eye size={15} /> View Record
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-card p-6 text-center muted-copy">
            No previous records uploaded yet. Use the upload section above to add medical reports or lab results.
          </div>
        )}
      </section>
    </div>
  );
}

function DoctorPatientDetails({ patientId, onBack }: { patientId: number; onBack: () => void }) {
  const detailsQuery = trpc.patients.getDetails.useQuery({ patientId });
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const clinicianName = meQuery.data?.name?.trim() || "Dr. Meera Mehta";
  const createPrescriptionMutation = trpc.prescriptions.create.useMutation();

  const [medicines, setMedicines] = useState<Array<{ drugName: string; dosage: string; duration: string; foodRestrictions: string }>>([
    { drugName: "", dosage: "", duration: "", foodRestrictions: "" },
  ]);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const addMedicine = () => {
    setMedicines((prev) => [...prev, { drugName: "", dosage: "", duration: "", foodRestrictions: "" }]);
  };

  const removeMedicine = (index: number) => {
    if (medicines.length <= 1) return;
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: string, value: string) => {
    setMedicines((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handlePrescribe = async (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < medicines.length; i++) {
      const m = medicines[i];
      if (!m.drugName.trim()) {
        toast.error(`Medicine #${i + 1}: Drug name is required.`);
        return;
      }
      if (!m.dosage.trim()) {
        toast.error(`Medicine #${i + 1}: Dosage is required.`);
        return;
      }
      if (!m.duration.trim()) {
        toast.error(`Medicine #${i + 1}: Duration is required.`);
        return;
      }
    }

    setSaving(true);
    try {
      await createPrescriptionMutation.mutateAsync({
        patientId,
        doctorId: meQuery.data?.id ?? 1,
        doctorName: clinicianName,
        doctorNotes: doctorNotes.trim() || undefined,
        medicines: medicines.map((m) => ({
          drugName: m.drugName.trim(),
          dosage: m.dosage.trim(),
          duration: m.duration.trim(),
          foodRestrictions: m.foodRestrictions.trim() || undefined,
        })),
      });

      toast.success("Prescription created and linked to patient successfully!");
      setMedicines([{ drugName: "", dosage: "", duration: "", foodRestrictions: "" }]);
      setDoctorNotes("");
      detailsQuery.refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create prescription.");
    } finally {
      setSaving(false);
    }
  };

  if (detailsQuery.isLoading) {
    return <div className="surface-card p-8 text-center muted-copy">Loading patient profile...</div>;
  }

  if (!detailsQuery.data || !detailsQuery.data.patient) {
    return (
      <div className="surface-card p-8 text-center muted-copy">
        Patient details could not be loaded. <button onClick={onBack} className="quiet-link underline ml-2">Back to list</button>
      </div>
    );
  }

  const { patient, records, prescriptions } = detailsQuery.data;

  return (
    <div className="space-y-8">
      <button onClick={onBack} className="quiet-link flex items-center gap-2 mb-2">
        <ArrowLeft size={16} /> Back to patient panel
      </button>

      {/* Patient Overview Header */}
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e7ebe5] pb-6">
          <div className="flex items-center gap-4">
            <Avatar initials={patient.initials} tone={patient.moodTone || "mint"} size="lg" />
            <div>
              <Eyebrow>Patient Profile</Eyebrow>
              <h2 className="section-title mt-1">{patient.name}</h2>
              <p className="muted-copy mt-1">
                {patient.condition} · {patient.age} years old ({patient.gender}) · DOB: {patient.dateOfBirth || "N/A"}
              </p>
              <p className="text-xs text-[#6e807a] mt-1">Contact: {patient.contact || "Not specified"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("status-tag", `status-tag-${patient.moodTone}`)}>Mood: {patient.mood}</span>
            <span className="status-tag status-tag-mint">{patient.status}</span>
          </div>
        </div>

        {/* Patient Details Grid */}
        <div className="grid gap-4 md:grid-cols-4 mt-6">
          <div className="bg-[#f7faf8] p-4 rounded-xl border border-[#e2eae4]">
            <span className="text-xs text-[#8a9993] font-bold block">PATIENT ID</span>
            <span className="text-sm font-bold text-[#173330] mt-1 block">#{patient.id}</span>
          </div>
          <div className="bg-[#f7faf8] p-4 rounded-xl border border-[#e2eae4]">
            <span className="text-xs text-[#8a9993] font-bold block">LAST SEEN</span>
            <span className="text-sm font-bold text-[#173330] mt-1 block">{patient.lastSeen}</span>
          </div>
          <div className="bg-[#f7faf8] p-4 rounded-xl border border-[#e2eae4]">
            <span className="text-xs text-[#8a9993] font-bold block">CONDITION</span>
            <span className="text-sm font-bold text-[#173330] mt-1 block truncate">{patient.condition}</span>
          </div>
          <div className="bg-[#f7faf8] p-4 rounded-xl border border-[#e2eae4]">
            <span className="text-xs text-[#8a9993] font-bold block">CARE STATUS</span>
            <span className="text-sm font-bold text-[#39766d] mt-1 block">{patient.status}</span>
          </div>
        </div>
      </section>

      {/* Previous Records Section */}
      <section className="surface-card p-6">
        <div className="flex items-center justify-between border-b border-[#e7ebe5] pb-4">
          <div>
            <Eyebrow>Patient Records</Eyebrow>
            <h3 className="section-title mt-1">Uploaded Medical History</h3>
            <p className="muted-copy mt-1">Previous medical reports and documents uploaded by the patient.</p>
          </div>
          <FileText size={20} className="text-[#55756c]" />
        </div>

        {records && records.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {records.map((r) => (
              <div key={r.id} className="bg-[#f8fbf8] p-4 rounded-xl border border-[#e1eae3] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn("p-2.5 rounded-lg flex-shrink-0", r.fileType.includes("pdf") ? "bg-[#e2eff2] text-[#4e8191]" : "bg-[#f4ead9] text-[#9d7951]")}>
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-sm text-[#173330] block truncate">{r.title || r.fileName}</strong>
                    <span className="text-xs text-[#71817d] block truncate">
                      {r.fileName} · Uploaded {new Date(r.uploadDate).toLocaleDateString()}
                    </span>
                    {r.description && <p className="text-xs text-[#4e625c] mt-0.5">{r.description}</p>}
                  </div>
                </div>
                <button
                  onClick={() => window.open(r.fileUrl, "_blank")}
                  className="outline-action flex-shrink-0"
                >
                  <Eye size={14} /> Open Record
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-copy mt-4 text-center">No previous records uploaded by this patient yet.</p>
        )}
      </section>

      {/* Previous Prescriptions History */}
      <section className="surface-card p-6">
        <div className="flex items-center justify-between border-b border-[#e7ebe5] pb-4">
          <div>
            <Eyebrow>Prescription History</Eyebrow>
            <h3 className="section-title mt-1">Previous Prescriptions</h3>
          </div>
          <Pill size={20} className="text-[#39796c]" />
        </div>

        {prescriptions && prescriptions.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {prescriptions.map((p) => (
              <div key={p.id} className="bg-[#f8fbf8] p-5 rounded-xl border border-[#e1eae3]">
                <div className="flex items-center justify-between border-b border-[#e7ebe5] pb-3">
                  <div>
                    <strong className="text-sm font-bold text-[#173330]">{p.doctorName}</strong>
                    <span className="text-xs text-[#71817d] ml-2">
                      · Prescribed on {new Date(p.prescriptionDate).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="status-tag status-tag-mint">Prescription #{p.id}</span>
                </div>

                {p.doctorNotes && (
                  <p className="text-xs text-[#4e625c] mt-3 bg-[#eff5f2] p-2.5 rounded-lg border border-[#e2eae4]">
                    <strong>Instructions:</strong> {p.doctorNotes}
                  </p>
                )}

                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-[#8a9993] uppercase">Medicines:</p>
                  {p.medicines.map((m) => (
                    <div key={m.id} className="bg-[#ffffff] p-3 rounded-lg border border-[#e5ebe6] flex flex-col md:flex-row md:items-center justify-between text-xs gap-2">
                      <div>
                        <strong className="text-[#173330] text-sm">{m.drugName}</strong>
                        <span className="ml-2 font-semibold text-[#39796c]">{m.dosage}</span>
                        {m.foodRestrictions && (
                          <span className="block text-[#6e807a] mt-0.5">Instructions: {m.foodRestrictions}</span>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-[#456b62]">Duration: {m.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-copy mt-4 text-center">No previous prescriptions recorded for this patient.</p>
        )}
      </section>

      {/* Create New Prescription Form */}
      <section className="surface-card p-6">
        <div className="border-b border-[#e7ebe5] pb-4">
          <Eyebrow>New Prescription</Eyebrow>
          <h3 className="section-title mt-1">Prescribe Treatment</h3>
          <p className="muted-copy mt-1">Create a new prescription for {patient.name}. Add multiple medicines if needed.</p>
        </div>

        <form onSubmit={handlePrescribe} className="mt-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[#173330]">Medicines List</h4>
              <button
                type="button"
                onClick={addMedicine}
                className="outline-action text-xs"
              >
                <Plus size={14} /> Add Medicine
              </button>
            </div>

            {medicines.map((med, index) => (
              <div key={index} className="bg-[#f7faf8] p-5 rounded-xl border border-[#e1eae4] relative space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#39796c] uppercase">Medicine #{index + 1}</span>
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedicine(index)}
                      className="text-xs text-[#bb665e] hover:underline flex items-center gap-1 font-bold"
                    >
                      <X size={14} /> Remove
                    </button>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-[#355850] mb-1">Drug / Medicine Name *</label>
                    <input
                      type="text"
                      required
                      value={med.drugName}
                      onChange={(e) => updateMedicine(index, "drugName", e.target.value)}
                      placeholder="e.g. Sertraline, Propranolol"
                      className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#ffffff] text-[#173330] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#355850] mb-1">Dosage *</label>
                    <input
                      type="text"
                      required
                      value={med.dosage}
                      onChange={(e) => updateMedicine(index, "dosage", e.target.value)}
                      placeholder="e.g. 50 mg · once daily"
                      className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#ffffff] text-[#173330] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#355850] mb-1">Duration / Period *</label>
                    <input
                      type="text"
                      required
                      value={med.duration}
                      onChange={(e) => updateMedicine(index, "duration", e.target.value)}
                      placeholder="e.g. 30 days, 2 weeks"
                      className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#ffffff] text-[#173330] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#355850] mb-1">Food Restrictions / Specific Instructions</label>
                  <input
                    type="text"
                    value={med.foodRestrictions}
                    onChange={(e) => updateMedicine(index, "foodRestrictions", e.target.value)}
                    placeholder="e.g. Take after breakfast with water. Avoid alcohol."
                    className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#ffffff] text-[#173330] focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#355850] mb-1">Additional Doctor Notes / Instructions</label>
            <textarea
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Patient reported mild anxiety spikes. Continue monitoring PHQ-9 check-ins."
              className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#f8fbf8] text-[#173330] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <ActionButton type="submit" disabled={saving}>
              {saving ? "Saving Prescription..." : "Prescribe / Save Prescription"} <Pill size={16} />
            </ActionButton>
          </div>
        </form>
      </section>
    </div>
  );
}

function DoctorOverview({ onNavigate }: { onNavigate: (nav: NavId) => void }) {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const patientsQuery = trpc.patients.list.useQuery();
  const patients = patientsQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = patients.find((patient) => patient.id === selectedId) ?? patients[0];
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const createNoteMutation = trpc.notes.create.useMutation();
  const clinicianName = meQuery.data?.name?.trim() || "Dr. Meera Mehta";

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !selected) return;
    try {
      await createNoteMutation.mutateAsync({
        patientId: selected.id,
        doctorId: meQuery.data?.id ?? 1,
        doctorName: clinicianName,
        note: noteContent.trim(),
      });
      toast.success(`Clinical note saved for ${selected.name}.`);
      setNoteContent("");
      setShowNoteModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save note.");
    }
  };

  return (
    <div className="space-y-8">
      <section className="doctor-hero">
        <div>
          <span className="hero-kicker hero-kicker-dark"><span className="live-dot live-dot-dark" /> {new Date().toLocaleDateString(undefined, { weekday: "long" })} care brief</span>
          <h2 className="doctor-heading mt-4">Good care starts<br /><em>with noticing.</em></h2>
          <p className="doctor-copy mt-4">A focused view of the people who are trusting you with their next step.</p>
        </div>
        <div className="doctor-hero-stamp"><Stethoscope size={22} /><span>MindSafe<br />care room</span></div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Users} label="Active patients" value={patientsQuery.isLoading ? "…" : String(patients.length)} note="in your care room" tone="blue" />
        <StatCard icon={FileCheck2} label="To review" value={patientsQuery.isLoading ? "…" : String(patients.filter((patient) => patient.status === "Review today").length)} note="today" tone="mint" />
        <StatCard icon={CircleAlert} label="Safety alerts" value={patientsQuery.isLoading ? "…" : String(patients.filter((patient) => patient.mood === "Needs care").length)} note="needs attention" tone="rose" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_1.5fr]">
        <div className="surface-card patient-inbox">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>Care inbox</Eyebrow>
              <h2 className="section-title mt-1">Your people, at a glance.</h2>
            </div>
            <button onClick={() => onNavigate("Patients")} className="quiet-link">View all <ArrowUpRight size={15} /></button>
          </div>
          <div className="mt-5 space-y-2">
            {patientsQuery.isLoading && <p className="animate-pulse text-xs text-[#71817d]">Loading patients…</p>}
            {!patientsQuery.isLoading && patients.length === 0 && (
              <p className="text-xs text-[#71817d]">No patients found. Add one from the Patients view.</p>
            )}
            {patients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => setSelectedId(patient.id)}
                className={cn("patient-row", selected?.id === patient.id && "patient-row-selected")}
              >
                <Avatar initials={patient.initials} tone={patient.moodTone ?? "ink"} size="sm" />
                <span className="min-w-0 flex-1 text-left">
                  <strong>{patient.name}</strong>
                  <small>{patient.condition}</small>
                </span>
                <span className={cn("mood-status", `mood-status-${patient.moodTone ?? "mint"}`)}>{patient.mood}</span>
                <span className="patient-last">{patient.lastSeen}</span>
                <ChevronRight size={15} className="text-[#a3ada8]" />
              </button>
            ))}
          </div>
        </div>

        {selected && (
        <div className="surface-card patient-detail">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar initials={selected.initials} tone={selected.moodTone ?? "ink"} size="lg" />
              <div>
                <Eyebrow>Selected patient</Eyebrow>
                <h2 className="section-title mt-1">{selected.name}</h2>
                <p className="muted-copy mt-1">{selected.condition} · {selected.age} years old</p>
              </div>
            </div>
            <button className="icon-button" onClick={() => onNavigate("Patients")} aria-label="Open complete patient profile">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="detail-stat-row mt-7">
            <div><span>Current mood</span><strong className="text-sm">{selected.mood}</strong><em>as recorded</em></div>
            <div><span>Last seen</span><strong className="text-sm">{selected.lastSeen}</strong><em>{selected.gender || "patient"}</em></div>
            <div><span>Care status</span><strong className="text-[#39766d]">{selected.status}</strong><em>{selected.condition}</em></div>
          </div>
          <LatestAssessmentCard patientId={selected.id} onNavigate={onNavigate} />
          <div className="mt-6 flex flex-wrap gap-3">
            <ActionButton onClick={() => onNavigate("Assessments")}>Review latest assessment <ArrowUpRight size={16} /></ActionButton>
            <button className="outline-action" onClick={() => setShowNoteModal(true)}>Add a note</button>
          </div>
        </div>
        )}
      </section>

      {/* Add Clinical Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#ffffff] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2eae4] space-y-4">
            <div className="flex items-start justify-between border-b border-[#e7ebe5] pb-3">
              <div>
                <Eyebrow>Clinical Documentation</Eyebrow>
                <h3 className="section-title mt-1">Add Note for {selected?.name ?? "patient"}</h3>
              </div>
              <button onClick={() => setShowNoteModal(false)} className="icon-button"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddNote} className="space-y-4">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
                required
                placeholder="Type clinical observations, progress updates, or care plan adjustments..."
                className="w-full px-3 py-2 text-xs border border-[#dce7df] rounded-lg bg-[#f8fbf8] text-[#173330] focus:outline-none"
              />
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowNoteModal(false)} className="outline-action">Cancel</button>
                <ActionButton type="submit"><Check size={15} /> Save Clinical Note</ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DoctorPatients() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const patientsQuery = trpc.patients.list.useQuery();

  if (selectedPatientId !== null) {
    return <DoctorPatientDetails patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} />;
  }

  const allPatients = patientsQuery.data || [];
  const filteredPatients = allPatients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.condition && p.condition.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.status && p.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Patient panel"
        title="People in your care."
        detail="Select a patient to view complete details, uploaded records, and create prescriptions."
      />
      <div className="surface-card overflow-hidden">
        <div className="table-toolbar flex items-center justify-between p-4 border-b border-[#e7ebe5]">
          <div className="search-field flex items-center gap-2 bg-[#f4f8f6] px-3 py-1.5 rounded-xl border border-[#dce7df] flex-1 max-w-md">
            <Search size={16} className="text-[#6d847c]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patients by name or condition..."
              className="bg-transparent text-xs text-[#173330] focus:outline-none w-full"
            />
            {searchTerm && <button onClick={() => setSearchTerm("")} className="text-xs text-[#8a9993]"><X size={14} /></button>}
          </div>
        </div>
        <div className="patient-table">
          {patientsQuery.isLoading ? (
            <div className="p-6 text-center muted-copy">Loading patient directory...</div>
          ) : filteredPatients.length > 0 ? (
            filteredPatients.map((patient) => (
              <div
                className="patient-table-row cursor-pointer hover:bg-[#f4f8f6] transition-colors"
                key={patient.id}
                onClick={() => setSelectedPatientId(patient.id)}
              >
                <Avatar initials={patient.initials} tone={patient.moodTone || "mint"} size="sm" />
                <div className="patient-table-name">
                  <strong>{patient.name}</strong>
                  <span>{patient.condition} · {patient.age}y</span>
                </div>
                <div className="table-metric">
                  <span>Latest mood</span>
                  <strong>{patient.mood}</strong>
                </div>
                <div className="table-metric">
                  <span>Last seen</span>
                  <strong>{patient.lastSeen}</strong>
                </div>
                <span
                  className={cn(
                    "status-tag",
                    patient.status === "Follow up"
                      ? "status-tag-rose"
                      : patient.status === "Review today"
                      ? "status-tag-sand"
                      : "status-tag-mint"
                  )}
                >
                  {patient.status}
                </span>
                <button
                  className="outline-action ml-auto text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPatientId(patient.id);
                  }}
                >
                  Open Details <ChevronRight size={15} />
                </button>
              </div>
            ))
          ) : (
            <div className="p-6 text-center muted-copy">No patients matching "{searchTerm}"</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DoctorAssessments({ onNavigate }: { onNavigate: (nav: NavId) => void }) {
  const assessmentsQuery = trpc.assessments.listAll.useQuery();
  const rows = assessmentsQuery.data ?? [];
  const [selectedAssessment, setSelectedAssessment] = useState<(typeof rows)[number] | null>(null);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Clinical review"
        title="Assessments, without the noise."
        detail="Check-ins your patients have completed, straight from their portal."
      />
      <div className="grid gap-3">
        {assessmentsQuery.isLoading && (
          <div className="surface-card p-6 text-center muted-copy">Loading assessments…</div>
        )}
        {!assessmentsQuery.isLoading && rows.length === 0 && (
          <div className="surface-card p-6 text-center muted-copy">
            No assessments submitted yet. Patients complete PHQ-9 and GAD-7 check-ins from their portal.
          </div>
        )}
        {rows.map((assessment) => {
          const share = assessment.maxScore > 0 ? assessment.score / assessment.maxScore : 0;
          const tone = share >= 0.7 ? "rose" : share >= 0.4 ? "sand" : "mint";
          return (
            <div className="surface-card assessment-review-row" key={assessment.id}>
              <div className={cn("assessment-icon", tone)}><FileCheck2 size={19} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="card-title">{assessment.title}</h3>
                  <span className="muted-copy">{assessment.type}</span>
                </div>
                <p className="mt-2 text-sm text-[#4d605b]">
                  {assessment.patientName} <span className="mx-1 text-[#b7c0bb]">·</span> {assessment.score}/{assessment.maxScore} · {new Date(assessment.completedAt).toLocaleDateString()}
                </p>
              </div>
              <span className={cn("status-tag", tone === "rose" ? "status-tag-rose" : tone === "sand" ? "status-tag-sand" : "status-tag-mint")}>
                {assessment.severity || "Recorded"}
              </span>
              <button
                className="outline-action"
                onClick={() => setSelectedAssessment(assessment)}
              >
                Open <ArrowUpRight size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Review Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#ffffff] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2eae4] space-y-4">
            <div className="flex items-start justify-between border-b border-[#e7ebe5] pb-3">
              <div>
                <Eyebrow>Clinical Review</Eyebrow>
                <h3 className="section-title mt-1">{selectedAssessment.title} — {selectedAssessment.patientName}</h3>
              </div>
              <button onClick={() => setSelectedAssessment(null)} className="icon-button"><X size={18} /></button>
            </div>
            <div className="space-y-3 bg-[#f8fbf8] p-4 rounded-xl border border-[#e2eae4] text-xs text-[#355850]">
              <p><strong>Assessment Type:</strong> {selectedAssessment.type}</p>
              <p><strong>Patient:</strong> {selectedAssessment.patientName}</p>
              <p><strong>Score:</strong> {selectedAssessment.score}/{selectedAssessment.maxScore}{selectedAssessment.severity ? ` · ${selectedAssessment.severity}` : ""}</p>
              <p><strong>Submitted:</strong> {new Date(selectedAssessment.completedAt).toLocaleString()}</p>
              {selectedAssessment.answersJson && (
                <p className="break-words text-[#4e625c]"><strong>Answers:</strong> {selectedAssessment.answersJson}</p>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <button className="outline-action" onClick={() => setSelectedAssessment(null)}>Close</button>
              <ActionButton onClick={() => { setSelectedAssessment(null); onNavigate("Patients"); }}>
                Open patient panel <ArrowUpRight size={16} />
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      <div className="security-banner">
        <ShieldCheck size={18} />
        <div><strong>Patient data is protected.</strong><span>Assessments are visible only to the assigned care team and the patient.</span></div>
        <ChevronRight size={16} className="ml-auto" />
      </div>
    </div>
  );
}

function DoctorMedication() {
  const prescriptionsQuery = trpc.prescriptions.listAll.useQuery();
  const prescriptions = prescriptionsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Treatment notes" title="Medication, with context." detail="Every prescription saved in the care room, with its instructions." />
      <div className="grid gap-4">
        {prescriptionsQuery.isLoading && (
          <div className="surface-card p-6 text-center muted-copy">Loading prescriptions…</div>
        )}
        {!prescriptionsQuery.isLoading && prescriptions.length === 0 && (
          <div className="surface-card p-6 text-center muted-copy">No prescriptions have been created yet.</div>
        )}
        {prescriptions.flatMap((prescription) =>
          prescription.items.map((item) => (
            <div className="surface-card medication-row" key={`${prescription.id}-${item.id}`}>
              <Avatar initials={prescription.patientInitials} tone="mint" size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9993]">{prescription.patientName}</p>
                <h3 className="card-title mt-1">{item.drugName}</h3>
                <p className="muted-copy mt-1">{item.dosage} · {item.duration}</p>
                {item.foodRestrictions && <p className="mt-1 text-xs text-[#71817d]">{item.foodRestrictions}</p>}
              </div>
              <div className="medication-review">
                <span>Prescribed</span>
                <strong>{new Date(prescription.prescriptionDate).toLocaleDateString()}</strong>
              </div>
            </div>
          )),
        )}
      </div>
    </div>
  );
}

function DoctorAlerts({ onSelectPatient }: { onSelectPatient?: (patientId: number) => void }) {
  const patientsQuery = trpc.patients.list.useQuery();
  const assessmentsQuery = trpc.assessments.listAll.useQuery();

  const patients = patientsQuery.data ?? [];
  const assessments = assessmentsQuery.data ?? [];

  // Signals are derived from real data only: a profile flagged "Needs care",
  // or a latest assessment scoring at least half of its maximum.
  const latestByPatient = new Map<number, (typeof assessments)[number]>();
  for (const assessment of [...assessments].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  )) {
    latestByPatient.set(assessment.patientId, assessment);
  }

  const signals = patients
    .map((patient) => ({ patient, latest: latestByPatient.get(patient.id) }))
    .filter(({ patient, latest }) =>
      patient.mood === "Needs care" || Boolean(latest && latest.maxScore > 0 && latest.score / latest.maxScore >= 0.5),
    );

  const loading = patientsQuery.isLoading || assessmentsQuery.isLoading;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Safety & follow-up" title="The moments that need you." detail="Derived from profile flags and real assessment scores — nothing is simulated." />

      {loading && <div className="surface-card p-6 text-center muted-copy">Checking for safety signals…</div>}

      {!loading && signals.length === 0 && (
        <div className="surface-card reminder-card">
          <div className="flex items-start justify-between">
            <div><Eyebrow>System check</Eyebrow><h3 className="panel-title mt-1">No active safety signals.</h3></div>
            <Check size={19} className="text-[#4e9386]" />
          </div>
          <p className="muted-copy mt-3">
            No patient is currently flagged “Needs care”, and no recent assessment is in a high score band.
          </p>
          <button className="quiet-link mt-5" onClick={() => onSelectPatient?.(1)}>
            View patient panel <ArrowUpRight size={15} />
          </button>
        </div>
      )}

      {signals.map(({ patient, latest }) => (
        <div className="surface-card alert-hero" key={patient.id}>
          <div className="alert-symbol"><CircleAlert size={20} /></div>
          <div>
            <span className="status-tag status-tag-rose">Needs attention</span>
            <h3 className="panel-title mt-3">{patient.name} may need follow-up.</h3>
            <p className="muted-copy mt-2 max-w-xl">
              {patient.mood === "Needs care" ? "Profile mood is flagged as “Needs care”. " : ""}
              {latest
                ? `Latest assessment ${latest.title} scored ${latest.score}/${latest.maxScore}${latest.severity ? ` (${latest.severity})` : ""} on ${new Date(latest.completedAt).toLocaleDateString()}.`
                : "No assessment has been submitted yet."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionButton onClick={() => onSelectPatient?.(patient.id)}>
                Open patient profile <ArrowUpRight size={16} />
              </ActionButton>
            </div>
          </div>
          <span className="alert-time">{patient.lastSeen}</span>
        </div>
      ))}
    </div>
  );
}

function LatestAssessmentCard({ patientId, onNavigate }: { patientId: number; onNavigate: (nav: NavId) => void }) {
  const query = trpc.assessments.listForPatient.useQuery({ patientId });
  const latest = [...(query.data ?? [])].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  )[0];

  return (
    <div className="mt-7 rounded-xl border border-[#e2eae4] bg-[#f8fbf8] p-4">
      <div className="flex items-center justify-between">
        <span className="chart-caption">Latest assessment</span>
        <button className="quiet-link" onClick={() => onNavigate("Assessments")}>Review all <ArrowUpRight size={14} /></button>
      </div>
      {query.isLoading ? (
        <p className="mt-3 animate-pulse text-xs text-[#71817d]">Loading assessment…</p>
      ) : latest ? (
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
          <strong className="text-sm text-[#173330]">{latest.title} · {latest.score}/{latest.maxScore}</strong>
          <span className="text-xs text-[#71817d]">
            {latest.severity || "recorded"} · {new Date(latest.completedAt).toLocaleDateString()}
          </span>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[#71817d]">No assessment recorded for this patient yet.</p>
      )}
    </div>
  );
}

function PortalContent({ role, activeNav, onNavigate }: { role: Role; activeNav: NavId; onNavigate: (nav: NavId) => void }) {
  if (role === "patient") {
    if (activeNav === "Companion") return <PatientCompanion />;
    if (activeNav === "Assessments") return <PatientAssessments />;
    if (activeNav === "Wellness") return <PatientWellness />;
    if (activeNav === "Care team") return <PatientCareTeam />;
    if (activeNav === "My Records") return <PatientMyRecords />;
    return <PatientOverview onNavigate={onNavigate} />;
  }
  if (activeNav === "Patients") return <DoctorPatients />;
  if (activeNav === "Assessments") return <DoctorAssessments onNavigate={onNavigate} />;
  if (activeNav === "Medication") return <DoctorMedication />;
  if (activeNav === "Alerts") return <DoctorAlerts onSelectPatient={() => onNavigate("Patients")} />;
  return <DoctorOverview onNavigate={onNavigate} />;
}

export default function Home() {
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [location, setLocation] = useLocation();

  // The portal is guarded by a real session: without one you go back to /login.
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => setLocation("/login"),
  });
  const user = meQuery.data ?? null;
  const role: Role = user?.portalRole === "doctor" ? "doctor" : "patient";

  const navItems = role === "patient" ? patientNav : doctorNav;
  const labels = portalLabels[language];
  const displayName = user?.name?.trim() || (role === "patient" ? "Patient" : "Clinician");
  const firstName = displayName.split(/\s+/)[0];
  const displayInitials = initialsOf(displayName);
  const todayLabel = new Date().toLocaleDateString(language === "telugu" ? "te-IN" : "en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const greeting = `${greetingForNow(language)}, ${firstName}.`;

  // Every section has a URL, so Back/Forward and refresh keep your place.
  const requestedNav = navFromLocation(location);
  const activeNav: NavId = requestedNav && canAccessSection(requestedNav, role) ? requestedNav : "Overview";

  useEffect(() => storeLanguage(language), [language]);
  useEffect(() => {
    // Wait for a settled response: a cached `null` while refetching must not
    // bounce a freshly signed-in visitor back to the login screen.
    if (meQuery.isPending || meQuery.isFetching) return;
    if (!meQuery.data) {
      const next = location.startsWith("/portal") ? `?next=${encodeURIComponent(location)}` : "";
      setLocation(`/login${next}`, { replace: true });
    }
  }, [meQuery.isPending, meQuery.isFetching, meQuery.data, location, setLocation]);

  // Normalise /portal and role-mismatched sections to a real section URL.
  useEffect(() => {
    if (!user) return;
    if (!requestedNav || !canAccessSection(requestedNav, role)) {
      setLocation(portalHref("Overview"), { replace: true });
      return;
    }
    if (location === "/portal" || location === "/portal/") {
      setLocation(portalHref(requestedNav), { replace: true });
    }
  }, [user, requestedNav, role, location, setLocation]);

  const navigate = (nav: NavId) => {
    setLocation(portalHref(nav));
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (meQuery.isLoading) {
    return (
      <div className="mindsafe-app flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-sm text-[#788984]">Opening your care space…</p>
      </div>
    );
  }

  if (!user) {
    // The effect above is navigating to /login; render nothing until then.
    return null;
  }

  return (
    <div className="mindsafe-app">
      <div className="ambient-glow ambient-glow-one" />
      <div className="ambient-glow ambient-glow-two" />
      <aside className={cn("app-sidebar", mobileOpen && "app-sidebar-open")}>
        <div className="sidebar-top"><Logo /><button className="sidebar-close lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={19} /></button></div>
        <div className="role-switcher" aria-label="Current portal view">
          <span className="role-switch-active">
            <span className={cn("role-dot", role === "patient" ? "role-dot-patient" : "role-dot-doctor")} />
            {role === "patient" ? "Patient" : "Doctor"}
          </span>
        </div>
        <div className="sidebar-section-label">{role === "patient" ? labels.patientSpace : labels.careRoom}</div>
        <nav className="sidebar-nav">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => navigate(label)} className={cn("nav-item", activeNav === label && "nav-item-active")}>
              <Icon size={18} strokeWidth={activeNav === label ? 2.1 : 1.7} />
              <span>{localizedNavLabel(label, language)}</span>
              {label === "Alerts" && <span className="nav-alert-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-lower">
          <div className="sidebar-note">
            <div className="sidebar-note-icon"><ShieldCheck size={16} /></div>
            <div>
              <strong>{role === "patient" ? "Your space is private." : "Privacy is built in."}</strong>
              <span>Protected by design, every step.</span>
            </div>
          </div>
          <button className="sidebar-help" onClick={() => setLocation("/help")}><CircleHelp size={17} />Help centre</button>
          <div className="profile-strip">
            <Avatar initials={displayInitials} tone={role === "patient" ? "ink" : "blue"} size="sm" />
            <div className="min-w-0 flex-1">
              <strong>{displayName}</strong>
              <span>{role === "patient" ? (user.demo ? "Demo patient account" : "Patient account") : "Clinician account"}</span>
            </div>
            <button className="icon-button" onClick={() => logoutMutation.mutate()} aria-label="Sign out" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && <button className="mobile-scrim lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

      <main className="app-main">
        <header className="topbar">
          <button className="mobile-menu lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="topbar-context">
            <span className="topbar-kicker">{role === "patient" ? labels.patient : labels.clinician}</span>
            <span className="topbar-divider">/</span>
            <span>{localizedNavLabel(activeNav, language)}</span>
          </div>
          <div className="topbar-actions">
            <label className="portal-language">
              <Languages size={14} />
              <select aria-label="Portal language" value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
                {Object.entries(languageLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
              </select>
            </label>
            <button className="theme-toggle" onClick={() => toggleTheme?.()} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button className="top-search" onClick={() => setShowSearchModal(true)}>
              <Search size={16} /><span>Search</span><kbd>⌘ K</kbd>
            </button>
            <button className="top-icon-button relative" onClick={() => setShowNotifications(!showNotifications)} aria-label="Notifications">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            <div className="top-avatar">
              <Avatar initials={displayInitials} tone={role === "patient" ? "ink" : "blue"} size="sm" />
            </div>
          </div>
        </header>

        {/* Global Search Modal */}
        {showSearchModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-20 p-4">
            <div className="bg-[#ffffff] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#e2eae4] space-y-4">
              <div className="flex items-center gap-3 border-b border-[#e7ebe5] pb-3">
                <Search size={18} className="text-[#39796c]" />
                <input
                  autoFocus
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search patients, medical records, resources, or care tools..."
                  className="w-full text-sm text-[#173330] focus:outline-none bg-transparent"
                />
                <button onClick={() => setShowSearchModal(false)} className="icon-button"><X size={16} /></button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <p className="text-[11px] font-bold uppercase text-[#8a9993]">Quick Jump</p>
                <button
                  onClick={() => { navigate(role === "patient" ? "My Records" : "Patients"); setShowSearchModal(false); }}
                  className="w-full text-left p-3 rounded-xl bg-[#f8fbf8] hover:bg-[#eef5f2] border border-[#e2eae4] flex items-center justify-between text-xs font-bold text-[#173330]"
                >
                  <span className="flex items-center gap-2"><FileText size={16} className="text-[#39796c]" /> {role === "patient" ? "My Records & Doctor Prescriptions" : "Patient Records & Prescriptions"}</span>
                  <ChevronRight size={15} />
                </button>
                {role === "patient" && (
                  <button
                    onClick={() => { navigate("Companion"); setShowSearchModal(false); }}
                    className="w-full text-left p-3 rounded-xl bg-[#f8fbf8] hover:bg-[#eef5f2] border border-[#e2eae4] flex items-center justify-between text-xs font-bold text-[#173330]"
                  >
                    <span className="flex items-center gap-2"><MessageCircle size={16} className="text-[#39796c]" /> MindSafe AI Companion Chat</span>
                    <ChevronRight size={15} />
                  </button>
                )}
                <button
                  onClick={() => { navigate("Assessments"); setShowSearchModal(false); }}
                  className="w-full text-left p-3 rounded-xl bg-[#f8fbf8] hover:bg-[#eef5f2] border border-[#e2eae4] flex items-center justify-between text-xs font-bold text-[#173330]"
                >
                  <span className="flex items-center gap-2"><FileCheck2 size={16} className="text-[#39796c]" /> PHQ-9 & GAD-7 Check-ins</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Popover */}
        {showNotifications && (
          <div className="fixed right-6 top-16 z-50 w-80 rounded-2xl bg-[#ffffff] p-5 shadow-2xl border border-[#e2eae4] space-y-3">
            <div className="flex items-center justify-between border-b border-[#e7ebe5] pb-2">
              <span className="text-xs font-bold text-[#173330]">Notifications</span>
              <button onClick={() => setShowNotifications(false)} className="text-xs text-[#8a9993]"><X size={14} /></button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#f8fbf8] border border-[#e2eae4]">
                <strong className="text-[#173330] block">You’re all caught up</strong>
                <span className="text-[#71817d]">Notifications appear here when your care team updates a record, note, or appointment.</span>
              </div>
            </div>
          </div>
        )}

        <div className="page-wrap">
          <div className="page-heading">
            <div>
              <Eyebrow>{todayLabel}</Eyebrow>
              <h1 className="page-title mt-2">{greeting}</h1>
              <p className="page-subtitle mt-2">{role === "patient" ? labels.patientSubtitle : labels.doctorSubtitle}</p>
            </div>
            <div className="page-heading-actions">
              <span className="secure-status"><span className="status-dot status-dot-mint" /> Secure session</span>
              <button className="date-pill"><CalendarDays size={15} /> {role === "patient" ? "Today" : "This week"}</button>
            </div>
          </div>
          <PortalContent role={role} activeNav={activeNav} onNavigate={navigate} />
        </div>
      </main>
    </div>
  );
}

