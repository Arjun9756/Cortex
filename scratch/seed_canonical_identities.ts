import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import { resolveIdentity } from '../packages/identity/canonicalPerson.service.js';
import sql from '../apps/api/config/postgres.js';

async function seedIdentities() {
    const identities = [
        // Priya Sharma
        { provider: 'github', externalId: 'gh_priya', username: 'priyasharma', email: 'priya.sharma@company.com', displayName: 'Priya Sharma' },
        { provider: 'jira', externalId: 'acc-priya-002', username: 'priyasharma', email: 'priya.sharma@company.com', displayName: 'Priya S.' },
        { provider: 'slack', externalId: 'U555PRIYA1', username: 'priya_sharma', email: 'priya.sharma@company.com', displayName: 'Priya Sharma' },
        
        // Rohan Verma
        { provider: 'github', externalId: 'gh_rohan', username: 'rohanverma', email: 'rohan.verma@company.com', displayName: 'Rohan Verma' },
        { provider: 'jira', externalId: 'acc-rohan-003', username: 'rohanverma', email: 'rohan.verma@company.com', displayName: 'Rohan V.' },
        { provider: 'slack', externalId: 'U777ROHAN2', username: 'rohan_verma', email: 'rohan.verma@company.com', displayName: 'Rohan Verma' },
        
        // Devendra Singh
        { provider: 'github', externalId: 'gh_devendra', username: 'devendrasingh', email: 'devendra.singh@company.com', displayName: 'Devendra Singh' },
        { provider: 'slack', externalId: 'U888DEVENDRA1', username: 'devendra_singh', email: 'devendra.singh@company.com', displayName: 'Devendra Singh' },

        // Neha Gupta
        { provider: 'github', externalId: 'gh_neha', username: 'nehagupta', email: 'neha.gupta@company.com', displayName: 'Neha Gupta' },
        { provider: 'slack', externalId: 'U111NEHA5', username: 'neha_gupta', email: 'neha.gupta@company.com', displayName: 'Neha Gupta' },

        // Vikram Patel
        { provider: 'github', externalId: 'gh_vikram', username: 'vikrampatel', email: 'vikram.patel@company.com', displayName: 'Vikram Patel' },
        { provider: 'slack', externalId: 'U999VIKRAM4', username: 'vikram_patel', email: 'vikram.patel@company.com', displayName: 'Vikram Patel' },

        // Amina Zahra
        { provider: 'github', externalId: 'gh_amina', username: 'aminazahra', email: 'sarah.chen@company.com', displayName: 'Amina Zahra' },
        { provider: 'slack', externalId: 'U888SARAH3', username: 'sarah_chen', email: 'sarah.chen@company.com', displayName: 'Amina Zahra' },

        // Michael
        { provider: 'github', externalId: 'gh_michael', username: 'michael', email: 'amit.shah@company.com', displayName: 'Michael' },
        { provider: 'slack', externalId: 'U222AMIT6', username: 'amit_shah', email: 'amit.shah@company.com', displayName: 'Michael' }
    ];

    console.log('--- Registering all team identities into person_identity table ---');
    for (const id of identities) {
        const res = await resolveIdentity({ ...id, source: seedSource } as any);
        console.log(`Resolved [${id.provider}] ${id.displayName} (${id.externalId}) -> ${res.canonicalPersonId} (${res.matchedBy})`);
    }
}

seedIdentities().catch(console.error).finally(async () => {
    await sql.end();
    process.exit(0);
});
