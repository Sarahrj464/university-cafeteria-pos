import bcrypt from "bcryptjs";
import pool from "./db.js";

const users = [
  {
    name: "System Admin",
    email: "admin@university.edu",
    password: "Admin@1234",
    role: "admin",
    student_id: null,
  },
  {
    name: "Cashier One",
    email: "cashier1@university.edu",
    password: "Cashier@1234",
    role: "cashier",
    student_id: null,
  },
  {
    name: "Cashier Two",
    email: "cashier2@university.edu",
    password: "Cashier@1234",
    role: "cashier",
    student_id: null,
  },
  {
    name: "Kitchen Staff",
    email: "kitchen@university.edu",
    password: "Kitchen@1234",
    role: "kitchen",
    student_id: null,
  },
  {
    name: "Student One",
    email: "student1@university.edu",
    password: "Student@1234",
    role: "student",
    student_id: "STU-2024-001",
  },
  {
    name: "Student Two",
    email: "student2@university.edu",
    password: "Student@1234",
    role: "student",
    student_id: "STU-2024-002",
  },
];

const mealPlans = [
  {
    email: "student1@university.edu",
    plan_type: "dining_dollars",
    total_credits: 8000,
    semester: "Fall 2025",
  },
  {
    email: "student2@university.edu",
    plan_type: "dining_dollars",
    total_credits: 5000,
    semester: "Fall 2025",
  },
];

