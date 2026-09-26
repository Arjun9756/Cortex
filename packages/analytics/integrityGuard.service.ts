import sql from '../../apps/api/config/postgres.js';
import { aggregationSources, assertDataSource, type DataSource } from '../database/provenance.js';

export interface IntegrityGuardResult {
    passed: boolean;
    violationsCount: number;
    remediatedIssues: string[];
    details: {
        reposChecked: number;
        peopleChecked: number;
        techsChecked: number;
    };
}

/**
 * Self-Healing Invariant Guard Service
 *
 * Runs automatically after every metrics recalculation job (webhook or cron)
 * to verify and enforce that:
 * 1. Zero-commit repositories strictly collapse to 0 contributors, null owner, 0 bus factor, and 'empty' status.
 * 2. Active repositories strictly maintain bus_factor <= contributor_count.
 * 3. Person metrics commit counts maintain 100% mathematical parity with repo_metrics.top_contributors.
 * 4. Technology metrics strictly exclude scaffold / 0-commit repositories.
 *
 * If any violation is ever introduced by incoming data or partial syncs, this guard
 * automatically performs self-healing remediation and logs a structured alert.
 */
export async function runPostRecalculationIntegrityGuard(source: DataSource): Promise<IntegrityGuardResult> {
    assertDataSource(source);
    const trustedSources = aggregationSources(source);
    const remediatedIssues: string[] = [];
    let violationsCount = 0;

    try {
        // ---------------------------------------------------------------------
        // 1. Audit & Self-Heal Repo Metrics
        // ---------------------------------------------------------------------
        const repos = await sql<any[]>`
            SELECT id, source, repo_name, commit_count, contributor_count, primary_owner, bus_factor, status, technologies, top_contributors
            FROM repo_metrics WHERE source IN ${sql([...trustedSources])}
        `;

        for (const r of repos) {
            const commits = Number(r.commit_count || 0);
            const contribs = Number(r.contributor_count || 0);
            const bf = Number(r.bus_factor || 0);
            const status = r.status;
            const tech = Array.isArray(r.technologies) ? r.technologies : [];

            if (commits === 0) {
                if (contribs !== 0 || r.primary_owner !== null || bf !== 0 || status !== 'empty' || tech.length !== 0) {
                    violationsCount++;
                    const msg = `Repo "${r.repo_name}" had 0 commits but non-collapsed fields (contribs=${contribs}, owner=${r.primary_owner}, bf=${bf}, status=${status})`;
                    console.warn(`[IntegrityGuard] ⚠️ VIOLATION DETECTED: ${msg}. Auto-remediating...`);
                    
                    await sql`
                        UPDATE repo_metrics
                        SET contributor_count = 0,
                            primary_owner = NULL,
                            primary_owner_percentage = 0,
                            bus_factor = 0,
                            risk_score = 0,
                            status = 'empty',
                            technologies = '[]'::jsonb,
                            top_contributors = '[]'::jsonb
                        WHERE id = ${r.id} AND source = ${r.source}
                    `;
                    remediatedIssues.push(msg);
                }
            } else {
                if (bf > contribs) {
                    violationsCount++;
                    const msg = `Repo "${r.repo_name}" had bus_factor (${bf}) > contributor_count (${contribs})`;
                    console.warn(`[IntegrityGuard] ⚠️ VIOLATION DETECTED: ${msg}. Auto-remediating...`);

                    await sql`
                        UPDATE repo_metrics
                        SET bus_factor = LEAST(bus_factor, contributor_count::numeric)
                        WHERE id = ${r.id} AND source = ${r.source}
                    `;
                    remediatedIssues.push(msg);
                }
            }
        }

        // ---------------------------------------------------------------------
        // 2. Audit & Self-Heal Person Metrics Mathematical Parity
        // ---------------------------------------------------------------------
        // Build map of expected person commits from authoritative repo_metrics.top_contributors
        const personExpectedCommits = new Map<string, number>();
        const updatedRepos = await sql<any[]>`
            SELECT repo_name, top_contributors
            FROM repo_metrics
            WHERE source IN ${sql([...trustedSources])} AND commit_count > 0
        `;

        for (const ur of updatedRepos) {
            let contribList: any[] = [];
            if (Array.isArray(ur.top_contributors)) {
                contribList = ur.top_contributors;
            } else if (typeof ur.top_contributors === 'string') {
                try {
                    contribList = JSON.parse(ur.top_contributors);
                } catch {
                    contribList = [];
                }
            }
            for (const c of contribList) {
                const personName = (c.person || c.name || '').trim();
                if (personName) {
                    const norm = personName.toLowerCase();
                    const current = personExpectedCommits.get(norm) || 0;
                    personExpectedCommits.set(norm, current + Number(c.commits || 0));
                }
            }
        }

        const people = await sql<any[]>`
            SELECT id, source, person_name, commit_count
            FROM person_metrics
            WHERE source IN ${sql([...trustedSources])} AND is_active = true
        `;

        for (const p of people) {
            const expected = personExpectedCommits.get(p.person_name.toLowerCase().trim()) || 0;
            const actual = Number(p.commit_count || 0);

            if (expected !== actual) {
                violationsCount++;
                const msg = `Person "${p.person_name}" commit_count mismatch: repo_metrics sum = ${expected}, person_metrics = ${actual}`;
                console.warn(`[IntegrityGuard] ⚠️ VIOLATION DETECTED: ${msg}. Auto-remediating...`);

                await sql`
                    UPDATE person_metrics
                    SET commit_count = ${expected}
                    WHERE id = ${p.id} AND source = ${p.source}
                `;
                remediatedIssues.push(msg);
            }
        }

        // ---------------------------------------------------------------------
        // 3. Audit & Self-Heal Technology Metrics (Exclude Empty Repos)
        // ---------------------------------------------------------------------
        const emptyRepoNames = new Set(
            repos.filter(r => Number(r.commit_count || 0) === 0).map(r => r.repo_name.toLowerCase())
        );

        const techRows = await sql<any[]>`
            SELECT id, source, tech_name, repos, repo_count
            FROM technology_metrics WHERE source IN ${sql([...trustedSources])}
        `;

        for (const t of techRows) {
            const tRepos: string[] = Array.isArray(t.repos) ? t.repos : [];
            const sanitizedRepos = tRepos.filter(rn => !emptyRepoNames.has(rn.toLowerCase()));

            if (sanitizedRepos.length !== tRepos.length) {
                violationsCount++;
                const msg = `Technology "${t.tech_name}" referenced empty repositories. Sanitized list from ${tRepos.length} to ${sanitizedRepos.length}`;
                console.warn(`[IntegrityGuard] ⚠️ VIOLATION DETECTED: ${msg}. Auto-remediating...`);

                await sql`
                    UPDATE technology_metrics
                    SET repos = ${sql.json(sanitizedRepos)},
                        repo_count = ${sanitizedRepos.length}
                    WHERE id = ${t.id} AND source = ${t.source}
                `;
                remediatedIssues.push(msg);
            }
        }

        const passed = violationsCount === 0;
        if (passed) {
            console.log(`[IntegrityGuard] ✅ All invariants verified: ${repos.length} repos, ${people.length} people, ${techRows.length} technologies in 100% compliance.`);
        } else {
            console.warn(`[IntegrityGuard] ⚠️ Remediated ${violationsCount} data integrity anomalies across incoming data.`);
        }

        return {
            passed,
            violationsCount,
            remediatedIssues,
            details: {
                reposChecked: repos.length,
                peopleChecked: people.length,
                techsChecked: techRows.length,
            }
        };
    } catch (err: any) {
        console.error('[IntegrityGuard] ❌ Error executing integrity guard:', err?.message || err);
        return {
            passed: false,
            violationsCount: violationsCount + 1,
            remediatedIssues: [`Exception during integrity guard: ${err?.message}`],
            details: { reposChecked: 0, peopleChecked: 0, techsChecked: 0 }
        };
    }
}
