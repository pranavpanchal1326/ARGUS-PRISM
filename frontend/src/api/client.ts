/* Typed API client — the app's ONLY data source (Law 2: no mock anything).
   Speaks the contract envelope { data, meta } and RFC-7807 problem+json. */
import type { components } from "./schema";

export type Schemas = components["schemas"];
export type Alert = Schemas["Alert"];
export type AccountSummary = Schemas["AccountSummary"];
export type Account = Schemas["Account"];
export type AccountTransaction = Schemas["AccountTransaction"];
export type ScorePoint = Schemas["ScorePoint"];
export type Case = Schemas["Case"];
export type CaseStatus = Schemas["CaseStatus"];
export type CaseNote = Schemas["CaseNote"];
export type CaseActivity = Schemas["CaseActivity"];
export type Graph = Schemas["Graph"];
export type GraphNode = Schemas["GraphNode"];
export type GraphEdge = Schemas["GraphEdge"];
export type StrJob = Schemas["StrJob"];
export type PackageSummary = Schemas["PackageSummary"];
export type AuditRecord = Schemas["AuditRecord"];
export type LedgerVerification = Schemas["LedgerVerification"];
export type Fairness = Schemas["Fairness"];
export type Recruiter = Schemas["Recruiter"];
export type RecruiterCampaign = Schemas["RecruiterCampaign"];
export type AdminUser = Schemas["AdminUser"];
export type Severity = Schemas["Severity"];
export type Pulse = Schemas["Pulse"];
export type Me = Schemas["Me"];
export type TokenPair = Schemas["TokenPair"];
export type MfaChallenge = Schemas["MfaChallenge"];

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

/** RFC-7807 problem details, surfaced verbatim — errors are honest here. */
export class ApiProblem extends Error {
  status: number;
  title: string;
  detail?: string;
  constructor(status: number, title: string, detail?: string) {
    super(detail ?? title);
    this.status = status;
    this.title = title;
    this.detail = detail;
  }
}

/** Network-level failure: the watch is interrupted. */
export class WatchInterrupted extends Error {
  constructor() {
    super("The watch is interrupted — the vault cannot be reached.");
  }
}

const store = {
  get access() { return sessionStorage.getItem("prism.access"); },
  get refresh() { return sessionStorage.getItem("prism.refresh"); },
  set(pair: TokenPair) {
    sessionStorage.setItem("prism.access", pair.access_token);
    sessionStorage.setItem("prism.refresh", pair.refresh_token);
  },
  clear() {
    sessionStorage.removeItem("prism.access");
    sessionStorage.removeItem("prism.refresh");
  },
};

export const tokens = store;

async function refreshTokens(): Promise<boolean> {
  const refresh = store.refresh;
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const body = await res.json();
    store.set(body.data ?? body);
    return true;
  } catch {
    return false;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (store.access) headers.set("Authorization", `Bearer ${store.access}`);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new WatchInterrupted();
  }

  if (res.status === 401 && !retried && store.refresh) {
    if (await refreshTokens()) return api<T>(path, init, true);
    store.clear();
  }

  if (!res.ok) {
    let title = res.statusText, detail: string | undefined;
    try {
      const problem = await res.json();
      title = problem.title ?? title;
      detail = problem.detail;
    } catch { /* non-JSON error body — keep statusText */ }
    throw new ApiProblem(res.status, title, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const WS_BASE = BASE.replace(/^http/, "ws");
