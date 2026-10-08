import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Leaf, LockKeyhole, ShieldCheck } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password to continue, or use the demo access below.");
      return;
    }
    setError("");
    setLocation("/portal");
  };

  return <div className="login-page"><header className="login-header"><Link href="/" className="journey-brand"><span className="landing-brand-mark"><Leaf size={20} /></span><span><strong>mindsafe</strong><small>a softer way forward</small></span></Link><div className="login-header-actions"><button className="theme-toggle" onClick={() => toggleTheme?.()} aria-label="Toggle theme">{theme === "dark" ? "☼" : "☾"}</button><Link href="/" className="login-back"><ArrowLeft size={14} /> Back to site</Link></div></header><main className="login-layout"><section className="login-intro"><span className="journey-eyebrow"><LockKeyhole size={14} /> Secure care space</span><h1>Come back to<br /><em>your space.</em></h1><p>Continue your check-ins, companion conversations, assessments, recovery path, and doctor-connected care.</p><div className="login-trust-list"><span><CheckCircle2 size={15} /> Private by design</span><span><CheckCircle2 size={15} /> English · తెలుగు</span><span><CheckCircle2 size={15} /> Tenglish in companion chat</span></div></section><section className="login-card"><div className="login-card-top"><div><span className="landing-section-eyebrow">Welcome back</span><h2>Sign in to MindSafe</h2></div><ShieldCheck size={22} /></div><div className="login-role-switch"><button className={role === "patient" ? "active" : ""} onClick={() => setRole("patient")} type="button">Patient</button><button className={role === "doctor" ? "active" : ""} onClick={() => setRole("doctor")} type="button">Doctor</button></div><form onSubmit={submit} className="login-form"><label>Email address<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" autoComplete="email" /></label><label>Password<div className="login-password"><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder="Enter your password" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>{error && <p className="login-error" role="alert">{error}</p>}<button className="login-submit" type="submit">Sign in as {role} <ArrowRight size={16} /></button></form><button className="login-demo" onClick={() => setLocation("/portal")} type="button">Continue with demo access</button><p className="login-legal">By continuing, you agree to MindSafe’s privacy and care-use terms. MindSafe is not an emergency service or a diagnosis.</p></section></main><footer className="journey-footer"><Link href="/"><Leaf size={16} /> mindsafe</Link><span><LockKeyhole size={13} /> Secure session</span><Link href="/404">Help & privacy</Link></footer></div>;
}
