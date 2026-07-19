import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import https from 'https';

const PEXELS_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_KEY) {
  console.error('PEXELS_API_KEY missing in environment. Add to backend/.env');
  process.exit(1);
}

const baseDir = path.resolve(process.cwd(), 'backend', 'src', 'config');
const imageMapPath = path.join(baseDir, 'image-map.json');

if (!fs.existsSync(imageMapPath)) {
  console.error('image-map.json not found at', imageMapPath);
  process.exit(1);
}

const currentMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf8'));

// Menu items and searchTerms (mirror of fetch-images.js)
const menuItems = [
  { name: "Aloo Paratha", searchTerm: "aloo paratha" },
  { name: "Egg Paratha (Anda Paratha)", searchTerm: "egg paratha" },
  { name: "Plain Paratha", searchTerm: "plain paratha" },
  { name: "Omelette", searchTerm: "omelette" },
  { name: "Halwa Puri", searchTerm: "halwa puri" },
  { name: "Chai with Rusk", searchTerm: "chai tea with rusk" },
  { name: "Nihari with Naan", searchTerm: "nihari" },
  { name: "Boiled Egg", searchTerm: "boiled egg" },
  { name: "Bun Kabab", searchTerm: "bun kabab" },
  { name: "Chicken Shami Roll", searchTerm: "chicken shami kabab" },
  { name: "Cold Coffee", searchTerm: "cold coffee" },
  { name: "Daal Chawal", searchTerm: "daal lentils rice" },
  { name: "Chicken Karahi", searchTerm: "chicken karahi" },
  { name: "Chicken Biryani", searchTerm: "chicken biryani" },
  { name: "Aloo Gosht with Roti", searchTerm: "aloo gosht" },
  { name: "Sabzi with Roti", searchTerm: "vegetable curry" },
  { name: "Chicken Pulao", searchTerm: "chicken pulao" },
  { name: "Mutton Karahi", searchTerm: "mutton karahi" },
  { name: "Mutton Biryani", searchTerm: "mutton biryani" },
  { name: "Beef Pulao", searchTerm: "beef pulao" },
  { name: "Daal Chawal with Kabab", searchTerm: "daal rice kabab" },
  { name: "Chow Mein / Macaroni", searchTerm: "chow mein noodles" },
  { name: "Chana Masala with Rice or Naan", searchTerm: "chana masala" },
  { name: "Haleem", searchTerm: "haleem meat stew" },
  { name: "Chicken Karahi with Naan", searchTerm: "chicken karahi naan" },
  { name: "Daal Makhani with Rice", searchTerm: "daal makhani" },
  { name: "BBQ Chicken Tikka", searchTerm: "chicken tikka" },
  { name: "Mutton Qorma with Naan", searchTerm: "mutton qorma" },
  { name: "Chapli Kebab with Naan", searchTerm: "chapli kebab" },
  { name: "Seekh Kebab with Naan", searchTerm: "seekh kebab" },
  { name: "Fried Fish with Chutney", searchTerm: "fried fish" },
  { name: "Malai Boti", searchTerm: "malai boti chicken" },
  { name: "Chicken/Mutton Handi", searchTerm: "handi curry" },
  { name: "Samosa (2 pieces)", searchTerm: "samosa" },
  { name: "Spring Roll (2 pieces)", searchTerm: "spring roll" },
  { name: "Pakora Plate", searchTerm: "pakora" },
  { name: "Chicken Shawarma", searchTerm: "shawarma" },
  { name: "Chicken Burger", searchTerm: "burger chicken" },
  { name: "French Fries", searchTerm: "french fries" },
  { name: "Chicken Roll (Paratha Roll)", searchTerm: "chicken roll wrap" },
  { name: "Chicken Patty", searchTerm: "chicken patty" },
  { name: "Samosa Chaat", searchTerm: "samosa chaat" },
  { name: "Dahi Bhalla Chaat", searchTerm: "dahi bhalla" },
  { name: "Papri Chaat", searchTerm: "papri chaat" },
  { name: "Gol Gappay / Pani Puri", searchTerm: "gol gappay pani puri" },
  { name: "Club Sandwich", searchTerm: "club sandwich" },
  { name: "Zinger Burger Combo", searchTerm: "fried chicken burger" },
  { name: "Loaded Fries", searchTerm: "loaded fries cheese" },
  { name: "Mini Pizza - Chicken Tikka", searchTerm: "mini pizza" },
  { name: "Mini Pizza - Chicken Fajita", searchTerm: "mini pizza fajita" },
  { name: "Chai (Tea)", searchTerm: "chai tea" },
  { name: "Lassi (Sweet/Salty)", searchTerm: "lassi yogurt drink" },
  { name: "Cold Drink (Pepsi/7UP)", searchTerm: "soft drink soda" },
  { name: "Rooh Afza Sharbat", searchTerm: "red juice drink sharbat" },
  { name: "Water Bottle", searchTerm: "water bottle" },
  { name: "Mango Shake", searchTerm: "mango shake" },
  { name: "Fresh Lemonade", searchTerm: "lemonade" },
  { name: "Kashmiri Chai (Pink Tea)", searchTerm: "kashmiri pink tea" },
  { name: "Fresh Orange Juice", searchTerm: "orange juice" },
  { name: "Oreo Milkshake", searchTerm: "oreo milkshake" },
  { name: "Banana Milkshake", searchTerm: "banana milkshake" },
  { name: "Coffee", searchTerm: "coffee espresso" },
  { name: "Lays Chips", searchTerm: "potato chips" },
  { name: "Assorted Biscuits/Wafers", searchTerm: "biscuits wafers" },
  { name: "Chocolate Bar", searchTerm: "chocolate bar" },
  { name: "Assorted Candies/Toffees", searchTerm: "candies toffees" },
  { name: "Slice Cake", searchTerm: "slice cake" },
  { name: "Brownie", searchTerm: "brownie chocolate" },
  { name: "Gulab Jamun", searchTerm: "gulab jamun" },
  { name: "Kheer", searchTerm: "kheer rice pudding" },
  { name: "Ice Cream", searchTerm: "ice cream scoop" },
  { name: "Jalebi", searchTerm: "jalebi" },
  { name: "Ras Malai", searchTerm: "ras malai" },
  { name: "Kulfi", searchTerm: "kulfi" },
];

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const fetchPexels = (query) =>
  new Promise((resolve, reject) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`;
    const options = { headers: { Authorization: PEXELS_KEY } };
    https
      .get(url, options, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(d);
            if (parsed.photos && parsed.photos.length > 0) {
              resolve(parsed.photos[0].src.medium);
            } else resolve(null);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', (e) => reject(e));
  });

(async () => {
  const updates = {};
  const skipped = [];
  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    try {
      const pexelUrl = await fetchPexels(item.searchTerm);
      if (!pexelUrl) {
        skipped.push({ name: item.name, reason: 'no pexels result' });
      } else {
        const current = currentMap[item.name];
        if (current && current === pexelUrl) {
          // exact same URL
        } else {
          // mark update
          updates[item.name] = pexelUrl;
          console.log(`Update: ${item.name} -> ${pexelUrl}`);
        }
      }
    } catch (err) {
      console.error(`Error fetching pexels for ${item.name}:`, err.message);
    }
    await sleep(500);
  }

  if (Object.keys(updates).length === 0) {
    console.log('No updates required.');
    process.exit(0);
  }

  // Backup current map
  const backupPath = path.join(baseDir, `image-map.backup.${Date.now()}.json`);
  fs.copyFileSync(imageMapPath, backupPath);
  console.log('Backup saved to', backupPath);

  // Merge updates into currentMap
  const merged = { ...currentMap, ...updates };
  fs.writeFileSync(imageMapPath, JSON.stringify(merged, null, 2));
  console.log('Applied updates to', imageMapPath);

  // Save updates.json for review
  const updatesFile = path.resolve(process.cwd(), 'backend', 'updates.json');
  fs.writeFileSync(updatesFile, JSON.stringify(updates, null, 2));
  console.log('Wrote updates file to', updatesFile);

  console.log('\nDone. Restart backend to pick up new image-map.json.');
})();
