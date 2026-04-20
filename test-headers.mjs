// Test script to see what AllRecipes returns to a server-side fetch
const https = require('https');

const options = {
  hostname: 'www.allrecipes.com',
  path: '/recipe/20513/classic-waffles/',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Has JSON-LD:', data.includes('application/ld+json'));
    console.log('Has recipeIngredient:', data.includes('recipeIngredient'));
    console.log('Has "butter":', data.includes('butter'));
    console.log('Has "waffle":', data.includes('waffle'));
    // Find the JSON-LD
    const ldMatch = data.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (ldMatch) {
      console.log('\nJSON-LD found:');
      try {
        const parsed = JSON.parse(ldMatch[1]);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
            console.log('Recipe name:', item.name);
            console.log('Ingredients count:', item.recipeIngredient?.length);
            console.log('First 3 ingredients:', item.recipeIngredient?.slice(0, 3));
          }
        }
      } catch(e) {
        console.log('JSON-LD parse error:', e.message);
        console.log('Content:', ldMatch[1].slice(0, 500));
      }
    } else {
      console.log('\nNo JSON-LD found!');
      console.log('Content preview:', data.slice(0, 500));
    }
  });
});

req.on('error', e => console.error(e));
req.end();
