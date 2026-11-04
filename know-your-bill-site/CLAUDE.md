# CLAUDE.md — Know Your Bill NOLA

> Instruction file for the coding agent (Claude Code). Read this whole file before every task on this project. Keep it updated all semester.
>
> **Project:** Final project, AI & Real Estate (SRED 4935), Tulane, Fall 2026 · **Owner:** Darby Brennan
> **Course name for the project:** NOLA Assessment Navigator · **Product name:** Know Your Bill NOLA
> **Last updated:** Nov 4, 2026 (Part 1 feedback fixes, Amendment 9 result)

---

## 0. Quick facts for the agent

- **Product:** a plain-English chatbot for New Orleans property owners.
- **Live chatbot (Layers 1 + 2):** https://claude.ai/artifact/Y1STBAZpBpHdWU68LE76cU (version 5)
- **Part 2 report:** "Know Your Bill NOLA — Part 2" doc, https://claude.ai/artifact/MPN557EobZ4EGGcejoG7rR
- **Current build:** a Claude artifact made of these files:
  - `index.html`: the page, plus the chat prompt (`RULES`), knowledge base (`KB`), and source list (`SOURCES`). It calls Claude through the `sample` capability.
  - `matcher.js`: turns a typed address into roll format and finds the parcel (§10.3).
  - `data/nbhd.json`: median residential value, homestead %, and Louisiana-mail % for 352 assessor subdivisions with 20+ homes. Feeds "Compared to your neighborhood."
  - `data/b_*.json`: the 2026 roll, trimmed to 23 fields per parcel and split into 33 files by the first letter of the street name. The page only fetches the file it needs.
- **The bot answers only from the KB plus the one property record the user looked up.** It cannot browse the web.
- **Bill estimates are computed by page code, not by the model.** The model is told to use the numbers exactly as given.
- **Deadlines:**

| Milestone | Due | Points |
|---|---|---|
| Part 1: .md + initial chatbot | Oct 25 | 10 |
| Part 2: data, property lookup, chatbot | Nov 8 | 10 |
| Final draft: full prototype | Nov 15 | 30 |
| Final: tested and refined | Dec 1 | 50 |

- **When facts change, update three places:** the `KB` string in `index.html`, the matching entry in `SOURCES`, and §2 and §8 of this file. Change all three in the same commit.

---

## 1. Purpose

### What it does
Know Your Bill NOLA helps regular New Orleans property owners answer one question: **"Is my property tax bill right, and what can I do about it?"**

It walks them through three decisions, in this order:
1. **What will my bill be?** Market value → assessed value → exemptions → millage → bill.
2. **Am I missing something?** Homestead, the senior/disability freeze, and veteran exemptions they may not have claimed.
3. **Should I appeal?** How appeals work, the deadlines, and what evidence counts. The bot explains; it never decides for them.

### Who uses it
- **Primary user: the everyday NOLA homeowner.**
  - About half of households own their home: the owner-occupied rate is 50.5% (Census QuickFacts, 2019–2023).
  - The median owner-occupied home value is **$296,400** and median household income is about $55K (Census QuickFacts).
  - Many owners have no mortgage, so they pay the bill directly. About 17% of residents are 65+, so the senior freeze matters.
  - **Design implications:**
    - Write at an 8th-grade reading level.
    - Design mobile-first.
    - Keep answers short.
    - Assume no finance background.
- **Secondary user: young or small landlords.**
  - Example: first-time owners of a double or two near Tulane and Loyola.
  - Common blind spots:
    - Homestead and the freeze only cover a home you live in.
    - Rental values reset at reassessment.
    - They are allowed to appeal.
- **Out of scope: renters.** If a user says they rent, give one sentence:
  - the tool is for owners;
  - property taxes are one factor in rent;
  - point them to city tenant resources.

### The three layers

| Layer | What the user gets | Status |
|---|---|---|
| **1. General guidance** | How assessments, exemptions, bills, and appeals work in Orleans Parish, with sources | **Live** (this file + artifact) |
| **2. My property** | Type any NOLA address → assessed value, exemptions on file, and an estimated bill | **Live** (Part 2) |
| **3. Market context** | Nearby sales and neighborhood trends, so the owner can judge whether the value looks fair | Final draft (Nov 15) |

---

## 2. Domain knowledge: how Orleans Parish assessment works

Every bullet carries a source tag. Full links are in §8.

### 2.1 Who does what
- **Orleans Parish Assessor** (Erroll G. Williams) [S2][S12]
  - Sets each property's fair market value and assessed value.
  - Approves exemptions.
- **Taxing bodies** set millage rates [S2]. Examples: City Council, School Board, Sewerage & Water Board, levee districts.
- **City Bureau of Treasury** mails bills and collects payments [S2][S7].
- **Board of Review (BOR)** is the New Orleans City Council acting independently of the Assessor [S1].
  - It hears value appeals.
  - It hires real estate professionals to run the hearings [S1].
- **Louisiana Tax Commission (LTC)** hears appeals of BOR decisions [S1].

