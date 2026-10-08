import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  CircleAlert,
  HeartHandshake,
  Leaf,
  LockKeyhole,
  MessageCircle,
  Mic,
  Moon,
  Pill,
  Play,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  Users,
  Wind,
} from "lucide-react";
import { languageLabels, getStoredLanguage, storeLanguage, type Language } from "@/lib/language";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

const copy = {
  english: {
    nav: ["Mental health", "Recovery", "Self-check", "Get help", "Emergency"],
    eyebrow: "Private support · Doctor-connected · Built for real life",
    title: <>A safer way to<br /><em>move forward.</em></>,
    intro: "MindSafe brings mental-health support, recovery education, mood insight, and doctor-supervised care into one calm place.",
    primary: "Explore MindSafe",
    secondary: "I need help now",
    trust: "Confidential by design. Human care when it matters.",
    sectionTitle: "Support for the whole journey.",
    sectionCopy: "Start with what you need today. Move between education, self-checks, support, and care without losing the thread.",
    cards: [
      ["My mental health", "Understand depression, anxiety, sleep, and the small practices that can make today feel more manageable.", "Explore mental wellness", "mint"],
      ["Recovery & drug awareness", "Learn about substances, triggers, dependence, recovery pathways, and how to support someone you love.", "Learn about recovery", "sand"],
      ["I’m worried about someone", "Practical guidance for family and friends, with clear boundaries and ways to reach professional help.", "Find a way to help", "blue"],
      ["Emergency support", "Immediate resources, crisis guidance, and a direct path to help when waiting is not the right option.", "See emergency options", "rose"],
    ],
    journeyEyebrow: "Inside MindSafe",
    journeyTitle: "Care that remembers the whole person.",
    journeyCopy: "A patient can start with a check-in, a question, or a quiet conversation. Their doctor sees the meaningful pattern, not just a single score.",
    cta: "Enter the care space",
    safetyTitle: "Supportive, not diagnostic.",
    safetyCopy: "MindSafe is designed to listen, organize, and connect people with care. It never replaces emergency services or a licensed doctor.",
    storiesTitle: "Real life is not linear.",
    storiesCopy: "The product should feel useful on an ordinary Tuesday, not just during a crisis.",
    footer: "A softer way forward.",
  },
  telugu: {
    nav: ["మానసిక ఆరోగ్యం", "రికవరీ", "స్వీయ తనిఖీ", "సహాయం", "అత్యవసరం"],
    eyebrow: "ప్రైవేట్ సహాయం · వైద్యుల అనుసంధానం · నిజ జీవితానికి",
    title: <>ముందుకు వెళ్లడానికి<br /><em>సురక్షితమైన మార్గం.</em></>,
    intro: "మానసిక ఆరోగ్య సహాయం, రికవరీ విద్య, మూడ్ అవగాహన, మరియు వైద్యుల సంరక్షణను MindSafe ఒక ప్రశాంతమైన స్థలంలో కలుపుతుంది.",
    primary: "MindSafe చూడండి",
    secondary: "ఇప్పుడే సహాయం కావాలి",
    trust: "మీ గోప్యతను దృష్టిలో ఉంచి రూపొందించబడింది.",
    sectionTitle: "మీ ప్రయాణానికి సంపూర్ణ సహాయం.",
    sectionCopy: "ఈరోజు మీకు అవసరమైన చోట మొదలుపెట్టండి — విద్య, స్వీయ తనిఖీ, సహాయం, మరియు వైద్య సంరక్షణ ఒకే చోట.",
    cards: [
      ["నా మానసిక ఆరోగ్యం", "డిప్రెషన్, ఆందోళన, నిద్ర, మరియు ఈ రోజును కొంచెం సులభంగా మార్చే పద్ధతులను తెలుసుకోండి.", "మానసిక ఆరోగ్యం", "mint"],
      ["రికవరీ మరియు డ్రగ్ అవగాహన", "పదార్థాలు, ట్రిగ్గర్లు, ఆధారపడటం, రికవరీ మార్గాలు, మరియు సహాయం గురించి తెలుసుకోండి.", "రికవరీ నేర్చుకోండి", "sand"],
      ["ఎవరినైనా గురించి ఆందోళనగా ఉందా?", "కుటుంబం మరియు స్నేహితులకు ఉపయోగపడే స్పష్టమైన మార్గదర్శకాలు.", "ఎలా సహాయపడాలో చూడండి", "blue"],
      ["అత్యవసర సహాయం", "తక్షణ వనరులు, క్రైసిస్ మార్గదర్శకాలు, మరియు సరైన సహాయం పొందే మార్గం.", "అత్యవసర ఎంపికలు", "rose"],
    ],
    journeyEyebrow: "MindSafe లో",
    journeyTitle: "మొత్తం వ్యక్తిని గుర్తుంచుకునే సంరక్షణ.",
    journeyCopy: "ఒక చెక్-ఇన్, ఒక ప్రశ్న, లేదా నిశ్శబ్ద సంభాషణతో ప్రారంభించండి. వైద్యుడు ఒక్క స్కోర్ కాదు, మారుతున్న నమూనాను చూస్తారు.",
    cta: "కేర్ స్పేస్‌లోకి వెళ్లండి",
    safetyTitle: "సహాయకం, నిర్ధారణ కాదు.",
    safetyCopy: "MindSafe వినడానికి, సమాచారాన్ని క్రమబద్ధీకరించడానికి, మరియు సంరక్షణకు అనుసంధానించడానికి రూపొందించబడింది.",
    storiesTitle: "నిజ జీవితం సరళంగా ఉండదు.",
    storiesCopy: "ఈ ఉత్పత్తి కష్ట సమయంలో మాత్రమే కాదు, సాధారణ రోజుల్లో కూడా ఉపయోగపడాలి.",
    footer: "ముందుకు వెళ్లడానికి ఒక మృదువైన మార్గం.",
  },
  tenglish: {
    nav: ["Mental health", "Recovery", "Self-check", "Get help", "Emergency"],
    eyebrow: "Private support · Doctor connection · Real life kosam",
    title: <>Oka safer way to<br /><em>move forward.</em></>,
    intro: "MindSafe mental-health support, recovery education, mood insight, mariyu doctor-supervised care ni oka calm place lo kaluputundi.",
    primary: "MindSafe explore cheyyandi",
    secondary: "Naaku ippude help kavali",
    trust: "Mee privacy ni mind lo petti design chesam.",
    sectionTitle: "Mee journey motham kosam support.",
    sectionCopy: "Ivala meeku kavalsina place nunchi start cheyyandi — learning, self-check, support, care anni oke chota.",
    cards: [
      ["Na mental health", "Depression, anxiety, sleep, mariyu ee roju konchem manageable ga undadaniki small practices ni telusukondi.", "Mental wellness explore", "mint"],
      ["Recovery & drug awareness", "Substances, triggers, dependence, recovery paths, mariyu meeku important aina vallani ela support cheyyalo telusukondi.", "Recovery nerchukondi", "sand"],
      ["Evaraina gurinchi worry ga unda?", "Family and friends kosam practical guidance, boundaries, mariyu professional help ki clear path.", "Help ela cheyyalo", "blue"],
      ["Emergency support", "Immediate resources, crisis guidance, mariyu wait cheyyakudadani anipinchinappudu help ki direct path.", "Emergency options", "rose"],
    ],
    journeyEyebrow: "MindSafe lo",
    journeyTitle: "Motham person ni gurthupettukune care.",
    journeyCopy: "Check-in, question, leda quiet conversation tho start cheyyachu. Doctor okka score kaadu, meaningful pattern ni chustaru.",
    cta: "Care space loki vellandi",
    safetyTitle: "Supportive, diagnosis kaadu.",
    safetyCopy: "MindSafe listen cheyyadaniki, organize cheyyadaniki, care tho connect cheyyadaniki design chesam. Emergency services ki replacement kaadu.",
    storiesTitle: "Real life linear ga undadu.",
    storiesCopy: "Product crisis time lo matrame kaadu, ordinary Tuesday lo kuda useful ga undali.",
    footer: "Oka softer way forward.",
  },
} as const;