async function seed() {
  const { env } = await import("./env.js");

  if (!env.databaseUrl) {
    console.error("Seed failed: DATABASE_URL is not set in backend/.env");
    process.exit(1);
  }

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    const hint =
      err.code === "ECONNREFUSED"
        ? "Cannot reach PostgreSQL. Run migrate first and verify DATABASE_URL."
        : err.message || "Unknown database error";
    console.error("Seed failed:", hint);
    process.exit(1);
  }

  try {
    await client.query("BEGIN");

    const userIds = {};

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 12);
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role, student_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           student_id = EXCLUDED.student_id
         RETURNING id, email`,
        [user.name, user.email, passwordHash, user.role, user.student_id],
      );
      userIds[result.rows[0].email] = result.rows[0].id;
      console.log(`Seeded user: ${user.email}`);
    }

    await client.query(
      `UPDATE users SET wallet_balance = 3000 WHERE email = $1`,
      ["student1@university.edu"],
    );
    await client.query(
      `UPDATE users SET wallet_balance = 2000 WHERE email = $1`,
      ["student2@university.edu"],
    );
    console.log("Seeded wallet balances for students.");

    await client.query("DELETE FROM meal_plans");

    for (const plan of mealPlans) {
      const studentId = userIds[plan.email];
      if (!studentId) continue;

      await client.query(
        `INSERT INTO meal_plans (student_id, plan_type, total_credits, semester, expires_at)
   VALUES ($1, $2, $3::numeric, $4, NOW() + INTERVAL '120 days')
   ON CONFLICT DO NOTHING`,
        [studentId, plan.plan_type, String(plan.total_credits), plan.semester],
      );
      console.log(`Seeded meal plan for: ${plan.email}`);
    }

    await client.query("COMMIT");
    console.log("User seed completed.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err.message || "Unknown error");
    process.exit(1);
  } finally {
    client.release();
  }

  // Menu + combo seed in separate transaction
  let menuClient;
  try {
    menuClient = await pool.connect();
    await seedMenu(menuClient);
  } catch (err) {
    console.error("Menu seed failed:", err.message || "Unknown error");
    process.exit(1);
  } finally {
    if (menuClient) menuClient.release();
    await pool.end();
  }
}

// ---------------------------------------------------------------------------
// CATEGORIES — consolidated to 9 TYPE-based buckets. Time-of-day is no
// longer a category; it lives on menu_items.meal_period instead. This is
// what fixes the "same dish appears under Lunch AND Dinner" duplication
// problem — the dish is stored ONCE and tagged with every period it's
// actually served in.
// ---------------------------------------------------------------------------
const categories = [
  { name: "Breakfast", icon: "sunrise", order: 1 },
  { name: "Rice & Karahi", icon: "bowl-food", order: 2 },
  { name: "Curries & Roti", icon: "utensils", order: 3 },
  { name: "Fast Food", icon: "burger", order: 4 },
  { name: "Snacks", icon: "cookie", order: 5 },
  { name: "Hot Beverages", icon: "coffee", order: 6 },
  { name: "Cold Beverages", icon: "glass-water", order: 7 },
  { name: "Desserts", icon: "cake", order: 8 },
  { name: "Confectionery", icon: "candy", order: 9 },
];

// meal_period values used below: "breakfast" | "lunch" | "dinner"
// Most curries/rice dishes are eaten at both lunch & dinner in a Pakistani
// cafeteria, so they carry both tags rather than being duplicated as rows.

const menuItems = [
  // ---------------- BREAKFAST ----------------
  {
    cat: "Breakfast",
    name: "French Toast",
    price: 110.0,
    tags: ["V"],
    period: ["breakfast"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_9yqt-OBK9Og8Y0FBCg87pfFGIk1MFBpLM8N_GVDFuA&s=10",
    description: "Golden pan-fried bread slices dipped in sweet egg batter, served with syrup.",
    allergens: ["Gluten", "Egg", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 340, protein_g: 10, carbs_g: 44, fat_g: 14 },
  },
  {
    cat: "Breakfast",
    name: "Pancakes with Honey",
    price: 130.0,
    tags: ["V"],
    period: ["breakfast"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSAGhytspVsyOimVwVSzO6UvlVttGkq3jSEdIhJCttwwQ&s=10",
    description: "Fluffy pancakes drizzled with honey and a pat of butter.",
    allergens: ["Gluten", "Egg", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 420, protein_g: 8, carbs_g: 62, fat_g: 16 },
  },
  {
    cat: "Breakfast",
    name: "Chicken Sausage & Egg",
    price: 140.0,
    tags: ["H"],
    period: ["breakfast"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTG_6t0Wc0YNJO83ft-ledss-3yvP6IZ5CiosqwNnjMFbTGrmtCTcqq45oc&s=10",
    description: "Grilled chicken sausages served with a fried egg and toast.",
    allergens: ["Egg", "Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 390, protein_g: 20, carbs_g: 22, fat_g: 24 },
  },
  {
    cat: "Breakfast",
    name: "Aloo Paratha",
    price: 50.0,
    tags: ["V"],
    period: ["breakfast"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDNglkDMgFuUR98kd4vbb3xTNlLGVJIRWYq7lr6SkeLA&s=10",
    description: "Fresh potato-stuffed paratha served hot with chutney. A student favorite.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 320, protein_g: 6, carbs_g: 42, fat_g: 14 },
  },
  {
    cat: "Breakfast",
    name: "Egg Paratha (Anda Paratha)",
    price: 70.0,
    tags: ["H"],
    period: ["breakfast"],
    image: "https://i.ytimg.com/vi/Xz31ahbF9FA/maxresdefault.jpg",
    description: "Paratha cooked with a layer of spiced beaten egg, crispy on the outside.",
    allergens: ["Gluten", "Egg"],
    prepTimeMinutes: 5,
    nutrition: { calories: 380, protein_g: 12, carbs_g: 40, fat_g: 19 },
  },
  {
    cat: "Breakfast",
    name: "Plain Paratha",
    price: 35.0,
    tags: ["V"],
    period: ["breakfast"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4soCLfeFgu3xjniPeA_OBEJOXNmlOprmdrqPpP1cOsphMS5LZNaHmhe3L&s=10",
    description: "Simple whole wheat paratha, perfect with daal or a fried egg.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 260, protein_g: 5, carbs_g: 36, fat_g: 10 },
  },
  {
    cat: "Breakfast",
    name: "Omelette",
    price: 65.0,
    tags: ["H"],
    period: ["breakfast"],
    image: "https://www.wholesomeyum.com/wp-content/uploads/2023/08/wholesomeyum-Omelette-Recipe-7.jpg",
    description: "Classic Pakistani-style omelette with onion, tomato, and green chilies.",
    allergens: ["Egg"],
    prepTimeMinutes: 5,
    nutrition: { calories: 210, protein_g: 13, carbs_g: 4, fat_g: 16 },
  },
  {
    cat: "Breakfast",
    name: "Halwa Puri",
    price: 135.0,
    tags: ["V"],
    period: ["breakfast"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRR1lDhSXRKWNsuZyg92ASdXkKEk8LNszLkVmLD6_ZrZoTq6TuKJzjSG263&s=10",
    description: "Crispy puri served with sweet halwa and spiced chickpeas. A traditional breakfast.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 620, protein_g: 10, carbs_g: 78, fat_g: 30 },
  },
  {
    cat: "Breakfast",
    name: "Chai with Rusk",
    price: 40.0,
    tags: ["V"],
    period: ["breakfast"],
    image: "https://m.media-amazon.com/images/I/61paf8WxhJL.jpg",
    description: "Hot doodh patti chai served with crispy rusk biscuits.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 180, protein_g: 4, carbs_g: 28, fat_g: 6 },
  },
  {
    // MERGED: was duplicated as "Nihari with Naan" (Breakfast) AND
    // "Beef Nihari" (Lunch) — same dish, now a single row tagged for both.
    cat: "Curries & Roti",
    name: "Beef Nihari with Naan",
    price: 240.0,
    tags: ["H"],
    period: ["breakfast", "lunch"],
    image: "https://dinneratthefranzens.com/wp-content/uploads/2022/08/nihari1.jpg",
    description: "Slow-cooked spiced beef stew, rich and hearty, served with fresh naan.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 540, protein_g: 30, carbs_g: 44, fat_g: 28 },
  },
  {
    cat: "Breakfast",
    name: "Boiled Egg",
    price: 25.0,
    tags: ["H", "GF"],
    period: ["breakfast"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSIBPEouB7ySk98fbN7uhMakyf6XsOWar5bDVBB7mVjDAyN6ihfoKZ-GcTT&s=10",
    description: "Simple soft or hard boiled egg, a protein-packed breakfast choice.",
    allergens: ["Egg"],
    prepTimeMinutes: 5,
    nutrition: { calories: 78, protein_g: 6, carbs_g: 1, fat_g: 5 },
  },
  {
    cat: "Breakfast",
    name: "Bun Kabab",
    price: 80.0,
    tags: ["H"],
    period: ["breakfast", "lunch"],
    image: "https://www.chilitochoc.com/wp-content/uploads/2021/03/bun-kebab-2-scaled-e1615826740701.jpg",
    description: "Spiced minced meat patty served inside a soft bun with chutney.",
    allergens: ["Gluten", "Egg"],
    prepTimeMinutes: 5,
    nutrition: { calories: 340, protein_g: 15, carbs_g: 30, fat_g: 18 },
  },
  {
    cat: "Breakfast",
    name: "Chicken Shami Roll",
    price: 120.0,
    tags: ["H"],
    period: ["breakfast", "lunch"],
    image: "https://i.ytimg.com/vi/dpJmLuNPicU/hqdefault.jpg",
    description: "Spiced shami kabab wrapped in warm paratha with chutney and salad.",
    allergens: ["Gluten", "Egg"],
    prepTimeMinutes: 5,
    nutrition: { calories: 410, protein_g: 18, carbs_g: 38, fat_g: 21 },
  },

  // ---------------- FAST FOOD (former "Meals" items folded in here — ----
  // ---------------- the standalone ones become real menu items; the -----
  // ---------------- ones that were literally "base item + fries + ------
  // ---------------- drink" become COMBOS further down instead.) --------
  {
    cat: "Fast Food",
    name: "Grilled Fish",
    price: 260.0,
    tags: ["H", "GF"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRzYg69eZyn_gVHK7CJiSbtx7jGAw6TDF0CmA6Vc9Ci40bcj7JOhcWq5bE&s=10",
    description: "Grilled fish fillet served with steamed vegetables and lemon butter sauce.",
    allergens: ["Fish"],
    prepTimeMinutes: 5,
    nutrition: { calories: 480, protein_g: 34, carbs_g: 18, fat_g: 26 },
  },
  {
    cat: "Fast Food",
    name: "Falafel Wrap",
    price: 190.0,
    tags: ["V", "VE"],
    period: ["lunch", "dinner"],
    image: "https://apexnutrition.ie/wp-content/uploads/2023/06/Falafel-Wraps.jpeg",
    description: "Crispy falafel wrap with hummus and salad.",
    allergens: ["Gluten", "Sesame"],
    prepTimeMinutes: 5,
    nutrition: { calories: 440, protein_g: 12, carbs_g: 60, fat_g: 16 },
  },
  {
    cat: "Fast Food",
    name: "Grilled Chicken Steak",
    price: 290.0,
    tags: ["H", "GF"],
    period: ["lunch", "dinner"],
    image: "https://i.ytimg.com/vi/xR6rTrhiZVU/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCt81MoZcQ4edseFXPwI3Ugia2xTQ",
    description: "Grilled chicken steak with mashed potatoes and sautéed vegetables.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 620, protein_g: 40, carbs_g: 38, fat_g: 30 },
  },
  {
    // base item for the "Chicken Sandwich Combo" seeded below
    cat: "Fast Food",
    name: "Chicken Sandwich",
    price: 170.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQy3RjnvmULy5HYmQYvYyvJ8LfoPVuoWV7A5Yhci0IafQ1sbErs8vdPbBnk&s=10",
    description: "Grilled chicken sandwich with lettuce, tomato and mayo.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 420, protein_g: 20, carbs_g: 38, fat_g: 18 },
  },
  {
    cat: "Fast Food",
    name: "Veggie Wrap",
    price: 150.0,
    tags: ["V"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHkNm09owDvSqgPtZdXo3fGHwaW7Szz7pZo7h8PIuMl5gLw7M5QQ8s7b2W&s=10",
    description: "Fresh vegetable wrap with hummus and salad.",
    allergens: ["Gluten", "Sesame"],
    prepTimeMinutes: 5,
    nutrition: { calories: 340, protein_g: 8, carbs_g: 46, fat_g: 12 },
  },
  {
    cat: "Curries & Roti",
    name: "Paneer Tikka with Naan",
    price: 210.0,
    tags: ["V"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQp55Wkmd0vuQdb9N1FhAccQAdaGeKMtBTwG3Ts7IGNhjdhmMNw_qBgEpM&s=10",
    description: "Marinated paneer tikka served with naan, chutney, and salad.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 560, protein_g: 22, carbs_g: 48, fat_g: 30 },
  },
  {
    // base item for "Beef Burger Combo" seeded below (was duplicated as a
    // separate "Beef Burger Meal" item before — now it's one base item)
    cat: "Fast Food",
    name: "Beef Burger",
    price: 220.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://www.certifiedirishangus.ie/wp-content/uploads/2019/11/TheUltimateBurgerwBacon_RecipePic.jpg",
    description: "Juicy beef patty with cheese, lettuce, tomato and special sauce.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 640, protein_g: 26, carbs_g: 44, fat_g: 30 },
  },
  {
    cat: "Rice & Karahi",
    name: "Chicken Rice Bowl",
    price: 240.0,
    tags: ["H", "GF"],
    period: ["lunch", "dinner"],
    image: "https://www.afarmgirlsdabbles.com/wp-content/uploads/2022/11/honey-garlic-chicken-rice-bowls_afarmgirlsdabbles_01s.jpg",
    description: "Grilled chicken served over seasoned rice with vegetables and sauce.",
    allergens: ["Soy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 560, protein_g: 34, carbs_g: 62, fat_g: 16 },
  },

  // ---------------- RICE & KARAHI ----------------
  {
    // MERGED: "Chicken Karahi with Roti" + "Chicken Karahi" + "Chicken
    // Karahi with Naan" were three near-identical rows differing only by
    // bread. Now one dish; bread choice lives in modifiers.
    cat: "Rice & Karahi",
    name: "Chicken Karahi",
    price: 300.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkZ059-IVTBEcCf4qiq2nx6aA-PcR5Ssh-V4VUhRRfBmyvF9TanbxFY_tW&s=10",
    description: "Classic chicken karahi cooked with tomatoes, peppers and aromatic spices.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 500, protein_g: 35, carbs_g: 20, fat_g: 27 },
    modifiers: [
      { name: "Bread choice", options: ["Roti (free)", "Naan (+Rs.20)"] },
    ],
  },
  {
    cat: "Curries & Roti",
    name: "Palak Paneer with Rice",
    price: 200.0,
    tags: ["V"],
    period: ["lunch", "dinner"],
    image: "https://production-media.gousto.co.uk/cms/mood-image/912_Palak-Paneer-with-Cardamom-Rice_004_0-1684999279717.jpg",
    description: "Creamy spinach curry with paneer cubes, served over steamed rice.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 460, protein_g: 16, carbs_g: 56, fat_g: 18 },
  },
  {
    cat: "Rice & Karahi",
    name: "Daal Chawal",
    price: 175.0,
    tags: ["V", "GF"],
    period: ["lunch", "dinner"],
    image: "https://media.istockphoto.com/id/1421211681/photo/healthy-nutritious-indian-comfort-food-dal-chawal-thali-or-dal-rice-served-in-two-way-ceramic.jpg?s=612x612&w=0&k=20&c=TaR7-0unJIBPS34oKoHnDdPkHP-Y84MdxbGlwdivzgw=",
    description: "Comforting yellow lentils served with steamed rice. Budget-friendly & filling.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 420, protein_g: 16, carbs_g: 72, fat_g: 8 },
  },
  {
    cat: "Rice & Karahi",
    name: "Chicken Biryani",
    price: 240.0,
    tags: ["H", "GF"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRBjTfNdM-oVdnnZwc7r4RJs6kAEyE3jAYACoL5s9gpHf0E2XhqWHhGH6A&s=10",
    description: "Fragrant basmati rice cooked with chicken and served with cooling raita.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 620, protein_g: 28, carbs_g: 78, fat_g: 22 },
  },
  {
    cat: "Curries & Roti",
    name: "Aloo Gosht with Roti",
    price: 250.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTp5GL9b5ssuGyUnOFfh-nx5IAX0AD5dofnhM9RF1fSy66pgO8p7BhSEjjM&s=10",
    description: "Tender beef and potato curry served with fresh roti bread.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 540, protein_g: 30, carbs_g: 44, fat_g: 26 },
  },
  {
    cat: "Curries & Roti",
    name: "Sabzi with Roti",
    price: 140.0,
    tags: ["V"],
    period: ["lunch", "dinner"],
    image: "https://www.arise-app.com/images/dishes/en/indian-meal-with-roti-curry-potato-sabzi-and-guava-1ml7tz.webp",
    description: "Seasonal vegetable curry with spinach, served with roti.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 320, protein_g: 9, carbs_g: 46, fat_g: 11 },
  },
  {
    cat: "Rice & Karahi",
    name: "Chicken Pulao",
    price: 220.0,
    tags: ["H", "GF"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQTxOBajvx5b4XWes1MOzq9ys3vd5i9TOamiOBJL9_WP2mKq1tQcOH-fQ&s=10",
    description: "Mildly spiced rice cooked with tender chicken pieces and whole spices.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 560, protein_g: 26, carbs_g: 70, fat_g: 18 },
  },
  {
    cat: "Curries & Roti",
    name: "Mutton Karahi",
    price: 450.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://mommyandkitchen.com/wp-content/uploads/2023/04/shinwari-mutton-karahi-top-view-500x500.jpg",
    description: "Rich mutton karahi cooked in a tomato-based gravy with ginger and garlic.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 560, protein_g: 38, carbs_g: 12, fat_g: 38 },
  },
  {
    cat: "Rice & Karahi",
    name: "Mutton Biryani",
    price: 280.0,
    tags: ["H", "GF"],
    period: ["lunch", "dinner"],
    image: "https://kitchendiariesbyzubda.com/wp-content/uploads/2024/10/IMG_0411-min-scaled.jpeg",
    description: "Fragrant basmati rice layered with tender mutton and traditional spices.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 660, protein_g: 32, carbs_g: 76, fat_g: 26 },
  },
  {
    cat: "Rice & Karahi",
    name: "Beef Pulao",
    price: 260.0,
    tags: ["H", "GF"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQu0T20h63NbJWXkAHkDqYz7V0M9J7Uy8neKa22Bhct2Q&s=10",
    description: "Aromatic rice cooked with tender beef pieces and whole spices.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 590, protein_g: 30, carbs_g: 68, fat_g: 22 },
  },
  {
    cat: "Rice & Karahi",
    name: "Daal Chawal with Kabab",
    price: 220.0,
    tags: ["H", "GF"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSiHZWDnzib-VFgAqv17On_seIxjf8qLsYEKrr2-GXAcBQ6lzOozP-SM26q&s=10",
    description: "Upgraded daal chawal served with shami kabab and fresh salad.",
    allergens: ["Egg"],
    prepTimeMinutes: 5,
    nutrition: { calories: 560, protein_g: 24, carbs_g: 74, fat_g: 18 },
  },
  {
    cat: "Fast Food",
    name: "Chow Mein / Macaroni",
    price: 200.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXnPN2n7f1Ne7LwkIhsIz80TEXJmr0HLx_LImGjBRbo61IS9Z0Sqd42S8d&s=10",
    description: "Indo-Chinese style stir-fried egg noodles or macaroni with vegetables and meat.",
    allergens: ["Gluten", "Egg", "Soy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 480, protein_g: 18, carbs_g: 62, fat_g: 18 },
  },
  {
    cat: "Curries & Roti",
    name: "Chana Masala with Rice or Naan",
    price: 180.0,
    tags: ["V", "GF"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnXgT4_aHVgl_PLBLFIcec9qhxVvvCHpbX7RuWmaF1SoEHkECFCYruYrM&s=10",
    description: "Spiced chickpea curry served with steamed rice or fresh naan.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 440, protein_g: 15, carbs_g: 70, fat_g: 11 },
  },
  {
    cat: "Curries & Roti",
    name: "Haleem",
    price: 240.0,
    tags: ["H"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://i.ytimg.com/vi/qqF61epRQi8/sddefault.jpg",
    description: "Slow-cooked meat and lentil stew, eaten any time of day.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 480, protein_g: 26, carbs_g: 46, fat_g: 20 },
  },

  // ---------------- CURRIES & ROTI (evening-leaning, still lunch too) ----
  {
    cat: "Curries & Roti",
    name: "Achari Chicken",
    price: 280.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://stewwithsaba.com/wp-content/uploads/2024/10/IMG_9899-edited.jpg",
    description: "Chicken cooked in tangy pickle-style spices.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 390, protein_g: 28, carbs_g: 10, fat_g: 24 },
  },
  {
    cat: "Curries & Roti",
    name: "Butter Chicken with Naan",
    price: 380.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT39I_6oUraz9YoePjeuKA2fbRnZEepiw0Tu-okn_F9ypRQcTISayWiByQ&s=10",
    description: "Creamy tomato-based butter chicken served with fresh naan.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 640, protein_g: 36, carbs_g: 44, fat_g: 34 },
  },
  {
    cat: "Fast Food",
    name: "Beef Steak with Fries",
    price: 480.0,
    tags: ["H", "GF"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTvVYcJUKZm-DHybcmeEkwcyQ2a3hJufi-sthIettb-8MPQ2TAG1iUL7gM&s=10",
    description: "Grilled beef steak served with fries and pepper sauce.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 720, protein_g: 42, carbs_g: 40, fat_g: 40 },
  },
  {
    cat: "Rice & Karahi",
    name: "Vegetable Biryani",
    price: 200.0,
    tags: ["V", "GF"],
    period: ["lunch", "dinner"],
    image: "https://www.sharmispassions.com/wp-content/uploads/2022/03/VegBiryani4.jpg",
    description: "Fragrant basmati rice cooked with mixed vegetables and spices.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 480, protein_g: 10, carbs_g: 78, fat_g: 14 },
  },
  {
    cat: "Curries & Roti",
    name: "Daal Makhani with Rice",
    price: 180.0,
    tags: ["V", "GF"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtQ5xLZdj-XEOSWUAlSyu2YaZBzLSw3sCklhiuNnE_uQ&s=10",
    description: "Creamy black lentil curry made with butter and cream, served with rice.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 480, protein_g: 15, carbs_g: 64, fat_g: 18 },
  },
  {
    cat: "Fast Food",
    name: "BBQ Chicken Tikka",
    price: 400.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRT56AlKha3Cmo3ukFpf64H9c0ObNCSiPMt-8jDxm639Q&s=10",
    description: "Chargrilled chicken tikka served with mint chutney and fresh salad.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 340, protein_g: 38, carbs_g: 6, fat_g: 18 },
  },
  {
    cat: "Curries & Roti",
    name: "Mutton Qorma with Naan",
    price: 415.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://tossncook.com/wp-content/uploads/2020/06/PicsArt_05-24-04.31.52-1-968x1024.jpg",
    description: "Rich and aromatic mutton qorma served with warm naan.",
    allergens: ["Gluten", "Dairy", "Nuts"],
    prepTimeMinutes: 5,
    nutrition: { calories: 660, protein_g: 34, carbs_g: 40, fat_g: 40 },
  },
  {
    cat: "Fast Food",
    name: "Chapli Kebab with Naan",
    price: 230.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSypkaR17-HYd8nBTr_VjjntADmcfs5pdrqeLrOOkCVVlYce8Sbm5P_k_M&s=10",
    description: "Peshawari-style spiced minced beef patty, pan-fried and served with naan.",
    allergens: ["Gluten", "Egg"],
    prepTimeMinutes: 5,
    nutrition: { calories: 520, protein_g: 26, carbs_g: 38, fat_g: 30 },
  },
  {
    cat: "Fast Food",
    name: "Seekh Kebab with Naan",
    price: 250.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTp7uhjKG-0Ay3hbhCTucFFr_HS6Va0MLZd47n15Fa0mA&s=10",
    description: "Skewered minced meat kebabs, chargrilled and served with naan and chutney.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 490, protein_g: 28, carbs_g: 36, fat_g: 26 },
  },
  {
    cat: "Fast Food",
    name: "Fried Fish with Chutney",
    price: 280.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTz0P7oRE_4hGnAddtIEaYQoTxBoxIyNKS8aO9-ezFTjw&s=10",
    description: "Crispy spiced fried fish served with tangy green chutney.",
    allergens: ["Fish", "Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 420, protein_g: 30, carbs_g: 22, fat_g: 24 },
  },
  {
    cat: "Fast Food",
    name: "Malai Boti",
    price: 420.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTSS4A30DCxrt45ZMtSZPYYaeIPrFVlWygRj36_X99OpQ&s=10",
    description: "Tender chicken pieces marinated in cream and spices, chargrilled to perfection.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 380, protein_g: 36, carbs_g: 6, fat_g: 24 },
  },
  {
    cat: "Curries & Roti",
    name: "Chicken/Mutton Handi",
    price: 450.0,
    tags: ["H", "GF"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjRKs0xnaR13ZPk9smimGf5smZcpCLwubbloFsGMQq1jjIzPyFMbiVinE&s=10",
    description: "Premium single-serving meat handi served in a traditional clay pot with naan.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 600, protein_g: 38, carbs_g: 16, fat_g: 42 },
  },

  // ---------------- SNACKS ----------------
  {
    cat: "Snacks",
    name: "Aloo Chaat",
    price: 60.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQARHiNI8g8LljrsfifFb7JVmM8Wqls84-07JSX48q-OaA-WbjXUA2bseTL&s=10",
    description: "Spicy tangy potato chaat topped with chutneys.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 180, protein_g: 4, carbs_g: 30, fat_g: 6 },
  },
  {
    cat: "Snacks",
    name: "Chicken Nuggets (6 pcs)",
    price: 160.0,
    tags: ["H"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://imgs.search.brave.com/CeK4-fLzzFsxYtB2sad4ZT-I46_2vOwxP8g6C-Q1yQE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzAyLzcxLzkwLzg2/LzM2MF9GXzI3MTkw/ODY3N18zanV4Nm5l/c2V5Q2Fqcnhmb2V5/UTdZcjcwMVF5NlQ3/MC5qcGc",
    description: "Crispy breaded chicken nuggets served with dip sauce.",
    allergens: ["Gluten", "Egg"],
    prepTimeMinutes: 5,
    nutrition: { calories: 380, protein_g: 18, carbs_g: 28, fat_g: 22 },
  },
  {
    cat: "Snacks",
    name: "Vegetable Cutlet",
    price: 70.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3pEpgy5og35lhOrMKmeCBPkRr0kvrmuWugncBR1braJcpzIDoHAf7xxc&s=10",
    description: "Pan-fried mixed vegetable cutlets served with ketchup.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 230, protein_g: 5, carbs_g: 30, fat_g: 10 },
  },
  {
    cat: "Snacks",
    name: "Chicken Wings (4 pcs)",
    price: 220.0,
    tags: ["H"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://imgs.search.brave.com/zbFdOPDfCWcJb2IRVqtLVEVE13S_HT7Wj2fjY-AYVxA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/YWxscmVjaXBlcy5j/b20vdGhtYi9YRDZz/YmdyNVB3U2ppZTJK/RWVoSC10bkJHbTg9/LzE1MDB4MC9maWx0/ZXJzOm5vX3Vwc2Nh/bGUoKTptYXhfYnl0/ZXMoMTUwMDAwKTpz/dHJpcF9pY2MoKTpm/b3JtYXQod2VicCkv/QUxSLTE4NzgyMi1i/YWtlZC1jaGlja2Vu/LXdpbmdzLTR4My01/YzdiNDYyNGM4NTU0/ZjNkYTVhYWJiN2Qz/YTkxYTIwOS5qcGc",
    description: "Spicy grilled or fried chicken wings served with dip.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 420, protein_g: 26, carbs_g: 10, fat_g: 30 },
  },
  {
    cat: "Snacks",
    name: "Samosa (2 pieces)",
    price: 50.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQj3nJZiyjWw5hF2ZkqIZvJF5zycl-GP0b4qYXE9cbX8g&s=10",
    description: "Two crispy potato samosas served with tamarind and mint chutney.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 260, protein_g: 5, carbs_g: 32, fat_g: 13 },
  },
  {
    cat: "Snacks",
    name: "Spring Roll (2 pieces)",
    price: 70.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://www.cubesnjuliennes.com/wp-content/uploads/2021/01/Spring-Roll-Recipe.jpg",
    description: "Two golden fried vegetable spring rolls with sweet chili sauce.",
    allergens: ["Gluten", "Soy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 220, protein_g: 4, carbs_g: 28, fat_g: 10 },
  },
  {
    cat: "Snacks",
    name: "Pakora Plate",
    price: 100.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyo7-TZR3GwUqTgmzHX_1-1igsatEPJUJxYG_S70mk8jilR29k2cBzw2Bt&s=10",
    description: "Assorted vegetable pakoras (onion, potato, spinach) with mint chutney.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 310, protein_g: 7, carbs_g: 34, fat_g: 17 },
  },
  {
    cat: "Snacks",
    name: "French Fries",
    price: 150.0,
    tags: ["V", "VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwn16qcQVv_D668Gzq1YGyWJQUfDeXGIxj0keiKgiSww&s=10",
    description: "Crispy golden fries, lightly salted, served with ketchup.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 380, protein_g: 5, carbs_g: 50, fat_g: 18 },
  },
  {
    cat: "Snacks",
    name: "Chicken Patty",
    price: 90.0,
    tags: ["H"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaAH_GCD7TmdwFKgl0DYsbmMmLqJHd-5r18y5lEkun0gYIEiSvvaZAzxfx&s=10",
    description: "Flaky baked pastry filled with spiced minced chicken.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 300, protein_g: 9, carbs_g: 28, fat_g: 17 },
  },
  {
    cat: "Snacks",
    name: "Samosa Chaat",
    price: 100.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkw7La5Kr-Xdvr88lKOnd931ifwFHFmISwgK6HchVgjTU_QDDVKsvV_K4&s=10",
    description: "Crushed samosa topped with chaat masala, yogurt, tamarind chutney, and onions.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 340, protein_g: 8, carbs_g: 42, fat_g: 15 },
  },
  {
    cat: "Snacks",
    name: "Dahi Bhalla Chaat",
    price: 80.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJLgSxd2sZphK4DUN1XOY8YYmX9q9uETap-usdjzoL6sYUIzAxa2Y-p3kD&s=10",
    description: "Soft lentil fritters in yogurt, topped with chutney and spices.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 280, protein_g: 9, carbs_g: 34, fat_g: 11 },
  },
  {
    cat: "Snacks",
    name: "Papri Chaat",
    price: 90.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSu-G2pVupPka_JGey1nZ5VMZmL0f4tAQ1DHfoMzm474BNU8Zaf3SEbu-iO&s=10",
    description: "Crispy wafers topped with potatoes, chickpeas, yogurt, and chutney.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 320, protein_g: 8, carbs_g: 44, fat_g: 13 },
  },
  {
    cat: "Snacks",
    name: "Gol Gappay / Pani Puri",
    price: 70.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://i.ytimg.com/vi/x23Uwcluefc/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLAuqCYJ5-h3UANanUadsXotBELtvw",
    description: "Hollow crispy balls filled with spiced potatoes, served with tangy water.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 200, protein_g: 4, carbs_g: 32, fat_g: 6 },
  },

  // ---------------- FAST FOOD (rest) ----------------
  {
    cat: "Fast Food",
    name: "Chicken Shawarma",
    price: 215.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRccCJN820woj96MJA2Lrw5FGxeSlRqTjzuXNcm9EQuzRXuRm1aqr5yOGVS&s=10",
    description: "Chicken shawarma wrapped in pita with garlic sauce and fresh vegetables.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 480, protein_g: 24, carbs_g: 44, fat_g: 22 },
  },
  {
    cat: "Fast Food",
    name: "Beef Shawarma",
    price: 230.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://cookingtheglobe.com/wp-content/uploads/2016/07/beef-shawarma.jpg",
    description: "Tender beef strips in pita with garlic sauce and fresh vegetables.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 460, protein_g: 22, carbs_g: 42, fat_g: 22 },
  },
  {
    // base item for the "Double Zinger Combo" (replaces old standalone item)
    cat: "Fast Food",
    name: "Double Zinger Burger",
    price: 260.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRz4-FhZaZCdBjYzMvLa2lZP04XZGAKkJex-Rp7tcrqYw&s=10",
    description: "Double crispy chicken fillet burger with cheese and sauce.",
    allergens: ["Gluten", "Egg"],
    prepTimeMinutes: 5,
    nutrition: { calories: 820, protein_g: 34, carbs_g: 70, fat_g: 38 },
  },
  {
    cat: "Fast Food",
    name: "Beef Roll",
    price: 180.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://thefoodiebunch.sfo3.digitaloceanspaces.com/wp-content/uploads/2025/02/12122406/Beef-Paratha-Roll2.png",
    description: "Spiced beef strips rolled in warm paratha with chutney and salad.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 420, protein_g: 18, carbs_g: 38, fat_g: 20 },
  },
  {
    // base item for the "Chicken Burger Combo" seeded below
    cat: "Fast Food",
    name: "Chicken Burger",
    price: 220.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnz_G6Q3G0Nzbw0sLlIJ_dgg-OHLg6_2cZXdDkAWEVZA&s=10",
    description: "Juicy chicken burger with sauce, lettuce, and onions.",
    allergens: ["Gluten", "Egg", "Sesame"],
    prepTimeMinutes: 5,
    nutrition: { calories: 520, protein_g: 20, carbs_g: 46, fat_g: 24 },
  },
  {
    cat: "Fast Food",
    name: "Chicken Roll (Paratha Roll)",
    price: 150.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2l3T6-Om3M79M-cvxH37zbn4_eVg50MxCUcUTbJGWtw&s=10",
    description: "Spiced chicken strips rolled in a warm paratha with chutney and salad.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 440, protein_g: 20, carbs_g: 40, fat_g: 22 },
  },
  {
    cat: "Fast Food",
    name: "Club Sandwich",
    price: 320.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXbZ5De04oDSb0wvFxnALSI-DRCu-YaUmzn_z8fvM6Sk4X39KnKThRbuWL&s=10",
    description: "Triple-layered sandwich with chicken, bacon, lettuce, tomato, and mayo.",
    allergens: ["Gluten", "Egg", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 640, protein_g: 28, carbs_g: 56, fat_g: 32 },
  },
  {
    cat: "Fast Food",
    name: "Loaded Fries",
    price: 280.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-aE3QY-25Tt5Yb92by6prPs1q5UNSNGixru81jD8SMp0F3zoYKcZYsdf1&s=10",
    description: "Crispy fries topped with melted cheese, chicken chunks, and special sauces.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 720, protein_g: 22, carbs_g: 64, fat_g: 42 },
  },
  {
    cat: "Fast Food",
    name: "Mini Pizza - Chicken Tikka",
    price: 220.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://i.ytimg.com/vi/gwZQdsXV9rM/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCVga7txo27EMf1N67zFYwZNmcUTw",
    description: "Personal-sized pizza topped with spiced chicken tikka and fresh cheese.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 460, protein_g: 20, carbs_g: 48, fat_g: 20 },
  },
  {
    cat: "Fast Food",
    name: "Mini Pizza - Chicken Fajita",
    price: 220.0,
    tags: ["H"],
    period: ["lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_qVRjyZb-OQ4YBOJMNKA-gMCYnrk1NqQOy-KyLItDLJNyHMZRgeLvoCY&s=10",
    description: "Personal-sized pizza with sautéed chicken fajita strips and vegetables.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 450, protein_g: 21, carbs_g: 46, fat_g: 19 },
  },

  // ---------------- HOT BEVERAGES ----------------
  {
    cat: "Hot Beverages",
    name: "Green Tea",
    price: 50.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRFg-0PN3MjuLD8p4RJK5GiCszI9GjCb7Y91L_uCubCC7dNSmxGOmb-aLH&s=10",
    description: "Hot green tea, light and refreshing.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 5, protein_g: 0, carbs_g: 1, fat_g: 0 },
  },
  {
    cat: "Hot Beverages",
    name: "Chai (Tea)",
    price: 40.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0m5HGJl3DCHRmw657b4py5VKh3uDc6q3zzgHAoBHUzXBmU9N-EXXHJfDd&s=10",
    description: "Hot doodh patti chai - the perfect tea break companion.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 90, protein_g: 2, carbs_g: 12, fat_g: 3 },
  },
  {
    cat: "Hot Beverages",
    name: "Coffee",
    price: 80.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1OSwzuuv2_V3-rWkLoBNwKNAcfdHdY1FYps-mqYlmPEw4G1elNCDzcsU&s=10",
    description: "Hot instant or espresso-style coffee served with milk and sugar.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 110, protein_g: 3, carbs_g: 14, fat_g: 4 },
  },
  {
    cat: "Hot Beverages",
    name: "Americano",
    price: 150.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToymGBIu_usHqcQUAMtZ2qz-TAUFpje50SlVXxBCLW3si7UL9Wyc3mNAM&s=10",
    description: "Classic black coffee, bold and simple.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 10, protein_g: 0, carbs_g: 2, fat_g: 0 },
  },
  {
    cat: "Hot Beverages",
    name: "Kashmiri Chai (Pink Tea)",
    price: 60.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTT38GqgSEskxaTXyK1nRWGyKLguKAAYpGcGC7zgwrYAZPGmJS0fHDCBBI&s=10",
    description: "Aromatic pink tea brewed with spices, almonds, and cardamom.",
    allergens: ["Dairy", "Nuts"],
    prepTimeMinutes: 5,
    nutrition: { calories: 160, protein_g: 3, carbs_g: 18, fat_g: 8 },
  },
  {
    cat: "Hot Beverages",
    name: "Masala Chai",
    price: 60.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjgMFGySDaHAgnY1wvXZhXi9dYa7BYByzQaD1T_G4H_FDXNG5KOxNfmg&s=10",
    description: "Spiced tea brewed with milk, cardamom, and ginger.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 100, protein_g: 2, carbs_g: 14, fat_g: 3 },
  },

  // ---------------- COLD BEVERAGES ----------------
  {
    cat: "Cold Beverages",
    name: "Cold Coffee",
    price: 110.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://i.ytimg.com/vi/iRr7jADrwws/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLAupWv0SIF6DOvVdHh5NMn2V87Hvg",
    description: "Chilled instant or espresso-style cold coffee with milk.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 190, protein_g: 5, carbs_g: 26, fat_g: 7 },
  },
  {
    cat: "Cold Beverages",
    name: "Apple Juice",
    price: 90.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://media.istockphoto.com/id/503096289/photo/apple-juice-pouring-from-red-apples-into-a-glass.jpg?s=612x612&w=0&k=20&c=IUX6P386QI4V2641c8zYmnVl52nJMhhsCA2rUctHjqM=",
    description: "Fresh chilled apple juice.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 110, protein_g: 0, carbs_g: 26, fat_g: 0 },
  },
  {
    cat: "Cold Beverages",
    name: "Chocolate Milkshake",
    price: 150.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8zuuFnPyVpMC7X0NOQi99ZNzGZfPx9s78ga-o2T6lYrZ3CaCMXbxzZUwU&s=10",
    description: "Rich and creamy chocolate milkshake topped with chocolate syrup.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 380, protein_g: 9, carbs_g: 56, fat_g: 14 },
  },
  {
    cat: "Cold Beverages",
    name: "Iced Tea",
    price: 90.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://hips.hearstapps.com/hmg-prod/images/delish-210419-iced-tea-02-landscape-jg-1619020612.jpg?crop=0.8891666666666667xw:1xh;center,top&resize=1200:*",
    description: "Chilled lemon iced tea, perfect for a hot day.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 90, protein_g: 0, carbs_g: 22, fat_g: 0 },
  },
  {
    cat: "Cold Beverages",
    name: "Lassi (Sweet/Salty)",
    price: 100.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTUzYCgaDRy7SAVJiDsT7HAyZjj_h8JnDXQ06D5EMsCnPsdyCDf2gDfa2s&s=10",
    description: "Refreshing sweet or salty yogurt drink served chilled.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 220, protein_g: 7, carbs_g: 30, fat_g: 8 },
  },
  {
    cat: "Cold Beverages",
    name: "Cold Drink (Pepsi/7UP)",
    price: 90.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://static.vecteezy.com/system/resources/thumbnails/071/978/326/small/refreshing-cold-colorful-soft-drinks-with-ice-and-citrus-photo.jpg",
    description: "Chilled soft drink bottle or can.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 150, protein_g: 0, carbs_g: 39, fat_g: 0 },
  },
  {
    cat: "Cold Beverages",
    name: "Rooh Afza Sharbat",
    price: 70.0,
    tags: ["VE"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmi6dMFyWSyBDucE2UURLaC8O8FzRmWChl6YMSt346DfZN9nsiVKkKwRk&s=10",
    description: "Cold floral Rooh Afza sharbat served over ice - a summer favorite.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 140, protein_g: 0, carbs_g: 35, fat_g: 0 },
  },
  {
    cat: "Cold Beverages",
    name: "Water Bottle",
    price: 60.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTy6lTpS9vp_BLJgChpZXm_Z0vmebu-4LiKjFww4gOAw3APz5ye3kYKl94&s=10",
    description: "Chilled mineral water bottle.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  },
  {
    cat: "Cold Beverages",
    name: "Mango Shake",
    price: 150.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEqMwRLOA2XsRLeVL8pPp38FUvgbk1bteizN-mzJkFKX_Y6HM04zCTWF4&s=10",
    description: "Thick, creamy mango milkshake made with real mango pulp.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 320, protein_g: 8, carbs_g: 52, fat_g: 10 },
  },
  {
    cat: "Cold Beverages",
    name: "Fresh Lemonade",
    price: 70.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmLy9HNoCjMj9NdQCcZ6k3gZk8QuVby18CCyKybsL56w&s=10",
    description: "Chilled fresh-squeezed lemonade with a hint of mint.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 110, protein_g: 0, carbs_g: 28, fat_g: 0 },
  },
  {
    cat: "Cold Beverages",
    name: "Fresh Orange Juice",
    price: 120.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcReqjk1rRWiRCrXsKiWluMOXLaoh8cmCBqi8ZMatmHTNw&s=10",
    description: "Freshly squeezed orange juice, rich in vitamin C.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 130, protein_g: 2, carbs_g: 30, fat_g: 0 },
  },
  {
    cat: "Cold Beverages",
    name: "Oreo Milkshake",
    price: 160.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://saltandbaker.com/wp-content/uploads/2020/12/oreo-milkshake-recipe-500x500.jpg",
    description: "Creamy milkshake blended with Oreo cookies and milk.",
    allergens: ["Dairy", "Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 420, protein_g: 8, carbs_g: 62, fat_g: 16 },
  },
  {
    cat: "Cold Beverages",
    name: "Banana Milkshake",
    price: 140.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWyD7_4W0cOt60Bm0pckY12JujOXwknlXp1XghuAjdeBbmnlZZ1P8_Gg5v&s=10",
    description: "Thick and creamy banana milkshake made with fresh bananas.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 300, protein_g: 8, carbs_g: 48, fat_g: 9 },
  },
  {
    cat: "Cold Beverages",
    name: "Watermelon Juice",
    price: 100.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRBqxUWDm5jEObHNOzybwBltEH5NVNgd8zi-Cc_HUhkrw&s=10",
    description: "Fresh chilled watermelon juice, naturally sweet and hydrating.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 90, protein_g: 1, carbs_g: 22, fat_g: 0 },
  },
  {
    cat: "Cold Beverages",
    name: "Peach Iced Tea",
    price: 100.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://www.vegetarianventures.com/wp-content/uploads/2019/07/PeachLemonadeBlog-16-of-18.jpg",
    description: "Chilled peach-flavored iced tea.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 110, protein_g: 0, carbs_g: 27, fat_g: 0 },
  },
  {
    cat: "Cold Beverages",
    name: "Vanilla Milkshake",
    price: 140.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://flouronmyfingers.com/wp-content/uploads/2022/03/Homemade-Vanilla-Milkshake-picture.jpg",
    description: "Classic creamy vanilla milkshake.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 320, protein_g: 8, carbs_g: 46, fat_g: 11 },
  },
  {
    cat: "Cold Beverages",
    name: "Fresh Lemon Juice",
    price: 90.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtSSysVpsc0LVQ3VNow91sT9rWI7JUy2VyxIYOwyfVdTRfFx2Wiydf1wI&s=10",
    description: "Cold freshly squeezed lemon juice with a hint of mint.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 100, protein_g: 0, carbs_g: 26, fat_g: 0 },
  },
  {
    cat: "Cold Beverages",
    name: "Strawberry Milkshake",
    price: 130.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTRCVnyWgYITQ63KckuKISzoWqODrAuE75tXFQEznrdA&s=10",
    description: "Creamy strawberry milkshake topped with whipped cream.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 310, protein_g: 7, carbs_g: 46, fat_g: 11 },
  },
  {
    cat: "Cold Beverages",
    name: "Iced Coffee",
    price: 120.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://images.immediate.co.uk/production/volatile/sites/30/2021/05/Iced-Mocha-db3c51a.jpg?quality=90&resize=708,643",
    description: "Chilled coffee over ice with milk and sugar.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 170, protein_g: 4, carbs_g: 24, fat_g: 6 },
  },
  {
    cat: "Cold Beverages",
    name: "Mango Juice",
    price: 110.0,
    tags: ["VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYma1t8mliAknwV9g5D0-APizRf8HrHJnpv_j4UjJ7cgt-6CjvKy25fBU&s=10",
    description: "Sweet mango juice made with ripe mango pulp.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 160, protein_g: 1, carbs_g: 40, fat_g: 0 },
  },

  // ---------------- CONFECTIONERY ----------------
  {
    cat: "Confectionery",
    name: "Almond Chocolate Bar",
    price: 60.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLPnEgXm8Y6XwiVHSlMTdxUN7O7DVoQNfWF_DvL1gGIy2ennA7rvWehEE&s=10",
    description: "Milk chocolate bar loaded with roasted almonds.",
    allergens: ["Dairy", "Nuts"],
    prepTimeMinutes: 5,
    nutrition: { calories: 220, protein_g: 4, carbs_g: 22, fat_g: 14 },
  },
  {
    cat: "Confectionery",
    name: "Kurkure",
    price: 45.0,
    tags: ["V", "VE"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://bumper.sale/wp-content/uploads/2024/09/51-1.webp",
    description: "Crunchy spiced corn puffs, a popular snack-time favorite.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 150, protein_g: 2, carbs_g: 18, fat_g: 8 },
  },
  {
    cat: "Confectionery",
    name: "Cupcake",
    price: 65.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyicRh5Y5V6Na9kPHyhTybfSmKGpt52wd9MbVoqZ-Q_MYkdiex23FZC5dT&s=10",
    description: "Soft vanilla or chocolate cupcake with buttercream frosting.",
    allergens: ["Gluten", "Egg", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 260, protein_g: 3, carbs_g: 34, fat_g: 12 },
  },
  {
    cat: "Confectionery",
    name: "Mixed Dry Fruits Pack",
    price: 90.0,
    tags: ["V", "VE", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://static.webx.pk/files/18781/Images/dryfruits-gift-pack-18781-0-081122092605729.jpg",
    description: "Small pack of mixed almonds, cashews, and raisins.",
    allergens: ["Nuts"],
    prepTimeMinutes: 5,
    nutrition: { calories: 210, protein_g: 6, carbs_g: 14, fat_g: 15 },
  },
  {
    cat: "Confectionery",
    name: "Lays Chips",
    price: 50.0,
    tags: ["V", "VE"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-0CADirPa0cjjtk0GqkvqzU_Nf3_RMx8E0JDtU91s8e4pvHN1b_dHf2E&s=10",
    description: "Popular crispy potato chips available in Classic Salted, Masala, and other flavors.",
    allergens: [],
    prepTimeMinutes: 5,
    nutrition: { calories: 160, protein_g: 2, carbs_g: 15, fat_g: 10 },
  },
  {
    cat: "Confectionery",
    name: "Assorted Biscuits/Wafers",
    price: 40.0,
    tags: ["V", "VE"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTTpNEC6X9_33BdcVBrbktlGGiEUefyfazeDmE0G9sE84Eb9tVVPPhDFICC&s=10",
    description: "Mixed packet of tea-time biscuits and wafers.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 140, protein_g: 2, carbs_g: 20, fat_g: 6 },
  },
  {
    cat: "Confectionery",
    name: "Chocolate Bar",
    price: 60.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTacBE4fDpSaZqEG_TXBlmf8zXB0hQDrRVpJt9_KkR9_UbaV6FiiKE7Pfq_&s=10",
    description: "Dairy Milk or similar chocolate bar - sweet indulgence.",
    allergens: ["Dairy", "Nuts"],
    prepTimeMinutes: 5,
    nutrition: { calories: 230, protein_g: 3, carbs_g: 25, fat_g: 13 },
  },
  {
    cat: "Confectionery",
    name: "Assorted Candies/Toffees",
    price: 45.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSIQiY8Uj44_kl064Y2EftGLXYrA6dvLO2ezh-ZrdSKnUE9pNA54rbpVeca&s=10",
    description: "Mix of colorful candies and toffees - perfect for a quick sweet treat.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 120, protein_g: 0, carbs_g: 26, fat_g: 2 },
  },
  {
    cat: "Confectionery",
    name: "Slice Cake",
    price: 55.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlW64ZgC4yATaw32NtuO3kVYMIFuUyeFm3x2nYecbP2OtLJ2sIW2qmGQc&s=10",
    description: "Single slice of chocolate or vanilla sponge cake.",
    allergens: ["Gluten", "Egg", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 280, protein_g: 4, carbs_g: 38, fat_g: 13 },
  },
  {
    cat: "Confectionery",
    name: "Brownie",
    price: 75.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQlkBV5h0EjtXJkP5Dahcqd49FgK0k8UA-bvH8m3p5fN-ngu3t8egEkgEc&s=10",
    description: "Rich, fudgy chocolate brownie - a dessert lover's favorite.",
    allergens: ["Gluten", "Egg", "Dairy", "Nuts"],
    prepTimeMinutes: 5,
    nutrition: { calories: 340, protein_g: 5, carbs_g: 42, fat_g: 18 },
  },

  // ---------------- DESSERTS ----------------
  {
    cat: "Desserts",
    name: "Apple Pie",
    price: 180.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://www.southernliving.com/thmb/bbDY1d_ySIrCFcq8WNBkR-3x6pU=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/2589601_Mailb_Mailbox_Apple_Pie_003-da802ff7a8984b2fa9aa0535997ab246.jpg",
    description: "Warm baked apple pie slice with cinnamon.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 310, protein_g: 4, carbs_g: 45, fat_g: 14 },
  },
  {
    cat: "Desserts",
    name: "Chocolate Mousse",
    price: 130.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://www.allrecipes.com/thmb/2wgE9MHJZzfRAHhlqzUXmsf2zUw=/0x512/filters:no_upscale():max_bytes(150000):strip_icc()/IMG_8145_Chocolate-Mousse-for-Beginners-4x3-cropped-757ae43035ff48cc8bc9ccffbd6cf3b7.jpg",
    description: "Light and airy chocolate mousse topped with chocolate shavings.",
    allergens: ["Egg", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 300, protein_g: 5, carbs_g: 28, fat_g: 19 },
  },
  {
    cat: "Desserts",
    name: "Fruit Custard",
    price: 100.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://www.blendwithspices.com/wp-content/uploads/2016/02/fruit-custard-recipe.jpg",
    description: "Chilled creamy custard mixed with seasonal fresh fruits.",
    allergens: ["Dairy", "Egg"],
    prepTimeMinutes: 5,
    nutrition: { calories: 230, protein_g: 5, carbs_g: 36, fat_g: 7 },
  },
  {
    cat: "Desserts",
    name: "Cheesecake Slice",
    price: 150.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRztWNGRaonhOfb6x7MRLI3HWyf2SnLCJ7YQS6QZ1FUEwr1RRfE_GQVTto&s=10",
    description: "Rich and creamy baked cheesecake slice with a biscuit base.",
    allergens: ["Gluten", "Dairy", "Egg"],
    prepTimeMinutes: 5,
    nutrition: { calories: 380, protein_g: 6, carbs_g: 32, fat_g: 26 },
  },
  {
    cat: "Desserts",
    name: "Gulab Jamun",
    price: 80.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThJC-droXtclRWi9a8Kw84tZvXQcB7gHdz93-7LmWnaV1pRAKOAY2pKLg&s=10",
    description: "Soft milk-solid dumplings soaked in fragrant rose syrup.",
    allergens: ["Gluten", "Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 300, protein_g: 5, carbs_g: 46, fat_g: 11 },
  },
  {
    cat: "Desserts",
    name: "Kheer",
    price: 100.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFAldIv1h742VcZ_pMwQmYLsf4KoZTe9LT--IHnQKgW825LeHqR6DqNgge&s=10",
    description: "Creamy rice pudding flavored with cardamom, almonds, and raisins.",
    allergens: ["Dairy", "Nuts"],
    prepTimeMinutes: 5,
    nutrition: { calories: 260, protein_g: 6, carbs_g: 40, fat_g: 9 },
  },
  {
    cat: "Desserts",
    name: "Ice Cream",
    price: 90.0,
    tags: ["V", "GF"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFmOPb64RkmmkmCKi6wU5cokVWSoRARhaw0zztZX_z69wfoGhoatNZeTtw&s=10",
    description: "Creamy ice cream scoops available in vanilla, chocolate, and strawberry flavors.",
    allergens: ["Dairy"],
    prepTimeMinutes: 5,
    nutrition: { calories: 210, protein_g: 4, carbs_g: 26, fat_g: 11 },
  },
  {
    cat: "Desserts",
    name: "Jalebi",
    price: 60.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyJDvBDr2a6zVgkHpwSmeOHGmh0fouXIjYmIzhK9w0yP0vyKOmZr0hOWzM&s=10",
    description: "Crispy pretzel-shaped sweet soaked in sugar syrup - an iconic treat.",
    allergens: ["Gluten"],
    prepTimeMinutes: 5,
    nutrition: { calories: 280, protein_g: 2, carbs_g: 52, fat_g: 8 },
  },
  {
    cat: "Desserts",
    name: "Ras Malai",
    price: 120.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR7ocD3Ml4AnzEmWstqL7YUqYqCSvm1vF9DQRNgrd90YhAbRfjespSJOSVS&s=10",
    description: "Soft cheese dumplings in a creamy, saffron-flavored milk base.",
    allergens: ["Dairy", "Nuts"],
    prepTimeMinutes: 5,
    nutrition: { calories: 260, protein_g: 8, carbs_g: 34, fat_g: 10 },
  },
  {
    cat: "Desserts",
    name: "Kulfi",
    price: 110.0,
    tags: ["V"],
    period: ["breakfast", "lunch", "dinner"],
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTabaJszMyoOnFXbQivxFbbwN75obIWFAWkAr_NAIoqKqJlg0JCruUq0Gg&s=10",
    description: "Traditional frozen ice cream stick flavored with cardamom and pistachio.",
    allergens: ["Dairy", "Nuts"],
    prepTimeMinutes: 5,
    nutrition: { calories: 230, protein_g: 5, carbs_g: 24, fat_g: 13 },
  },
];

// ---------------------------------------------------------------------------
// COMBOS — real bundle deals. discount_type: 'fixed_price' sets a flat total
// for the whole bundle; 'percent_off' takes X% off the sum of item prices.
// swap_group lets a slot be filled by ANY item sharing that group (e.g. the
// student can pick any cold drink) instead of one hardcoded item.
// ---------------------------------------------------------------------------
const combos = [
  {
    name: "Beef Burger Combo",
    description: "Beef Burger + French Fries + any Cold Drink, at a bundled price.",
    image: "https://www.certifiedirishangus.ie/wp-content/uploads/2019/11/TheUltimateBurgerwBacon_RecipePic.jpg",
    discount_type: "fixed_price",
    discount_value: 400.0, // vs ~460 à la carte (220 + 150 + 90)
    items: [
      { item: "Beef Burger", quantity: 1 },
      { item: "French Fries", quantity: 1 },
      { swap_group: "cold_drink", quantity: 1 },
    ],
  },
  {
    name: "Chicken Burger Combo",
    description: "Chicken Burger + French Fries + any Cold Drink, at a bundled price.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnz_G6Q3G0Nzbw0sLlIJ_dgg-OHLg6_2cZXdDkAWEVZA&s=10",
    discount_type: "fixed_price",
    discount_value: 400.0, // vs ~460 à la carte (220 + 150 + 90)
    items: [
      { item: "Chicken Burger", quantity: 1 },
      { item: "French Fries", quantity: 1 },
      { swap_group: "cold_drink", quantity: 1 },
    ],
  },
  {
    name: "Double Zinger Combo",
    description: "Double Zinger Burger + French Fries + any Cold Drink, at a bundled price.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRz4-FhZaZCdBjYzMvLa2lZP04XZGAKkJex-Rp7tcrqYw&s=10",
    discount_type: "fixed_price",
    discount_value: 450.0, // vs ~500 à la carte (260 + 150 + 90)
    items: [
      { item: "Double Zinger Burger", quantity: 1 },
      { item: "French Fries", quantity: 1 },
      { swap_group: "cold_drink", quantity: 1 },
    ],
  },
  {
    name: "Chicken Sandwich Combo",
    description: "Chicken Sandwich + French Fries + any Cold Drink, at a bundled price.",
    image: "https://www.eatingwell.com/thmb/s3AWSL6ExvQzQmh5l_a931lYBtc=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Avocado-Tomato-Chicken-Sandwich-1x1-4686_preview_maxWidth_4000_maxHeight_4000_ppi_300_quality_100-af42b0d8afce4c63ab17edfdfbf9eeb9.jpg",
    discount_type: "fixed_price",
    discount_value: 360.0, // vs ~410 à la carte (170 + 150 + 90)
    items: [
      { item: "Chicken Sandwich", quantity: 1 },
      { item: "French Fries", quantity: 1 },
      { swap_group: "cold_drink", quantity: 1 },
    ],
  },
  {
    name: "Chai + Rusk Discount",
    description: "10% off when you order Chai (Tea) together with Assorted Biscuits/Wafers.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0m5HGJl3DCHRmw657b4py5VKh3uDc6q3zzgHAoBHUzXBmU9N-EXXHJfDd&s=10",
    discount_type: "percent_off",
    discount_value: 10,
    items: [
      { item: "Chai (Tea)", quantity: 1 },
      { item: "Assorted Biscuits/Wafers", quantity: 1 },
    ],
  },
  {
    name: "Samosa + Chai Combo",
    description: "Samosa (2 pieces) + Chai (Tea) bundled at a flat student-friendly price.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQj3nJZiyjWw5hF2ZkqIZvJF5zycl-GP0b4qYXE9cbX8g&s=10",
    discount_type: "fixed_price",
    discount_value: 80.0, // vs 90 à la carte (50 + 40)
    items: [
      { item: "Samosa (2 pieces)", quantity: 1 },
      { item: "Chai (Tea)", quantity: 1 },
    ],
  },
];

// Which menu items count as "any cold drink" for swap_group combo slots.
// Cashier UI: when it sees a combo_items row with swap_group set, it should
// let the user pick from menu_items where category = 'Cold Beverages'
// (or you can hardcode a specific list here if you want a smaller subset).
const SWAP_GROUP_CATEGORY = {
  cold_drink: "Cold Beverages",
};

async function seedMenu(client) {
  await client.query("BEGIN");

  const categoryIds = {};
  for (const cat of categories) {
    const result = await client.query(
      `INSERT INTO categories (name, icon, display_order)
   VALUES ($1::varchar, $2, $3)
   ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon, display_order = EXCLUDED.display_order
   RETURNING id`,
      [cat.name, cat.icon, cat.order],
    );
    categoryIds[cat.name] = result.rows[0].id;
  }

  // Deactivate any leftover categories from the old scheme (Meals, Lunch,
  // Dinner, Beverages) instead of hard-deleting — keeps historical order
  // references intact if any exist.
  const oldCategoryNames = ["Meals", "Lunch", "Dinner", "Beverages"];
  await client.query(
    `UPDATE categories SET is_active = false WHERE name = ANY($1::text[])`,
    [oldCategoryNames],
  );

  // Only delete menu items NOT referenced by any past order (safe delete —
  // won't break order history / foreign key constraints)
  await client.query(`
    DELETE FROM menu_items
    WHERE id NOT IN (
      SELECT DISTINCT menu_item_id FROM order_items WHERE menu_item_id IS NOT NULL
    )
  `);
  console.log("Cleared unused old menu items.");

  const menuItemIds = {}; // name -> id, used for combo_items lookup below

  for (const item of menuItems) {
    const result = await client.query(
      `INSERT INTO menu_items
        (category_id, name, price, image_url, dietary_tags, modifiers, is_available, description, allergens, prep_time_minutes, nutritional_info, meal_period)
   VALUES
        ($1::uuid, $2, $3::numeric, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
   ON CONFLICT (category_id, name) DO UPDATE SET
     price = EXCLUDED.price,
     image_url = EXCLUDED.image_url,
     dietary_tags = EXCLUDED.dietary_tags,
     modifiers = EXCLUDED.modifiers,
     is_available = EXCLUDED.is_available,
     description = EXCLUDED.description,
     allergens = EXCLUDED.allergens,
     prep_time_minutes = EXCLUDED.prep_time_minutes,
     nutritional_info = EXCLUDED.nutritional_info,
     meal_period = EXCLUDED.meal_period
   RETURNING id`,
      [
        categoryIds[item.cat],
        item.name,
        item.price,
        item.image,
        item.tags,
        JSON.stringify(item.modifiers || []),
        item.available !== false,
        item.description,
        item.allergens,
        item.prepTimeMinutes ?? 5,
        JSON.stringify(item.nutrition),
        item.period,
      ],
    );
    menuItemIds[item.name] = result.rows[0].id;
  }

  console.log(
    `Menu items seeded successfully. Seeded ${menuItems.length} items across ${categories.length} categories.`,
  );

  // --------------------- COMBOS ---------------------
  // Clear old combo_items first (child rows) then combos, so re-running
  // seed.js doesn't leave stale bundle definitions behind.
  await client.query(`DELETE FROM combo_items`);
  await client.query(`DELETE FROM combos`);

  for (const combo of combos) {
    const comboResult = await client.query(
      `INSERT INTO combos (name, description, image_url, discount_type, discount_value)
       VALUES ($1, $2, $3, $4, $5::numeric)
       RETURNING id`,
      [combo.name, combo.description, combo.image, combo.discount_type, combo.discount_value],
    );
    const comboId = comboResult.rows[0].id;

    for (const line of combo.items) {
      if (line.swap_group) {
        // swappable slot: not tied to one menu_item_id, just marks the
        // group. Cashier UI resolves the allowed choices via
        // SWAP_GROUP_CATEGORY at order time (or you can pick any single
        // representative item here as a "default" — using the cheapest
        // cold drink so the row still satisfies the NOT NULL FK if you
        // choose to make menu_item_id required).
        const categoryName = SWAP_GROUP_CATEGORY[line.swap_group];
        const defaultDrink = menuItems.find((m) => m.cat === categoryName);
        await client.query(
          `INSERT INTO combo_items (combo_id, menu_item_id, quantity, is_swappable, swap_group)
           VALUES ($1, $2, $3, true, $4)`,
          [comboId, menuItemIds[defaultDrink.name], line.quantity, line.swap_group],
        );
      } else {
        const menuItemId = menuItemIds[line.item];
        if (!menuItemId) {
          console.warn(`Combo "${combo.name}": menu item "${line.item}" not found, skipping.`);
          continue;
        }
        await client.query(
          `INSERT INTO combo_items (combo_id, menu_item_id, quantity, is_swappable)
           VALUES ($1, $2, $3, false)`,
          [comboId, menuItemId, line.quantity],
        );
      }
    }
  }

  console.log(`Combo seed completed. Seeded ${combos.length} combos.`);

  await client.query("COMMIT");
  console.log("Menu + combo seed completed successfully.");
}

seed();