### 2.2 Fair market value (FMV)
- **Legal standard:** property must be assessed at fair market value [S1].
- **What the Assessor considers** [S1]:
  - sale prices of comparable properties;
  - replacement cost;
  - operating and repair costs;
  - rent the property could earn;
  - other economic factors.
- **Mass appraisal.** Values are set for the whole parish at once, using models built on sales and property data, not one-off appraisals.
- **Reassessment cycle.** All property must be reassessed at least every four years [S3].
  - The last one: 2023, for the 2024 tax year. Total assessed values rose about 20% [S11].
  - **The current reassessment is for the 2027 tax roll** [S12] (see §2.6).
  - **Timing (corrected per Part 1 feedback):** the reassessment work happens in **2026**. The new values were posted and open for review and appeal July–Aug 2026 [S6], and they first show up on **2027 bills mailed in Dec 2026**. Don't call it a reassessment that is still coming in 2027.
- **Why values change** [S1][S11]:
  - mostly market changes;
  - also renovations, major damage, or corrections;
  - this can happen in non-reassessment years too.

### 2.3 Assessed value
- Assessed value = FMV × the assessment ratio [S1][S3]:

| Property class | Ratio |
|---|---|
| Land | 10% |
| Residential improvements | 10% |
| Commercial improvements | 15% |
| Business movable property | 15% |
| Public service (excluding land) | 25% |

- **No yearly 10% cap in Orleans.** A 2022 amendment that would have capped annual increases on homesteaded homes **failed** [S13].
  - Statewide, a 2018 amendment phases in tax increases over four years when a homestead's assessed value jumps 50% or more [S14].

### 2.4 Millage and the tax bill
- **What a mill is:** $1 of tax per $1,000 of taxable assessed value (1/10 of 1%) [S1][S3].
- **Formula:** `Tax = (Assessed value − exemptions) × mills ÷ 1,000` [S1].
- **2026 rates:**
  - Citywide total: **121.20 mills** [S2]. The School Board's 45.31 is the largest piece [S2].
  - Plus a levee district: most East Bank owners paid **133.48 total mills**, and Algiers owners **132.01** [S4].
  - **Discrepancy resolved:** the City's table still lists the older 10.79 East Bank levee rate [S2], but real 2026 bills show **12.28** [S16]. That matches BGR's 133.48 total [S4].
- **Mills that ignore homestead:** **11.51 mills** of police and fire taxes (4.67 + 4.62 + 2.22) apply to the full assessed value [S2][S3].
  - Checked on real bills [S16]: the police/fire base is the full assessed value, so homestead, veteran, and first-responder amounts are all still taxed at these mills. Only "other" exemptions (exempt owners) are removed from it.
- **Add-ons in some neighborhoods** [S2]:
  - special districts, e.g., Downtown Development District 13.73 mills;
  - flat-fee security districts, e.g., University area $950.
- **Rollback and roll-forward**
  - After a reassessment, taxing bodies must **roll back** millage so total collections stay level [S3].
  - They may then **roll forward** with a public hearing and a two-thirds vote [S3].
  - **A rollback does not protect every owner.** If your value rose faster than average, your bill can still go up [S3].
- **Billing calendar**
  - Bills are mailed mid-to-late December, even if your lender pays through escrow [S7].
  - Bills are due by Jan 31 [S3][S7]. The City has extended the deadline in some years [S7]. **2026 bills were due Feb 28, 2026** (delinquent Mar 1), with 1% monthly interest after that [S16].
- **Act 718 phase-in:** bills marked "ACT 718" are taxed on a phased-in, lower assessment [S16]. The roll file does not flag these parcels.

### 2.5 Exemptions
- **Homestead exemption** [S1][S2][S3]
  - Exempts the first **$75,000 of market value ($7,500 assessed)** on the home you own and live in as your primary residence.
  - Limited to one per person or married couple.
  - Apply at the Assessor's office as soon as you buy and move in [S1].
  - **Documents** [S15]:
    - proof of ownership;
    - an ID showing the property address;
    - an Entergy or cable bill in your name at that address. S&WB, internet, and Delta bills are not accepted.
  - Fill out the application before booking the appointment. All owners who live there must attend [S15].
  - It stays in place while you own and live there.
  - Tell the Assessor if you move [S1].
  - It does **not** cover the 11.51 police/fire mills [S2].
- **Special Assessment Level ("senior/disability freeze")** [S8]
  - **Eligibility:** homestead owners who are 65+, veterans with a 50%+ service-connected disability rating, or permanently and totally disabled.
  - **What it does:** freezes the **assessed value**, not the tax rate.
  - **Income limit:** $100,000 indexed to inflation starting 2026 [S8]. The Assessor's current figure is **$102,700** household income [S15].
  - **Documents** [S15]:
    - an ID showing the property address;
    - the previous year's signed 1040;
    - a Social Security or pension award letter.
  - **Upkeep:** owners who are not 65+ must certify income every year [S8]. For 65+ owners the freeze is permanent once granted [S1].
  - **Where to apply:** the Assessor. The BOR cannot hear freeze or homestead denials [S1].
  - **Amendment 9 (Nov 3, 2026) passed** on unofficial results: 58.2% yes as of Nov 4 with 95% of precincts in [S17]. It raises the income limit to **$150,000** for tax years beginning Jan 1, 2027, with inflation indexing from 2028 [S9].
  - **Still to confirm:** official certification, and how the Assessor applies it to 2027 applications.
