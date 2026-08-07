import http from 'http';
import { runAnalyticsJob } from '../packages/workers/scheduler.worker.js';
import { driver } from '../apps/api/config/neo4j.js';

function checkServer(): Promise<boolean> {
    return new Promise((resolve) => {
        const req = http.get('http://localhost:3000/health', (res) => {
            resolve(res.statusCode === 200 || res.statusCode === 404);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function main() {
    const isUp = await checkServer();
    console.log(`Server running on port 3000: ${isUp}`);
}

main().catch(console.error);
