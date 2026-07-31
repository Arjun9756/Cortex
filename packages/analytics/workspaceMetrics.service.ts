import sql from "../../apps/api/config/postgres.js";

export async function calculateWorkspaceMetrics() {
    try {
        const [personStats] = await sql`SELECT count(*)::int AS count, avg(risk_score)::int AS avg_risk FROM person_metrics`;
        const [repoStats] = await sql`SELECT count(*)::int AS count, avg(bus_factor)::numeric AS avg_bf FROM repo_metrics`;
        const [eventStats] = await sql`
            SELECT 
                count(*) FILTER (WHERE event_type ILIKE '%issue%')::int AS issues,
                count(*) FILTER (WHERE event_type ILIKE '%pull_request%' OR event_type ILIKE '%pr%')::int AS prs
            FROM events
        `;

        const totalPeople = personStats?.count ?? 0;
        const totalRepos = repoStats?.count ?? 0;
        const avgRisk = personStats?.avg_risk ?? 47;
        const avgBusFactor = repoStats?.avg_bf ?? 1.0;
        const openIssues = eventStats?.issues ?? 0;
        const openPrs = eventStats?.prs ?? 0;

        await sql`
            INSERT INTO workspace_metrics
                (knowledge_risk_avg, bus_factor_avg, repo_count, contributor_count, open_issues_count, open_prs_count, computed_at)
            VALUES
                (${avgRisk}, ${avgBusFactor}, ${totalRepos}, ${totalPeople}, ${openIssues}, ${openPrs}, now())
        `;

        console.log(`[WorkspaceMetrics] Computed: repos=${totalRepos}, people=${totalPeople}, riskAvg=${avgRisk}%, busFactorAvg=${avgBusFactor}`);
    } catch (error: any) {
        console.error(`[WorkspaceMetrics] Error calculating workspace metrics: ${error?.message}`);
    }
}
