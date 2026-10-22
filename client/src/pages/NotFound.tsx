import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, CircleAlert, Leaf, Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { getStoredLanguage, storeLanguage, type Language } from "@/lib/language";

export default function NotFound() {
  const [language, setLanguage] = useState<Language>(() => (getStoredLanguage() === "telugu" ? "telugu" : "english"));
  const setPageLanguage = (next: Language) => {
    setLanguage(next);
    storeLanguage(next);
  };

  useEffect(() => {
    document.title = "MediSafe — Page Not Found";
  }, []);

  return <div className="error-page">
    <SiteHeader language={language} onLanguageChange={setPageLanguage} />
    <main className="error-main"><div className="error-orb"><CircleAlert size={31} /></div><span className="journey-eyebrow"><Search size={14} /> Route not found</span><h1>That page<br /><em>isn’t here.</em></h1><p>The link may have changed, or the page may still be finding its place. You can return to a safe starting point below.</p><div className="error-actions"><Link href="/" className="landing-primary-action">Go to home <ArrowRight size={16} /></Link><Link href="/help" className="landing-secondary-action">Get help <ArrowRight size={15} /></Link></div></main>
    <footer className="journey-footer"><Link href="/"><Leaf size={16} /> medisafe</Link><span>Private support for real life.</span><Link href="/emergency">Emergency support</Link></footer>
  </div>;
}
