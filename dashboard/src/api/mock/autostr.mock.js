/**
 * Mock data for Panel 05: AutoSTR Preview.
 * Contains FIU XML, CBI Evidence Package, and RBI Intelligence Report.
 */

export const mockFIUXML = `<?xml version="1.0" encoding="UTF-8"?>
<FIUReport version="2.0" xmlns="http://fiuindia.gov.in/str/schema">
  <Header>
    <ReportType>STR</ReportType>
    <ReportingEntityCode>UNION_BANK_OF_INDIA_001</ReportingEntityCode>
    <ReportDate>2026-03-15</ReportDate>
    <ReportID>STR-UBI-2026-0847-AUTO</ReportID>
    <GeneratedBy>ARGUS-PRISM-AUTOSTR-v2</GeneratedBy>
    <GenerationTimestamp>2026-03-15T14:47:23Z</GenerationTimestamp>
  </Header>
  <SAPTRN>
    <AccountID>UBI-2026-DEMO-001</AccountID>
    <SuspicionScore>87</SuspicionScore>
    <SuspicionBasis>
      WARMTHSCORE_THRESHOLD_CROSSED · SIGNAL_4_DORMANT_REACTIVATION · 
      SIGNAL_2_DEVICE_FINGERPRINT · SIGNAL_5_FRI_CONTRADICTION · 
      RECRUITER_NETWORK_IDENTIFIED · LAYERING_PATTERN_CONFIRMED
    </SuspicionBasis>
    <AccountHolderProfile>STUDENT</AccountHolderProfile>
    <AccountCreationDate>2026-03-12</AccountCreationDate>
    <SuspicionPeriodStart>2026-03-12T00:00:00Z</SuspicionPeriodStart>
    <SuspicionPeriodEnd>2026-03-15T14:47:23Z</SuspicionPeriodEnd>
    <Transactions>
      <Transaction id="TXN-001">
        <Amount currency="INR">200.00</Amount>
        <Type>CREDIT</Type>
        <Channel>UPI</Channel>
        <Timestamp>2026-03-12T18:22:00Z</Timestamp>
        <CounterpartyID>UBI-2026-RECR-001</CounterpartyID>
        <FlagReason>TEST_CREDIT_PATTERN</FlagReason>
      </Transaction>
      <Transaction id="TXN-002">
        <Amount currency="INR">850000.00</Amount>
        <Type>CREDIT</Type>
        <Channel>NEFT</Channel>
        <Timestamp>2026-03-15T14:12:00Z</Timestamp>
        <CounterpartyID>EXTERNAL_UNKNOWN</CounterpartyID>
        <FlagReason>ILLICIT_CREDIT_PAYLOAD</FlagReason>
      </Transaction>
    </Transactions>
  </SAPTRN>
  <SAPINP>
    <InvestigationPriority>HIGH</InvestigationPriority>
    <RecommendedAction>FREEZE_AND_INVESTIGATE</RecommendedAction>
    <RelatedAccounts>
      <Account id="UBI-2026-RECR-001" role="RECRUITER_COORDINATOR"/>
      <Account id="UBI-2026-RECR-002" role="RECRUITER_ORCHESTRATOR"/>
    </RelatedAccounts>
  </SAPINP>
  <SAPLEP>
    <LawEnforcementPriority>CBI_REFERRAL</LawEnforcementPriority>
    <SupremeCourtWrit>03/2025</SupremeCourtWrit>
    <CBIPackageGenerated>true</CBIPackageGenerated>
  </SAPLEP>
  <SAPPIT>
    <PatternID>ORGANISED_MULE_NETWORK</PatternID>
    <PatternDescription>
      Industrial mule recruitment operation. Coordinator account UBI-2026-RECR-001 
      identified sending test payments to 9 accounts simultaneously. 
      Orchestrator UBI-2026-RECR-002 targeting 23 accounts. Layering confirmed 
      across 4 hops. Round-trip pattern detected. FRI evasion via clean SIM 
      confirmed by Signal 5 contradiction.
    </PatternDescription>
  </SAPPIT>
</FIUReport>`;

