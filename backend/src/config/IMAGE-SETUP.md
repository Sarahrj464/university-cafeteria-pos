# 📷 Cafeteria Menu Images Setup Guide

This guide explains how to fetch real food images from Pexels API and update your seed.js file.

## 📋 Current Status

Your seed.js currently uses **LoremFlickr** (placeholder images) via `foodImage()` function calls:

```javascript
image: foodImage("chickencurry", 109)
```

This setup works, but LoremFlickr generates generic placeholder images. To use **real, high-quality food photos**, follow this guide to fetch from Pexels.

## ✅ Overview

**Goal:** Replace placeholder images with real Pexels photos

**Process:**
1. Get a free Pexels API key (2 minutes)
2. Run `fetch-images.js` to search Pexels for all 36 items (~18 seconds)
3. Copy the results and paste into `merge-images.js`
4. Run `merge-images.js` to replace foodImage() calls with real URLs
5. Seed your database

## 🚀 Quick Start

### Step 1: Get Pexels API Key

1. Visit: https://www.pexels.com/api/
2. Sign up or log in
3. Create a new API application
4. Copy your API key

### Step 2: Add API Key to .env

Edit `backend/.env`:

```env
PEXELS_API_KEY=your-free-api-key-here
```

### Step 3: Fetch Images from Pexels

```bash
cd backend
npm run fetch-images
```

**This will:**
- Search Pexels for all 36 menu items (with 500ms delays to respect rate limits)
- Print progress and results
- Output an `imageMap` object with real Pexels URLs
- Take about 20-30 seconds

**Example output:**

```
🔍 Fetching images from Pexels for 36 items...
⏱️  Rate limiting: 500ms delay between requests

[1/36] ✅ Aloo Paratha
[2/36] ✅ Egg Paratha (Anda Paratha)
[3/36] ✅ Plain Paratha
...
[36/36] ✅ Fresh Lemonade

======================================================================
📋 IMAGE MAP (Ready to copy into seed.js)
======================================================================

const imageMap = {
  "Aloo Paratha": "https://images.pexels.com/photos/1234567/pexels-photo-1234567.jpeg",
  "Egg Paratha (Anda Paratha)": "https://images.pexels.com/photos/2345678/...",
  ...
};

======================================================================
📊 SUMMARY
======================================================================
✅ Successfully fetched: 36/36
```

### Step 4: Copy the imageMap

From the console output above, copy the entire `const imageMap = { ... };` block (all 36 items).

### Step 5: Paste into merge-images.js

Open `backend/src/config/merge-images.js` and replace the empty imageMap:

**Before:**
```javascript
const imageMap = {
  // Example format from fetch-images.js output:
  // "Aloo Paratha": "https://images.pexels.com/photos/12345/...",
  // Paste your complete imageMap here
};
```

**After:**
```javascript
const imageMap = {
  "Aloo Paratha": "https://images.pexels.com/photos/1234567/pexels-photo-1234567.jpeg",
  "Egg Paratha (Anda Paratha)": "https://images.pexels.com/photos/2345678/...",
  ...
  // All 36 items here
};
```

### Step 6: Merge Images into seed.js

```bash
npm run merge-images
```

**This will:**
- Replace all `foodImage()` calls with real Pexels URLs
- Print confirmation for each item
- Show a summary of updates

**Example output:**

```
✅ Updated: Aloo Paratha
✅ Updated: Egg Paratha (Anda Paratha)
✅ Updated: Plain Paratha
...
✅ Updated: Fresh Lemonade

============================================================
📊 SUMMARY
============================================================
✅ Successfully updated: 36/36 items

📝 File saved: backend/src/config/seed.js

🚀 Next steps:
   1. (Optional) Review the updated seed.js file
   2. Run: npm run seed
   3. Your database will be populated with real Pexels images!
```

### Step 7: Seed Your Database

```bash
npm run seed
```

Done! Your database now has real Pexels images for all menu items.

## 🔄 How It Works

### fetch-images.js

**Location:** `backend/src/config/fetch-images.js`

Fetches real food images from Pexels:

```javascript
// For each menu item, searches Pexels with a relevant keyword
const item = "Chicken Biryani";
const keyword = "chicken biryani";
// Returns the first matching photo's Pexels URL
// Example: https://images.pexels.com/photos/12345/pexels-photo-12345.jpeg
```