- **Disabled veterans (2022 amendment)** [S10]. On top of homestead:

| VA disability rating | Extra exemption |
|---|---|
| 50–69% | Next $2,500 of assessed value |
| 70–99% | Next $4,500 of assessed value |
| 100% unemployable or totally disabled | Entire assessed value |

  - Surviving spouses also qualify [S10].
- **First responder exemption** [S15]: an extra $25,000 of market value ($2,500 assessed) off a homestead property. It is for full-time public safety and public works employees, and volunteer firefighters, employed in Orleans Parish.

### 2.6 Reassessment for the 2027 tax roll (reviewed in 2026)
- **Where things stand (Oct 22, 2026):**

| Date | Event |
|---|---|
| Jul 15 – Aug 17, 2026 | 2027 rolls open for inspection [S1][S6] |
| Jul 22 – Aug 20, 2026, 4 p.m. | Formal appeal window [S1][S6] |
| Sep 15–25, 2026 | BOR hearings [S1] |
| Oct 15, 2026 | BOR adopts changes [S1] |
| Week of Oct 19, 2026 | Decisions mailed [S1] |

- **Millage is in play** [S5]:
  - The City submitted two 2027 levies: rolled-back rates, or a **roll-forward** from 44.67 to 52.11 mills on several city taxes.
  - The roll-forward would add about **$178/yr** for a homesteaded $300K home.
  - **Public hearing: Nov 5, 2026.** Update this file after it.
- **2027 bills** should follow the normal calendar: mailed in December 2026, due around Jan 31, 2027 [S3][S7].

### 2.7 Appeals: process and deadlines
1. **Open rolls (informal).** Review your value and talk to Assessor staff [S1][S6].
   - **Dates:** each year about July 15 to mid-August.
   - **Booking:** at nolaassessor.com or (504) 754-8811, at least 24 hours ahead [S6].
   - **Locations** [S6]:
     - City Hall, 1300 Perdido St, 4th floor
     - Algiers Courthouse, 225 Morgan St
     - Lakeview Christian Center, 5885 Fleur De Lis Dr
2. **Formal appeal to the Board of Review.**
   - **Deadline:** three business days after open rolls close. For 2027 it was **Aug 20, 2026** [S1][S6].
   - **How to file:** online at nolaassessor.com, or on paper (four copies, by hand or mail) [S6].
   - **Attach everything with the form** or the appeal is denied as incomplete [S1].
   - **Helpful documents** [S1]: appraisals, insurance policies, photos, contractor repair estimates.
3. **BOR hearing.**
   - **What the board weighs** [S1]:
     - the property's recent sale price;
     - comparable nearby sales;
     - a real estate professional's opinion.
   - The hearing officer does not announce the result. The decision comes by certified mail [S1].
4. **Louisiana Tax Commission.**
   - File in writing within **10 business days** of the BOR notice [S1]. Use LTC Form 3103.A [S1].
5. **What value appeals can't fix.**
   - A value appeal targets the *value*, not the tax rate.
   - Rate complaints go to the taxing bodies. Use the public hearings, like the Nov 5 hearing [S5].

---

## 3. Rules for the chatbot (instructions to the agent)

Build these into the prompt and the UI. They are non-negotiable.

1. **Cite a source for every fact.**
   - Every factual sentence ends with a source tag (`[S1]`).
   - The UI turns tags into numbered links and lists the sources under the answer.
   - If an answer has no source, the UI must label it "unverified."
2. **Say "I don't know" when unsure.**
   - If the KB (or, from Part 2 on, retrieved pages) does not answer the question, the bot says "I don't know."
   - Then it shares what it does know and names the right office.
   - Never guess numbers, dates, phone numbers, or rules.
3. **No legal or tax advice.**
   - The bot explains how things work and what evidence matters.
   - It never tells a user they personally should appeal, what their property is "really" worth, or how to file their taxes.
   - For "should I…?" questions: explain the trade-offs, then hand off.
4. **Offer a human contact.**
   - Every answer ends with one handoff: the single best office for the question, with a phone number or website from §2/§8.
   - The page also shows a permanent "Talk to a person" panel.
5. **Disclose that it's a student prototype.**
   - A persistent banner says: a student prototype, not legal or tax advice, can be wrong, verify with official offices.
   - Never remove the banner. Never claim to be an official City or Assessor tool.
6. **Plain language.**
   - 8th-grade reading level, short sentences, under ~170 words, bullets for steps.
   - Show the math step by step whenever a bill is estimated.
7. **Be honest about time.**
   - Say which tax year a number comes from.
   - Flag when a deadline has passed and what options remain.
   - Never present a pending vote (the Nov 5 millage hearing) as decided. Present Amendment 9 as passed on unofficial results until it is certified.
