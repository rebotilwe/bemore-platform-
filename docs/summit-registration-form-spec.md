# BeMore Deal Accelerator -- Registration Form Specification

**Source**: BeMore Deal Accelerator Giveaway -- Student Accommodation Summit 2026 (Google Forms, 42 responses)
**Purpose**: Define the registration/application form fields for the BeMore portal, aligned with the summit giveaway form structure.
**Date**: 2026-03-26

---

## Form Structure Overview

The registration form is divided into 7 sections, collected in a multi-step flow.
Total responses from summit form: 42 (41 on most questions).

---

## SECTION 1: BASIC INFORMATION

| # | Field | Type | Required | Options / Validation |
|---|-------|------|----------|---------------------|
| 1.1 | Full name and surname | Text | Yes | Min 2 characters |
| 1.2 | Contact number | Tel | Yes | SA mobile format (10 digits, starts with 0) |
| 1.3 | Email address | Email | Yes | Valid email format |
| 1.4 | Company name / entity | Text | No | "if applicable" |

### Notes
- The summit form collected name as a single field ("Full name and surname"). The current MVP splits this into First Name + Surname. **Recommendation**: Keep the split (first name + surname) for better data quality, but display as a single visual row.
- Email was not explicitly in the summit form but is essential for the portal. Keep it.

---

## SECTION 2: APPLICANT TYPE

| # | Field | Type | Required | Options |
|---|-------|------|----------|---------|
| 2.1 | Which best describes you? | Single-select (radio/dropdown) | Yes | See options below |

### Options (from summit form responses)
1. Property Developer
2. Land Owner
3. Investor
4. Student Accommodation Operator
5. Built Environment Professional
6. Aspiring Student Accommodation Developer
7. PropTech Company
8. Family Home Owner (opposite a tertiary institution)
9. Other (free text)

### Summit Response Distribution
| Option | % |
|--------|---|
| Investor | 36.6% |
| Property Developer | 22.0% |
| Land Owner | 19.5% |
| Student Accommodation Operator | ~7% |
| Built Environment Professional | ~5% |
| Other categories | ~10% |

### Notes
- The current MVP has 4 categories: Developer, Landowner, Student (operator), Professional. The summit form revealed additional categories: **Investor**, **Aspiring Student Accommodation Developer**, **PropTech Company**, and **Family Home Owner**.
- **Recommendation**: Expand the category list to include Investor and Aspiring Developer at minimum. Consider grouping PropTech and Family Home Owner under "Other" with a free-text field.

---

## SECTION 3: DEVELOPMENT READINESS

| # | Field | Type | Required | Options |
|---|-------|------|----------|---------|
| 3.1 | Do you currently have land? | Single-select (radio) | Yes | See options below |
| 3.2 | What stage is your project? | Single-select (radio/dropdown) | Yes | See options below |
| 3.3 | Estimated project value (R) | Single-select (radio/dropdown) | Yes | See options below |

### 3.1 -- Land Status Options
1. Land Secured
2. Land under negotiation
3. No land yet

### Summit Response Distribution (3.1)
| Option | % |
|--------|---|
| Land Secured | 48.8% |
| No land yet | 31.7% |
| Land under negotiation | 19.5% |

### 3.2 -- Project Stage Options
1. Concept
2. Feasibility completed
3. Design Stage
4. Funding Stage
5. Construction Stage

### Summit Response Distribution (3.2)
| Option | % |
|--------|---|
| Funding Stage | 53.7% |
| Concept | 34.1% |
| Feasibility completed | ~5% |
| Design Stage | ~4% |
| Construction Stage | ~3% |

### 3.3 -- Estimated Project Value Options
1. Less than R5m
2. R5m -- R20m
3. R20m -- R100m
4. R100m+

### Summit Response Distribution (3.3)
| Option | % |
|--------|---|
| R20m -- R100m | 36.6% |
| R100m+ | 34.1% |
| R5m -- R20m | 17.1% |
| Less than R5m | 12.2% |

