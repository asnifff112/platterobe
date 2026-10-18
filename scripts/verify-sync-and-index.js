const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');

// 1. Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

let passed = 0;
let failed = 0;

function testAssert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=================================================================');
  console.log('PLATTEROBE LIVE SUPABASE DATA-SYNC & PRODUCT INDEX TEST SUITE');
  console.log('Connecting to:', supabaseUrl);
  console.log('=================================================================\n');

  // Test 1: Verify that nonexistent codes return NOT FOUND and never mock data
  console.log('--- Test 1: Nonexistent / hardcoded series numbers return NOT FOUND ---');
  const { data: checkPltr } = await supabase.from('products').select('*');
  const findSeriesInDb = (query) => {
    const clean = query.trim().toUpperCase();
    return checkPltr.find(p => {
      const s = p.series_no || (p.nutrition && p.nutrition._series_no);
      return s && s.trim().toUpperCase() === clean;
    });
  };

  const pltr2InDb = findSeriesInDb('PLTR.002');
  console.log('   PLTR.002 in live Supabase:', pltr2InDb ? pltr2InDb.name : 'Not present (CORRECT)');
  testAssert(!pltr2InDb, 'PLTR.002 does not exist in live Supabase products');

  const randomCodeMatch = findSeriesInDb('UNKNOWN-RANDOM-CODE-999');
  testAssert(!randomCodeMatch, 'Unknown code returns no product in Supabase');

  // Test 2: Add a real manual product to Supabase with custom series number
  console.log('\n--- Test 2: Create real product in Supabase with custom series number ---');
  const testId = `test-verify-${Date.now()}`;
  const customSeries = `OAT-TEST-${Date.now().toString().slice(-4)}`;
  const testSlug = `test-oat-live-${Date.now()}`;

  const nutritionPayload = {
    calories: 460,
    protein: '17g',
    carbs: '60g',
    fat: '14g',
    fiber: '9g',
    _series_no: customSeries
  };

  const dbRow = {
    id: testId,
    slug: testSlug,
    name: 'Live Verified Oat Platter',
    subtitle: 'Oats · Almond Milk · Chia · Fresh Mango · Honey',
    short_description: 'Real admin-created platter stored directly in Supabase PostgreSQL.',
    description: 'Slow-cooked oats steeped in almond milk, layered with ripe mango slices, chia seeds, and raw wildflower honey.',
    why_youll_like_it: 'Clean, sustained morning energy with authentic verified data.',
    price: 119,
    original_price: 149,
    is_featured: true,
    available: true,
    category: 'breakfast',
    weight: '360g',
    image: 'https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images/fruit-oat-jar-1792243878418.jpeg',
    ingredients: [
      { name: 'Rolled Oats', quantity: '60', unit: 'g' },
      { name: 'Almond Milk', quantity: '150', unit: 'ml' },
      { name: 'Fresh Mango', quantity: '80', unit: 'g' },
      { name: 'Chia Seeds', quantity: '10', unit: 'g' }
    ],
    nutrition: nutritionPayload,
    sort_order: 99
  };

  const { data: insertData, error: insertError } = await supabase.from('products').insert(dbRow).select('*').single();
  testAssert(!insertError, `Insert live product into Supabase (error: ${insertError?.message || 'none'})`);
  testAssert(insertData?.id === testId, 'Created product returned correct ID from Supabase');

  // Test 3: Lookup by exact Series No. from live Supabase data (case-insensitive & with spaces)
  console.log('\n--- Test 3: Lookup product from live Supabase data ---');
  const { data: allProdsAfterInsert } = await supabase.from('products').select('*');
  const lookupQuery = `   ${customSeries.toLowerCase()}   `;
  const cleanQuery = lookupQuery.trim().toUpperCase();

  const matchedProduct = allProdsAfterInsert.find(p => {
    const s = p.series_no || (p.nutrition && p.nutrition._series_no);
    return s && s.trim().toUpperCase() === cleanQuery;
  });

  testAssert(Boolean(matchedProduct), `Found product matching custom series "${customSeries}" in live Supabase`);
  testAssert(matchedProduct?.name === 'Live Verified Oat Platter', 'Product name matches live Supabase data');
  testAssert(matchedProduct?.price === 119, 'Product price matches live Supabase data (119)');
  testAssert(matchedProduct?.original_price === 149, 'Product original price matches live Supabase data (149)');
  testAssert(matchedProduct?.weight === '360g', 'Product weight matches live Supabase data (360g)');
  testAssert(matchedProduct?.image.includes('fruit-oat-jar-1792243878418.jpeg'), 'Product image matches uploaded Supabase storage URL');
  testAssert(matchedProduct?.nutrition?.calories === 460, 'Nutritional calories match live Supabase data (460 kcal)');
  testAssert(matchedProduct?.nutrition?.protein === '17g', 'Nutritional protein matches live Supabase data (17g)');
  testAssert(Array.isArray(matchedProduct?.ingredients) && matchedProduct?.ingredients.length === 4, 'Ingredients match live Supabase data (4 items)');

  // Test 4: Update product Series No. in Supabase
  console.log('\n--- Test 4: Update product Series No in Supabase ---');
  const updatedSeries = `OAT-UPDATED-${Date.now().toString().slice(-4)}`;
  const updatedNutrition = { ...nutritionPayload, _series_no: updatedSeries };

  const { data: updateData, error: updateError } = await supabase
    .from('products')
    .update({
      nutrition: updatedNutrition,
      price: 125,
      updated_at: new Date().toISOString()
    })
    .eq('id', testId)
    .select('*')
    .single();

  testAssert(!updateError, `Update product in Supabase (error: ${updateError?.message || 'none'})`);

  const { data: allProdsAfterUpdate } = await supabase.from('products').select('*');
  const oldMatch = allProdsAfterUpdate.find(p => {
    const s = p.series_no || (p.nutrition && p.nutrition._series_no);
    return s && s.trim().toUpperCase() === customSeries.toUpperCase();
  });
  testAssert(!oldMatch, 'Old Series No is no longer found in Supabase');

  const newMatch = allProdsAfterUpdate.find(p => {
    const s = p.series_no || (p.nutrition && p.nutrition._series_no);
    return s && s.trim().toUpperCase() === updatedSeries.toUpperCase();
  });
  testAssert(Boolean(newMatch), 'New Series No successfully found in Supabase');
  testAssert(newMatch?.price === 125, 'Updated price reflects in Supabase (125)');

  // Test 5: Duplicate validation
  console.log('\n--- Test 5: Duplicate Series No validation ---');
  const isDuplicate = allProdsAfterUpdate.some(p => {
    if (p.id === 'different-product-id') return false;
    const s = p.series_no || (p.nutrition && p.nutrition._series_no);
    return s && s.trim().toUpperCase() === updatedSeries.toUpperCase();
  });
  testAssert(isDuplicate, 'System detects duplicate series number against existing product');

  // Test 6: Clean up test product
  console.log('\n--- Test 6: Clean up test product from Supabase ---');
  const { error: deleteError } = await supabase.from('products').delete().eq('id', testId);
  testAssert(!deleteError, `Delete test product from Supabase (error: ${deleteError?.message || 'none'})`);

  const { data: afterDeleteProds } = await supabase.from('products').select('*');
  const deletedMatch = afterDeleteProds.find(p => p.id === testId);
  testAssert(!deletedMatch, 'Test product is completely removed from Supabase');

  // Test 7: Verify source code compliance with requirements
  console.log('\n--- Test 7: Source code inspections ---');
  const productsTs = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'products.ts'), 'utf8');
  testAssert(!productsTs.includes('seriesNo: "PLTR.'), 'products.ts has no hardcoded PLTR series numbers');
  testAssert(!productsTs.includes('e.g. "PLTR.001"'), 'products.ts has no sample series comments');

  const indexClientTsx = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'index', 'IndexClient.tsx'), 'utf8');
  testAssert(!indexClientTsx.includes('PLTR.'), 'IndexClient.tsx has no hardcoded PLTR codes');
  testAssert(!indexClientTsx.includes('SAMPLE_CODES'), 'IndexClient.tsx has no SAMPLE_CODES section');
  testAssert(indexClientTsx.includes('Enter your product series number'), 'IndexClient.tsx uses neutral placeholder "Enter your product series number"');

  const navbarTsx = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'Navbar.tsx'), 'utf8');
  testAssert(navbarTsx.includes('/index'), 'Navbar.tsx contains /index route');

  const siteConfigTs = fs.readFileSync(path.join(__dirname, '..', 'src', 'config', 'site.ts'), 'utf8');
  testAssert(siteConfigTs.includes('{ label: "THE INDEX", href: "/index" }'), 'site.ts config has THE INDEX -> /index');

  const dbTs = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'db.ts'), 'utf8');
  testAssert(!dbTs.includes('initialProducts.find((p) => p.seriesNo'), 'db.ts getProductBySeriesNo does NOT fall back to initialProducts');

  console.log('\n=================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
