/**
 * Comprehensive End-to-End Dashboard Cross-Field Invariant Verification Suite
 *
 * Verifies all logical invariants across live PostgreSQL, Neo4j, and analytics services:
 * 1. Empty/Scaffold Repo Collapse (0 commits => 0 contributors, tech [], owner null, BF 0, risk 0, status empty)
 * 2. Non-zero contributors implies non-zero commits
 * 3. Contributor ownership % sums to 100% (within ±0.5% rounding)
 * 4. Bus factor <= contributor count
 * 5. Bus factor == 0 <=> contributor count == 0
 * 6. PR decomposition: stale_outlier + standard_pr + bot_pr + closed_unmerged + open == total
 * 7. Classification logic: 0 commits cannot appear in Healthy; SPOF, Healthy, Scaffold sum to total repos
 * 8. Successor recommendations empty when repo contributors <= 1
 * 9. Referential integrity: all repos referenced in person/tech metrics exist in repo_metrics
 * 10. Person commit count == sum of their per-repo commits in repo_metrics.top_contributors
 * 11. Dashboard aggregate commits (118) == sum of repo_metrics.commit_count
 * 12. Distinct repository count == 20 (no duplicate external IDs or phantom rows)
 * 13. Canonical person identities: exactly 11 active canonical engineers in person_metrics, 0 bots/ghosts/slack-id pseudonyms
 */

import sql from '../apps/api/config/postgres.js';
import { calculatePrMetrics } from '../packages/analytics/prMetrics.service.js';
import { calculateSuccessorCandidates } from '../packages/analytics/successor.service.js';
import { isBotAccount } from '../packages/shared/botDetection.js';

interface InvariantViolation {
  invariant: string;
  recordId: string;
  message: string;
  expected: any;
  actual: any;
}

const violations: InvariantViolation[] = [];