### Notes
- The current MVP's "Funding Requirement" field (Developer form) uses different ranges: R500k-R1m, R1m-R5m, R5m-R20m, R20m+. The summit form uses broader ranges more suited to the actual respondent profile (mostly R20m+). **Recommendation**: Adopt the summit form ranges.
- The current MVP's "Project Stage" for developers has: Ideation, Feasibility, Approved Plans, Construction Ready. The summit form uses: Concept, Feasibility completed, Design Stage, Funding Stage, Construction Stage. **Recommendation**: Adopt the summit version -- "Funding Stage" is critical as 53.7% of respondents selected it.

---

## SECTION 4: FUNDING & PARTNERSHIP INTENTION

| # | Field | Type | Required | Options |
|---|-------|------|----------|---------|
| 4.1 | What are you seeking? | Multi-select (checkboxes) | Yes | See options below |
| 4.2 | Have you previously raised funding? | Single-select (radio) | Yes | See options below |

### 4.1 -- Seeking Options (select all that apply)
1. Equity partner -- An investor who co-owns the project
2. Debt funding -- Borrowed capital (loans, bonds)
3. Joint venture partner -- A partner who shares risk and reward
4. Advisory support -- Expert guidance on deal structuring, compliance, etc.

### Summit Response Distribution (4.1) -- Multi-select
| Option | Count | % of respondents |
|--------|-------|-----------------|
| Debt funding | 28 | 68.3% |
| Advisory support | 21 | 51.2% |
| Equity partner | 17 | 41.5% |
| Joint venture partner | 14 | 34.1% |

### 4.2 -- Previous Funding Options
1. Yes (Institutional) -- e.g. DBSA, NHFC, NEF, banks
2. Yes (Private) -- e.g. private investors, family offices
3. No

### Summit Response Distribution (4.2)
| Option | % |
|--------|---|
| No | 68.3% |
| Yes (Private) | 17.1% |
| Yes (Institutional) | 14.6% |

### Notes
- The current MVP only asks "Previous Institutional Funding? Yes/No" in the Developer form. The summit form distinguishes between Institutional and Private funding. **Recommendation**: Adopt the 3-option version for all applicant types.
- "What are you seeking?" is a new question not in the current MVP. It's critical for lead qualification and matching with funders (DBSA, NHFC, NEF, SAIF). **Must add**.

---

## SECTION 5: PROJECT DETAILS (KEY FILTER)

| # | Field | Type | Required | Options |
|---|-------|------|----------|---------|
| 5.1 | Briefly describe your project | Textarea (paragraph) | Yes | Min 50 characters, max 2000 characters |

### Notes
- This is a free-text field for detailed project descriptions. The summit form received rich, detailed responses ranging from 1 sentence to full business pitches.
- This field is **not in the current MVP**. **Must add** -- it is the most valuable field for lead qualification.
- This feeds directly into the auto-tagging engine for tags like `HIGH_VALUE`, `SHOVEL_READY`, `PIPELINE_READY`, `INSTITUTIONAL_GRADE`.

---

## SECTION 6: COMMITMENT

| # | Field | Type | Required | Options |
|---|-------|------|----------|---------|
| 6.1 | Are you available to attend the summit physically? (Tickets are non-transferable) | Single-select (radio) | Yes | Yes / No |

### Summit Response Distribution
| Option | % |
|--------|---|
| Yes | 97.6% |
| No | 2.4% |

### Notes
- Summit-specific question. Include for summit registration flow. Can be toggled on/off depending on whether an event is active.

---

## SECTION 7: FINAL COMPETITIVE EDGE

| # | Field | Type | Required | Options |
|---|-------|------|----------|---------|
| 7.1 | Why should BeMore choose you? | Textarea (paragraph) | Yes | Min 50 characters, max 2000 characters |

### Notes
- Motivational / pitch field. Received 39 responses in the summit form with detailed answers.
- This field is **not in the current MVP**. **Recommendation**: Add as an optional field for the Deal Accelerator programme applications. It helps the panel shortlist candidates.

---

## LEGAL & CONSENT

| # | Field | Type | Required | Options |
|---|-------|------|----------|---------|
| 8.1 | Terms & Conditions acceptance | Checkbox / Radio | Yes | I Agree / I Disagree |
| 8.2 | POPIA consent | Checkbox / Radio | Yes | Yes / No |

