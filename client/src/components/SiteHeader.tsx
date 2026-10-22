import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, ChevronDown, Leaf, Menu, Moon, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { languageLabels, type Language } from "@/lib/language";
import { useTheme } from "@/contexts/ThemeContext";
import {
  careSpaceLink,
  isActivePath,
  journeyLinks,
  labelFor,
  pillars,
  primaryLinks,
  type PillarId,
} from "@/lib/siteNav";

type HeaderProps = {
  language: Language;
  onLanguageChange: (language: Language) => void;
};

/** Public pages only offer the two written languages; Tenglish is for companion chat. */
const headerLanguages: Language[] = ["english", "telugu"];

export function SiteHeader({ language, onLanguageChange }: HeaderProps) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => setOpen(false), [location]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand" aria-label="MediSafe home">
          <span className="landing-brand-mark">
            <Leaf size={20} />
          </span>
          <span>
            <strong>medisafe</strong>
            <small>a softer way forward</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          {primaryLinks.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              aria-current={isActivePath(location, link.href) ? "page" : undefined}
              className={cn(
                "site-nav-link",
                isActivePath(location, link.href) && "site-nav-link-active",
                link.id === "emergency" && "site-nav-link-emergency",
              )}
            >
              {labelFor(link, language)}
            </Link>
          ))}
        </nav>

        <div className="site-header-actions">
          <label className="site-language">
            <span className="sr-only">Language</span>
            <select
              value={language === "telugu" ? "telugu" : "english"}
              onChange={(event) => onLanguageChange(event.target.value as Language)}
            >
              {headerLanguages.map((key) => (
                <option value={key} key={key}>
                  {languageLabels[key]}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </label>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => toggleTheme?.()}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Link href={careSpaceLink.href} className="site-cta">
            {labelFor(careSpaceLink, language)} <ArrowUpRight size={14} />
          </Link>
          <button
            type="button"
            className="site-menu-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="site-mobile-nav"
            aria-label={open ? "Close navigation" : "Open navigation"}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="site-mobile-panel" id="site-mobile-nav">
          <div className="site-mobile-group">
            <span className="site-mobile-label">Journeys</span>
            {pillars.map((pillar) => (
              <Link
                key={pillar.id}
                href={pillar.href}
                className={cn(
                  "site-mobile-link",
                  isActivePath(location, pillar.href) && "site-mobile-link-active",
                )}
              >
                <span>
                  <strong>{labelFor(pillar, language)}</strong>
                  <small>{pillar.scope[language]}</small>
                </span>
                <ArrowUpRight size={15} />
              </Link>
            ))}
          </div>
          <div className="site-mobile-group">
            <span className="site-mobile-label">Support</span>
            {journeyLinks.map((link) => (
              <Link key={link.id} href={link.href} className="site-mobile-link">
                <span>
                  <strong>{labelFor(link, language)}</strong>
                </span>
                <ArrowUpRight size={15} />
              </Link>
            ))}
            <Link href="/emergency" className="site-mobile-link site-mobile-link-emergency">
              <span>
                <strong>{labelFor(primaryLinks[3], language)}</strong>
              </span>
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link href={careSpaceLink.href} className="site-mobile-cta">
            {labelFor(careSpaceLink, language)} <ArrowUpRight size={15} />
          </Link>
        </div>
      )}
    </header>
  );
}

/**
 * Sits under the header on both journey pages. The two journeys are always
 * one click apart, and the shared destinations (self-check, doctor, help)
 * intentionally appear under both of them.
 */
export function JourneySubnav({ active, language }: { active: PillarId; language: Language }) {
  return (
    <div className="journey-subnav">
      <div className="journey-subnav-inner">
        <div className="journey-switch" role="tablist" aria-label="Choose your journey">
          {pillars.map((pillar) => (
            <Link
              key={pillar.id}
              href={pillar.href}
              role="tab"
              aria-selected={active === pillar.id}
              className={cn(
                "journey-switch-tab",
                active === pillar.id && "journey-switch-tab-active",
              )}
            >
              {labelFor(pillar, language)}
            </Link>
          ))}
        </div>
        <nav className="journey-subnav-links" aria-label="Shared journey resources">
          {journeyLinks.map((link) => (
            <Link key={link.id} href={link.href}>
              {labelFor(link, language)}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
