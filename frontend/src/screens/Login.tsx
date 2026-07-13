/* The Teller Window — "Present your credentials."
   email+password → MFA challenge → 6 engraved digit boxes → vault door. */
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, tokens, ApiProblem, WatchInterrupted, type MfaChallenge, type TokenPair } from "../api/client";
import { useAuth } from "../shell/AuthContext";
import "./login.css";

type Stage = "credentials" | "totp" | "vault-door";

export function Login() {
  const [stage, setStage] = useState<Stage>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { reload } = useAuth();

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await api<{ data: MfaChallenge }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setMfaToken(res.data.mfa_token);
      setStage("totp");
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
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
        <div className="vault-door" aria-label="Entering the vault">
          <div className="vault-door__leaf" />
        </div>
      </div>
    );
  }

  return (
    <div className="teller-field">
      <div className="teller paper">
        <div className="teller__head">
          <div className="teller__wordmark v-institution">ARGUS · PRISM</div>
          <div className="teller__rule" />
          <h1 className="teller__invite v-institution">
            {stage === "credentials" ? "Present your credentials." : "The second key, please."}
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
            <button className="btn-brass teller__submit" disabled={busy} type="submit">
              {busy ? "Verifying…" : "Approach the window"}
            </button>
          </form>
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
            <button className="btn-quiet teller__back" onClick={() => { setStage("credentials"); setError(null); }}>
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
      <span className="stamp stamp--oxblood stamp--sm stamp--landing">RETURNED</span>
      <span className="returned__reason v-machine">{reason}</span>
    </div>
  );
}
