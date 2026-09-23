import { cortexAgent } from '../packages/agent/graph/workflow.js';
import fs from 'fs';

interface TestItem {
    id: string;
    category: string;
    query: string;
    expectedChecks: {
        mustMention?: string[];
        mustNotMention?: string[];
        mustCallTools?: string[];
        isDecline?: boolean;
    };
}

const TEST_SET: TestItem[] = [
    // ─── 1. Part 0 Original Failures (Must match dashboard numbers exactly) ─
    {
        id: 'P0_1',
        category: 'Part 0 Bug Fixes',
        query: 'how many commits in billing-engine',
        expectedChecks: {
            mustMention: ['4', 'billing-engine', 'priyasharma'],
            mustCallTools: ['get_commit_count'],
        }
    },
    {
        id: 'P0_2',
        category: 'Part 0 Bug Fixes',
        query: 'how many commits did priyasharma make',
        expectedChecks: {
            mustMention: ['9', 'priyasharma'],
            mustCallTools: ['get_commit_count'],
        }
    },
    {
        id: 'P0_3',
        category: 'Part 0 Bug Fixes',
        query: 'who is the best successor for billing-engine',
        expectedChecks: {
            mustMention: ['rohanverma', '25%', 'billing-engine'],
            mustCallTools: ['get_successor_recommendation'],
        }
    },

    // ─── 2. Multi-Hop Questions ───────────────────────────────────────────────
    {
        id: 'MH_1',
        category: 'Multi-Hop',
        query: 'who should replace priyasharma if they leave, and what repositories do they own',
        expectedChecks: {
            mustMention: ['rohanverma', 'billing-engine'],
        }
    },

    // ─── 3. Comparative Questions ────────────────────────────────────────────
    {
        id: 'COMP_1',
        category: 'Comparative',
        query: 'who commits more, priyasharma or rohanverma',
        expectedChecks: {
            mustMention: ['priyasharma', 'rohanverma'],
        }
    },

    // ─── 4. Questions with No Clean Tool Match (Multi-faceted) ───────────────
    {
        id: 'MULTI_1',
        category: 'Multi-Tool / Risk Analysis',
        query: "what's risky about auth-token-vault",
        expectedChecks: {
            mustMention: ['auth-token-vault', 'bus factor', '80%'],
        }
    },

    // ─── 5. Out-of-Scope ─────────────────────────────────────────────────────
    {
        id: 'OOS_1',
        category: 'Out of Scope',
        query: "what's the weather today in Tokyo",
        expectedChecks: {
            isDecline: true,
            mustNotMention: ['Tokyo weather is sunny', '25 degrees'],
        }
    },

    // ─── 6. 5 Very Different Phrasings of Same Underlying Question ───────────
    {
        id: 'PHRASE_1',
        category: 'Phrasing (Formal)',
        query: 'Could you please specify the total number of commits recorded for billing-engine?',
        expectedChecks: {
            mustMention: ['4'],
        }
    },
    {
        id: 'PHRASE_2',
        category: 'Phrasing (Casual)',
        query: 'yo how many commits does billing-engine got',
        expectedChecks: {
            mustMention: ['4'],
        }
    },
    {
        id: 'PHRASE_3',
        category: 'Phrasing (Broken Grammar)',
        query: 'billing engine commit count total how much',
        expectedChecks: {
            mustMention: ['4'],
        }
    },
    {
        id: 'PHRASE_4',
        category: 'Phrasing (Hindi/Hinglish)',
        query: 'billing-engine me kitne commits hue hai abhi tak',
        expectedChecks: {
            mustMention: ['4'],
        }
    },
    {
        id: 'PHRASE_5',
        category: 'Phrasing (Typos)',
        query: 'how many comits in billing-engin',
        expectedChecks: {
            mustMention: ['4'],
        }
    },

    // ─── 7. Nonexistent Entity ───────────────────────────────────────────────
    {
        id: 'NONEXIST_1',
        category: 'Nonexistent Entity',
        query: 'how many commits in non-existent-fake-repo-12345',
        expectedChecks: {
            mustNotMention: ['has 45 commits', 'has 12 commits'],
        }
    }
];

