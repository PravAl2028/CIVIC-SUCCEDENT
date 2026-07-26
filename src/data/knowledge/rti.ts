export interface RTITemplate {
  id: string;
  category: string;
  title: string;
  template: string;
  fees: string;
  timeLimit: string;
  penalties: string;
}

export const RTI_TEMPLATES: RTITemplate[] = [
  {
    id: "rti_basic",
    category: "general",
    title: "Basic RTI Application - Status of Complaint",
    template: `To,
The Public Information Officer,
{department_name},
{address}

Subject: Application under Section 6(1) of the Right to Information Act, 2005

Respected Sir/Madam,

I, {applicant_name}, citizen of India, hereby request the following information under the Right to Information Act, 2005:

1. Status of complaint/repair request regarding {issue_type} at {issue_address}, submitted on {complaint_date}.
2. Name and designation of the officer responsible for addressing this complaint.
3. Expected date of resolution.
4. Action taken so far on this complaint.

Case Reference Number: {case_id}

I am enclosing the prescribed application fee of ₹10/- (Indian Rupees Ten only) by way of {payment_method}.

As per Section 7(1) of the RTI Act, I request you to provide the above information within 30 days of receipt of this application.

Yours faithfully,
{applicant_name}
{applicant_address}
{applicant_phone}
Date: {date}`,
    fees: "₹10 (Indian Rupees Ten only)",
    timeLimit: "30 days from receipt of application",
    penalties: "₹25 per day of delay beyond 30 days, up to ₹25,000 maximum"
  },
  {
    id: "rti_escalation",
    category: "escalation",
    title: "First Appeal under RTI Act",
    template: `To,
The Appellate Authority,
{department_name},
{address}

Subject: First Appeal under Section 19(1) of the Right to Information Act, 2005

Respected Sir/Madam,

I wish to file a First Appeal against the decision/non-response of the Public Information Officer regarding my RTI application dated {rti_date} seeking information about {issue_type} at {address}.

Original RTI Reference: {rti_reference}
Reason for Appeal: {appeal_reason}

I request the Appellate Authority to direct the PIO to provide the requested information within the stipulated time.

Yours faithfully,
{applicant_name}
Date: {date}`,
    fees: "No additional fee for first appeal",
    timeLimit: "30 days for Appellate Authority to decide",
    penalties: "As per Section 20 of RTI Act"
  },
  {
    id: "rti_municipal",
    category: "municipal",
    title: "RTI for Municipal Infrastructure Issues",
    template: `To,
The Public Information Officer,
{municipal_body},
{address}

Subject: RTI Application for Information on Municipal Infrastructure Maintenance

Respected Sir/Madam,

Under Section 6(1) of the RTI Act, 2005, I seek the following information regarding public infrastructure in {ward_area}:

1. Budget allocation for maintenance of {infrastructure_type} in {ward_area} for the financial year {fy_year}.
2. List of tenders issued for maintenance/repair work in {ward_area} during {fy_year}.
3. Name of contractor awarded the maintenance contract for {infrastructure_type} in this area.
4. Total expenditure incurred on maintenance of {infrastructure_type} in {ward_area} during {fy_year}.
5. Details of any complaints received regarding {infrastructure_type} at {address} in the past 12 months and action taken.

Case Reference: {case_id}

I am enclosing the application fee of ₹10/-.

Yours faithfully,
{applicant_name}
Date: {date}`,
    fees: "₹10 (if applicable under state rules)",
    timeLimit: "30 days",
    penalties: "₹25 per day delay, maximum ₹25,000"
  }
];

export const LEGAL_RIGHTS = [
  {
    title: "Right to Information",
    act: "Right to Information Act, 2005",
    description: "Every citizen has the right to seek information from any public authority. The PIO must respond within 30 days.",
    relevance: "Use when government departments fail to respond to complaints about civic issues."
  },
  {
    title: "Right to Clean Environment",
    act: "Article 21 of the Constitution of India",
    description: "The Supreme Court has held that the right to live includes the right to a clean environment, including clean water and air.",
    relevance: "Applicable to water pollution, garbage dumps, and environmental hazards."
  },
  {
    title: "Right to Safety",
    act: "Consumer Protection Act, 2019",
    description: "Citizens have the right to be protected against goods and services that are hazardous to life and property.",
    relevance: "Applicable to dangerous road conditions, broken infrastructure, and public safety hazards."
  },
  {
    title: "Municipal Accountability",
    act: "74th Constitutional Amendment Act",
    description: "Municipal bodies are constitutionally mandated to provide basic civic services including roads, drainage, and street lighting.",
    relevance: "All civic infrastructure issues fall under municipal responsibility."
  },
  {
    title: "Public Interest Litigation",
    act: "Article 32 and Article 226 of the Constitution",
    description: "Any citizen can file a PIL in the High Court or Supreme Court for matters of public interest, including civic infrastructure.",
    relevance: "Use as last resort when all other channels fail and the issue affects public safety."
  }
];