8. **Scope.**
   - Orleans Parish only. Other parishes have different deadlines.
   - Renters get the one-line redirect (§1).
9. **Privacy** (applies from Part 2 on).
   - Address lookups use public records only.
   - Don't store addresses or chat logs.
   - Don't look up property owners by name.
   - **Owner names are not in the chatbot's data files.** Keep it that way. If asked who owns a property, point to the Assessor's property search.
   - Don't guess about an owner's personal situation, such as why a home has no homestead.
10. **Property answers** (Part 2).
   - Cite the roll record as [P1] and the page's bill estimate as [P2].
   - Use the page's numbers exactly; never recompute them.
   - Always say the estimate leaves out neighborhood fees, special-district millage, and any Act 718 phase-in, and link to the official bill.
   - Say these are 2026 values (appraisal date Jan 1, 2023), not the 2027 values.

---

## 4. Public education outline (City of New Orleans)

Each topic lists its sources and the questions owners most likely ask. These double as the bot's test set.

### Topic A — How property values are set
- **Content:**
  - FMV standard and mass appraisal.
  - The five factors the Assessor considers.
  - The 4-year reassessment cycle.
  - Why values change between cycles.
- **Sources:** S1, S3, S11, S12
- **Owners ask:**
  1. "How did the Assessor come up with my home's value?"
  2. "Why did my value go up when I didn't change anything?"
  3. "Do they actually come inspect my house?" ← *not in the KB yet; the bot should say "I don't know" and refer to the Assessor.*

### Topic B — From assessed value and millage to a tax bill (worked example)
- **Content:**
  - Assessment ratios.
  - What a mill is.
  - Homestead vs. non-homestead mills.
  - Neighborhood add-ons.
  - Billing calendar.
- **Sources:** S1, S2, S3, S4, S7
- **Worked example.** 2026 rates, East Bank, $300,000 home, owner-occupied with homestead (close to the $296,400 city median):

| Step | Math | Result |
|---|---|---|
| 1. Assessed value | $300,000 × 10% | **$30,000** |
| 2. Homestead-eligible mills | 133.48 total − 11.51 police/fire | **121.97 mills** |
| 3. Taxable value after homestead | $30,000 − $7,500 | **$22,500** |
| 4. Tax on homestead-eligible mills | $22,500 × 121.97 ÷ 1,000 | **$2,744.33** |
| 5. Tax on police/fire mills (no homestead) | $30,000 × 11.51 ÷ 1,000 | **$345.30** |
| **Estimated 2026 bill** | Step 4 + Step 5 | **≈ $3,089.63** |
| Same house, no homestead (e.g., a rental) | $30,000 × 133.48 ÷ 1,000 | **≈ $4,004.40** |
| Homestead savings | $7,500 × 121.97 ÷ 1,000 | **≈ $914.78/yr** |

  - Excludes special-district millages and flat security-district fees.
  - 2027 bills will differ because of the reassessment for the 2027 roll, rollbacks, and the possible roll-forward [S5].
- **Owners ask:**
  1. "How much will I owe this year?"
  2. "Why is my bill different from my neighbor's?"
  3. "When is the bill due, and what if my lender pays it?"

### Topic C — Exemptions owners can claim, and how to apply
- **Content:**
  - Homestead ($75K FMV).
  - Senior/disability freeze (65+, income limit $102,700 for 2026; $150K from 2027 under Amendment 9, passed on unofficial results).
  - Disabled-veteran exemptions.
  - All are applied for at the Assessor's office, and homestead is a prerequisite for the others.
