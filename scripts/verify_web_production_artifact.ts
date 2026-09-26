import fs from 'node:fs';
import path from 'node:path';

const artifactRoot = path.resolve(process.argv[2] || 'web/dist');
if (!fs.existsSync(artifactRoot) || !fs.statSync(artifactRoot).isDirectory()) {
    console.error(`[production-artifact] FAIL: build output not found: ${artifactRoot}`);
    process.exit(1);
}

const files: string[] = [];
const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(fullPath);
        else files.push(fullPath);
    }
};
walk(artifactRoot);

const failures: string[] = [];
const forbiddenFile = /(?:^|[._-])(?:seed|test|fixture|golden|cleanup|reconcile)(?:[._-]|$)/i;
// UI copy may legitimately name the golden-data verifier; only fail on executable
// seed-runner helpers that would indicate database fixture code entered the bundle.
const forbiddenCode = /assertSafeTestDatabase|seedSourceFor/i;
for (const file of files) {
    const relative = path.relative(artifactRoot, file);
    if (forbiddenFile.test(path.basename(file))) failures.push(`${relative}: seed/test/fixture artifact filename`);
    if (fs.statSync(file).size > 8_000_000) continue;
    const content = fs.readFileSync(file);
    if (forbiddenCode.test(content.toString('utf8'))) failures.push(`${relative}: seed/test runner reference found in production bundle`);
}

if (failures.length) {
    console.error('[production-artifact] FAIL\n' + failures.map(value => `- ${value}`).join('\n'));
    process.exit(1);
}
console.log(`[production-artifact] PASS: ${files.length} web build files scanned; no seed/test/fixture runners found`);
