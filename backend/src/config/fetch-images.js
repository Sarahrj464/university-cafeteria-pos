import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Menu items organized by category
const menuItems = [
  // BREAKFAST (original 7 + new 4)
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

  // LUNCH (original 7 + new 6)
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

  // DINNER (original 6 + new 2)
  { name: "Chicken Karahi with Naan", searchTerm: "chicken karahi naan" },
  { name: "Daal Makhani with Rice", searchTerm: "daal makhani" },
  { name: "BBQ Chicken Tikka", searchTerm: "chicken tikka" },
  { name: "Mutton Qorma with Naan", searchTerm: "mutton qorma" },
  { name: "Chapli Kebab with Naan", searchTerm: "chapli kebab" },
  { name: "Seekh Kebab with Naan", searchTerm: "seekh kebab" },
  { name: "Fried Fish with Chutney", searchTerm: "fried fish" },
  { name: "Malai Boti", searchTerm: "malai boti chicken" },
  { name: "Chicken/Mutton Handi", searchTerm: "handi curry" },

  // SNACKS (original 8 + new 9)
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

  // BEVERAGES (original 7 + new 6)
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

  // CONFECTIONERY & SNACKS COUNTER (new 6)
  { name: "Lays Chips", searchTerm: "potato chips" },
  { name: "Assorted Biscuits/Wafers", searchTerm: "biscuits wafers" },
  { name: "Chocolate Bar", searchTerm: "chocolate bar" },
  { name: "Assorted Candies/Toffees", searchTerm: "candies toffees" },
  { name: "Slice Cake", searchTerm: "slice cake" },
  { name: "Brownie", searchTerm: "brownie chocolate" },

  // DESSERTS (new 6)
  { name: "Gulab Jamun", searchTerm: "gulab jamun" },
  { name: "Kheer", searchTerm: "kheer rice pudding" },
  { name: "Ice Cream", searchTerm: "ice cream scoop" },
  { name: "Jalebi", searchTerm: "jalebi" },
  { name: "Ras Malai", searchTerm: "ras malai" },
  { name: "Kulfi", searchTerm: "kulfi" },
];

// Approximate matches (will be flagged in output)
const approximateMatches = [
  "Rooh Afza Sharbat",          // No exact match; using "red juice drink"
  "Water Bottle",               // Generic search
  "Kashmiri Chai (Pink Tea)",   // Using "kashmiri pink tea"
  "Assorted Biscuits/Wafers",   // Using general biscuits category
  "Assorted Candies/Toffees",   // Using general candies category
];

// Sleep function for rate limiting
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch from Pexels API
const fetchImageFromPexels = (searchTerm, apiKey) => {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(searchTerm);
    const url = `https://api.pexels.com/v1/search?query=${query}&per_page=1`;

    const options = {
      headers: {
        Authorization: apiKey,
      },
    };

    https
      .get(url, options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.photos && parsed.photos.length > 0) {
              const photo = parsed.photos[0];
              // Use src.medium for consistency with 400x300 crop
              resolve(photo.src.medium);
            } else {
              resolve(null);
            }
          } catch (err) {
            reject(
              new Error(`Parse error for "${searchTerm}": ${err.message}`),
            );
          }
        });
      })
      .on("error", (err) => {
        reject(new Error(`Network error for "${searchTerm}": ${err.message}`));
      });
  });
};

// Main function
const main = async () => {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.error("Error: PEXELS_API_KEY not found in environment variables.");
    console.error("Please add PEXELS_API_KEY to your backend/.env file");
    console.error("Get a free API key from: https://www.pexels.com/api/");
    process.exit(1);
  }

  console.log(
    `\n🔍 Fetching images from Pexels for ${menuItems.length} items...`,
  );
  console.log("⏱️  Rate limiting: 500ms delay between requests\n");

  const imageMap = {};
  const failedItems = [];
  const approximateItems = [];

  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const progress = `[${i + 1}/${menuItems.length}]`;

    try {
      const imageUrl = await fetchImageFromPexels(item.searchTerm, apiKey);

      if (imageUrl) {
        imageMap[item.name] = imageUrl;
        const isApproximate = approximateMatches.includes(item.name);
        const flag = isApproximate ? " ⚠️  (approximate match)" : "";
        console.log(`${progress} ✅ ${item.name}${flag}`);
        if (isApproximate) {
          approximateItems.push(item.name);
        }
      } else {
        console.log(`${progress} ❌ ${item.name} - No image found`);
        failedItems.push(item.name);
      }

      // Rate limiting: 500ms delay between requests (200 req/hr = 1 req/18sec, well within limits)
      if (i < menuItems.length - 1) {
        await sleep(500);
      }
    } catch (err) {
      console.log(`${progress} ⚠️  ${item.name} - ${err.message}`);
      failedItems.push(item.name);
    }
  }

  // Output results
  console.log("\n" + "=".repeat(70));
  console.log("📋 IMAGE MAP (Ready to copy into seed.js)");
  console.log("=".repeat(70) + "\n");

  console.log("const imageMap = {");
  Object.entries(imageMap).forEach(([name, url]) => {
    console.log(`  "${name}": "${url}",`);
  });
  console.log("};\n");

  // Save imageMap directly to a JSON file in the SAME folder as this script
  // (src/config), so merge-images.js can find it without any path mismatch.
  const outputPath = path.join(__dirname, "image-map.json");
  fs.writeFileSync(outputPath, JSON.stringify(imageMap, null, 2));
  console.log(`✅ Saved to ${outputPath}\n`);

  // Summary
  console.log("=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  console.log(
    `✅ Successfully fetched: ${Object.keys(imageMap).length}/${menuItems.length}`,
  );

  if (approximateItems.length > 0) {
    console.log(`\n⚠️  APPROXIMATE MATCHES (verify manually):`);
    approximateItems.forEach((item) => {
      console.log(`   - ${item}`);
    });
  }

  if (failedItems.length > 0) {
    console.log(`\n❌ NO IMAGE FOUND (source manually):`);
    failedItems.forEach((item) => {
      console.log(`   - ${item}`);
    });
  }

  console.log("\n💡 Next steps:");
  console.log("1. Review the approximate & failed items above");
  console.log("2. Run: npm run merge-images");
  console.log("3. Run: npm run seed\n");
};

// Run the script
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});