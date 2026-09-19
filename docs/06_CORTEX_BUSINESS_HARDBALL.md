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

---

## SECTION 7: "Why Cortex at All?" — The Core Existence Questions

> Ye section un questions ke liye hai jo sabse pehle aate hain: "Kyun banaya? Kyun khareedein? Notion kaafi nahi hai kya?" Har answer mein: honest truth + evidence + kab ye objection valid hai vs kab dismiss karo.

---

### Q17: "Agar log Notion ya Confluence mein properly document karein, toh Cortex ki zaroorat hi kyun hai?"

**Ye sabse common objection hai. Iska seedha answer:**

Documentation discipline **real world mein scale nahi karti** — ye ek behavioral fact hai, opinion nahi.

**Evidence:**
- Atlan, TribalHabits, getleo.ai research: Engineering knowledge **behavior mein hoti hai, docs mein nahi** — "why did we choose Redis here?" ka jawab Confluence mein nahi, 6 mahine purani Slack thread mein milta hai
- Deadline pe developer documentation skip karta hai — ye consistent pattern hai across all org sizes
- Confluence/Notion pages **stale ho jaate hain** — code change hota hai, wiki update nahi hoti; 6 mahine mein outdated
- McKinsey/BCG research: Companies ab KM tools ki zaroorat is angle se dekh rahi hain: **"AI-readiness prerequisite"** — agar knowledge structured nahi hai, toh internal AI tools train nahi ho sakte

**Cortex ka actual angle:**
```
Notion/Confluence model:
  Engineer manually likhta hai → stored → koi padhta hai (shayad)
  Problem: Depends on discipline. Nobody has it consistently.

Cortex model:
  Engineer kuch nahi likhta → System automatically
  observe karta hai GitHub commits + Slack threads + Jira tickets
  → "Rahul ke paas 73% payment-gateway ka knowledge hai"
  → "Agar Rahul jaaye, Priya 40% cover kar sakti hai"
  → "Ye 3 repos mein koi backup nahi hai"
```

**Kab ye objection valid hai:** Agar koi company genuinely ek dedicated documentation culture maintain karti hai (mandatory ADRs, weekly knowledge transfer sessions, strict onboarding playbooks) — ye companies **Cortex ki target nahi hain**. Ye rare hain, lekin exist karti hain.

**Kab dismiss karo:** Jab koi bolte hain "hum toh document karte hain" — almost always ye aspirational hai, actual nahi. Poochho: "Last 3 mahine mein kitni Confluence pages update hui hain jo 1 saal se zyada purani theen?" Answer usually silence hota hai.

---

### Q18: "Market mein log Cortex ke liye paise denge ki nahi?"

**Honest answer: Direct nahi. Trigger event pe haan.**

**Research-backed reality:**

| Situation | Pay karenge? |
|---|---|
| Sab theek chal raha hai, koi departure nahi | ❌ Nahi — "nice to have" |
| Senior engineer recently resign kiya | ✅ Haan — "kal chahiye" |
| Hiring freeze + delivery continue karni hai | ✅ Haan — continuity risk |
| Platform team bani, ownership map chahiye | ✅ Haan — uska pehla mandate yahi hai |
| Series C funding round, investor due diligence | ✅ Haan — "single point of failure koi hai?" |
| "Hum toh Confluence use karte hain" | ❌ Nahi — wrong trigger |

**Market size reality (Gartner data):**
- SEI platform adoption: **5% companies in 2024 → 50% by 2027** (10x growth projected)
- Ye bata raha hai: market abhi **early formation** mein hai — 2-3 saal ahead of mainstream pull
- LinearB price: $29-59/seat/month = **$40,000–$100,000/year** for 60-engineer team
- Cortex free pilot offer = **unbeatable entry point** against this

**Bottom line:** Log tab paisa denge jab **pain already ho raha ho** — departure hua ho, ya hone wala ho. Cortex ek **painkiller hai, vitamin nahi**. Vitamin koi proactively nahi khareedata jab tak doctor prescribe na kare; painkiller tab khareedta hai jab sar dard ho raha ho.

