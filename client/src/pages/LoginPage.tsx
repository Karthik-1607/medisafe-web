import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Leaf, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";

type Mode = "login" | "register";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const login = trpc.auth.login.useMutation();
  const register = trpc.auth.register.useMutation();
  const demo = trpc.auth.demo.useMutation();
  const pending = login.isPending || register.isPending || demo.isPending;

  // A guarded destination (e.g. /portal/assessments) is restored after sign-in.
  const finish = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/portal";
    // Drop the anonymous `auth.me = null` cache so the portal does not treat
    // the new session as signed out while it refetches.
    queryClient.clear();
    setLocation(safeNext, { replace: true });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "register" && !name.trim()) {
      setError("Enter your name to create an account.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password to continue, or use demo access below.");
      return;
    }
    if (mode === "register" && password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }

    try {
      if (mode === "register") {
        await register.mutateAsync({ name: name.trim(), email: email.trim(), password, role });
        toast.success("Account created — welcome to MindSafe.");
      } else {
        await login.mutateAsync({ email: email.trim(), password });
        toast.success("Signed in securely.");
      }
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const startDemo = async () => {
    setError("");
    try {
      await demo.mutateAsync();
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the demo session.");
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <Link href="/" className="journey-brand">
          <span className="landing-brand-mark"><Leaf size={20} /></span>
          <span><strong>mindsafe</strong><small>a softer way forward</small></span>
        </Link>
        <div className="login-header-actions">
          <button className="theme-toggle" onClick={() => toggleTheme?.()} aria-label="Toggle theme">
            {theme === "dark" ? "☼" : "☾"}
          </button>
          <Link href="/" className="login-back"><ArrowLeft size={14} /> Back to site</Link>
        </div>
      </header>

      <main className="login-layout">
        <section className="login-intro">
          <span className="journey-eyebrow"><LockKeyhole size={14} /> Secure care space</span>
          <h1>Come back to<br /><em>your space.</em></h1>
          <p>Continue your check-ins, companion conversations, assessments, recovery path, and doctor-connected care.</p>
          <div className="login-trust-list">
            <span><CheckCircle2 size={15} /> Private by design</span>
            <span><CheckCircle2 size={15} /> English · తెలుగు</span>
            <span><CheckCircle2 size={15} /> Tenglish in companion chat</span>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-top">
            <div>
              <span className="landing-section-eyebrow">{mode === "login" ? "Welcome back" : "Create your account"}</span>
              <h2>{mode === "login" ? "Sign in to MindSafe" : "Join MindSafe"}</h2>
            </div>
            <ShieldCheck size={22} />
          </div>

          {mode === "register" && (
            <div className="login-role-switch">
              <button className={role === "patient" ? "active" : ""} onClick={() => setRole("patient")} type="button">Patient</button>
              <button className={role === "doctor" ? "active" : ""} onClick={() => setRole("doctor")} type="button">Doctor</button>
            </div>
          )}

          <form onSubmit={submit} className="login-form">
            {mode === "register" && (
              <label>
                Full name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  type="text"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              Email address
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <div className="login-password">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="login-submit" type="submit" disabled={pending}>
              {pending
                ? "Please wait…"
                : mode === "login"
                  ? <>Sign in <ArrowRight size={16} /></>
                  : <>Create {role} account <ArrowRight size={16} /></>}
            </button>
          </form>

          <button className="login-demo" onClick={switchMode} type="button">
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
          <button className="login-demo" onClick={startDemo} type="button" disabled={pending}>
            Continue with demo access
          </button>
          <p className="login-legal">
            By continuing, you agree to MindSafe’s privacy and care-use terms. MindSafe is not an emergency service or a diagnosis.
          </p>
        </section>
      </main>

      <footer className="journey-footer">
        <Link href="/"><Leaf size={16} /> mindsafe</Link>
        <span><LockKeyhole size={13} /> Secure session</span>
        <Link href="/help">Help & privacy</Link>
      </footer>
    </div>
  );
}
