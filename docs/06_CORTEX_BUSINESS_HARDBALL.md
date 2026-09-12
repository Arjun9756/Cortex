# Cortex — Business-Level Hard Questions (CEO/CTO/VP/Investor Lens)

> Internal reference. Harsh reality, no sugar-coating. Har jawab mein: kya poocha ja sakta hai, honest current answer, aur agar answer weak hai toh kya karna padega usse strong banane ke liye.

---

## SECTION 1: "Why does this exist" — Market & Problem Questions

### Q1: "What problem are you solving that isn't already solved?"
**Harsh reality:** Abhi tumhare paas iska crisp answer nahi hai. Meeting mein Karan ne yehi poocha tha (16:15) aur tumne technical features (graph, vector search) bataye, business problem nahi.

**Honest current answer:** "Engineering teams lose tribal knowledge when senior people leave, and onboarding new devs takes weeks because context (why decisions were made) lives in people's heads, not in searchable form."

**Deep down truth:** Ye problem **real hai**, but ye **naya nahi hai** — Confluence, Notion, wikis, Glean — sab isi problem se paisa kama rahe hain 5-10 saal se. Tumhara answer abhi "hum bhi ye karte hain" hai, "hum ye alag/better karte hain" nahi.

**Kya karna padega:** Ek specific, narrow, provable claim chahiye — jaise "hum specifically 20-100 developer teams ke liye, jo Confluence maintain nahi kar pate aur Glean afford nahi kar sakte, unke liye automatic (bina manual documentation ke) knowledge capture karte hain."

---

### Q2: "Why would a company use Cortex instead of just telling people to write better documentation?"
**Harsh reality:** Ye ek genuinely tough question hai jo koi bhi skeptical CTO poochega — "why not just fix the process instead of buying a tool?"

**Honest answer:** Documentation discipline **kabhi scale nahi karti** — teams jitni bhi try karein, docs stale ho jaate hain, developers likhna avoid karte hain jab deadline pe hote hain. Ye ek **behavioral problem** hai jo tools se hi solve hota hai (automatic capture), manual discipline se nahi.

**Deep down truth:** Ye argument sahi hai, but tumhe **proof chahiye**, sirf claim nahi. Abhi tumhare paas koi case study, koi before/after metric, koi customer testimonial nahi hai. Ek CTO isko turant challenge karega: "prove it, show me a team where this actually reduced onboarding time."

---

### Q3: "Who exactly is your customer — the CTO, the manager, or the individual developer?"
**Harsh reality:** Meeting transcript mein ye khud confused tha. Tumne bola "CTO/top management ke liye", phir employee grading discuss hui, phir "employees ke liye limited chat" — teeno alag buyer/user hain.

**Honest current answer:** Abhi decide nahi hua hai clearly. Working assumption: **CTO/Engineering Manager buyer hai**, developers end-users hain (query karte hain), employees grading se exclude.

**Deep down truth:** Agar tumhe khud clear nahi ki buyer kaun hai, sales pitch, pricing, aur product roadmap sab confuse rahenge. B2B SaaS mein "buyer ≠ user" hona normal hai (jaise Slack — IT buys, everyone uses), lekin **dono personas clearly defined honi chahiye**, abhi nahi hain.

---

### Q4: "What's your total addressable market? How many companies actually fit this profile?"
**Harsh reality:** Koi number discuss nahi hua abhi tak. Ye ek investor/CEO level question hai jo turant poocha jayega.

**Honest answer:** Abhi koi TAM calculation nahi ki gayi.

**Deep down truth:** Agar tumhara target "20-100 developer companies jo Glean afford nahi kar sakti" hai, ye ek **genuinely large but low-value-per-customer market hai** — bahut saari chhoti IT services companies (jaise CodeStore, nSoft, Kody jo tumne contact kiya), lekin unka **budget bhi chhota hai**. Ye tension hai: bada market, chhota per-customer revenue. Investor turant poochega "how do you make this a venture-scale business if each customer pays ₹5,000-10,000/month?"

---

## SECTION 2: Competitive & Differentiation Questions

### Q5: "How is this different from Glean?"
**Harsh reality:** Ye question tumhe pehle bhi mila (Karan ne poocha), aur abhi bhi weak answer hai.

**Honest current answer:** Glean bade enterprises (500-50,000 employees) ke liye hai, expensive hai, broad hai (sab departments). Cortex chhoti engineering teams ke liye hai, engineering-specific hai, affordable hai.

**Deep down truth:** Ye **positioning hai, moat nahi**. Agar Glean chaahe, wo apna pricing chhota kar sakta hai chhoti companies ke liye (unke paas resources hain). Tumhara real defense sirf "hum sasta/chhota hain" nahi ho sakta — ye **temporary advantage** hai, permanent nahi. Tumhe koi **technical ya workflow-level differentiation** chahiye jo Glean easily copy na kar sake.

---

### Q6: "What stops a developer from just using ChatGPT/Claude with the codebase pasted in?"
**Harsh reality:** Ye bahut practical question hai jo koi bhi technical CTO poochega.

