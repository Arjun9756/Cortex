import { getDashboardOverview, getFindings } from '../apps/api/modules/dashboard/controller.js';
import type { Request, Response } from 'express';

function mockReqRes() {
  const req = {} as Request;
  let responseData: any = null;
  let statusCode = 200;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
  } as unknown as Response;

  return { req, res, getResult: () => ({ statusCode, responseData }) };
}

async function testController() {
  console.log('=== Testing getDashboardOverview Controller Endpoint ===');
  const { req, res, getResult } = mockReqRes();
  await getDashboardOverview(req, res);
  const { statusCode, responseData } = getResult();

  console.log('Status code:', statusCode);
  console.log('Stats:', responseData?.stats);
  console.log('Health Score Breakdown:', responseData?.healthScore?.breakdown);
  console.log('Health Score Grade & Explanation:', {
    score: responseData?.healthScore?.score,
    grade: responseData?.healthScore?.grade,
    explanation: responseData?.healthScore?.explanation,
  });

  if (statusCode !== 200) {
    throw new Error(`getDashboardOverview returned status ${statusCode}`);
  }

  // Verify breakdown
  const bd = responseData.healthScore.breakdown;
  if (bd.spofRepoCount > bd.activeRepoCount) {
    throw new Error('SPOF repo count cannot exceed active repo count');
  }
  if (bd.totalRepos !== 13 || bd.activeRepoCount !== 11) {
    throw new Error(`Expected 13 total repos and 11 active repos, got total=${bd.totalRepos}, active=${bd.activeRepoCount}`);
  }

  // Verify riskAlerts has no empty repos
  const emptyAlert = responseData.riskAlerts.find((a: any) => a.entityName === 'cortex-core' || a.entityName === 'AuditTestRepo_Beta');
  if (emptyAlert) {
    throw new Error(`FAIL: Empty repo found in riskAlerts: ${JSON.stringify(emptyAlert)}`);
  }
  console.log('✅ PASS: No empty repos in riskAlerts!');

  console.log('\n=== Testing getFindings Controller Endpoint ===');
  const { req: reqF, res: resF, getResult: getResultF } = mockReqRes();
  await getFindings(reqF, resF);
  const { statusCode: statusF, responseData: findingsData } = getResultF();

  console.log('Findings status code:', statusF);
  console.log('Total findings:', findingsData?.findings?.length);
  const emptyFinding = findingsData?.findings?.find((f: any) => f.relatedEntity === 'cortex-core' || f.relatedEntity === 'AuditTestRepo_Beta');
  if (emptyFinding) {
    throw new Error(`FAIL: Empty repo found in findings: ${JSON.stringify(emptyFinding)}`);
  }
  console.log('✅ PASS: No empty repos in critical findings!');

  process.exit(0);
}

testController().catch(err => {
  console.error('Controller test error:', err);
  process.exit(1);
});
