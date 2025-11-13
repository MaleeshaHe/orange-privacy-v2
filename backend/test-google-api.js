require('dotenv').config();
const axios = require('axios');

async function testGoogleSearch() {
  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  console.log('\n🧪 Testing Google Custom Search API\n');
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : '❌ Missing');
  console.log('Search Engine ID:', searchEngineId || '❌ Missing');

  if (!apiKey || !searchEngineId) {
    console.error('\n❌ Missing credentials!\n');
    return;
  }

  // Test with a very common name that should have results
  const testQueries = [
    'Elon Musk',
    'person face',
    'Maleesha Herath'
  ];

  for (const query of testQueries) {
    console.log(`\n───────────────────────────────────────`);
    console.log(`Testing query: "${query}"`);
    console.log(`───────────────────────────────────────`);

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: searchEngineId,
          searchType: 'image',
          q: query,
          num: 10
        },
        timeout: 10000
      });

      const items = response.data.items || [];
      console.log(`✅ Success! Found ${items.length} images`);

      if (items.length > 0) {
        console.log('Sample results:');
        items.slice(0, 3).forEach((item, i) => {
          console.log(`  ${i + 1}. ${item.link.substring(0, 60)}...`);
        });
      } else {
        console.log('⚠️  API works but returned 0 results');
        console.log('   This means your Search Engine is not configured to search the entire web');
      }

      // Check search information
      if (response.data.searchInformation) {
        console.log(`Total results available: ${response.data.searchInformation.totalResults || 0}`);
      }

    } catch (error) {
      console.error(`❌ Error: ${error.response?.data?.error?.message || error.message}`);
      if (error.response?.status === 403) {
        console.error('   → Invalid API key or API not enabled');
      } else if (error.response?.status === 400) {
        console.error('   → Invalid Search Engine ID or not configured for images');
      }
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📋 Next Steps:');
  console.log('');
  console.log('If all queries returned 0 results:');
  console.log('1. Go to: https://programmablesearchengine.google.com/');
  console.log('2. Select your search engine');
  console.log('3. Click "Setup" → "Basics"');
  console.log('4. Enable "Search the entire web" ✅');
  console.log('5. Make sure "Image search" is ON ✅');
  console.log('6. Click "Update" and wait 5 minutes');
  console.log('7. Run this test again');
  console.log('\n═══════════════════════════════════════\n');
}

testGoogleSearch().catch(console.error);
