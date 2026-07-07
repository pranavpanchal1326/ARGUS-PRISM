"""AutoSTR package generators — FIU-IND STR (XML), CBI (PDF), RBI report (JSON).

Each generator produces bytes from real case data. Sealing computes the content
SHA-256 (the document fingerprint) and an HMAC seal with the signing key. The seal is
kept server-side; only the fingerprint's last 8 chars ever reach the UI (Law 3).
"""

from __future__ import annotations

import hashlib
import hmac
import io
import json
from datetime import UTC, datetime
from xml.sax.saxutils import escape

from app.core.config import get_settings
from app.services.pipeline import mask_ref


def _ts() -> str:
    return datetime.now(UTC).isoformat()


def fiu_str_xml(case, accounts: list) -> bytes:
    """FIU-IND Suspicious Transaction Report (simplified FINgate-style XML)."""
    generated = _ts()
    rows = "".join(
        f"""
    <Subject>
      <AccountRef>{escape(mask_ref(a.id))}</AccountRef>
      <Branch>{escape(a.branch)}</Branch>
      <WarmthScore>{a.warmth_score:.1f}</WarmthScore>
      <RiskBand>{escape(a.severity)}</RiskBand>
      <Status>{escape(a.status)}</Status>
    </Subject>"""
        for a in accounts
    )
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<SuspiciousTransactionReport xmlns="urn:fiu-ind:str:1.0">
  <Header>
    <ReportingEntity>Union Bank of India</ReportingEntity>
    <CaseId>{escape(case.id)}</CaseId>
    <CaseTitle>{escape(case.title)}</CaseTitle>
    <GeneratedAt>{generated}</GeneratedAt>
    <RegulatoryBasis>PMLA 2002 Section 12; RBI Master Direction on KYC</RegulatoryBasis>
  </Header>
  <Subjects>{rows}
  </Subjects>
</SuspiciousTransactionReport>
"""
    return xml.encode("utf-8")


def rbi_json(case, accounts: list) -> bytes:
    """RBI supervisory return (streamed from memory — fixes V2's memory:// 404)."""
    doc = {
        "report_type": "RBI_SUPERVISORY_RETURN",
        "reporting_entity": "Union Bank of India",
        "case_id": case.id,
        "generated_at": _ts(),
        "regulatory_basis": "RBI Master Direction on Fraud Risk Management",
        "subjects": [
            {
                "account_ref": mask_ref(a.id),
                "branch": a.branch,
                "warmth_score": round(a.warmth_score, 1),
                "risk_band": a.severity,
                "response_tier": a.response_tier,
                "status": a.status,
                "tainted": a.tainted,
            }
            for a in accounts
        ],
    }
    return json.dumps(doc, indent=2).encode("utf-8")


def cbi_pdf(case, accounts: list) -> bytes:
    """CBI evidence package as a real PDF (reportlab)."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    y = height - 25 * mm

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(20 * mm, y, "CBI Evidence Package")
    y -= 8 * mm
    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, y, f"Case: {case.title}  ({case.id})")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Generated: {_ts()}")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, "Basis: PMLA 2002 §12; BNS 2023 §318 (cheating)")
    y -= 10 * mm

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(20 * mm, y, "Subjects")
    y -= 7 * mm
    pdf.setFont("Helvetica", 9)
    for a in accounts:
        line = f"{mask_ref(a.id)}  |  {a.branch}  |  warmth {a.warmth_score:.1f}  |  {a.severity}  |  {a.status}"
        pdf.drawString(22 * mm, y, line)
        y -= 5.5 * mm
        if y < 25 * mm:
            pdf.showPage()
            y = height - 25 * mm
            pdf.setFont("Helvetica", 9)
    pdf.showPage()
    pdf.save()
    return buf.getvalue()


def seal(content: bytes) -> tuple[str, str]:
    """Return (fingerprint_sha256_hex, hmac_signature_hex). Signature stays server-side."""
    settings = get_settings()
    fingerprint = hashlib.sha256(content).hexdigest()
    signature = hmac.new(
        settings.package_signing_key.encode("utf-8"), content, hashlib.sha256
    ).hexdigest()
    return fingerprint, signature


PACKAGE_SPECS = {
    "FIU_STR_XML": (fiu_str_xml, "fiu_str.xml", "application/xml"),
    "CBI_PDF": (cbi_pdf, "cbi_package.pdf", "application/pdf"),
    "RBI_JSON": (rbi_json, "rbi_report.json", "application/json"),
}
