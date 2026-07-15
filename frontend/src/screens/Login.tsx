/* The Teller Window — "Present your credentials."
   email+password → MFA challenge → 6 engraved digit boxes → vault door. */
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { api, tokens, ApiProblem, WatchInterrupted, type MfaChallenge, type TokenPair } from "../api/client";
import { useAuth } from "../shell/AuthContext";
import { useLockMode } from "../shell/ModeContext";
import { Rosette } from "../canon/Rosette";
import { Overprint } from "../canon/Overprint";
import { MASTER_PARAMS } from "../engine/rosette";
import "./login.css";

type Stage = "credentials" | "enrol" | "totp" | "vault-door";

export function Login() {
  const [stage, setStage] = useState<Stage>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { reload } = useAuth();
  useLockMode("note"); // public documents are printed notes

  /* The watermark develops: each field completed raises its opacity a step. */
  const filled = (email ? 1 : 0) + (password ? 1 : 0);
  const watermarkOpacity = stage === "totp" || stage === "enrol"
    ? 0.06 + digits.filter(Boolean).length * 0.01
    : filled * 0.03;

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await api<{ data: MfaChallenge }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setMfaToken(res.data.mfa_token);
      if (!res.data.mfa_enrolled) {
        // First login: enrol. The otpauth URI arrives exactly once and is
        // rendered as a QR only — never displayed as text (Law 3).
        const enrol = await fetch(`${import.meta.env.VITE_API_BASE ?? "http://localhost:8000"}/api/v1/auth/mfa/enroll`, {
          method: "POST",
          headers: { Authorization: `Bearer ${res.data.mfa_token}` },
        });
        if (!enrol.ok) throw new ApiProblem(enrol.status, "Enrolment failed");
        const body = await enrol.json();
        const dataUrl = await QRCode.toDataURL(body.data.otpauth_uri, {
          margin: 1, width: 180,
          color: { dark: "#1c1b16", light: "#f3eddf" },
        });
        setQrDataUrl(dataUrl);
        setStage("enrol");
      } else {
        setStage("totp");
        setTimeout(() => digitRefs.current[0]?.focus(), 50);
      }
    } catch (err) {
      setError(err instanceof WatchInterrupted ? err.message
        : err instanceof ApiProblem ? (err.detail ?? err.title)
        : "The teller could not process your request.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTotp(code: string) {
    setBusy(true); setError(null);
    try {
      const res = await api<{ data: TokenPair }>("/api/v1/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ mfa_token: mfaToken, code }),
      });
      tokens.set(res.data);
      await reload();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) { navigate("/alerts"); return; }
      setStage("vault-door");
      setTimeout(() => navigate("/alerts"), 650);
    } catch (err) {
      setDigits(Array(6).fill(""));
      digitRefs.current[0]?.focus();
      setError(err instanceof WatchInterrupted ? err.message
        : err instanceof ApiProblem ? (err.detail ?? err.title)
        : "The code was not accepted.");
    } finally {
      setBusy(false);
    }
  }

  function onDigit(i: number, value: string) {
    const v = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) digitRefs.current[i + 1]?.focus();
    const code = next.join("");
    if (code.length === 6) void submitTotp(code);
  }

  function onDigitKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) digitRefs.current[i - 1]?.focus();
  }

  if (stage === "vault-door") {
    return (
      <div className="teller-field">
        <div className="teller-watermark" style={{ opacity: 0.12 }}>
          <Rosette params={MASTER_PARAMS} size={320} tier={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="teller-field fibered">
      <div className="teller-watermark" style={{ opacity: watermarkOpacity }} aria-hidden>
        <Rosette params={MASTER_PARAMS} size={340} tier={3} />
      </div>
      <div className="teller">
        {/* SPECIMEN — the operator is a specimen until proven. Lifts on success. */}
        <div className="teller__specimen" aria-hidden>
          <Overprint tone="vermilion" size="full">SPECIMEN</Overprint>
        </div>
        <div className="teller__head">
          <div className="teller__wordmark v-display">ARGUS · PRISM</div>
          <div className="teller__rule" />
          <h1 className="teller__invite v-display">
            {stage === "credentials" ? "Present your credentials."
              : stage === "enrol" ? "Your key is cut once."
              : "The second key, please."}
          </h1>
        </div>

        {stage === "credentials" ? (
          <form className="teller__form" onSubmit={submitCredentials}>
            <label className="field">
              <span className="field__label">Officer email</span>
              <input className="field__input" type="email" required autoFocus
                autoComplete="username" placeholder="officer@bank.in"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Password</span>
              <input className="field__input" type="password" required
                autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && <ReturnedNote reason={error} />}
            <button className="btn btn--primary teller__submit" disabled={busy} type="submit">
              {busy ? "Verifying…" : "Approach the window"}
            </button>
          </form>
        ) : stage === "enrol" ? (
          <div className="teller__form teller__enrol">
            {qrDataUrl && <img className="teller__qr" src={qrDataUrl} alt="TOTP enrolment QR — scan with your authenticator" />}
            <p className="teller__enrol-note">
              Scan with your authenticator app. This key is shown once and
              never again — regenerating cuts a different key.
            </p>
            <button className="btn btn--primary" onClick={() => {
              setQrDataUrl(null);
              setStage("totp");
              setTimeout(() => digitRefs.current[0]?.focus(), 50);
            }}>
              I hold the key — continue
            </button>
            {error && <ReturnedNote reason={error} />}
          </div>
        ) : (
          <div className="teller__form">
            <div className="totp">
              {digits.map((d, i) => (
                <input key={i}
                  ref={(el) => { digitRefs.current[i] = el; }}
                  className={`totp__digit${d ? " totp__digit--filled" : ""}`}
                  inputMode="numeric" maxLength={1} value={d} disabled={busy}
                  aria-label={`Digit ${i + 1} of 6`}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onKeyDown={(e) => onDigitKey(i, e)} />
              ))}
            </div>
            {error && <ReturnedNote reason={error} />}
            <button className="btn btn--quiet teller__back" onClick={() => { setStage("credentials"); setError(null); }}>
              Return to the window
            </button>
          </div>
        )}

        <div className="teller__micr v-machine">⑆ UNION BANK OF INDIA ⑆ PRISM V3 ⑆</div>
      </div>
    </div>
  );
}

/* Error as a RETURNED stamp + machine reason — the paper world's problem. */
function ReturnedNote({ reason }: { reason: string }) {
  return (
    <div className="returned" role="alert">
      <Overprint tone="vermilion" size="body">RETURNED</Overprint>
      <span className="returned__reason">{reason}</span>
    </div>
  );
}
