import http from 'http';

interface ChatResponse {
  answer: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  execution: {
    tools: string[];
    graphAction?: string;
    graphEntities?: string[];
    graphTarget?: string;
    graphRelation?: string;
    vectorQuery?: string;
  };
  sources?: any[];
  graphContext?: any[];
  sqlContext?: any[];
  knowledgeRiskResult?: any;
}

function sendChatQuery(query: string): Promise<{ query: string; response: ChatResponse }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });
    const req = http.request(
      'http://localhost:3000/api/chat/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ query, response: parsed });
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runExhaustiveChatbotAudit() {
  console.log('================================================================================');
  console.log('🧪 EXHAUSTIVE CHATBOT AUDIT: TESTING ALL USER QUERY VARIATIONS & BACKEND RESPONSES');
  console.log('================================================================================\n');

  const testQueries = [
    // 1. Repo Risk / Bus Factor Queries (English & Hinglish)
    "konsi repo me risk jyda h sabse",
    "which repo has bus factor 1",
    "Which repository has higher risk",
    "compare repo risks",
    "which codebase is vulnerable",
    "single point of failure repositories",

    // 2. Person Knowledge Risk Queries
    "what happens if Arjun leaves the team",
    "knowledge risk of Sarah Chen",
    "what breaks if Vikram Patel quits",

    // 3. Entity Contact Info & Role Queries
    "what is Arjun's email and role",
    "who is Sarah Chen",
    "contact details for Vikram Patel",

    // 4. Technology Usage Queries
    "what technologies does Arjun use",
    "what uses Redis",
    "who knows Valkey",

    // 5. Semantic / Vector Architectural Decision Queries
    "why was Redis replaced with Valkey",
    "reason for replacing Redis",

    // 6. Compound Multi-Intent Queries (2-3 asks in one sentence)
    "Who is Arjun, what is his knowledge risk, and which repo is riskiest?",
    "what is Sarah Chen's email and what happens if she leaves"
  ];

  let passCount = 0;
  let failCount = 0;
  const auditResults: { query: string; passed: boolean; toolsUsed: string[]; snippet: string; issue?: string }[] = [];

  for (const q of testQueries) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`❓ Query: "${q}"`);
    try {
      const { response } = await sendChatQuery(q);
      const tools = response.execution?.tools || [];
      const answer = response.answer || '';
      
      console.log(` 🛠️  Tools Called: [${tools.join(', ')}]`);
      console.log(` 💬 Answer Preview: ${answer.slice(0, 150).replace(/\n/g, ' ')}...`);

      // Validation logic:
      let passed = true;
      let issue = '';

      if (!tools.length) {
        passed = false;
        issue = 'No tools executed by LLM planner';
      } else if (answer.includes('The indexed evidence does not contain') && !q.includes('nonexistent')) {
        passed = false;
        issue = 'Answer claims evidence missing for a valid query';
      }

      if (passed) {
        passCount++;
        console.log(` ✅ STATUS: PASS`);
      } else {
        failCount++;
        console.log(` ❌ STATUS: FAIL - ${issue}`);
      }

      auditResults.push({ query: q, passed, toolsUsed: tools, snippet: answer.slice(0, 150), issue });
    } catch (err: any) {
      failCount++;
      console.error(` ❌ STATUS: ERROR - ${err?.message}`);
      auditResults.push({ query: q, passed: false, toolsUsed: [], snippet: '', issue: err?.message });
    }
  }

  console.log('\n================================================================================');
  console.log(`📊 CHATBOT AUDIT SUMMARY: ${passCount} PASSED / ${failCount} FAILED out of ${testQueries.length} QUERIES`);
  console.log('================================================================================\n');

  if (failCount > 0) {
    console.log('⚠️ FAILED QUERIES DETAILED REPORT:');
    auditResults.filter(r => !r.passed).forEach(r => {
      console.log(` - Query: "${r.query}" | Issue: ${r.issue} | Tools: [${r.toolsUsed.join(', ')}]`);
    });
  }

  process.exit(failCount === 0 ? 0 : 1);
}

runExhaustiveChatbotAudit().catch(console.error);
