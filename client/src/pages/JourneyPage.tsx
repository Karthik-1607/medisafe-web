import { Link } from "wouter";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, CircleAlert, HeartHandshake, Leaf, LockKeyhole, Moon, Pill, ShieldCheck, Sparkles, Sun, Stethoscope, Wind } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useState } from "react";
import { getStoredLanguage, storeLanguage, type Language } from "@/lib/language";

export type JourneyKind = "mental" | "recovery";

const content = {
  mental: {
    eyebrow: "Mental health journey",
    title: <>A little more room<br /><em>to breathe.</em></>,
    intro: "A calm, practical starting point for depression, anxiety, sleep, mood changes, and the moments that feel difficult to name.",
    color: "mental",
    icon: HeartHandshake,
    topics: [
      ["Notice what is present", "Gentle mood, sleep, energy, and anxiety check-ins help you see patterns without reducing you to a score."],
      ["Learn without the jargon", "Clear guides for depression, anxiety, overwhelm, and supportive daily practices."],
      ["Talk it through", "A private AI companion for reflection in English, Telugu, or Tenglish inside the conversation."],
    ],
    actions: ["Start a self-check", "Explore depression support", "Find a doctor"],
  },
  recovery: {
    eyebrow: "Drug addiction & recovery",
    title: <>Recovery is not<br /><em>all or nothing.</em></>,
    intro: "Understand substances, cravings, triggers, dependence, and recovery pathways with information that is direct, humane, and never shaming.",
    color: "recovery",
    icon: Pill,
    topics: [
      ["Understand the pattern", "Learn about substances, dependence, triggers, cravings, withdrawal awareness, and safer next steps."],
      ["Build a recovery path", "Track milestones, reflections, medication context, and the moments that deserve extra support."],
      ["Keep support connected", "Share meaningful progress with your doctor while keeping private reflections under your control."],
    ],
    actions: ["Start a recovery check", "Explore drug awareness", "Find a doctor"],
  },
} as const;