function check(
  condition: boolean,
  invariant: string,
  recordId: string,
  message: string,
  expected: any,
  actual: any
) {
  if (!condition) {
    violations.push({ invariant, recordId, message, expected, actual });
    console.error(`❌ [FAIL] ${invariant} on ${recordId}: ${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
  }
}

async function main() {
  console.log('================================================================');
  console.log('   CORTEX DASHBOARD END-TO-END INVARIANT AUDIT & VERIFICATION   ');
  console.log('================================================================\n');

  // Load all tables
  const repoRows = await sql`
    SELECT id, external_id, repo_name, bus_factor, risk_score, contributor_count,
           primary_owner, status, commit_count, primary_owner_percentage,
           technologies, top_contributors, computed_at
    FROM repo_metrics
    ORDER BY repo_name
  `;

  const personRows = await sql`
    SELECT id, external_id, person_name, risk_score, top_technologies, repos,
           commit_count, is_active, employment_status
    FROM person_metrics
    ORDER BY person_name
  `;

  const techRows = await sql`
    SELECT tech_name, usage_percent, repo_count, contributor_count, repos
    FROM technology_metrics
    ORDER BY tech_name
  `;

  const repoNamesSet = new Set(repoRows.map(r => r.repo_name));

  console.log(`[Loaded Data] Repos: ${repoRows.length}, People: ${personRows.length}, Technologies: ${techRows.length}\n`);

  // -------------------------------------------------------------------------
  // INVARIANT 1: Empty / Scaffold Repository Collapse
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 1: Empty / Scaffold Repository Collapse...');
  for (const r of repoRows) {
    const commits = Number(r.commit_count || 0);
    if (commits === 0) {
      const contribCount = Number(r.contributor_count || 0);
      const techs = Array.isArray(r.technologies) ? r.technologies : [];
      const contribs = Array.isArray(r.top_contributors) ? r.top_contributors : [];
      const bf = Number(r.bus_factor || 0);
      const risk = Number(r.risk_score || 0);
      const owner = r.primary_owner;

      check(contribCount === 0, 'Invariant 1', r.repo_name, '0 commits must have 0 contributor_count', 0, contribCount);
      check(techs.length === 0, 'Invariant 1', r.repo_name, '0 commits must have empty technologies array', [], techs);
      check(contribs.length === 0, 'Invariant 1', r.repo_name, '0 commits must have empty top_contributors', [], contribs);
      check(bf === 0, 'Invariant 1', r.repo_name, '0 commits must have bus_factor 0', 0, bf);
      check(risk === 0, 'Invariant 1', r.repo_name, '0 commits must have risk_score 0', 0, risk);
      check(owner === null || owner === 'None', 'Invariant 1', r.repo_name, '0 commits must have null or None owner', null, owner);
      check(r.status === 'empty', 'Invariant 1', r.repo_name, '0 commits must have status empty', 'empty', r.status);
    }
  }

  // -------------------------------------------------------------------------
  // INVARIANT 2: Contributors > 0 => Commits > 0
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 2: Contributors > 0 implies Commits > 0...');
  for (const r of repoRows) {
    const contribCount = Number(r.contributor_count || 0);
    const commits = Number(r.commit_count || 0);
    if (contribCount > 0) {
      check(commits > 0, 'Invariant 2', r.repo_name, 'contributors > 0 requires commits > 0', '> 0', commits);
    }
  }

  // -------------------------------------------------------------------------
  // INVARIANT 3: Sum of contributor ownership % == 100% (within ±0.5% rounding)
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 3: Sum of Contributor Ownership % == 100%...');
  for (const r of repoRows) {
    const commits = Number(r.commit_count || 0);
    if (commits > 0) {
      const contribs: any[] = Array.isArray(r.top_contributors) ? r.top_contributors : [];
      const sumPct = contribs.reduce((acc, c) => acc + Number(c.percentage || 0), 0);
      check(
        Math.abs(sumPct - 100.0) <= 0.5,
        'Invariant 3',
        r.repo_name,
        `sum of contributor percentages (${sumPct.toFixed(1)}%) must be 100% ±0.5%`,
        100.0,
        Number(sumPct.toFixed(1))
      );
    }
  }

  // -------------------------------------------------------------------------
  // INVARIANT 4: Bus factor <= Contributors
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 4: Bus Factor <= Contributor Count...');
  for (const r of repoRows) {
    const bf = Number(r.bus_factor || 0);
    const contribCount = Number(r.contributor_count || 0);
    check(
      bf <= contribCount,
      'Invariant 4',
      r.repo_name,
      'bus_factor cannot exceed contributor_count',
      `<= ${contribCount}`,
      bf
    );
  }

  // -------------------------------------------------------------------------
  // INVARIANT 5: Bus factor == 0 <=> Contributors == 0
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 5: Bus Factor == 0 <=> Contributors == 0...');
  for (const r of repoRows) {
    const bf = Number(r.bus_factor || 0);
    const contribCount = Number(r.contributor_count || 0);
    check(
      (bf === 0) === (contribCount === 0),
      'Invariant 5',
      r.repo_name,
      'bus_factor is 0 if and only if contributor_count is 0',
      contribCount === 0 ? 0 : '>0',
      bf
    );
  }

  // -------------------------------------------------------------------------
  // INVARIANT 6: Pull Request Decomposition Parity
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 6: Pull Request Decomposition Parity...');
  const aggPr = await calculatePrMetrics({ includeBots: true });
  const aggSum =
    aggPr.counts.mergedHumanPrs +
    aggPr.counts.staleOutliersCount +
    aggPr.counts.mergedBotPrs +
    aggPr.counts.closedUnmergedPrs +
    aggPr.counts.openPrs;

  check(
    aggSum === aggPr.counts.totalEvaluated,
    'Invariant 6',
    'AGGREGATE_PRS',
    'sum of PR partitions must equal totalEvaluated',
    aggPr.counts.totalEvaluated,
    aggSum
  );

  let perRepoEvaluated = 0;
  let perRepoHumanMerged = 0;
  let perRepoBotMerged = 0;
  let perRepoOutliers = 0;
  let perRepoClosedUnmerged = 0;
  let perRepoOpen = 0;

  for (const r of repoRows) {
    const rPr = await calculatePrMetrics({ repoName: r.repo_name, includeBots: true });
    const rSum =
      rPr.counts.mergedHumanPrs +
      rPr.counts.staleOutliersCount +
      rPr.counts.mergedBotPrs +
      rPr.counts.closedUnmergedPrs +
      rPr.counts.openPrs;

    check(
      rSum === rPr.counts.totalEvaluated,
      'Invariant 6',
      r.repo_name,
      'per-repo PR partitions must equal per-repo totalEvaluated',
      rPr.counts.totalEvaluated,
      rSum
    );

    perRepoEvaluated += rPr.counts.totalEvaluated;
    perRepoHumanMerged += rPr.counts.mergedHumanPrs;
    perRepoBotMerged += rPr.counts.mergedBotPrs;
    perRepoOutliers += rPr.counts.staleOutliersCount;
    perRepoClosedUnmerged += rPr.counts.closedUnmergedPrs;
    perRepoOpen += rPr.counts.openPrs;
  }

  check(perRepoEvaluated === aggPr.counts.totalEvaluated, 'Invariant 6', 'PER_REPO_SUM_EVALUATED', 'sum of per-repo totalEvaluated matches aggregate', aggPr.counts.totalEvaluated, perRepoEvaluated);
  check(perRepoHumanMerged === aggPr.counts.mergedHumanPrs, 'Invariant 6', 'PER_REPO_SUM_HUMAN', 'sum of per-repo human merged matches aggregate', aggPr.counts.mergedHumanPrs, perRepoHumanMerged);
  check(perRepoBotMerged === aggPr.counts.mergedBotPrs, 'Invariant 6', 'PER_REPO_SUM_BOTS', 'sum of per-repo bot merged matches aggregate', aggPr.counts.mergedBotPrs, perRepoBotMerged);
  check(perRepoOutliers === aggPr.counts.staleOutliersCount, 'Invariant 6', 'PER_REPO_SUM_OUTLIERS', 'sum of per-repo outliers matches aggregate', aggPr.counts.staleOutliersCount, perRepoOutliers);
  check(perRepoClosedUnmerged === aggPr.counts.closedUnmergedPrs, 'Invariant 6', 'PER_REPO_SUM_CLOSED_UNMERGED', 'sum of per-repo closed unmerged matches aggregate', aggPr.counts.closedUnmergedPrs, perRepoClosedUnmerged);
  check(perRepoOpen === aggPr.counts.openPrs, 'Invariant 6', 'PER_REPO_SUM_OPEN', 'sum of per-repo open matches aggregate', aggPr.counts.openPrs, perRepoOpen);

  // -------------------------------------------------------------------------
  // INVARIANT 7: Classification Logic
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 7: Repository Classification Logic...');
  const emptyRepos = repoRows.filter(
    r => r.status === 'empty' || r.status === 'scaffold' || (Number(r.bus_factor) === 0 && Number(r.commit_count ?? 0) === 0)
  );
  const activeRepos = repoRows.filter(
    r => r.status !== 'empty' && r.status !== 'scaffold' && (Number(r.bus_factor) > 0 || Number(r.commit_count) > 0)
  );
  const spofRepos = activeRepos.filter(r => Number(r.bus_factor) <= 1);
  const healthyRepos = activeRepos.filter(r => Number(r.bus_factor) >= 2);

  check(
    spofRepos.length + healthyRepos.length + emptyRepos.length === repoRows.length,
    'Invariant 7',
    'ALL_REPOS_PARTITION',
    'spof + healthy + empty must form a complete partition of all repos',
    repoRows.length,
    spofRepos.length + healthyRepos.length + emptyRepos.length
  );
  check(
    emptyRepos.length === 3,
    'Invariant 7',
    'SCAFFOLD_REPOS_COUNT',
    'exactly 3 scaffold/empty repositories',
    3,
    emptyRepos.length
  );

  for (const r of repoRows) {
    const commits = Number(r.commit_count || 0);
    const bf = Number(r.bus_factor || 0);
    if (commits === 0) {
      check(
        r.status === 'empty',
        'Invariant 7',
        r.repo_name,
        '0-commit repo cannot be healthy or fragile, must be empty',
        'empty',
        r.status
      );
      check(
        emptyRepos.some(er => er.repo_name === r.repo_name),
        'Invariant 7',
        r.repo_name,
        '0-commit repo must be classified under Scaffold/Empty filter',
        true,
        emptyRepos.some(er => er.repo_name === r.repo_name)
      );
      check(
        !healthyRepos.some(hr => hr.repo_name === r.repo_name),
        'Invariant 7',
        r.repo_name,
        '0-commit repo must never appear in Healthy filter',
        false,
        healthyRepos.some(hr => hr.repo_name === r.repo_name)
      );
      check(
        !spofRepos.some(sr => sr.repo_name === r.repo_name),
        'Invariant 7',
        r.repo_name,
        '0-commit repo must never appear in SPOF filter',
        false,
        spofRepos.some(sr => sr.repo_name === r.repo_name)
      );
    } else {
      if (bf <= 1) {
        check(
          spofRepos.some(sr => sr.repo_name === r.repo_name),
          'Invariant 7',
          r.repo_name,
          'active repo with BF <= 1 must be classified as Critical SPOF',
          true,
          spofRepos.some(sr => sr.repo_name === r.repo_name)
        );
      } else {
        check(
          healthyRepos.some(hr => hr.repo_name === r.repo_name),
          'Invariant 7',
          r.repo_name,
          'active repo with BF >= 2 must be classified as Healthy',
          true,
          healthyRepos.some(hr => hr.repo_name === r.repo_name)
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // INVARIANT 8: Successor Recommendations Empty When Contributors <= 1
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 8: Successor Candidates on Low Contributor Repos...');
  for (const r of repoRows) {
    const contribCount = Number(r.contributor_count || 0);
    if (contribCount <= 1 && r.primary_owner) {
      const succ = await calculateSuccessorCandidates(r.primary_owner, r.repo_name);
      check(
        succ.candidates.length === 0,
        'Invariant 8',
        r.repo_name,
        `successor candidates list must be empty for repo with ${contribCount} contributors`,
        0,
        succ.candidates.length
      );
      check(
        succ.hasSuccessor === false,
        'Invariant 8',
        r.repo_name,
        `hasSuccessor must be false for repo with ${contribCount} contributors`,
        false,
        succ.hasSuccessor
      );
    }
  }

  // -------------------------------------------------------------------------
  // INVARIANT 9: Referential Integrity of Repository References
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 9: Referential Integrity of Repositories...');
  for (const p of personRows) {
    const repos: string[] = Array.isArray(p.repos) ? p.repos : [];
    for (const repo of repos) {
      check(
        repoNamesSet.has(repo),
        'Invariant 9',
        `Person: ${p.person_name}`,
        `referenced repository "${repo}" must exist in repo_metrics`,
        true,
        repoNamesSet.has(repo)
      );
    }
  }

  for (const t of techRows) {
    const repos: string[] = Array.isArray(t.repos) ? t.repos : [];
    for (const repo of repos) {
      check(
        repoNamesSet.has(repo),
        'Invariant 9',
        `Tech: ${t.tech_name}`,
        `referenced repository "${repo}" must exist in repo_metrics`,
        true,
        repoNamesSet.has(repo)
      );
    }
  }

  // -------------------------------------------------------------------------
  // INVARIANT 10: Person Commits Parity with repo_metrics.top_contributors
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 10: Person Commits Parity with repo_metrics...');
  // Build person contributions sum map from repo_metrics
  const personContribSumMap = new Map<string, number>();
  for (const r of repoRows) {
    const contribs = Array.isArray(r.top_contributors) ? r.top_contributors : [];
    for (const c of contribs) {
      const name = (c.person || '').trim().toLowerCase();
      personContribSumMap.set(name, (personContribSumMap.get(name) || 0) + Number(c.commits || 0));
    }
  }

  for (const p of personRows) {
    const pName = p.person_name.trim().toLowerCase();
    const expectedCommits = personContribSumMap.get(pName) || 0;
    const actualCommits = Number(p.commit_count || 0);

    check(
      actualCommits === expectedCommits,
      'Invariant 10',
      p.person_name,
      `person commits must equal sum of commits across repo_metrics.top_contributors`,
      expectedCommits,
      actualCommits
    );
  }

  // -------------------------------------------------------------------------
  // INVARIANT 11: Dashboard Aggregate Commits Parity (Total = 118 without fake PR commits)
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 11: Aggregate Commits Parity (Total = 118)...');
  const totalRepoCommits = repoRows.reduce((acc, r) => acc + Number(r.commit_count || 0), 0);
  check(
    totalRepoCommits === 118,
    'Invariant 11',
    'ALL_REPOS_COMMITS',
    'total repo_metrics commit_count must equal 118',
    118,
    totalRepoCommits
  );

  // -------------------------------------------------------------------------
  // INVARIANT 12: Distinct Repository Count Parity (Total = 20)
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 12: Distinct Repository Count Parity (Total = 20)...');
  check(
    repoRows.length === 20,
    'Invariant 12',
    'REPO_COUNT',
    'total distinct rows in repo_metrics must be 20',
    20,
    repoRows.length
  );

  const duplicateNames = new Set<string>();
  const seenNames = new Set<string>();
  for (const r of repoRows) {
    if (seenNames.has(r.repo_name)) {
      duplicateNames.add(r.repo_name);
    }
    seenNames.add(r.repo_name);
  }
  check(
    duplicateNames.size === 0,
    'Invariant 12',
    'NO_DUPLICATE_REPOS',
    'no duplicate repository names in repo_metrics',
    0,
    Array.from(duplicateNames)
  );

  // -------------------------------------------------------------------------
  // INVARIANT 13: Canonical Person Identities (11 active, 0 bots/ghosts)
  // -------------------------------------------------------------------------
  console.log('Checking Invariant 13: Canonical Person Identities...');
  check(
    personRows.length === 11,
    'Invariant 13',
    'PERSON_COUNT',
    'exactly 11 active canonical engineers in person_metrics',
    11,
    personRows.length
  );

  const SLACK_PATTERN = /^U[A-Z0-9]{6,}$/i;
  for (const p of personRows) {
    const isBot = isBotAccount(p.person_name, null, null, p.external_id);
    check(
      !isBot,
      'Invariant 13',
      p.person_name,
      'no bot accounts permitted in person_metrics',
      false,
      isBot
    );

    const isSlack = SLACK_PATTERN.test(p.person_name.trim());
    check(
      !isSlack,
      'Invariant 13',
      p.person_name,
      'no Slack ID pseudonyms permitted as person_name',
      false,
      isSlack
    );

    const isGhost = p.person_name.toLowerCase() === 'ghost' || p.person_name.toLowerCase().includes('unknown');
    check(
      !isGhost,
      'Invariant 13',
      p.person_name,
      'no ghost or unknown accounts in person_metrics',
      false,
      isGhost
    );
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('                   AUDIT SUMMARY & RESULTS                      ');
  console.log('================================================================');
  if (violations.length === 0) {
    console.log('✅ ALL 13 CROSS-FIELD INVARIANTS PASSED PERFECTLY!');
    console.log(`   • Total Repositories Audited: ${repoRows.length}`);
    console.log(`   • Total Commits Verified:     ${totalRepoCommits}`);
    console.log(`   • Total Canonical People:     ${personRows.length}`);
    console.log(`   • Total PR Events Decomposed: ${aggPr.counts.totalEvaluated}`);
    console.log(`   • Total Technologies Scored:  ${techRows.length}`);
    console.log('================================================================\n');
    await sql.end();
    process.exit(0);
  } else {
    console.error(`❌ INVARIANT AUDIT FAILED WITH ${violations.length} VIOLATION(S):`);
    for (const v of violations) {
      console.error(`  - [${v.invariant}] on ${v.recordId}: ${v.message}`);
    }
    console.log('================================================================\n');
    await sql.end();
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
