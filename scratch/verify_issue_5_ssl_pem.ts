import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testPemLoad() {
    console.log('Testing SSL CA PEM file loading behavior...');
    const pemPath = path.join(__dirname, '..', 'postgresql.pem');
    const fakePemPath = path.join(__dirname, '..', 'non_existent_cert.pem');

    console.log('1. Checking existing postgresql.pem:', fs.existsSync(pemPath) ? 'EXISTS' : 'MISSING');

    console.log('2. Simulating what happens when postgresql.pem is missing on a new machine:');
    try {
        fs.readFileSync(fakePemPath, 'utf-8');
    } catch (e: any) {
        console.log('Actual Node.js error when file is missing:', e.message);
    }
}

testPemLoad();
