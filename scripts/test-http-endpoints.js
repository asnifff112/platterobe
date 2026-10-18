const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3007' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        path,
        statusCode: res.statusCode,
        data,
        title: (data.match(/<title>([^<]+)<\/title>/) || [])[1],
      }));
    }).on('error', reject);
  });
}

(async () => {
  console.log('--- Verifying HTTP Endpoints on Local Production Server ---');

  // 1. Home page
  const home = await get('/');
  console.log('1. GET /:');
  console.log('   Status:', home.statusCode);
  console.log('   Has Navbar "THE INDEX":', home.data.includes('THE INDEX') || home.data.includes('The Index'));
  console.log('   Has link href="/index":', home.data.includes('href="/index"'));
  console.log('   Has "#how-it-works" in navbar:', home.data.includes('href="/#how-it-works"'));

  // 2. Product Index page (empty state)
  const indexPage = await get('/index');
  console.log('\n2. GET /index:');
  console.log('   Status:', indexPage.statusCode);
  console.log('   Title:', indexPage.title);
  console.log('   Has Heading "THE PLATTEROBE INDEX":', indexPage.data.includes('THE PLATTEROBE INDEX'));
  console.log('   Has Placeholder "Enter your product series number":', indexPage.data.includes('Enter your product series number'));
  console.log('   Has LOOKUP button:', indexPage.data.includes('Lookup') || indexPage.data.includes('LOOKUP'));
  console.log('   Contains SAMPLE_CODES or "Sample Codes:":', indexPage.data.includes('Sample Codes'));
  console.log('   Contains "PLTR.001":', indexPage.data.includes('PLTR.001'));
  console.log('   Contains "PLTR.002":', indexPage.data.includes('PLTR.002'));
  console.log('   Contains "PLTR.010":', indexPage.data.includes('PLTR.010'));
  console.log('   Contains "PLTR.016":', indexPage.data.includes('PLTR.016'));

  // 3. Product Index lookup (found state)
  const lookupPage = await get('/index?code=PLTR.001');
  console.log('\n3. GET /index?code=PLTR.001:');
  console.log('   Status:', lookupPage.statusCode);
  console.log('   Contains "Verified Product Record":', lookupPage.data.includes('Verified Product Record'));
  console.log('   Contains "Oat Jar":', lookupPage.data.includes('Oat Jar'));
  console.log('   Contains "Order on WhatsApp":', lookupPage.data.includes('Order on WhatsApp'));
  console.log('   Contains "View Platter":', lookupPage.data.includes('View Platter'));

  // 4. Product Index lookup (not found state)
  const notFoundPage = await get('/index?code=NONEXISTENT999');
  console.log('\n4. GET /index?code=NONEXISTENT999:');
  console.log('   Status:', notFoundPage.statusCode);
  console.log('   Contains "Series Number Not Found":', notFoundPage.data.includes('Series Number Not Found'));
  console.log('   Contains "NONEXISTENT999":', notFoundPage.data.includes('NONEXISTENT999'));
  console.log('   Contains "Reset Search":', notFoundPage.data.includes('Reset Search'));
  console.log('   Contains hardcoded example like "e.g. PLTR.001":', notFoundPage.data.includes('PLTR.001'));

  console.log('\n--- HTTP Verification Complete ---');
})();