function LanguageControl({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return <select className="journey-language" aria-label="Page language" value={language === "telugu" ? "telugu" : "english"} onChange={(event) => onChange(event.target.value as Language)}><option value="english">English</option><option value="telugu">తెలుగు</option></select>;
}

export default function JourneyPage({ kind }: { kind: JourneyKind }) {
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage() === "telugu" ? "telugu" : "english");
  const { theme, toggleTheme } = useTheme();
  const data = content[kind];
  const Icon = data.icon;
  const isTelugu = language === "telugu";
  const setPageLanguage = (next: Language) => { setLanguage(next); storeLanguage(next); };

  return <div className={`journey-page journey-page-${data.color}`}>
    <header className="journey-header"><Link href="/" className="journey-brand"><span className="landing-brand-mark"><Leaf size={20} /></span><span><strong>mindsafe</strong><small>a softer way forward</small></span></Link><nav><Link href="/mental-health">Mental health</Link><Link href="/recovery">Recovery</Link><Link href="/help">Get help</Link><Link href="/emergency">Emergency</Link></nav><div className="journey-header-actions"><LanguageControl language={language} onChange={setPageLanguage} /><button className="theme-toggle" onClick={() => toggleTheme?.()} aria-label="Toggle theme">{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button><Link href="/login" className="journey-sign-in">Sign in <ArrowRight size={14} /></Link></div></header>
    <main>
      <section className="journey-hero"><div className="journey-hero-copy"><Link href="/" className="journey-back"><ArrowLeft size={14} /> Back to MindSafe</Link><span className="journey-eyebrow"><Icon size={14} /> {isTelugu ? data.eyebrow : data.eyebrow}</span><h1>{isTelugu ? (kind === "mental" ? <>మానసిక ఆరోగ్యానికి<br /><em>కొంచెం ఊపిరి.</em></> : <>రికవరీ అనేది<br /><em>అన్నీ లేదా ఏమీ కాదు.</em></>) : data.title}</h1><p>{isTelugu ? (kind === "mental" ? "డిప్రెషన్, ఆందోళన, నిద్ర, మూడ్ మార్పులు, మరియు చెప్పడానికి కష్టమైన క్షణాల కోసం ప్రశాంతమైన ప్రారంభ స్థలం." : "పదార్థాలు, క్రేవింగ్స్, ట్రిగ్గర్లు, ఆధారపడటం, మరియు రికవరీ మార్గాలను నేరం మోపకుండా అర్థం చేసుకోండి.") : data.intro}</p><div className="journey-hero-actions"><Link href="/portal" className="landing-primary-action">{data.actions[0]} <ArrowRight size={16} /></Link><Link href="/help" className="landing-secondary-action"><CircleAlert size={15} /> Need support?</Link></div><span className="journey-privacy"><LockKeyhole size={13} /> Private by design · Doctor-connected when you choose</span></div><div className="journey-hero-art"><div className="journey-art-glow" /><div className="journey-art-orbit journey-art-orbit-one" /><div className="journey-art-orbit journey-art-orbit-two" /><div className="journey-art-core"><Icon size={40} strokeWidth={1.2} /></div><span className="journey-art-chip chip-one">notice</span><span className="journey-art-chip chip-two">return</span></div></section>
      <section className="journey-content"><div className="journey-content-heading"><span className="landing-section-eyebrow">What you can do here</span><h2>{isTelugu ? "మీకు సరిపోయే చిన్న అడుగులు." : "Start where it feels useful."}</h2><p>{isTelugu ? "మీకు అవసరమైన చోట నుండి ప్రారంభించండి. పరిపూర్ణ రోజులు అవసరం లేదు." : "Choose one small thing. You do not need a perfect day to begin."}</p></div><div className="journey-topic-grid">{data.topics.map(([title, description], index) => <article className="journey-topic-card" key={title}><span className="journey-topic-number">0{index + 1}</span><span className="journey-topic-icon">{index === 0 ? <Wind size={19} /> : index === 1 ? <BookOpen size={19} /> : <Sparkles size={19} />}</span><h3>{isTelugu ? ["ఇప్పుడు ఏమి జరుగుతుందో గమనించండి", "సులభమైన భాషలో తెలుసుకోండి", "దాని గురించి మాట్లాడండి"][index] : title}</h3><p>{isTelugu ? ["మూడ్, నిద్ర, శక్తి, మరియు ఆందోళనను గమనించండి.", "డిప్రెషన్, ఆందోళన, క్రేవింగ్స్ మరియు సహాయక పద్ధతులను తెలుసుకోండి.", "మీకు సహజంగా అనిపించే భాషలో సురక్షితమైన సంభాషణ."][index] : description}</p><Link href={index === 2 ? "/portal" : "/help"}>Learn more <ArrowUpRightIcon /></Link></article>)}</div></section>
      <section className="journey-care-strip"><div><span className="journey-eyebrow"><Stethoscope size={14} /> Connected care</span><h2>{isTelugu ? "ఒక్కసారి చేసిన చెక్-ఇన్ కంటే ఎక్కువ." : "More than a one-time check-in."}</h2><p>{isTelugu ? "మీకు అనుమతి ఉన్నప్పుడు, మీ డాక్టర్ అర్థవంతమైన నమూనాలను చూడగలరు — చెక్-ఇన్‌లు, అంచనాలు, మందులు, మరియు మీ మాటలు." : "When you choose to share, your doctor can see meaningful patterns across check-ins, assessments, medication, and what you have said."}</p></div><div className="journey-care-list"><span><CheckCircle2 size={16} /> Mood and progress patterns</span><span><CheckCircle2 size={16} /> Validated self-checks</span><span><CheckCircle2 size={16} /> Medication context</span><span><CheckCircle2 size={16} /> Safety support when needed</span></div></section>
      <section className="journey-bottom-cta"><ShieldCheck size={23} /><div><h2>{isTelugu ? "ఇది నిర్ధారణ కాదు. ఇది ఒక ప్రారంభం." : "Supportive, not diagnostic."}</h2><p>{isTelugu ? "MindSafe వినడానికి, క్రమబద్ధీకరించడానికి, మరియు సంరక్షణతో అనుసంధానించడానికి రూపొందించబడింది." : "MindSafe helps you listen, organize, and connect with care. It does not replace emergency services or a licensed doctor."}</p></div><Link href="/login" className="landing-primary-action">Enter MindSafe <ArrowRight size={16} /></Link></section>
    </main>
    <footer className="journey-footer"><Link href="/"><Leaf size={16} /> mindsafe</Link><span>English · తెలుగు · Tenglish in companion chat</span><Link href="/404">Help & privacy</Link></footer>
  </div>;
}

function ArrowUpRightIcon() { return <ArrowRight size={14} />; }
