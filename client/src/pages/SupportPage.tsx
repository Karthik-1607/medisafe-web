import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, CircleAlert, HeartHandshake, Leaf, LockKeyhole, MessageCircle, PhoneCall, ShieldCheck, Stethoscope } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function SupportPage({ emergency = false }: { emergency?: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const title = emergency ? "Urgent support should be clear." : "You do not have to work it out alone.";
  const intro = emergency ? "If you may hurt yourself or someone else, or feel unable to stay safe, contact your local emergency service now. MindSafe can help you find the next step, but it is not an emergency service." : "Choose the kind of support that fits this moment. You can start quietly, talk with a doctor, or move directly to urgent resources.";
  const items = emergency ? [
    ["Immediate danger", "Contact your local emergency service now, or go to the nearest emergency department. If possible, stay with someone you trust.", "Call local emergency service"],
    ["Talk to your doctor", "Open your MindSafe care space to review your safety plan and doctor-connected support.", "Open care space"],
    ["Make the next ten minutes safer", "Move away from anything you could use to harm yourself, get near another person, and take one small grounding step.", "See grounding steps"],
  ] : [
    ["Start with a self-check", "Use a short check-in to put words around mood, anxiety, cravings, or what feels difficult today.", "Open patient space"],
    ["Talk to a doctor", "Find the care-room entry point and keep questions, records, and follow-ups together.", "Open doctor-connected care"],
    ["Help someone you love", "Learn how to listen without taking over, set boundaries, and encourage professional support.", "Read family guidance"],
  ];

  const activate = (title: string) => {
    if (title === "Immediate danger") window.location.href = "tel:112";
    else if (title === "Talk to your doctor" || title === "Start with a self-check" || title === "Open care space") window.location.href = "/portal";
    else setExpanded(expanded === title ? null : title);
  };

  return <div className={`support-page ${emergency ? "support-page-emergency" : "support-page-help"}`}><header className="support-header"><Link href="/" className="journey-brand"><span className="landing-brand-mark"><Leaf size={20} /></span><span><strong>mindsafe</strong><small>a softer way forward</small></span></Link><div className="support-header-actions"><button className="theme-toggle" onClick={() => toggleTheme?.()} aria-label="Toggle theme">{theme === "dark" ? "☼" : "☾"}</button><Link href="/login" className="journey-sign-in">Sign in <ArrowRight size={14} /></Link></div></header><main><div className="support-breadcrumb"><Link href="/"><ArrowLeft size={14} /> Back to home</Link></div><section className="support-hero"><span className="journey-eyebrow"><CircleAlert size={14} /> {emergency ? "Emergency support" : "Get help"}</span><h1>{title}</h1><p>{intro}</p><div className="support-safety-note"><LockKeyhole size={15} /> Your information stays private unless you choose to share it with your doctor.</div></section><section className="support-options">{items.map(([heading, description, action], index) => <article className="support-option" key={heading}><span className="support-option-icon">{index === 0 ? <PhoneCall size={19} /> : index === 1 ? <Stethoscope size={19} /> : <HeartHandshake size={19} />}</span><span className="support-option-number">0{index + 1}</span><h2>{heading}</h2><p>{description}</p><button onClick={() => activate(heading)}>{action} <ArrowRight size={15} /></button>{expanded === heading && <div className="support-expanded"><ShieldCheck size={15} /> {emergency ? "Try naming five things you can see, four you can feel, and one person you can contact. If safety is still uncertain, use emergency services now." : "You can start with one sentence. You do not need to explain everything before asking for support."}</div>}</article>)}</section><section className="support-footer-cta"><MessageCircle size={22} /><div><h2>Need a quiet place to start?</h2><p>MindSafe’s companion can listen in English, Telugu, or Tenglish. It is supportive, not diagnostic.</p></div><Link href="/portal" className="landing-primary-action">Open companion <ArrowRight size={16} /></Link></section></main><footer className="journey-footer"><Link href="/"><Leaf size={16} /> mindsafe</Link><span>Emergency services remain the fastest option in immediate danger.</span><Link href="/404">Help & privacy</Link></footer></div>;
}
