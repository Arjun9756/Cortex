import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';

interface PersonSpec {
  canonicalId: string;
  displayName: string;
  email: string;
  githubUsername: string;
  githubExtId: string;
  slackId: string;
  jiraId: string;
}

const CANONICAL_PERSONAS: PersonSpec[] = [
  {
    canonicalId: 'person_arjun_kumar',
    displayName: 'Arjun Kumar',
    email: 'arjun.kumar@company.com',
    githubUsername: 'arjun9756',
    githubExtId: '1001',
    slackId: 'U0987654321',
    jiraId: 'acc-arjun-001'
  },
  {
    canonicalId: 'person_priya_sharma',
    displayName: 'Priya Sharma',
    email: 'priya.sharma@company.com',
    githubUsername: 'priyasharma',
    githubExtId: '8008',
    slackId: 'U555PRIYA1',
    jiraId: 'acc-priya-002'
  },
  {
    canonicalId: 'person_vikram_patel',
    displayName: 'Vikram Patel',
    email: 'vikram.patel@company.com',
    githubUsername: 'vikrampatel',
    githubExtId: '5005',
    slackId: 'U999VIKRAM4',
    jiraId: 'acc-vikram-003'
  },
  {
    canonicalId: 'person_neha_gupta',
    displayName: 'Neha Gupta',
    email: 'neha.gupta@company.com',
    githubUsername: 'nehagupta',
    githubExtId: '6006',
    slackId: 'U111NEHA5',
    jiraId: 'acc-neha-004'
  },
  {
    canonicalId: 'person_devendra_singh',
    displayName: 'Devendra Singh',
    email: 'devendra.singh@company.com',
    githubUsername: 'devendrasingh',
    githubExtId: '2002',
    slackId: 'U888DEVENDRA1',
    jiraId: 'acc-devendra-008'
  },
  {
    canonicalId: 'person_sarah_chen',
    displayName: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    githubUsername: 'sarahchen',
    githubExtId: '4004',
    slackId: 'U888SARAH3',
    jiraId: 'acc-sarah-006'
  },
  {
    canonicalId: 'person_amina_zahra',
    displayName: 'Amina Zahra',
    email: 'amina.zahra@company.com',
    githubUsername: 'aminazahra',
    githubExtId: '3004',
    slackId: 'U333AMINA7',
    jiraId: 'acc-amina-009'
  },
  {
    canonicalId: 'person_rohan_verma',
    displayName: 'Rohan Verma',
    email: 'rohan.verma@company.com',
    githubUsername: 'rohanverma',
    githubExtId: '3003',
    slackId: 'U777ROHAN2',
    jiraId: 'acc-rohan-005'
  },
  {
    canonicalId: 'person_amit_shah',
    displayName: 'Amit Shah',
    email: 'amit.shah@company.com',
    githubUsername: 'amitshah',
    githubExtId: '2007',
    slackId: 'U222AMIT6',
    jiraId: 'acc-amit-007'
  },
  {
    canonicalId: 'person_michael_chen',
    displayName: 'Michael Chen',
    email: 'michael.chen@company.com',
    githubUsername: 'michaelchen',
    githubExtId: '2006',
    slackId: 'U444MICHAEL8',
    jiraId: 'acc-michael-010'
  },
  {
    canonicalId: 'person_kavita_reddy',
    displayName: 'Kavita Reddy',
    email: 'kavita.reddy@company.com',
    githubUsername: 'kavitareddy',
    githubExtId: '6009',
    slackId: 'U666KAVITA9',
    jiraId: 'acc-kavita-011'
  }
];

async function reconcileIdentities() {
  console.log('=== Reconciling Person Identities in Postgres & Neo4j ===');

  // 1. Reconcile Postgres person_identity table
  for (const p of CANONICAL_PERSONAS) {
    // Update or insert canonical rows for each provider
    // By Email
    await sql`
      UPDATE person_identity
      SET canonical_person_id = ${p.canonicalId},
          display_name = ${p.displayName}
      WHERE lower(email) = lower(${p.email})
    `;

    // By Slack ID
    await sql`
      UPDATE person_identity
      SET canonical_person_id = ${p.canonicalId},
          display_name = ${p.displayName},
          email = ${p.email}
      WHERE external_id = ${p.slackId} OR lower(username) = lower(${p.slackId})
    `;

    // By Jira ID
    await sql`
      UPDATE person_identity
      SET canonical_person_id = ${p.canonicalId},
          display_name = ${p.displayName},
          email = ${p.email}
      WHERE external_id = ${p.jiraId}
    `;

    // By GitHub username / ext ID
    await sql`
      UPDATE person_identity
      SET canonical_person_id = ${p.canonicalId},
          display_name = ${p.displayName},
          email = ${p.email}
      WHERE external_id = ${p.githubExtId}
         OR lower(username) = lower(${p.githubUsername})
         OR lower(display_name) = lower(${p.githubUsername})
         OR lower(display_name) = lower(${p.displayName})
    `;
  }

  // Mark known bots and ghosts in person_identity
  await sql`
    UPDATE person_identity
    SET is_active = false
    WHERE lower(display_name) LIKE '%bot%'
       OR lower(username) LIKE '%bot%'
       OR lower(display_name) LIKE '%unknown%'
       OR lower(display_name) = 'ghost'
       OR lower(username) = 'ghost'
       OR lower(display_name) = 'custom-ci-auto'
       OR external_id IN ('26634292', '991122', '49699333', '101010', '41898282', 'acc-sentry-bot', '37929162', '29139614', '19733683', '26384082', 'U999UNKNOWN_GHOST', 'github_Unknown Contributor', 'acc-corrupt-000')
  `;

  console.log('Postgres person_identity table updated.');

  // 2. Reconcile Neo4j PERSON nodes
  const session = driver.session();
  try {
    for (const p of CANONICAL_PERSONAS) {
      // Find all person nodes corresponding to this persona by email, name, or slackId
      await session.run(`
        MATCH (node:PERSON)
        WHERE toLower(node.email) = toLower($email)
           OR toLower(node.name) = toLower($name)
           OR toLower(node.name) = toLower($githubUsername)
           OR node.externalId = $slackId
           OR node.externalId = $jiraId
           OR node.externalId = $githubExtId
           OR node.name = $slackId
        SET node.name = $name,
            node.canonicalPersonId = $canonicalId,
            node.email = $email,
            node.isBot = false,
            node.isActive = true
      `, {
        email: p.email,
        name: p.displayName,
        githubUsername: p.githubUsername,
        slackId: p.slackId,
        jiraId: p.jiraId,
        githubExtId: p.githubExtId,
        canonicalId: p.canonicalId
      });
    }

    // Flag automated bot nodes in Neo4j
    await session.run(`
      MATCH (node:PERSON)
      WHERE toLower(node.name) ENDS WITH '[bot]'
         OR toLower(node.name) IN ['dependabot', 'renovate', 'github-actions', 'snyk-bot', 'snyk', 'codecov', 'web-flow', 'semantic-release-bot', 'greenkeeper', 'slackbot', 'custom-ci-auto', 'jira-sentry-automation[bot]']
      SET node.isBot = true, node.isActive = false
    `);

    // Ensure human git commit accounts on Arjun9756/Cortex are active so commit volume is preserved
    await session.run(`
      MATCH (node:PERSON)
      WHERE node.name IN ['ghost', 'Unknown Contributor']
      SET node.isBot = false, node.isActive = true
    `);

    console.log('Neo4j PERSON nodes reconciled and bots tagged.');
  } finally {
    await session.close();
    await sql.end();
  }
}

reconcileIdentities().catch(console.error);
