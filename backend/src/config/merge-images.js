import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedFilePath = path.join(__dirname, 'seed.js');
const imageMapPath = path.join(__dirname, 'image-map.json');

if (!fs.existsSync(imageMapPath)) {
  console.error('');
  console.error('❌ Error: image-map.json not found!');
  console.error('   Run "npm run fetch-images" first to generate it.');
  console.error('');
  process.exit(1);
}

const imageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf-8'));

if (Object.keys(imageMap).length === 0) {
  console.error('❌ Error: image-map.json is empty!');
  process.exit(1);
}

try {
  // Read seed.js
  let seedContent = fs.readFileSync(seedFilePath, 'utf-8');

  let updateCount = 0;
  let failedCount = 0;

  // Find every menu item block: name: "...", ... image: foodImage(...)
  const itemBlockRegex = /name:\s*"([^"]+)",((?:(?!name:)[\s\S])*?)image:\s*foodImage\([^)]*\)/g;

  seedContent = seedContent.replace(itemBlockRegex, (match, itemName, middle) => {
    // Try exact match first, then fall back to "starts with" for names
    // that have extra text in parentheses, e.g. "Lassi (Sweet/Salty)"
    let key = Object.keys(imageMap).find((k) => k === itemName);
    if (!key) {
      key = Object.keys(imageMap).find((k) => itemName.startsWith(k));
    }

    if (!key) {
      console.log(`⚠️  No match found for: ${itemName}`);
      failedCount++;
      return match;
    }

    updateCount++;
    console.log(`✅ Updated: ${itemName}`);
    return `name: "${itemName}",${middle}image: "${imageMap[key]}"`;
  });

  // Write back to seed.js
  fs.writeFileSync(seedFilePath, seedContent, 'utf-8');

  console.log('');
  console.log('='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully updated: ${updateCount}/${Object.keys(imageMap).length}`);

  if (failedCount > 0) {
    console.log(`⚠️  Failed to update: ${failedCount} items`);
    console.log('   (Check names above — they may not match keys in image-map.json)');
  }

  console.log('');
  console.log('📝 File saved: backend/src/config/seed.js');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('   1. (Optional) Review the updated seed.js file');
  console.log('   2. Run: npm run seed');
  console.log('   3. Your database will be populated with real Pexels images!');
  console.log('');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}