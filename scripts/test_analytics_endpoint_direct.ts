import app from '../apps/api/bootstrap/app.js';
import http from 'http';

async function testAppDirectly() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3099, resolve));
  console.log('Test Server listening on port 3099');

  try {
    const res = await fetch('http://localhost:3099/api/analytics/trends');
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('Response status flag:', data.status);
    console.log('Metadata:', data.metadata);
    console.log('Commit Trends:', data.commitTrends);
    console.log('Repo Health (count):', data.repoHealth?.length);
    console.log('Tech Usage (count):', data.techUsage?.length);
    console.log('Heatmap (days count):', data.heatmap?.length);
    
    if (res.status === 200 && data.status === true && data.repoHealth?.length === 10) {
      console.log('\n✅ PASS: /api/analytics/trends endpoint returned 200 OK with all 10 real repos!');
    } else {
      console.error('\n❌ FAIL: Response did not match expected structure');
    }
  } finally {
    server.close();
  }
  process.exit(0);
}

testAppDirectly().catch((err) => {
  console.error(err);
  process.exit(1);
});