---

### Q19: "Cortex ki jagah existing tools — GitHub Insights, Jira reports, Slack analytics — kyun nahi use karein?"

**Honest answer:** Kyunki ye tools **data silos hain** — koi ek jagah nahi jahan ye sab connect ho.

**Breakdown:**

| Tool | Kya dikhata hai | Kya nahi dikhata |
|---|---|---|
| GitHub Insights | Commit frequency, PR count, top contributors | Kya Rahul hi ek aadmi hai jo payment-gateway samajhta hai? |
| Jira Reports | Ticket velocity, sprint burndown | Kaun engineer kis domain ka asli expert hai? |
| Slack Analytics | Message count, active users | Kaunse conversations mein critical architectural decisions hue? |
| Confluence/Notion | Jo likha gaya | Jo kabhi likha hi nahi gaya (80% knowledge) |

**Cortex kya karta hai jo ye nahi karte:**
1. **Cross-tool knowledge graph** — GitHub + Jira + Slack ek saath, relationships draw karta hai
2. **Departure simulation** — "Agar X jaaye, kaun cover kar sakta hai, aur kya gap rahega?" — koi tool ye nahi karta
3. **Bus factor score** — mathematical, not vibes-based
4. **Grounded Q&A agent** — natural language mein pooch, cited source ke saath jawab

---

### Q20: "Kya ye sirf ek 'nice dashboard' hai, ya actually kuch solve karta hai?"

**Ye sabse important question hai — aur ye decide karta hai ki Cortex survive karega ki nahi.**

**G2/market research se competitor churn reasons:**
- LinearB, CodeScene users aksar chodh dete hain kyunki: "High-level dashboards without actionable guidance" — vanity metrics dikhate hain, fix nahi karwate
- "Tool fatigue" — ek aur dashboard jo koi nahi dekha

**Cortex ko "nice dashboard" nahi banana hai. Iske liye:**

✅ **Jo Cortex MUST do (painkiller features):**
- Departure simulation → Specific names + successor recommendations (actionable)
- Bus factor alert → "Ye 3 repos SPOF risk pe hain" → direct action lagta hai
- Agent Q&A → "Kaun payment-gateway-v2 handle kar sakta hai?" → instant answer, not "check Confluence"

❌ **Jo Cortex nahi banana chahiye (nice-to-have = death):**
- Generic DORA metrics (LinearB already karta hai, better)
- Pretty graphs without action recommendations
- "Knowledge health score" without explaining what to do about it

**Test:** Koi bhi feature add karne se pehle poochho: **"Isko dekh ke engineer/manager kya karega kal subah?"** Agar jawab vague hai — remove the feature.

---

### Q21: "Ye product kitne logon ke liye relevant hai — sabke liye ya sirf bade companies ke liye?"

**Honest answer: Beachhead = 40–150 engineer teams. Extremes pe fit nahi hota.**

| Company size | Fit? | Reason |
|---|---|---|
| < 10 engineers | ❌ | Sab ek hi room mein hain, bus factor naturally low |
| 10–40 engineers | ⚠️ Marginal | Pain hai but budget nahi, CEO khud manage kar leta hai |
| **40–150 engineers** | ✅ **Sweet spot** | Bus factor real hai, platform team bani hai/ban rahi hai, GitHub+Jira+Slack already use ho raha hai |
| 150–500 engineers | ⚠️ Stretch | Pain bahut zyada hai, but procurement/security blocks karenge (SOC 2 chahiye) |
| 500+ engineers | ❌ | Jellyfish/Faros territory; 2-person vendor pass nahi hoga procurement mein |

**Geography:**
- **US/EU first** — budget hai, eng intelligence tools already familiar hain, BYOC concept samajhte hain
- **India (GCC/product companies) second** — budget tight hai, lekin GCCs (Goldman Sachs, JP Morgan engineering centers) mein departure risk genuinely high hai kyunki attrition rates 20-30% hain. Ye ek underserved segment hai.

---

### Q22: "Cortex ka actual moat kya hai? 3 mahine mein koi copy kar sakta hai?"

