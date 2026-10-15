// booking-templates.js - per-loan_type record templates for liveTransport's
// create_bo_task side-effect. The business path is an amendment to an existing
// RCF, not a new-loan origination.
window.BOOKING_TEMPLATES = {
  business: {
    customer_name: "James Thornfield",
    amount: 300000,
    record: {
      "loan_type": "business",
      "customer": {
        "name": "Thornfield Precision Engineering Ltd",
        "customer_no": "CIF-TH-4471823",
        "segment": "SME Manufacturing",
        "relationship_manager": "Talia",
        "credit_officer": "Sarah Chen"
      },
      "intent": {
        "purpose": "Increase existing SME RCF for automotive contract working capital",
        "amount": 300000,
        "existing_limit": 200000,
        "requested_increase": 300000,
        "total_limit": 500000,
        "contract_value": 760000,
        "management_pipeline_value": 780000,
        "required_within_days": 10,
        "currency": "GBP"
      },
      "eligibility": {
        "identity": "verified",
        "kyc": "valid_until_2026-10",
        "ubo": "verified",
        "aml": "clear",
        "sanctions": "clear",
        "pep": "clear",
        "bureau": "clear",
        "result": "eligible"
      },
      "documents": [
        { "id": "kyc_profile", "label": "KYC profile valid until Oct 2026", "status": "validated", "issues": [] },
        { "id": "ubo_declaration", "label": "UBO declaration: James 67%, Emma 33%", "status": "validated", "issues": [] },
        { "id": "director_ids", "label": "Director IDs", "status": "validated", "issues": [] },
        { "id": "accounts_2022", "label": "2022 filed accounts", "status": "validated", "issues": [] },
        { "id": "accounts_2023", "label": "2023 filed accounts", "status": "validated", "issues": [] },
        { "id": "prior_credit_memo", "label": "Prior credit memo + current facility", "status": "validated", "issues": [] },
        { "id": "management_accounts_2024", "label": "2024 management accounts", "status": "validated", "issues": [] },
        { "id": "jlr_contract", "label": "Signed contract", "status": "validated", "issues": [
          { "code": "contract_value_variance", "message": "Management accounts cite £780,000; signed contract shows £760,000.", "fix": "reviewed_by_credit" }
        ] }
      ],
      "disbursement": {
        "account_name": "Thornfield Precision Engineering Ltd",
        "bank": "Barclays",
        "account_masked": "**** 2910"
      },
      "indicative_offer": {
        "amount": 300000,
        "rate": "SONIA + 2.8%",
        "term_months": 12,
        "total_limit": 500000
      },
      "financials": {
        "revenue_fy22": 3900000,
        "revenue_fy23": 4180000,
        "revenue_fy24": 4600000,
        "ebitda_fy24": 620000,
        "net_debt": 410000,
        "dscr": 2.1,
        "leverage_percent": 34,
        "current_ratio": 1.6,
        "revenue_growth_yoy_percent": 10,
        "projected_cash_flow": "positive under signed contract"
      },
      "recommendation": {
        "decision": "approve",
        "amount": 300000,
        "term_months": 12,
        "risk_grade": "Medium",
        "rationale": "Metrics exceed policy thresholds; clear compliance; existing RCF performance satisfactory."
      },
      "booking_fields": {
        "entityName": "Thornfield Precision Engineering Ltd",
        "customerId": "CIF-TH-4471823",
        "existingFacilityRef": "RCF-2026-TH-00291",
        "facilityRef": "RCF-2026-TH-00291",
        "currentLimit": "200000",
        "increaseAmount": "300000",
        "newLimit": "500000",
        "pricing": "SONIA + 2.8%",
        "reviewDate": "2027-07-01",
        "facilityLetter": "Thornfield_Facility_Letter_July2026.pdf",
        "contractSummary": "Signed 18-month automotive supply contract worth £760,000; £20,000 variance reviewed",
        "creditOfficer": "Sarah Chen",
        "industry": "Precision engineering / automotive components",
        "director": "James Thornfield",
        "uboJames": "67%",
        "uboEmma": "33%",
        "riskGrade": "Medium",
        "security": "Unsecured, consistent with existing facility",
        "humanApproval": "Required before booking"
      }
    }
  },
  student: {
    customer_name: "Daniel Carter",
    amount: 25000,
    record: {
      "customer": { "name": "Daniel", "customer_no": "CIF-90114", "segment": "Student" },
      "intent": { "purpose": "Student loan - tuition + living", "amount": 25000, "currency": "GBP" },
      "eligibility": { "identity": "verified", "credit": "pass", "fraud": "clear", "affordability": "pass", "result": "eligible" },
      "documents": [],
      "booking_fields": {}
    }
  }
};