export const mockCBIPackage = {
  case_reference: "CBI-PRISM-2026-0847",
  legal_authority: "Supreme Court Suo Motu Writ Petition Criminal No. 03/2025",
  prepared_by: "ARGUS-PRISM AutoSTR Engine v2.0",
  prepared_for: "Central Bureau of Investigation — Cyber Crime Wing",
  prepared_at: "2026-03-15T14:47:23Z",
  
  executive_summary: `This evidence package has been automatically generated 
    by ARGUS-PRISM in compliance with the Supreme Court directive (SC Writ 03/2025) 
    designating the CBI as primary investigation agency for digital arrest fraud. 
    Account UBI-2026-DEMO-001 was identified as a mule account 72 hours before 
    the first illicit credit arrived. The account was restricted under RBI KYC 
    Master Direction 2016 Section 38 at Hour 60. The fraud payload of ₹8,50,000 
    arrived at Hour 72 but could not be withdrawn due to prior restriction.`,
    
  transaction_lineage: [
    {
      step: 1, 
      description: "RECRUITER TEST CREDIT",
      from: "UBI-2026-RECR-001", 
      to: "UBI-2026-DEMO-001",
      amount: 200, 
      channel: "UPI",
      timestamp: "2026-03-12T18:22:00Z",
      significance: "Warming phase initiation. Signal 1 triggered."
    },
    {
      step: 2,
      description: "ILLICIT PAYLOAD CREDIT",
      from: "EXTERNAL_UNKNOWN",
      to: "UBI-2026-DEMO-001", 
      amount: 850000,
      channel: "NEFT",
      timestamp: "2026-03-15T14:12:00Z",
      significance: "Primary fraud credit. Account restricted. Funds frozen."
    },
    {
      step: 3,
      description: "LAYERING HOP 01",
      from: "UBI-2026-DEMO-001",
      to: "UBI-2026-LAYR-001",
      amount: 790000,
      channel: "IMPS",
      timestamp: "2026-03-15T14:15:00Z",
      significance: "Initial layering attempt. Blocked."
    }
  ],
  
  device_timeline: [
    { hour: 0, event: "Account created", device_id: "IMEI-XX1122334455", sim_id: "SIM-CLEAN-001" },
    { hour: 2, event: "UPI registered on different device", device_id: "IMEI-XX9988776655", sim_id: "SIM-CLEAN-001" },
    { hour: 2, event: "Signal 2 triggered — device mismatch", score_impact: "+22 points" },
    { hour: 18, event: "Signal 1 triggered — test credit received", score_impact: "+15 points" }
  ],
  
  warmth_progression: "Hour 0: 21 → Hour 24: 41 → Hour 48: 69 → Hour 60: 77 → Hour 72: 87",
  
  legal_basis_for_restriction: "RBI KYC Master Direction 2016 Section 38 — Account restricted at WarmthScore 77 (threshold: 75) without court order. Restriction applied 12 hours before illicit credit arrived.",
  
  network_connections: "2 recruiter networks identified. 31 total warming accounts across both campaigns. See attached graph export.",
  
  recommended_charges: "Prevention of Money Laundering Act 2002 Sections 3 and 4. IT Act 2000 Section 66D. IPC Section 420."
};

export const mockRBIReport = {
  report_period: "Q4 FY2025-26",
  reporting_entity: "Union Bank of India",
  report_type: "CYBER_FRAUD_INTELLIGENCE",
  generated_at: "2026-03-15T14:47:23Z",
  
  summary_stats: {
    total_str_filed: 12,
    total_accounts_flagged: 47,
    total_accounts_restricted: 18,
    total_accounts_frozen: 6,
    total_value_protected: 142000000,
    false_positive_rate: 4.0,
    avg_detection_lead_time_hours: 67.3
  },
  
  pattern_breakdown: [
    { pattern: "LAYERING", count: 8, total_value: 67000000 },
    { pattern: "ROUND_TRIP", count: 4, total_value: 23000000 },
    { pattern: "RECRUITER_NETWORK", count: 2, total_campaigns: 2, accounts_in_network: 31 },
    { pattern: "STRUCTURING", count: 6, total_value: 52000000 }
  ],
  
  signal_performance: [
    { signal: "Signal 1 — Test Credit Pattern", triggers: 31, confirmed_mule: 28, accuracy: 90 },
    { signal: "Signal 2 — Device Fingerprint", triggers: 24, confirmed_mule: 21, accuracy: 88 },
    { signal: "Signal 3 — Velocity Derivative", triggers: 19, confirmed_mule: 17, accuracy: 89 },
    { signal: "Signal 4 — Dormant Reactivation", triggers: 11, confirmed_mule: 11, accuracy: 100 },
    { signal: "Signal 5 — FRI Contradiction", triggers: 8, confirmed_mule: 8, accuracy: 100 },
    { signal: "Signal 6 — SIM Swap Velocity", triggers: 5, confirmed_mule: 5, accuracy: 100 }
  ]
};

export const mockAutoSTRPackages = {
  case_id: "CASE-UBI-2026-0847",
  account_id: "UBI-2026-DEMO-001",
  warmth_score: 87,
  generated_at: "2026-03-15T14:47:23Z",
  status: "PENDING_MLRO_APPROVAL",
  fiu_xml: mockFIUXML,
  cbi_package: mockCBIPackage,
  rbi_report: mockRBIReport
};