**Honest answer:** ChatGPT ko context nahi hota — har baar naya session, koi persistent knowledge graph nahi, koi cross-referencing GitHub+Jira+Slack ka nahi.

**Deep down truth:** Ye answer sahi hai, but weak hai kyunki **Claude Projects, ChatGPT Custom GPTs, aur Cursor jaise tools already ye gap bhar rahe hain** — persistent context, codebase-aware chat. Tumhara differentiation **structured knowledge graph + cross-tool relationships** hai (jo generic LLM chat nahi karta), lekin ye tabhi valuable hai jab genuinely accurately kaam kare — aur audit ne dikhaya hai ki abhi ye **hallucination-prone hai, grounding enforced nahi hai**.

---

### Q7: "What's your moat? What stops a competitor from copying this in 3 months?"
**Harsh reality:** Sabse dangerous question, kyunki abhi honest answer hai: **kuch nahi rokta**.

**Honest answer:** Abhi koi proprietary data advantage, koi network effect, koi switching cost nahi hai jo replicate karna hard ho.

**Deep down truth:** Architecture (GitHub webhook → queue → LLM extraction → Neo4j → chat) ye **koi bhi decent engineer 2-3 mahine mein clone kar sakta hai** — ye "well-known pattern" hai, novel research nahi. Real moat **future mein** aa sakta hai agar: (a) tum genuinely bahut customers ka data accumulate karo aur unse learn karo (network effect), (b) specific vertical (jaise sirf fintech engineering teams) mein deep integration karo jo generic tools nahi karte, ya (c) grading/accountability feature (jo abhi risky hai) genuinely well-executed ho jaye aur ban jaye "the standard".

---

## SECTION 3: Business Model & Revenue Questions

### Q8: "What's your pricing model, and does it actually work at your target customer's budget?"
**Harsh reality:** Poori meeting mein pricing discuss hi nahi hua. Ye bada gap hai.

**Honest answer:** Abhi koi finalized pricing nahi hai.

**Deep down truth:** Agar target 20-100 developer companies hain jo already tight-margin IT services companies hain (jaisa CodeStore/nSoft/Kody profile se pata chala), unka **software tools ka budget genuinely limited hota hai**. Per-seat pricing (Glean model) yahan kaam nahi karega — inka CTO khud approve karega sirf agar price **"no-brainer" cheap** ho (₹2,000-5,000/month range shayad), jo tumhare infra costs (LLM API + Neo4j hosting + Qdrant) ko cover karne ke liye kaafi tight hai.

---

### Q9: "What does it cost YOU to run this per customer, and does your pricing cover it with margin?"
**Harsh reality:** Audit mein clearly aaya — **koi cost accounting nahi hai system mein**, aur Neo4j Aura akela $292/month se shuru hota hai (2GB tier).

**Honest answer:** Abhi per-customer unit economics calculate nahi kiye gaye.

**Deep down truth:** Ye **sabse dangerous unknown hai**. Agar Neo4j hosting hi $292/month se shuru ho raha hai per client (ya shared infra pe bhi scale ke saath badhega), aur tumhara target customer sirf ₹2,000-5,000/month de sakta hai, **math kaam nahi karega** jab tak: (a) multi-tenant shared infrastructure genuinely efficient banao (abhi audit ke according koi tenant isolation hi nahi hai — sab data globally shared hai), ya (b) pricing upar le jao, jo target market ke budget se clash karega.

---

### Q10: "How many paying customers do you have right now?"
**Harsh reality:** Zero. Ye seedha bola jayega.

**Honest answer:** Abhi zero paying customers hain, cold outreach chal raha hai (CodeStore, nSoft, Kody jaisi companies ko), aur landing page pe kuch organic traffic aaya hai (Washington DC, Mumbai se).

**Deep down truth:** Ye **normal hai is stage pe**, lekin kisi bhi investor/serious buyer ke liye "zero revenue, zero paying customer, pre-product-market-fit" — matlab abhi **fundraising ya big claims karne ka time nahi hai**, abhi **customer discovery aur first paying customer** hi sabse important milestone hai.

---

## SECTION 4: Technical Credibility Questions (Deep Down)

### Q11: "Is this actually production-ready, or is this a demo?"
**Harsh reality:** Audit ne clearly likh diya hai: **"Not functional as a production system"** — verbatim verdict.

**Honest answer:** Ye abhi ek **demo/prototype stage** hai. Core architecture bana hai, lekin security (no auth, open CORS), data integrity (Jira/Slack duplicate handling broken), aur trust (fake fallback analytics data) — ye teeno areas mein critical gaps hain.

**Deep down truth:** Agar koi technical CTO tumhara code review kare ya network tab dekhe, wo turant pakad lega ki analytics numbers fake hain (103/102 hardcoded), integration counts fake hain (42/18), aur koi authentication hi nahi hai. **Ye ek instant credibility killer hai** — isliye demo dene se pehle Section "Fake Fallbacks" wala fix zaroor hona chahiye, chahe baaki sab kuch rough ho.

---

### Q12: "If the LLM hallucinates a wrong fact, how would anyone know?"
**Harsh reality:** Abhi koi mechanism nahi hai isko catch karne ka.