type Copy = (typeof copy)[Language];

function LanguageSelector({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return <label className="landing-language"><span className="sr-only">Language</span><span className="landing-language-icon">文</span><select value={language === "telugu" ? "telugu" : "english"} onChange={(event) => onChange(event.target.value as Language)}>{(["english", "telugu"] as const).map((key) => <option value={key} key={key}>{languageLabels[key]}</option>)}</select><ChevronDown size={14} /></label>;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <button className="theme-toggle" onClick={() => toggleTheme?.()} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>;
}

function Brand() {
  return <Link href="/" className="landing-brand"><span className="landing-brand-mark"><Leaf size={21} /></span><span><strong>mindsafe</strong><small>a softer way forward</small></span></Link>;
}

function FeatureIcon({ type }: { type: string }) {
  const Icon = type === "mental" ? HeartHandshake : type === "recovery" ? Pill : type === "voice" ? Mic : type === "check" ? ShieldCheck : type === "doctor" ? Stethoscope : MessageCircle;
  return <span className="landing-feature-icon"><Icon size={19} strokeWidth={1.8} /></span>;
}

function PublicHeader({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  const t = copy[language];
  const [location] = useLocation();
  const routes = ["/mental-health", "/recovery", "/portal", "/help", "/emergency"];
  return (
    <header className="landing-header">
      <Brand />
      <nav className="landing-nav">
        {t.nav.map((item, index) => {
          const route = routes[index];
          const isActive = location === route;
          return (
            <Link
              href={route}
              key={route}
              className={cn("nav-pill", isActive && "nav-pill-active")}
            >
              {item}
            </Link>
          );
        })}
      </nav>
      <div className="landing-header-actions">
        <LanguageSelector language={language} onChange={onChange} />
        <ThemeToggle />
        <Link href="/login" className="landing-login">
          Sign in <ArrowUpRight size={15} />
        </Link>
      </div>
    </header>
  );
}

function LandingSection({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return <section className={cn("landing-section", className)} id={id}>{children}</section>;
}

export default function LandingPage() {
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage() === "telugu" ? "telugu" : "english");
  const t: Copy = copy[language];
  useEffect(() => storeLanguage(language), [language]);

  return <div className="landing-page">
    <PublicHeader language={language} onChange={setLanguage} />
    <main>
      <LandingSection className="landing-hero-wrap">
        <div className="landing-hero-grid" />
        <div className="landing-hero-orb landing-hero-orb-one" />
        <div className="landing-hero-orb landing-hero-orb-two" />
        <div className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">
              <span className="landing-live-dot" />
              {t.eyebrow}
            </span>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
            <div className="landing-hero-actions">
              <a href="#how-it-works" className="landing-primary-action">
                {t.primary} <ArrowRight size={17} />
              </a>
              <Link href="/emergency" className="landing-secondary-action">
                <CircleAlert size={15} />
                {t.secondary}
              </Link>
            </div>
            <div className="landing-trust-row">
              <span>
                <LockKeyhole size={14} />
                {t.trust}
              </span>
              <span className="landing-trust-divider" />
              <span>EN · తెలుగు</span>
            </div>
          </div>
          <div className="landing-hero-art">
            <div className="landing-art-ring landing-art-ring-one" />
            <div className="landing-art-ring landing-art-ring-two" />
            <div className="landing-art-orb">
              <Wind size={34} strokeWidth={1.4} />
            </div>
            <div className="landing-art-note note-one">notice</div>
            <div className="landing-art-note note-two">breathe</div>
            <div className="landing-art-note note-three">return</div>
          </div>
        </div>
      </LandingSection>

      <LandingSection className="landing-segment-section" id="how-it-works"><div className="landing-section-heading"><div><span className="landing-section-eyebrow">01 · Choose your starting point</span><h2>Two journeys.<br /><em>One safer place.</em></h2></div><p>Start with the part of life that feels most present. Both paths lead to education, self-checks, supportive tools, and doctor-connected care.</p></div><div className="landing-segment-grid"><a className="landing-segment-card landing-segment-mental" id="mental-health" href="/mental-health"><div className="segment-card-top"><span className="landing-card-number">01</span><FeatureIcon type="mental" /></div><div><span className="landing-segment-label">Depression · anxiety · mood</span><h3>{language === "telugu" ? "మానసిక ఆరోగ్యం" : "Depression & mental health"}</h3><p>{language === "telugu" ? "మూడ్, ఆందోళన, నిద్ర, మరియు డాక్టర్ సహాయంతో ముందుకు వెళ్లే చిన్న అడుగులు." : "Understand your mood, depression, anxiety, sleep, and the small steps that can make today feel more manageable."}</p></div><span className="landing-segment-footer">Explore mental health <ArrowUpRight size={16} /></span></a><a className="landing-segment-card landing-segment-recovery" id="recovery" href="/recovery"><div className="segment-card-top"><span className="landing-card-number">02</span><FeatureIcon type="recovery" /></div><div><span className="landing-segment-label">Awareness · recovery · support</span><h3>{language === "telugu" ? "డ్రగ్ అడిక్షన్ & రికవరీ" : "Drug addiction & recovery"}</h3><p>{language === "telugu" ? "పదార్థాలు, ట్రిగ్గర్లు, క్రేవింగ్స్, రికవరీ మార్గాలు, మరియు సిగ్గులేని సహాయం గురించి తెలుసుకోండి." : "Learn about substances, triggers, cravings, recovery pathways, and how to support yourself or someone you love without shame."}</p></div><span className="landing-segment-footer">Explore recovery <ArrowUpRight size={16} /></span></a></div></LandingSection>

      <LandingSection className="landing-intro" id="self-check"><div className="landing-section-heading"><div><span className="landing-section-eyebrow">02 · {t.sectionTitle}</span><h2>{t.sectionTitle}</h2></div><p>{t.sectionCopy}</p></div><div className="landing-help-grid">{t.cards.map(([title, description, action, tone], index) => <a href={index === 0 ? "/mental-health" : index === 1 ? "/recovery" : index === 2 ? "/help" : "/emergency"} className={cn("landing-help-card", `landing-help-${tone}`)} key={title}><span className="landing-card-number">0{index + 1}</span><FeatureIcon type={index === 0 ? "mental" : index === 1 ? "recovery" : index === 2 ? "doctor" : "emergency"} /><h3>{title}</h3><p>{description}</p><span className="landing-card-link">{action} <ArrowUpRight size={15} /></span></a>)}</div></LandingSection>

      <LandingSection className="landing-journey" id="patients"><div className="landing-journey-art"><div className="journey-sun" /><div className="journey-hill journey-hill-one" /><div className="journey-hill journey-hill-two" /><div className="journey-line" /><div className="journey-marker marker-one">01</div><div className="journey-marker marker-two">02</div><div className="journey-marker marker-three">03</div><span className="journey-art-label">one small step at a time</span></div><div className="landing-journey-copy"><span className="landing-section-eyebrow">{t.journeyEyebrow}</span><h2>{t.journeyTitle}</h2><p>{t.journeyCopy}</p><div className="landing-journey-list"><div><FeatureIcon type="check" /><span><strong>Check in without judgement</strong><small>Mood, sleep, cravings, and what feels present.</small></span></div><div><FeatureIcon type="voice" /><span><strong>Talk in the language that feels natural</strong><small>English or Telugu on the site; Tenglish in the companion chat.</small></span></div><div><FeatureIcon type="doctor" /><span><strong>Keep your doctor in the loop</strong><small>Summaries, records, medication, and safety signals.</small></span></div></div><Link href="/portal" className="landing-inline-action">{t.cta} <ArrowRight size={16} /></Link></div></LandingSection>

      <LandingSection className="landing-toolkit" id="clinicians"><div className="landing-section-heading"><div><span className="landing-section-eyebrow">02 · Built for the real workflow</span><h2>One place. The whole picture.</h2></div><p>Patient support and doctor insight should feel connected, not like separate products stitched together.</p></div><div className="landing-toolkit-grid"><div className="landing-tool-large landing-tool-green"><div><FeatureIcon type="chat" /><span className="landing-tool-label">AI companion</span><h3>Say the thing<br /><em>in your own words.</em></h3><p>Private text and voice sessions with language-aware responses and gentle redirection.</p></div><div className="landing-chat-preview"><div className="chat-preview-top"><span className="landing-mini-orb"><Sparkles size={13} /></span><span>your companion</span><span className="chat-preview-private"><LockKeyhole size={10} /> private</span></div><div className="chat-preview-bubble">Naku ee roju konchem heavy ga anipistundi.</div><div className="chat-preview-bubble chat-preview-response">Adi vinadaniki kastam ga undi. Oka small step tho start cheddama?</div></div></div><div className="landing-tool-column"><div className="landing-tool-small landing-tool-sand"><FeatureIcon type="recovery" /><span className="landing-tool-label">Drug awareness</span><h3>Information that<br />doesn’t shame.</h3><p>Risks, triggers, recovery pathways, and support for families.</p><a href="/mental-health">Explore library <ArrowUpRight size={14} /></a></div><div className="landing-tool-small landing-tool-blue"><FeatureIcon type="doctor" /><span className="landing-tool-label">Doctor view</span><h3>Patterns, not<br />just paperwork.</h3><p>Assessments, mood trends, records, medication, and alerts together.</p><a href="/portal">Open care room <ArrowUpRight size={14} /></a></div></div></div></LandingSection>

      <LandingSection className="landing-learn" id="learn"><div className="landing-section-heading"><div><span className="landing-section-eyebrow">03 · Learn at your pace</span><h2>Knowledge can be a form of care.</h2></div><p>Short, readable resources that help patients and families understand what is happening — and what to do next.</p></div><div className="landing-learn-grid"><article className="learn-feature-card"><div className="learn-feature-visual"><div className="learn-sun" /><div className="learn-shape learn-shape-one" /><div className="learn-shape learn-shape-two" /><span>mental health / recovery / support</span></div><div className="learn-feature-body"><span className="landing-tool-label">Featured guide</span><h3>If this continues…<br /><em>what could help?</em></h3><p>Understand patterns early, make room for support, and choose a next step that is realistic.</p><a href="/portal">Read the guide <ArrowUpRight size={15} /></a></div></article><div className="learn-list-card"><span className="landing-tool-label">Explore topics</span><h3>For the next ten minutes.</h3><div className="learn-list"><a href="/portal"><span className="learn-list-icon"><BookOpen size={16} /></span><span><strong>Depression, without the jargon</strong><small>Read · 6 min</small></span><ArrowUpRight size={15} /></a><a href="/portal"><span className="learn-list-icon learn-list-icon-blue"><Play size={15} fill="currentColor" /></span><span><strong>What a craving can feel like</strong><small>Watch · 4 min</small></span><ArrowUpRight size={15} /></a><a href="/portal"><span className="learn-list-icon learn-list-icon-sand"><Users size={16} /></span><span><strong>How to support someone safely</strong><small>Read · 5 min</small></span><ArrowUpRight size={15} /></a></div></div></div></LandingSection>

      <LandingSection className="landing-emergency" id="emergency"><div className="landing-emergency-copy"><span className="landing-eyebrow landing-eyebrow-warm"><CircleAlert size={14} /> When waiting is not the right option</span><h2>Urgent help<br /><em>should be clear.</em></h2><p>{t.safetyCopy}</p><div className="landing-emergency-actions"><Link href="/emergency" className="landing-emergency-primary">See emergency support <ArrowUpRight size={16} /></Link><Link href="/portal" className="landing-emergency-secondary">Open patient safety tools</Link></div></div><div className="landing-emergency-panel"><div className="landing-emergency-panel-head"><span className="landing-mini-orb landing-mini-orb-warm"><ShieldCheck size={14} /></span><span>MindSafe safety layer</span><span className="landing-safety-live"><i /> active</span></div><div className="landing-safety-line"><span>Every companion message</span><strong>screened for safety</strong></div><div className="landing-safety-line"><span>Emergency language</span><strong>EN · తెలుగు · TE</strong></div><div className="landing-safety-line"><span>Care team status</span><strong className="landing-status-ready">ready to notify</strong></div><div className="landing-safety-note"><LockKeyhole size={13} /> Your safety comes before the conversation.</div></div></LandingSection>

      <LandingSection className="landing-final"><span className="landing-section-eyebrow">{t.footer}</span><h2>There is room for<br /><em>a next step.</em></h2><p>{t.storiesCopy}</p><Link href="/portal" className="landing-primary-action">{t.primary} <ArrowRight size={17} /></Link></LandingSection>
    </main>
    <footer className="landing-footer"><Brand /><div><span>Private support for real life.</span><span>English · తెలుగు</span></div><span>© 2026 MindSafe</span></footer>
  </div>;
}