export async function runSuite(): Promise<{ total: number; passed: number; failed: number; results: any[] }> {
    console.log(`\n========================================================================`);
    console.log(`🚀 RUNNING GENERALIZED AGENT VERIFICATION SUITE (${TEST_SET.length} tests)`);
    console.log(`========================================================================\n`);

    const results: any[] = [];
    let passed = 0;

    for (let i = 0; i < TEST_SET.length; i++) {
        const item = TEST_SET[i];
        console.log(`[${i + 1}/${TEST_SET.length}] [${item.category}] Testing: "${item.query}"`);
        const t0 = Date.now();

        try {
            const res = await cortexAgent.invoke({ query: item.query }, { recursionLimit: 25 });
            const latency = Date.now() - t0;
            const answer = res.answer || '';
            const tools = res.executedTools || [];

            let ok = true;
            const failures: string[] = [];

            if (item.expectedChecks.mustMention) {
                for (const m of item.expectedChecks.mustMention) {
                    const normAnswer = answer.toLowerCase().replace(/[-_]/g, ' ').replace(/\u202f/g, ' ').replace(/\s*%/g, '%');
                    const normM = m.toLowerCase().replace(/[-_]/g, ' ').replace(/\u202f/g, ' ').replace(/\s*%/g, '%');
                    if (!normAnswer.includes(normM)) {
                        ok = false;
                        failures.push(`Expected mention of "${m}" not found in answer.`);
                    }
                }
            }

            if (item.expectedChecks.mustNotMention) {
                for (const m of item.expectedChecks.mustNotMention) {
                    if (answer.toLowerCase().includes(m.toLowerCase())) {
                        ok = false;
                        failures.push(`Forbidden mention of "${m}" found in answer.`);
                    }
                }
            }

            if (item.expectedChecks.mustCallTools) {
                for (const t of item.expectedChecks.mustCallTools) {
                    if (!tools.includes(t)) {
                        ok = false;
                        failures.push(`Expected tool "${t}" was not executed (called: [${tools.join(', ')}]).`);
                    }
                }
            }

            if (item.expectedChecks.isDecline) {
                const isDeclineAnswer = answer.toLowerCase().includes('cortex') ||
                    answer.toLowerCase().includes('assistant') ||
                    answer.toLowerCase().includes('cannot') ||
                    answer.toLowerCase().includes('can only') ||
                    answer.toLowerCase().includes("don't have data");
                if (!isDeclineAnswer) {
                    ok = false;
                    failures.push(`Expected polite decline for out-of-scope question.`);
                }
            }

            if (ok) passed++;

            const statusStr = ok ? '✅ PASS' : '❌ FAIL';
            console.log(`  -> ${statusStr} in ${latency}ms | Tools: [${tools.join(', ')}]`);
            if (!ok) {
                console.log(`     Issues: ${failures.join(' | ')}`);
                console.log(`     Snippet: ${answer.slice(0, 140)}...`);
            }

            results.push({
                id: item.id,
                category: item.category,
                query: item.query,
                status: ok ? 'PASS' : 'FAIL',
                latencyMs: latency,
                toolsCalled: tools,
                answerSnippet: answer.slice(0, 160).replace(/\n/g, ' '),
                failures,
            });
        } catch (err: any) {
            console.error(`  -> 💥 ERROR: ${err.message}`);
            results.push({
                id: item.id,
                category: item.category,
                query: item.query,
                status: 'ERROR',
                latencyMs: Date.now() - t0,
                error: err.message,
            });
        }
    }

    console.log(`\n========================================================================`);
    console.log(`🏁 SUITE SUMMARY: ${passed}/${TEST_SET.length} PASSED (${Math.round((passed / TEST_SET.length) * 100)}%)`);
    console.log(`========================================================================\n`);

    return {
        total: TEST_SET.length,
        passed,
        failed: TEST_SET.length - passed,
        results,
    };
}

async function main() {
    const run1 = await runSuite();
    fs.writeFileSync('scratch/suite_run_1.json', JSON.stringify(run1, null, 2));

    if (run1.failed > 0) {
        console.warn(`Run 1 had ${run1.failed} failures. Please inspect scratch/suite_run_1.json.`);
        process.exit(1);
    }

    console.log("\n=== CONSECUTIVE RUN #2 TO VERIFY ZERO REGRESSIONS ===");
    const run2 = await runSuite();
    fs.writeFileSync('scratch/suite_run_2.json', JSON.stringify(run2, null, 2));

    if (run2.failed > 0) {
        console.warn(`Run 2 had ${run2.failed} failures. Zero regression requirement not met.`);
        process.exit(1);
    }

    console.log("\n🎉 CONSECUTIVE RUNS (2x) BOTH PASSED WITH ZERO REGRESSIONS (100%)!");
    process.exit(0);
}

main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