**Honest answer:** Abhi answer prompt mein sirf instruction hai "only verified evidence", lekin koi post-generation validation nahi hoti.

**Deep down truth:** Ye **core product ka sabse bada credibility risk hai** — agar Cortex "why did we choose GraphQL" jaisa sawaal ka **galat/hallucinated answer** de de, aur developer usi ko sach maan le, ye **worse hai** than no tool at all, kyunki wrong confident information zyada damaging hai than "I don't know, go ask someone". Isko fix kiye bina ye product genuinely risky hai enterprise use ke liye.

---

### Q13: "What happens to my company's data if I stop paying, or if you shut down?"
**Harsh reality:** Ye ek genuine enterprise buyer concern hai, especially agar data unke Slack/GitHub/Jira se aa raha hai.

**Honest answer:** "Bring Your Own Cloud" model discuss hua tha meeting mein (customer apna Neo4j/infra use kare), lekin ye implement nahi hua abhi — abhi sab centralized/shared hai (audit ke according, no tenant model).

**Deep down truth:** Enterprise buyers (especially security-conscious ones) **data ownership/portability** ko bahut seriously lete hain. Agar tumhare paas clear data export, deletion, aur (ideally) self-hosted option na ho, **bigger/security-conscious clients turant reject kar denge**, chahe product kitna bhi accha ho.

---

## SECTION 5: Team & Execution Questions

### Q14: "Who's building this — just you, or is there a team?"
**Harsh reality:** Abhi solo founder, full-time WeframeTech job ke saath side mein bana rahe ho.

**Honest answer:** Solo, part-time (evenings/weekends), full-time backend job ke saath.

**Deep down truth:** Investors/serious partners generally **solo, part-time founders** ko high-risk maante hain kyunki bandwidth limited hai, aur agar job demanding ho gayi, Cortex pe time nahi mil payega. Ye disqualifying nahi hai (bahut successful products aise shuru hue), lekin **honestly acknowledge karna padega** ki abhi ye "side project validating an idea" stage hai, "startup ready to scale" nahi.

---

### Q15: "What's your realistic timeline to first paying customer?"
**Harsh reality:** Abhi definitive timeline nahi hai, aur security/data-integrity fixes (Section audit se) pehle karne honge before koi serious demo bhi de sakte ho.

**Honest answer:** P0 fixes (auth, injection, fake data removal) complete karne ke baad hi genuine outreach/demo possible hai — realistically 3-4 hafte ka technical work bacha hai stability ke liye, phir customer discovery calls already chal rahe hain.

**Deep down truth:** Jaldi "customer laane" ki pressure mein **abhi demo dena risky hai** — agar ek potential client dekh le ki analytics fake hai ya koi security issue exploit ho jaye, wo sirf ek chhota bug nahi, **reputation permanently damage** kar sakta hai chhoti tech community mein (jahan log ek dusre se baat karte hain).

---

## SECTION 6: The Grading/Scoring Feature — Separate Deep-Dive

### Q16: "You mentioned developer scoring/grading — isn't this just surveillance that developers will resist?"
**Harsh reality:** Tumne khud meeting mein ye concern raise ki thi apne product pe (57:05) — "main tumhara knowledge risk jaan sakta hoon, tum mera jaan sakte ho."

**Honest answer:** Ye abhi sirf idea stage mein hai, implement nahi hua. Recognize kiya gaya hai ki ye trust-sensitive feature hai.

**Deep down truth:** Ye feature **do tarah se fail ho sakta hai**: (1) Agar developers ko lage unhe track/grade kiya ja raha hai bina unki consent/buy-in ke, wo **tool ko hi resist karenge** (fake activity, gaming the metrics, ya seedha use hi nahi karenge) — jo pura product hi undermine karega. (2) Fair grading algorithm banana **genuinely unsolved problem hai** (Tomhawk ne khud flag kiya) — task complexity, code quality, aur "contribution" ko objectively measure karna extremely hard hai, aur agar galat measure kiya toh ye **legal/HR liability** bhi ban sakta hai (unfair performance reviews ka basis banne se).

**Recommendation jo pehle bhi di gayi:** Isko **Phase 2 mein rakho**, abhi core knowledge-assistant product pe focus karo jahan trust issue kam hai.

---

## SUMMARY — The Brutal Truth in One Paragraph

Cortex ek **genuine problem** (engineering knowledge silos) pe based hai, aur architecture **conceptually sahi** hai. Lekin abhi: (1) differentiation story weak hai — "Glean se sasta" ek moat nahi hai, (2) unit economics calculate nahi hue — infra cost vs target customer ka budget mismatch ho sakta hai, (3) product security/integrity issues hain jo demo dene se pehle fix honi chahiye (fake data, no auth, injection risk), (4) buyer persona aur grading feature ka scope abhi tak confused hai, aur (5) zero paying customers hain abhi. **Ye sab normal hai is stage ke liye** — lekin agle steps mein "feature add karna" nahi, balki "in gaps ko honestly close karna" priority honi chahiye, warna pehla serious CTO/investor conversation hi in exact questions pe atak jayega.