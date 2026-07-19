// 📋 IMAGEMAP TEMPLATE
// 
// This is what you'll get from fetch-images.js and where it goes
// 
// Usage:
// 1. Run: npm run fetch-images
// 2. Copy the ENTIRE imageMap below (starting with "const imageMap = {")
// 3. Paste into: backend/src/config/merge-images.js (line ~19)

// ============================================================
// EXAMPLE OUTPUT FROM fetch-images.js:
// ============================================================

const imageMap = {
  "Aloo Paratha": "https://images.pexels.com/photos/1234567/pexels-photo-1234567.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Egg Paratha (Anda Paratha)": "https://images.pexels.com/photos/2345678/pexels-photo-2345678.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Plain Paratha": "https://images.pexels.com/photos/3456789/pexels-photo-3456789.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Omelette": "https://images.pexels.com/photos/4567890/pexels-photo-4567890.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Halwa Puri": "https://images.pexels.com/photos/5678901/pexels-photo-5678901.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Chai with Rusk": "https://images.pexels.com/photos/6789012/pexels-photo-6789012.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Nihari with Naan": "https://images.pexels.com/photos/7890123/pexels-photo-7890123.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Daal Chawal": "https://images.pexels.com/photos/8901234/pexels-photo-8901234.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Chicken Karahi": "https://images.pexels.com/photos/9012345/pexels-photo-9012345.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Chicken Biryani": "https://images.pexels.com/photos/1111111/pexels-photo-1111111.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Aloo Gosht with Roti": "https://images.pexels.com/photos/2222222/pexels-photo-2222222.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Sabzi with Roti": "https://images.pexels.com/photos/3333333/pexels-photo-3333333.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Chicken Pulao": "https://images.pexels.com/photos/4444444/pexels-photo-4444444.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Mutton Karahi": "https://images.pexels.com/photos/5555555/pexels-photo-5555555.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Chicken Karahi with Naan": "https://images.pexels.com/photos/6666666/pexels-photo-6666666.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Daal Makhani with Rice": "https://images.pexels.com/photos/7777777/pexels-photo-7777777.jpeg?auto=compress&cs=tinysrgb&w=400",
  "BBQ Chicken Tikka": "https://images.pexels.com/photos/8888888/pexels-photo-8888888.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Mutton Qorma with Naan": "https://images.pexels.com/photos/9999999/pexels-photo-9999999.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Chapli Kebab with Naan": "https://images.pexels.com/photos/1010101/pexels-photo-1010101.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Seekh Kebab with Naan": "https://images.pexels.com/photos/1111112/pexels-photo-1111112.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Fried Fish with Chutney": "https://images.pexels.com/photos/1212121/pexels-photo-1212121.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Samosa": "https://images.pexels.com/photos/1313131/pexels-photo-1313131.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Spring Roll": "https://images.pexels.com/photos/1414141/pexels-photo-1414141.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Pakora Plate": "https://images.pexels.com/photos/1515151/pexels-photo-1515151.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Chicken Shawarma": "https://images.pexels.com/photos/1616161/pexels-photo-1616161.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Chicken Burger": "https://images.pexels.com/photos/1717171/pexels-photo-1717171.jpeg?auto=compress&cs=tinysrgb&w=400",
  "French Fries": "https://images.pexels.com/photos/1818181/pexels-photo-1818181.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Chicken Roll": "https://images.pexels.com/photos/1919191/pexels-photo-1919191.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Chicken Patty": "https://images.pexels.com/photos/2020202/pexels-photo-2020202.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Chai (Tea)": "https://images.pexels.com/photos/2121212/pexels-photo-2121212.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Lassi": "https://images.pexels.com/photos/2222223/pexels-photo-2222223.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Cold Drink (Pepsi/7UP)": "https://images.pexels.com/photos/2323232/pexels-photo-2323232.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Rooh Afza Sharbat": "https://images.pexels.com/photos/2424242/pexels-photo-2424242.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Water Bottle": "https://images.pexels.com/photos/2525252/pexels-photo-2525252.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Mango Shake": "https://images.pexels.com/photos/2626262/pexels-photo-2626262.jpeg?auto=compress&cs=tinysrgb&w=400",
  "Fresh Lemonade": "https://images.pexels.com/photos/2727272/pexels-photo-2727272.jpeg?auto=compress&cs=tinysrgb&w=400",
};

// ============================================================
// WHERE TO PASTE THIS:
// ============================================================
//
// File: backend/src/config/merge-images.js
// 
// Find:
//   const imageMap = {
//     // Example format from fetch-images.js output:
//     // "Aloo Paratha": "https://images.pexels.com/photos/12345/...",
//     // Paste your complete imageMap here, replacing this comment
//   };
//
// Replace the entire imageMap object with what you copied from fetch-images.js
//
// Then run:
//   $ npm run merge-images
//
// ============================================================
// IMPORTANT NOTES:
// ============================================================
//
// ✅ Item names must match EXACTLY with what's in seed.js
// ✅ Each URL must start with "https://images.pexels.com/photos/"
// ✅ All 36 items must be present (7+7+7+8+7 = 36)
// ✅ No trailing commas after the last item
// ✅ Paste the ENTIRE const imageMap = { ... } block
//
// ❌ DON'T:
//   - Change item names
//   - Remove any items
//   - Edit URLs manually
//   - Include comments in the imageMap object
//
// ============================================================
// TROUBLESHOOTING:
// ============================================================
//
// If merge-images.js gives an error:
// 1. Check item names match exactly (capitalization matters)
// 2. Verify imageMap is valid JavaScript (use a JSON validator)
// 3. Make sure all items are included
// 4. Run fetch-images again if some items are missing
//
// ============================================================
