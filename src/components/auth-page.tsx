"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleHelp,
  Eye,
  EyeOff,
  KeyRound,
  LaptopMinimal,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  TicketCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserTicketPanel } from "@/components/user-ticket-panel";
import { TechnicianDashboard } from "@/components/technician-dashboard";
import {
  getAuthErrorMessage,
  getAuthSnapshot,
  loginWithPassword,
  logout,
  parseAuthSnapshot,
  registerUser,
  getServerAuthSnapshot,
  subscribeToAuthSession,
} from "@/lib/auth";

type AuthMode = "login" | "register";

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const authSnapshot = useSyncExternalStore(
    subscribeToAuthSession,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );
  const session = parseAuthSnapshot(authSnapshot);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (mode === "register") {
      const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
      if (password !== passwordConfirm) {
        setError("Hasła nie są takie same.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await loginWithPassword(email, password);
      } else {
        await registerUser(
          email,
          password,
          String(formData.get("passwordConfirm") ?? ""),
        );
        form.reset();
        setEmail(email);
        setMode("login");
        setNotice("Konto zostało utworzone. Możesz się teraz zalogować.");
      }
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setShowPassword(false);
  }

  function handleLogout() {
    logout();
    setNotice("Wylogowano z konta.");
  }

  if (session?.user.role === "uzytkownik") {
    return <UserTicketPanel session={session} onLogout={handleLogout} />;
  }
  if (session?.user.role === "technik") {
    return <TechnicianDashboard session={session} onLogout={handleLogout} />;
  }

  return (
    <main className="auth-shell">
      <header className="auth-header">
        <Link className="brand" href="/" aria-label="Szkolny Helpdesk — strona główna">
          <span className="brand-mark"><Wrench size={19} strokeWidth={2.5} /></span>
          <span className="brand-name">szkolny<span>helpdesk</span></span>
        </Link>
        <div className="header-note"><span className="online-dot" /> System zgłoszeń szkolnych</div>
      </header>

      <section className="auth-layout" aria-label="Logowanie i rejestracja">
        <div className="welcome-panel">
          <div className="welcome-grid" aria-hidden="true" />
          <div className="welcome-content">
            <div className="welcome-eyebrow"><span /> POMOC TECHNICZNA W TWOJEJ SZKOLE</div>
            <h1>Coś nie działa?<br /><span>Ogarnijmy to.</span></h1>
            <p className="welcome-copy">Zgłoś usterkę w kilka chwil. Informacja od razu trafi do zespołu technicznego.</p>

            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon"><TicketCheck size={19} /></span>
                <span><strong>Proste zgłaszanie usterek</strong><small>Przekaż problem bez szukania właściwej osoby</small></span>
                <Check className="feature-check" size={16} />
              </div>
              <div className="feature-item">
                <span className="feature-icon"><LaptopMinimal size={19} /></span>
                <span><strong>Sprzęt, sale i multimedia</strong><small>Jedno miejsce na szkolne usterki</small></span>
                <Check className="feature-check" size={16} />
              </div>
            </div>
          </div>

          <div className="welcome-footer">
            <div className="avatar-stack" aria-hidden="true"><span>IT</span><span>✓</span><span>+</span></div>
            <span>Wsparcie techniczne<br /><strong>zawsze pod ręką</strong></span>
            <ShieldCheck className="footer-shield" size={21} />
          </div>
          <div className="decor-orbit orbit-one" aria-hidden="true" />
          <div className="decor-orbit orbit-two" aria-hidden="true" />
          <div className="decor-spark" aria-hidden="true">✳</div>
        </div>

        <div className="form-panel">
          {session ? (
            <div className="success-state" role="status">
              <div className="success-icon"><Check size={28} strokeWidth={2.5} /></div>
              <p className="form-kicker">DOSTĘP POTWIERDZONY</p>
              <h2>Miło Cię widzieć.</h2>
              <p className="form-description">Zalogowano jako <strong>{session.user.email}</strong>.</p>
              <div className="role-pill"><ShieldCheck size={16} /> {session.user.role === "technik" ? "Technik" : "Użytkownik"}</div>
              <Button className="submit-button logout-button" onClick={handleLogout} type="button">
                Wyloguj się <ArrowRight size={17} />
              </Button>
              <p className="session-note">Sesja jest zapisana w tej przeglądarce.</p>
            </div>
          ) : (
            <>
              <div className="form-heading">
                <div className="form-kicker">WITAJ W SZKOLNYM HELPDESKU</div>
                <h2>{mode === "login" ? "Zaloguj się" : "Utwórz konto"}</h2>
                <p className="form-description">
                  {mode === "login"
                  ? "Zaloguj się, aby zgłaszać usterki lub obsługiwać je jako technik."
                    : "Dołącz do systemu zgłoszeń swojej szkoły."}
                </p>
              </div>

              <div className="auth-tabs" role="tablist" aria-label="Wybierz logowanie lub rejestrację">
                <Button
                  className={mode === "login" ? "auth-tab active" : "auth-tab"}
                  id="login-tab"
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  onClick={() => changeMode("login")}
                  variant="ghost"
                >
                  Logowanie
                </Button>
                <Button
                  className={mode === "register" ? "auth-tab active" : "auth-tab"}
                  id="register-tab"
                  type="button"
                  role="tab"
                  aria-selected={mode === "register"}
                  onClick={() => changeMode("register")}
                  variant="ghost"
                >
                  Rejestracja
                </Button>
              </div>

              {notice && <div className="notice-message" role="status"><Check size={16} /> {notice}</div>}
              {error && <div className="error-message" role="alert"><CircleHelp size={17} /> <span>{error}</span></div>}

              <form className="auth-form" onSubmit={handleSubmit} aria-labelledby={`${mode}-tab`}>
                <Label className="field-label" htmlFor="email">Adres e-mail</Label>
                <div className="input-wrap">
                  <Mail className="input-icon" size={18} aria-hidden="true" />
                  <Input
                    autoComplete="email"
                    className="auth-input"
                    id="email"
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="imie@szkola.pl"
                    required
                    type="email"
                    value={email}
                  />
                </div>

                <div className="password-label-row">
                  <Label className="field-label" htmlFor="password">Hasło</Label>
                  {mode === "login" && <span className="field-hint">minimum 8 znaków</span>}
                </div>
                <div className="input-wrap">
                  <KeyRound className="input-icon" size={18} aria-hidden="true" />
                  <Input
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="auth-input password-input"
                    id="password"
                    minLength={8}
                    name="password"
                    placeholder="••••••••••"
                    required
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                    className="password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    type="button"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {mode === "register" && (
                  <>
                    <Label className="field-label confirm-label" htmlFor="passwordConfirm">Powtórz hasło</Label>
                    <div className="input-wrap">
                      <LockKeyhole className="input-icon" size={18} aria-hidden="true" />
                      <Input
                        autoComplete="new-password"
                        className="auth-input"
                        id="passwordConfirm"
                        minLength={8}
                        name="passwordConfirm"
                        placeholder="Wpisz hasło ponownie"
                        required
                        type={showPassword ? "text" : "password"}
                      />
                    </div>
                    <p className="register-role-note"><UserRound size={15} /> Rejestracja tworzy konto użytkownika. Rola technika jest nadawana przez administratora.</p>
                  </>
                )}

                <Button aria-busy={isSubmitting} className="submit-button" disabled={isSubmitting} type="submit">
                  {isSubmitting ? <><LoaderCircle className="spin" size={18} /><span className="sr-only">Trwa wysyłanie formularza</span></> : <span>{mode === "login" ? "Zaloguj się" : "Utwórz konto"}</span>}
                  {!isSubmitting && <ArrowRight size={18} />}
                </Button>
              </form>

              <div className="form-security"><LockKeyhole size={14} /> Logowanie obsługuje PocketBase Auth</div>
            </>
          )}
        </div>
      </section>

      <footer className="page-footer">
        <span>© 2026 Szkolny Helpdesk</span>
        <span className="footer-help"><CircleHelp size={14} /> Potrzebujesz pomocy? Skontaktuj się z administratorem szkoły.</span>
      </footer>
    </main>
  );
}
