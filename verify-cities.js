// verify-cities.js
// Run with: node verify-cities.js
// Tests every entry in cityIndex.js against your live API
// Outputs broken entries and a suggested fix list

const https = require('https');

const CITY_INDEX = require('./services/cityIndex');
const API = 'https://api.aqi.jeff-o-blogs.com';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function verify() {
  const broken = [];
  const working = [];
  let i = 0;

  console.log(`\nVerifying ${CITY_INDEX.length} cities...\n`);

  for (const entry of CITY_INDEX) {
    const { city, state, country } = entry;
    i++;
    try {
      const url = `${API}/api/aqi/city?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=${encodeURIComponent(country)}`;
      const { status, body } = await fetchJSON(url);
      if (status === 200 && body.success) {
        console.log(`✅ [${i}/${CITY_INDEX.length}] ${city}, ${state}, ${country}`);
        working.push(entry);
      } else {
        console.log(`❌ [${i}/${CITY_INDEX.length}] ${city}, ${state}, ${country} — ${body.error || status}`);
        broken.push(entry);
      }
    } catch (e) {
      console.log(`💥 [${i}/${CITY_INDEX.length}] ${city}, ${state}, ${country} — ${e.message}`);
      broken.push(entry);
    }
    await sleep(600);
  }

  console.log('\n════════════════════════════════════');
  console.log(`✅ Working: ${working.length}`);
  console.log(`❌ Broken:  ${broken.length}`);
  console.log('════════════════════════════════════\n');

  if (broken.length > 0) {
    console.log('BROKEN ENTRIES — fix these in cityIndex.js:\n');
    broken.forEach(({ city, state, country }) => {
      console.log(`  { city:'${city}', state:'${state}', country:'${country}' },`);
    });
  }
}

verify().catch(console.error);