**Search Keywords Used:**
- Breakfast: "aloo paratha", "egg paratha", "omelette", "chai tea", etc.
- Lunch: "chicken karahi", "biryani", "daal lentils", etc.
- Dinner: "tikka", "kebab", "mutton qorma", etc.
- Snacks: "samosa", "shawarma", "burger", etc.
- Beverages: "chai", "lassi", "mango shake", "lemonade", etc.

**Rate Limiting:**
- Pexels free tier: 200 requests/hour
- Script uses 500ms delays between requests
- Total runtime: ~18-20 seconds for 36 items

### merge-images.js

**Location:** `backend/src/config/merge-images.js`

Replaces placeholder images in seed.js:

**Before (using LoremFlickr):**
```javascript
{
  name: "Chicken Biryani",
  image: foodImage("biryani,rice", 110),
}
```

**After (using real Pexels):**
```javascript
{
  name: "Chicken Biryani",
  image: "https://images.pexels.com/photos/5636267/pexels-photo-5636267.jpeg",
}
```

The script uses pattern matching to find and replace each `foodImage()` call.

## ⚠️ Troubleshooting

### "PEXELS_API_KEY not found"

**Solution:**
1. Get free API key: https://www.pexels.com/api/
2. Add to `backend/.env`: `PEXELS_API_KEY=your-key`
3. Make sure you're running the command from the `backend/` folder

### Images don't update in seed.js

**Possible causes:**
- `imageMap` is empty (didn't copy from fetch-images output)
- Syntax error in `imageMap` (missing comma, quote, etc.)
- Item name doesn't exactly match in seed.js

**Solution:**
1. Run `fetch-images` again and verify output
2. Check `imageMap` syntax (should be valid JavaScript)
3. Verify item names match exactly (e.g., "Aloo Paratha" vs "aloo paratha")

### Image URLs are broken

**Solution:**
1. Paste URL directly in browser to verify it works
2. Re-run `fetch-images` to get fresh URLs
3. Copy new `imageMap` and re-run `merge-images`

### Some images not found

Some Pakistani dishes may not have exact matches on Pexels. The script will:
- Skip items with no matches (marked with ❌)
- Use approximate searches for specialty items (marked with ⚠️)

**For missing items, manually add to imageMap:**

1. Search on Pexels: https://www.pexels.com/
2. Find a good image of the dish
3. Copy the Pexels URL
4. Add to `imageMap` in merge-images.js:

```javascript
const imageMap = {
  "Your Missing Item": "https://images.pexels.com/photos/YOUR-ID/...",
  // ... other items
};
```

5. Re-run `npm run merge-images`

## 📊 Menu Items (36 Total)

**BREAKFAST (7):**
- Aloo Paratha, Egg Paratha, Plain Paratha, Omelette, Halwa Puri, Chai with Rusk, Nihari with Naan

**LUNCH (7):**
- Daal Chawal, Chicken Karahi, Chicken Biryani, Aloo Gosht with Roti, Sabzi with Roti, Chicken Pulao, Mutton Karahi

**DINNER (7):**
- Chicken Karahi with Naan, Daal Makhani with Rice, BBQ Chicken Tikka, Mutton Qorma with Naan, Chapli Kebab with Naan, Seekh Kebab with Naan, Fried Fish with Chutney

**SNACKS (8):**
- Samosa, Spring Roll, Pakora Plate, Chicken Shawarma, Chicken Burger, French Fries, Chicken Roll, Chicken Patty

**BEVERAGES (7):**
- Chai (Tea), Lassi, Cold Drink (Pepsi/7UP), Rooh Afza Sharbat, Water Bottle, Mango Shake, Fresh Lemonade

## 💡 Tips

- **Backup seed.js** before running merge-images as a precaution
- **Test a few items** before running the full merge
- **Update images anytime** by re-running fetch-images and merge-images
- **Use Pexels directly** to manually source images you prefer for specific items

## 📚 References

- **Pexels API:** https://www.pexels.com/api/documentation/
- **Free tier limits:** 200 requests/hour, 10 requests/second per IP
- **Image quality:** All URLs are JPEG from Pexels CDN (fast, no watermark, free)

## 🎯 Next Steps After Setup

1. ✅ Run `npm run seed` to populate your database
2. ✅ Start your server: `npm run dev`
3. ✅ View images in POS and student portals
4. ✅ Test ordering with real food images

---

**Questions?** Check the script comments in `backend/src/config/` or re-read this guide.
