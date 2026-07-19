╔══════════════════════════════════════════════════════════════════════════════╗
║                   🎉 PEXELS IMAGE SETUP COMPLETE! 🎉                         ║
╚══════════════════════════════════════════════════════════════════════════════╝

📁 NEW FILES CREATED:
═══════════════════════════════════════════════════════════════════════════════

✅ backend/src/config/fetch-images.js
   → Fetches real food images from Pexels API (36 items)
   → Outputs an imageMap object
   → Rate limited to respect Pexels free tier

✅ backend/src/config/merge-images.js
   → Pastes imageMap you provide
   → Updates seed.js replacing foodImage() calls with real URLs
   → Reports what was updated

✅ backend/src/config/IMAGE-SETUP.md
   → Complete step-by-step guide
   → Troubleshooting section
   → Tips and references

✅ backend/src/config/IMAGEMAP-TEMPLATE.js
   → Shows exact format of imageMap output
   → Shows where to paste it
   → Important notes and warnings

✅ backend/src/config/QUICK-START.sh
   → Quick reference of all commands
   → Print this out or keep handy


📦 NPM SCRIPTS ADDED:
═══════════════════════════════════════════════════════════════════════════════

$ npm run fetch-images
  → Fetches 36 real food images from Pexels
  → Takes ~20-30 seconds
  → Outputs imageMap to console

$ npm run merge-images
  → Updates seed.js with images from imageMap
  → Replaces foodImage() calls with real URLs
  → Safe to run multiple times


🚀 QUICK START (5 MINUTES):
═══════════════════════════════════════════════════════════════════════════════

1️⃣  Get Pexels API key (free)
    → Visit: https://www.pexels.com/api/
    → Sign up → Create app → Copy key

2️⃣  Add to backend/.env
    PEXELS_API_KEY=your-key-here

3️⃣  Run: npm run fetch-images
    ✏️  Copy the imageMap output (all 36 items)

4️⃣  Edit: backend/src/config/merge-images.js
    🔗 Paste imageMap you just copied (line ~19)

5️⃣  Run: npm run merge-images
    ✅ Your seed.js is updated with real Pexels URLs!

6️⃣  Run: npm run seed
    ✅ Database is populated with real images!


📊 WHAT HAPPENS:
═══════════════════════════════════════════════════════════════════════════════

BEFORE (Placeholder images using LoremFlickr):
───────────────────────────────────────────────
  {
    name: "Chicken Biryani",
    image: foodImage("biryani,rice", 110),  // Generic placeholder
  }

AFTER (Real Pexels food photos):
─────────────────────────────────
  {
    name: "Chicken Biryani",
    image: "https://images.pexels.com/photos/5636267/pexels-photo-5636267.jpeg",
  }


📋 MENU ITEMS (36 TOTAL):
═══════════════════════════════════════════════════════════════════════════════

BREAKFAST (7):
  Aloo Paratha, Egg Paratha (Anda Paratha), Plain Paratha, Omelette,
  Halwa Puri, Chai with Rusk, Nihari with Naan

LUNCH (7):
  Daal Chawal, Chicken Karahi, Chicken Biryani, Aloo Gosht with Roti,
  Sabzi with Roti, Chicken Pulao, Mutton Karahi

DINNER (7):
  Chicken Karahi with Naan, Daal Makhani with Rice, BBQ Chicken Tikka,
  Mutton Qorma with Naan, Chapli Kebab with Naan, Seekh Kebab with Naan,
  Fried Fish with Chutney

SNACKS (8):
  Samosa, Spring Roll, Pakora Plate, Chicken Shawarma, Chicken Burger,
  French Fries, Chicken Roll, Chicken Patty

BEVERAGES (7):
  Chai (Tea), Lassi, Cold Drink (Pepsi/7UP), Rooh Afza Sharbat,
  Water Bottle, Mango Shake, Fresh Lemonade


⚙️ HOW THE SCRIPTS WORK:
═══════════════════════════════════════════════════════════════════════════════

fetch-images.js:
  1. Reads PEXELS_API_KEY from .env
  2. For each menu item, sends 1 API request to Pexels
  3. Gets the first matching photo's URL
  4. Adds 500ms delays between requests (rate limiting)
  5. Outputs: const imageMap = { ... } with all 36 URLs

merge-images.js:
  1. Reads the imageMap object you paste in
  2. Opens seed.js
  3. Finds each foodImage() call by name
  4. Replaces it with the real Pexels URL
  5. Writes updated seed.js to disk


⏱️ TIMING:
═══════════════════════════════════════════════════════════════════════════════

fetch-images.js:    ~20-30 seconds (36 API calls with rate limiting)
merge-images.js:    ~2-3 seconds (file processing)
npm run seed:       ~5-10 seconds (database seeding)

Total time:         ~30-45 seconds for everything!


📚 FILES TO READ:
═══════════════════════════════════════════════════════════════════════════════

Start here:
  → backend/src/config/QUICK-START.sh (overview of steps)

Then read:
  → backend/src/config/IMAGE-SETUP.md (detailed guide with examples)

Reference:
  → backend/src/config/IMAGEMAP-TEMPLATE.js (exact format & requirements)

Source code:
  → backend/src/config/fetch-images.js (how fetching works)
  → backend/src/config/merge-images.js (how merging works)


💡 TIPS:
═══════════════════════════════════════════════════════════════════════════════

✅ Test with one item first:
   - Run fetch-images, copy just one entry to imageMap
   - Run merge-images, verify it works
   - Then do all 36

✅ Backup seed.js before merging:
   - Just in case something goes wrong
   - You can always restore and try again

✅ Verify images in your browser:
   - Click the URL in seed.js to confirm it loads
   - Make sure it's actually a food photo

✅ Refresh images anytime:
   - You can re-run fetch-images and merge-images
   - Great for testing or if Pexels returns different results

✅ For missing items:
   - Some Pakistani dishes may not be on Pexels
   - Manually add those URLs to imageMap before running merge-images
   - Or search https://www.pexels.com/ for better alternatives


🆘 TROUBLESHOOTING:
═══════════════════════════════════════════════════════════════════════════════

Problem: "PEXELS_API_KEY not found in environment variables"
→ Solution: Make sure you added it to backend/.env and it's correct

Problem: fetch-images runs but outputs no imageMap
→ Solution: Check your internet connection, API key, and Pexels status

Problem: merge-images says "imageMap is empty"
→ Solution: You forgot to paste the imageMap object into merge-images.js

Problem: Some items didn't update
→ Solution: Item names must match exactly (capitalization matters)

Problem: Image URLs show broken in browser
→ Solution: Re-run fetch-images to get fresh URLs, some may expire

For more troubleshooting, see: backend/src/config/IMAGE-SETUP.md


✨ NEXT STEPS:
═══════════════════════════════════════════════════════════════════════════════

Ready to start?

1. Get your Pexels API key: https://www.pexels.com/api/
2. Add to backend/.env: PEXELS_API_KEY=your-key
3. Run: cd backend && npm run fetch-images
4. Follow steps 4-6 from "QUICK START" section above
5. Enjoy your real food images! 🍽️

═══════════════════════════════════════════════════════════════════════════════

Questions? Check the files or re-read IMAGE-SETUP.md

Happy coding! 🚀

═══════════════════════════════════════════════════════════════════════════════