### Terms & Conditions Summary (BeMore Developer Catalyst Programme)
1. **Purpose**: Identify, support, and showcase emerging property developers via mentorship, deal preparation, and exposure to funding institutions. Does NOT guarantee funding.
2. **Eligibility**: All information must be true, accurate, and complete. Authority to submit. No undisclosed disputes. BeMore may disqualify misleading applications.
3. **Selection**: Not guaranteed. Panel shortlists on viability, impact, readiness. Decisions are final, no appeal.
4. **Pitch Participation (Dragon's Den)**: Shortlisted applicants may present to funding institutions and partners.
5. **Intellectual Property**: Applicant retains IP. Grants BeMore non-exclusive right to review/discuss/evaluate. Reasonable confidentiality applies.
6. **No Advisory or Financial Guarantee**: Not financial advice, not investment solicitation, no guarantee of funding or deal closure.
7. **Use of Information**: For evaluation, engagement with funders, internal analysis. Not sold outside programme partners.
8. **Marketing & Publicity**: Shortlisted participants' name, project name, and general description may be used for marketing. Sensitive info shared only with consent.
9. **Limitation of Liability**: Not liable for losses from participation, third-party funding decisions, or business outcomes.
10. **Right to Amend**: BeMore may modify structure, timelines, criteria, or cancel/postpone.
11. **Acceptance**: By submitting, applicant confirms they have read, understood, and agree to T&Cs.

### POPIA Consent Statement
> By submitting this application, I hereby:
> - Consent to Bemore Group and its Programme partners collecting, processing, and storing my personal and project-related information for purposes of:
>   - Evaluating my application
>   - Communicating with me regarding the Programme
>   - Sharing relevant information with funding institutions and Programme partners
> - Understand that my information will be handled in accordance with applicable data protection laws, including the **Protection of Personal Information Act (POPIA)**
> - Acknowledge that I may request access to, correction of, or deletion of my personal information at any time, subject to Programme requirements

---

## GAP ANALYSIS: Summit Form vs Current MVP

### Fields in Summit Form but NOT in Current MVP
| Field | Priority | Impact |
|-------|----------|--------|
| Land status (secured/negotiation/none) | HIGH | Key qualification filter |
| Estimated project value | HIGH | Already in MVP but with different ranges |
| What are you seeking (funding type) | HIGH | Critical for funder matching |
| Briefly describe your project | HIGH | Most valuable lead-qual field |
| Why should BeMore choose you | MEDIUM | Useful for shortlisting |
| Summit attendance availability | LOW | Event-specific |
| POPIA consent (explicit) | HIGH | Legal requirement |
| T&C acceptance | HIGH | Legal requirement |

### Fields in Current MVP but NOT in Summit Form
| Field | Recommendation |
|-------|---------------|
| Years of Experience (Developer) | Keep -- useful for profiling |
| Development Type checkboxes | Keep -- useful for tagging |
| Land Size (Landowner) | Keep -- useful detail |
| Zoning Status (Landowner) | Keep -- useful detail |
| Is Land Serviced (Landowner) | Keep -- useful detail |
| Ownership Structure (Landowner) | Keep -- useful detail |
| Current Bed Count (Student) | Keep -- useful detail |
| Occupancy Rate (Student) | Keep -- useful detail |
| University Partnership (Student) | Keep -- useful detail |
| Asset Type (Student) | Keep -- useful detail |
| Profession (Professional) | Keep -- useful detail |
| Registration Status (Professional) | Keep -- useful detail |
| Project Scale Handled (Professional) | Keep -- useful detail |
| Looking For checkboxes (Professional) | Merge with "What are you seeking" |

### Recommended Merged Form Structure
1. **Basic Info** (all types): Name, Email, Phone, Company
2. **Applicant Type** (expanded categories)
3. **Development Readiness** (all types): Land status, Project stage, Estimated value
4. **Category-Specific Fields** (conditional, based on type selected)
5. **Funding & Partnership** (all types): What seeking, Previous funding
6. **Project Description** (all types): Free-text paragraph
7. **Commitment** (optional/event-specific): Summit attendance
8. **Competitive Edge** (optional): Why choose you
9. **Legal**: T&Cs + POPIA consent