- **Sources:** S1, S2, S8, S9, S10, S15
- **Owners ask:**
  1. "How do I apply for homestead, and what do I bring?" (Added in Part 2 from the Assessor's site [S15].)
  2. "I'm 65. Can my taxes be frozen?" (Answer: the assessed value is frozen, not the tax rate.)
  3. "I own a double and live in one side. Do I get homestead?" ← *not in the KB yet; the bot should say "I don't know."*

### Topic D — What the reassessment for the 2027 tax roll means for owners
- **Content:**
  - Values reset to market.
  - The appeal window closed Aug 20, 2026.
  - Millage must roll back, but the City is weighing a roll-forward (Nov 5 hearing).
  - There is no 10% cap.
  - The 50%+ phase-in rule.
  - The senior freeze income limit rises to $150K under Amendment 9 (passed Nov 3, unofficial).
  - 2027 bills arrive in December.
- **Sources:** S1, S3, S5, S6, S9, S12, S13, S14
- **Owners ask:**
  1. "Will my taxes go up in 2027?"
  2. "My value jumped. Is there a cap?"
  3. "What is a 'roll forward' and can I weigh in?"

### Topic E — How to appeal, where to go, and deadlines
- **Content:**
  - Informal open rolls at three locations.
  - Formal BOR appeal: online or four paper copies, due three business days after rolls close.
  - Evidence types.
  - BOR hearings at Delgado.
  - LTC within 10 business days.
  - What appeals can't fix.
- **Sources:** S1, S6
- **Owners ask:**
  1. "Is it too late to appeal my 2027 value?"
  2. "What evidence do I need?"
  3. "Do I need a lawyer?" (No-advice rule: explain the process and point to the BOR or the Assessor.)

---

## 5. Live chatbot (Layers 1 + 2)

- **Link:** https://claude.ai/artifact/Y1STBAZpBpHdWU68LE76cU
- **Sharing:** the artifact is private by default. Share it with the professor from the artifact's Share menu before submitting.
- **How it works:**
  - The page prompt combines the §3 rules with a KB of 16 numbered sources (S1–S16), plus the looked-up property record (P1/P2) when there is one.
  - The address lookup and bill estimate run in page code (see §10), not in the model.
  - Claude returns JSON: `{answer, sources[], handoff, confident}`.
  - The page renders:
    - numbered citation links;
    - a source list;
    - a "Talk to a person" handoff;
    - an "unverified" label when no source matched.
- **Viewer note:** each viewer is asked once to allow the page to use Claude, and calls run on the viewer's own Claude account.

---

## 6. Sample questions and results (tested Oct 22, 2026, version 1)

The five starter questions were run in the live page; screenshots are attached separately as Screenshots 1–5. The overall grade is good on the rules and weaker on the math.
- **What worked:** every answer cited sources, kept the no-advice line, ended with a handoff, and said "I don't know" when the knowledge base ran out.
- **What failed:** two answers gave a wrong or incomplete bill estimate.

| # | Question | What the bot said | What it got wrong or missed |
|---|---|---|---|
| 1 | "How do they turn my home's value into a tax bill?" | Correct 3-step path (value × 10% → minus $7,500 → × mills ÷ 1,000). Example: $200K home = **$1,515** using 121.20 mills. | **The math was wrong.** It applied the homestead exemption to all 121.20 mills, but 11.51 police/fire mills ignore homestead. It also skipped the levee millage that every East Bank owner pays. It mentioned both caveats after the number instead of building them into it, so a reader would walk away with too low an estimate. |
| 2 | "What would a $300,000 home with homestead pay?" | $30,000 assessed → $22,500 taxable → **$2,727**, plus about **$86** for police/fire on the exempt $7,500. Flagged the Nov 5 rate hearing. | **It understated the bill by about $276.** It handled the police/fire adjustment correctly, but it treated levee charges as "can add more" when they apply to everyone. It never gave a total. The correct 2026 East Bank figure is **≈ $3,090** (§4 Topic B); the bot's numbers add up to about $2,813. |
| 3 | "How do I apply for the homestead exemption?" | Listed eligibility rules; said "I don't know which documents the Assessor requires" and gave the Assessor's contact. | **The "I don't know" was the correct behavior,** and it confirms a real gap in the knowledge base: no document checklist and no info on online applications. **But it added the renter line when nobody said they rent.** Rule 7 should only fire when the user says they rent. |
| 4 | "I'm 67. Can I freeze my assessment?" | Correct eligibility, $100K income limit, Amendment 9 pending (said it doesn't know the result), freezes value not rate, homestead required first. | **Solid answer.** One minor miss: it didn't say that 65+ owners don't have to re-certify income each year. The source only supports that indirectly through the "no reapplication" line. |
| 5 | "My 2027 value went way up. Is it too late to appeal?" | Aug 20 deadline passed; LTC within 10 business days if they already went to the Board of Review; next open rolls in July 2027; listed evidence types. | It missed two useful facts it had: **no 10% cap exists** [S13], and the **50%+ phase-in** for homesteads [S14]. It also didn't point to the **Nov 5 millage hearing** as the place to push back on rates. The "July 2027" date is inferred from the yearly pattern; no source states it. The handoff went to the Assessor when the Board of Review/LTC fits better. |

**Bonus test (6):** "What evidence does the Board of Review look at?"
- Accurate and well cited.
- It repeated the inferred "July 2027" date.

**Fixes for the next version:**
- Put the full worked example (§4 Topic B, with levee and police/fire mills) into the knowledge base, and tell the bot to always give a total.
- Only show the renter line when the user says they rent.
- Add the official homestead application steps.
- Tell the bot to mention the no-cap rule, the 50% phase-in, and the Nov 5 hearing for any "my value went up" question.
- Add an explicit source line for when the next open rolls start.

**Stress tests to run next** (harder cases):
1. "I own a double near Tulane and rent out both sides. Can I get homestead?"
2. "I live in one side of my double. Does homestead cover the whole building?" (not in the knowledge base yet; it should say "I don't know")
3. "I'm 68 and make $120,000. Can I get the freeze?"
4. "Should I hire a lawyer to fight my assessment?"
5. "I rent my apartment. Will my rent go up?"

---

## 7. Build notes and roadmap (for the agent)

### Current (Part 2)
- **Files:** `index.html`, `matcher.js`, `data/b_*.json` (published together as one artifact), `CLAUDE.md`. Version 1 of the page is kept as `index_v1.html`.
- **To republish:** publish `index.html` with `matcher.js` and every `data/` file listed in `files`. Leaving them out keeps the published copies.
- **Design:**
  - Theme: street-tile blue on cool paper.
  - Fonts: Zilla Slab (display), Public Sans (body), IBM Plex Mono (numbers).
  - Light and dark tokens.
  - Mobile-first.
- **Keep the design tokens consistent** across future pages.

### Part 2 (done Oct 28): data exploration and property lookup
- **Decision:** artifact path with the roll preloaded as static JSON. The Assessor site blocks automated fetches, and the artifact can't call outside sites anyway.
- **Still to do:**
  - special-district fees (no district field in the roll; needs a GIS join);
  - Act 718 flag (not in the roll);
  - 2027 values (need the 2027 roll when the LTC posts it).

### Final draft (Nov 15): Layer 3, market context
- Show recent nearby sales vs. the assessed value as the evidence an owner would bring to an appeal.
- Present it as information, never as a recommendation.
- **Sales data:** the roll's Transfer Date and Purchase Price, keeping only SALE/SALW instruments with prices over $1,000. The Verified Sale flag is useless ("N" in every row).
- **Nearby:** same Subdivision first. Later, geocode parcels with the Census Geocoder or the City's Parcels layer (data.nola.gov v9q5-fz7t, situs address + polygon) for distance.
- **Bring in the STR file** (§10.4) for the young-landlord path.
- **Fix the matcher misses** (§10.3): snap Census-geocoded points to City parcel polygons for condos filed under another number.

### Final (Dec 1)
- Run the full §4 question set.
- Log misses here.
- Refine the prompt and the KB.

---

## 8. Sources

| ID | Source | Link |
|---|---|---|
| S1 | New Orleans City Council — Property Tax Assessments & Appeals (Tax Year 2027) | https://council.nola.gov/resources/property-tax-assessments-and-appeals/ |
| S2 | City of New Orleans Treasury — How taxes are calculated (2026 millage) | https://nola.gov/next/treasury/topics/how-taxes-are-calculated/ |
| S3 | Bureau of Governmental Research — About Your Property Taxes | https://www.bgr.org/about-your-property-taxes/ |
| S4 | BGR media release, Jan 29, 2026 — tax rates across three parishes | https://www.bgr.org/wp-content/uploads/Media-Release_New-Data-on-Property-Tax-Rates-Across-Three-Parishes_01.29.26.pdf |
| S5 | FOX 8, Sept 28, 2026 — proposed 2027 millage roll-forward | https://www.fox8live.com/2026/09/28/new-orleans-property-owners-could-pay-more-under-proposed-2027-tax-increase/ |
| S6 | Orleans Parish Assessor — 2027 rolls open July 15–Aug 17 | https://www.nolaassessor.com/2026/07/13/2027-assessment-rolls-open-for-public-inspection-july-15-to-august-17/ |
| S7 | City of New Orleans — Pay Property Tax / Treasury FAQ | https://nola.gov/property-tax/ · https://nola.gov/next/treasury/topics/faq/ |
| S8 | Ballotpedia — LA special assessment level and homestead (2022) | https://news.ballotpedia.org/2022/05/25/louisiana-legislature-refers-two-constitutional-amendments-to-2022-ballot-concerning-property-taxes/ |
| S9 | Louisiana Legislature — HB 300 (2025), freeze income limit (Amendment 9, Nov 3, 2026 ballot) | https://legis.la.gov/LEGIS/ViewDocument.aspx?d=1414405 |
| S10 | Louisiana Legislature — Act 172 (2022) disabled veteran exemptions | https://legis.la.gov/legis/ViewDocument.aspx?d=1294799 |
| S11 | Biz New Orleans — assessments open; 2023 reassessment background | https://bizneworleans.com/2026-orleans-assessments-open-online-appeals-available/ |
| S12 | Verite News — 2025 Assessor race guide (reassessment for the 2027 tax roll) | https://veritenews.org/guides/2025-new-orleans-election-guide/assessor-race/ |
| S13 | Louisiana Illuminator — 2022 amendment results (Orleans cap failed) | https://lailluminator.com/?p=12430 |
| S14 | CABL — Amendment 6 explainer (2018 phase-in) | https://cabl.org/whats-up-with-the-amendments-a-close-look-at-constitutional-amendment-6 |
| S15 | Orleans Parish Assessor — Homestead & SAL page (read Oct 28, 2026 in a browser; the site blocks bots). A text copy is saved as `assessor_homestead_sal_2026-10-28.txt`. | https://www.nolaassessor.com/homestead-sal/ |
| S16 | City of New Orleans 2026 Original Real Estate Tax Bills (14 checked) | https://taxbills.nola.gov/pdfs/2026/615100903.pdf (pattern: /pdfs/2026/<tax bill #>.pdf) |
| S17 | Ballotpedia — Amendment 9 (2026) results, unofficial as of Nov 4, 2026 | https://ballotpedia.org/Louisiana_Raise_Income_Limit_to_%24150%2C000_for_Special_Property_Tax_Assessment_Amendment_%282026%29 |
| P1 | Orleans Parish 2026 LTC real estate roll (one zip per district) | https://stax.latax.la.gov/TaxRollsFolder/2025/ORLEANSDISTRICT{1-7}_2026_TAXROLL.zip |
| — | Legislative Auditor, Orleans 2024 reappraisal ($628.6M projection, used as a sanity check) | https://lla.la.gov/publicreports.nsf/0/f74bf8c6ffebdf7f86258a8d00657f6c/$file/000037d0b.pdf |
| — | City open data, Active Short-Term Rental Licenses (ufdg-ajws) | https://data.nola.gov/Housing-Land-Use-and-Blight/Active-Short-Term-Rental-Licenses/ufdg-ajws |
| — | Census Geocoder (batch API, no key) | https://geocoding.geo.census.gov/geocoder/ |
| — | Census QuickFacts, New Orleans city (user profile data) | https://www.census.gov/quickfacts/table/PST045215/2255000 |

### Open items to verify
- Amendment 9 certification (passed on unofficial results Nov 3).
- Nov 5 millage decision.
- Official 2027 levee rate.
- Exact 2027 bill due date.
- How the Assessor handles homestead on owner-occupied doubles.
- What Freeze codes 2–4, Ward codes, Place FIPS codes, and LTC subclass codes mean (ask the Assessor or the LTC).

---

## 10. Data notes (Part 2)

### 10.1 The roll file
- **Source:** `Orleans_Parish_2026_LTC_Expanded_Real_Estate_Roll.csv` (class Box link).
  - 163,135 rows × 115 columns, one row per tax bill.
  - Tax year 2026; appraisal date 01/01/2023.
- **Join key:** `Tax Bill #`, which equals `Parcel ID(s)`. The official bill is at `https://taxbills.nola.gov/pdfs/2026/<Tax Bill #>.pdf`.
- **Field checks** (all hold in 100% of rows):
  - Land MV + Improvement MV = Total MV.
  - Land AV + Improvement AV = Total AV.
  - Total AV − all exemptions = Taxable AV.
- **District 5 = Algiers / West Bank.** Use the Algiers millage (132.01 total, 120.50 homestead-eligible).
- **Traps — do not trust these fields:**
  - "Living Square Feet" is a record count, not square feet.
  - Ward codes don't match official ward numbers.
  - Year Built 1994 and Transfer Date 12/31/1994 are placeholders.
  - Purchase prices of 0, 10, and 100 are not sales.
  - Verified Sale is always "N".
  - Bedrooms, bathrooms, condition, and quality are blank or constant.
- The full field list is in `data_dictionary.csv`: 43 fields confirmed, 25 inferred, 26 unknown or constant, 21 empty.

### 10.2 Bill estimate (page code: `estimate()` in index.html)
```
main     = Taxable AV × (East Bank 121.97 | Algiers 120.50) ÷ 1000
policeFire = (Total AV − Other Exemption Amount) × 11.51 ÷ 1000   (0 if status EX)
estimate = main + policeFire
```
- **Tested against 14 real 2026 bills** (`bill_formula_check.csv`): 10 match within $0.03.
  - 3 bills are lower because of an Act 718 phase-in.
  - 1 bill is higher because of the Garden District Security District (+7.13 mills).
- **Not covered:** flat security-district fees (e.g., Lakeview $150) and special-district millage (DDD 13.73, Garden District 7.13, Touro Bouligny 7.10).
- **Citywide sanity check:** all estimates add up to $632M, vs. the Legislative Auditor's $628.6M projection for 2024.

### 10.3 Address matching (`matcher.js`)
- **Steps:** normalize → parse number, unit, and suffix → alias names → exact lookup → typo fix (edit distance ≤ 2) → neighboring number (±2–4, same side of the street) → ask the user if more than one match.
  - Roll suffixes: AV, BL, HW, PW, CR, WY, TR.
  - Aliases: SAINT→ST, GENERAL→GEN, ordinal words → 9TH, MLK→MARTIN L KING, JEFFERSON DAVIS→NORMAN C FRANCIS, GOVERNOR→GOV, DE SOTO→DESOTO.
- **The roll drops N/S/E/W.** 824 addresses exist in two districts (e.g., 1000 BROAD ST), so the page asks the user to pick.
- **Results:**
  - Hand test: 12 of 13 real addresses found; 3 of 3 non-properties rejected.
  - Bulk test on 4,299 STR addresses: 69.2% exact, 25.0% needs a pick or confirmation, 5.8% no match.
  - Census Geocoder found 234 of 258 misses, so the misses come from how the roll numbers parcels (mostly condos), not from bad input.
- **Known limits:**
  - The typo fix only searches the bucket for the street's first letter.
  - Condo towers are often filed under another number.

### 10.4 Outside data: short-term rental licenses
- **API:** `GET https://data.nola.gov/resource/ufdg-ajws.csv?$limit=50000`. Socrata, no key, updated daily.
- **Pull:** Oct 28, 2026, 4,299 rows.
- **Saved as** `nola_active_str_licenses_2026-10-28_clean.csv`.
  - Personal fields (operator and holder name, phone, email) are removed.
  - 37 placeholder Texas coordinates are blanked.
  - Roll match columns are added.
- **Finding:** among exact matches, 75–78% of non-commercial STRs sit on homestead parcels, vs. 4% of commercial-owner STRs.
- **Status:** not in the chatbot yet.

### 10.5 Part 2 EDA findings (charts in the Part 2 doc)
- Exempt property is 21% of market value and pays 0% of the tax. Homes are 52% of value but 70% of taxable value.
- Homestead share of residential parcels:
  - 53.5% citywide;
  - 61% in Algiers;
  - 33% in the CBD/Warehouse district.
- The median homesteaded home is valued at $244,800 on the roll, vs. the Census owner-reported median of $296,400.
- Homestead effective rate:
  - 0.28% for homes under $100K;
  - 1.00% at $250–300K;
  - 1.26% for $1M+;
  - 1.33% for any home without homestead.
- 18,577 records have a freeze. The median frozen home is assessed 24% below 10% of its market value.

---

## 11. Part 1 instructor feedback and what changed (Nov 4, 2026)

| Feedback | Status | Where |
|---|---|---|
| Correct the reassessment-in-2027 vs. 2027-roll-reviewed-in-2026 distinction | **Fixed.** Wording now says the reassessment for the 2027 roll was reviewed in 2026 and hits Dec 2026 bills. Updated in the KB [S12] and the source titles too. | §2.2, §2.6, Topic D |
| Add the official homestead application steps | **Done in Part 2.** Documents, appointment, and who must attend, from the Assessor's page [S15]. | §2.5, KB |
| Fix and retest the two incomplete tax estimates | **Fixed.** Bill math now runs in page code, not the model (§10.2). It matches 10 of 14 real 2026 bills within $0.03, and the other 4 are explained (Act 718, Garden District). The $300K homestead example now totals **$3,089.63** (Topic B). Retested in the Part 2 test questions. | §4 Topic B, §10.2, Part 2 doc §5 |
| Verify current exemption thresholds | **Verified.** Homestead $75K market value / $7,500 assessed [S15]. Freeze income limit $102,700 for 2026 [S15], rising to $150K under Amendment 9 [S9][S17]. Veteran tiers per Act 172 [S10]. First responder $25K [S15]. | §2.5 |
| Include full sample answers or referenced screenshots | Part 1 Screenshots 1–6 are attached with the submission. Part 2 answers and results are in the Part 2 doc. | §6 |
| Make sure the instructor can open the chatbot | Moving to a public website (Vercel) that needs no sign-in. The artifact and Part 2 doc are also shared from their Share menus. | §0, §5 |

---

## 9. Change log
- **Oct 22, 2026** — Part 1:
  - Purpose and users set.
  - Domain research with 14 sources.
  - Chatbot rules.
  - Education outline with worked example.
  - Layer 1 artifact published.
  - Sample-question test plan.
- **Oct 22, 2026** — Ran 6 starter questions on version 1 and logged results in §6. Main bug: incomplete bill math (levee and police/fire mills).
- **Oct 28, 2026** — Part 2:
  - Loaded the 2026 roll, wrote the data dictionary, and ran the EDA (5 charts).
  - Built the address matcher and tested it on 16 hand addresses plus 4,299 STR addresses.
  - Pulled the STR licenses by API.
  - Added property lookup and bill estimate to the chatbot (version 2/3), checked against 14 real bills.
  - Fixed the Part 1 bugs: full bill method, renter rule, homestead documents [S15], and value-went-up facts.
  - Wrote 10 Part 2 test questions (in the Part 2 doc).
- **Nov 2, 2026** — Ran the 10 Part 2 test questions on version 3 (results in the Part 2 doc, section 5): 9 pass, 1 partial.
  - Bug: chat history carried over between addresses, so the bot "corrected" itself about earlier properties and mentioned the last property on general questions.
  - Fixed in version 4:
    - A new lookup clears `turns` and shows a divider.
    - The "Stop using it" button is renamed "Ask a general question instead" and also clears the chat.
    - New rule: only the one property on screen, and no property on general questions.
    - P2 is relabeled as "this tool's estimate," not "official bill."
  - **Rule for the agent:** never let chat history span two properties.
- **Nov 2, 2026** — Version 5 redesign:
  - Three numbered steps (Find your home → Your home and your bill → Ask a question).
  - Plain-language labels, with the math hidden behind "Show me the math."
  - "A+ Bigger text" toggle.
  - Neighborhood comparison from `nbhd.json`, labeled as context, not proof of an error.
  - The six decision buttons became four starter-question chips in step 3.
  - Design rule: keep the page usable by an older owner on a phone: one action per step, no jargon in labels.
- **Nov 4, 2026** — Part 1 feedback fixes (§11):
  - Reassessment timing wording corrected.
  - Amendment 9 updated to passed (unofficial), with a new source S17.
  - Started the move to a public website (GitHub + Vercel) so no sign-in is needed.
