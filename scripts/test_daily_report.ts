import { generateAndSaveDailyReport, aggregateDailyReportData, renderDailyReportHtml } from '../packages/analytics/dailyReport.service.js';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('📄 TESTING CORTEX EXECUTIVE DAILY HTML REPORT GENERATOR');
    console.log('════════════════════════════════════════════════════════════════════════════════\n');

    const start = Date.now();
    const result = await generateAndSaveDailyReport();
    const duration = Date.now() - start;

    console.log('\n✅ Report Successfully Generated & Stored in PostgreSQL!');
    console.log(`⏱️ Duration: ${duration}ms`);
    console.log(`📅 Date: ${result.reportDate}`);
    console.log(`💾 Storage: PostgreSQL (daily_reports table)`);
    console.log(`📊 Workspace Health Score: ${result.summary.workspace.healthScore}/100`);
    console.log(`📦 Repositories Indexed: ${result.summary.workspace.repoCount}`);
    console.log(`👥 Contributors Indexed: ${result.summary.workspace.contributorCount}`);
    console.log(`⚠️ Bus Factor = 1 Repos Found: ${result.summary.criticalRisks.busFactorOneRepos.length}`);
    console.log(`⚡ Top Risk People: ${result.summary.criticalRisks.highRiskPeople.map((p: any) => `${p.name} (${p.riskScore}%)`).join(', ')}`);
    console.log(`💡 AI Recommendations Count: ${result.summary.aiRecommendations.length}`);
    console.log(`📄 HTML Document Length: ${(result.html.length / 1024).toFixed(2)} KB`);

    console.log('\n════════════════════════════════════════════════════════════════════════════════');
    console.log('🎉 TEST COMPLETE — HTML IS STORED IN DB WITH EMBEDDED CORTEX LOGO');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Daily Report Test Error:', err);
    process.exit(1);
});