**Honest answer: Abhi? Haan, technically copy ho sakta hai. Long-term moat? Ek hai, but build karna padega.**

**Abhi ka technical architecture (replicate-able):**
- GitHub webhook → BullMQ → LLM extraction → PostgreSQL + pgvector → LangGraph agent
- Ye well-known pattern hai. Koi bhi senior engineer 2-3 mahine mein bana sakta hai.

**Actual moat (agar build kiya jaaye):**

1. **Data network effect** — Jitne zyada orgs Cortex use karein, utna better anonymized benchmarking ("tumhari team ka bus factor industry average se 2x zyada hai"). Ye tab valuable hota hai jab 50+ orgs use kar rahi hon.

2. **Departure simulation accuracy** — Isko better banane ke liye real-world feedback chahiye: "Simulation ne kaha Priya cover kar sakti hai, actually kya hua?" — ye feedback loop agar capture kiya jaaye, accuracy improve hoti hai aur replicate karna hard hota hai.

3. **Identity resolution layer** — GitHub email ≠ Slack display name ≠ Jira username. Ye silently fail karta hai aur bahut edge cases hain. Jo iska robust solution build karega, use copy karna genuinely hard hai.

4. **First-mover in the niche** — "Engineering departure risk" as a specific category abhi kisi ki territory nahi hai. Agar Cortex yahan brand bana le (blog posts, public bus factor calculator tool, community) — "Cortex = departure risk" association ek soft moat ban sakta hai.

---

### Q23: "Agar hum free pilot dete hain, toh business kaise chalega?"

**Honest answer: Free pilot = customer discovery tool. Revenue 3-6 mahine baad aata hai.**

**DevTools free-to-paid conversion research:**
- Freemium: 2-5% conversion (poor)
- Free trial → activated user: 15-25% conversion
- **Activated devtool (user reached "aha moment")**: 20-40% top quartile

**"Aha moment" for Cortex:**
> User apni team ka bus factor score dekhta hai aur pehli baar realize karta hai: *"Ye banda agar jaaye toh hum stuck ho jaayenge."* — Tab conversion probability highest hoti hai.

**Free pilot ka structure (hard cap: 5 pilots at a time):**
- 30 days, BYOC setup (user ka apna infra)
- Written success metrics (3 specific questions jo Cortex correctly answer karega)
- Month 2 mein commercial conversation

**Jab paid karo:**
- Pilot success metric meet hua? → "Commercial mein jaate hain"
- Failed? → Feedback lo, fix karo, next pilot
- **Never: "Free indefinitely"** — ek deadline define karo

---

## UPDATED SUMMARY — Post-GTM Research

**Ye 3 truths Cortex ke baare mein permanently yaad rakho:**

### Truth 1: Problem real hai, timing early hai
Bus factor risk genuinely documented problem hai (1.5-2x salary replacement cost, 4-8 week velocity loss per departure). Lekin **market 2-3 saal early hai** — Gartner says 5% adoption in 2024. Ye survivable hai sirf agar tum free pilots pe operate karo, paid contracts pe nahi.

### Truth 2: Documentation tools substitute nahi hain — alag category hai
Notion/Confluence = manual, passive, stale. Cortex = automatic, active, real-time. Ye competition nahi hai, ye alag use case hai. **Pitch yahi karo:** "Cortex woh knowledge capture karta hai jo kabhi likhi hi nahi gayi."

### Truth 3: Painkiller business model — vitamin nahi
Trigger event ke baad becho: departure hua, hiring freeze hai, platform team bani. Proactive buyers rare hain. **Reactive buyers (post-pain) conversion rate 3-5x higher hoti hai** — unhe dhundho.

**Final verdict (updated): GO-WITH-CONDITIONS**
- ✅ Free pilots shuru karo — 5 max at a time
- ✅ Target: Series B-C, 40-150 engineers, recent departure signal
- ✅ BYOC only — no data sovereignty questions
- ❌ Paid contracts nahi — not yet
- ❌ 500+ company procurement nahi — SOC 2 nahi hai abhi