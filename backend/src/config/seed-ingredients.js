import pool from "./db.js";

const ingredientRecords = [
  // ---------------- Grains/Staples ----------------
  {
    ingredient_name: "Basmati rice",
    unit: "kg",
    low_stock_threshold: 20,
  },
  {
    ingredient_name: "Rice (general)",
    unit: "kg",
    low_stock_threshold: 15,
  },
  {
    ingredient_name: "Yellow lentils (daal)",
    unit: "kg",
    low_stock_threshold: 10,
  },
  {
    ingredient_name: "Black lentils (urad)",
    unit: "kg",
    low_stock_threshold: 8,
  },
  {
    ingredient_name: "Chickpeas (chana)",
    unit: "kg",
    low_stock_threshold: 8,
  },
  {
    ingredient_name: "Potatoes",
    unit: "kg",
    low_stock_threshold: 25,
  },
  {
    ingredient_name: "Whole wheat flour (atta)",
    unit: "kg",
    low_stock_threshold: 10,
  },
  {
    ingredient_name: "Bread (toast slices)",
    unit: "pcs",
    low_stock_threshold: 120,
  },
  {
    ingredient_name: "Rusk biscuits",
    unit: "pcs",
    low_stock_threshold: 200,
  },
  {
    ingredient_name: "Paratha sheets",
    unit: "pcs",
    low_stock_threshold: 100,
  },
  {
    ingredient_name: "Naan bread",
    unit: "pcs",
    low_stock_threshold: 80,
  },
  {
    ingredient_name: "Roti",
    unit: "pcs",
    low_stock_threshold: 120,
  },
  {
    ingredient_name: "Pita bread",
    unit: "pcs",
    low_stock_threshold: 60,
  },
  {
    ingredient_name: "Macaroni / noodles",
    unit: "kg",
    low_stock_threshold: 8,
  },
  {
    ingredient_name: "French fries potatoes",
    unit: "kg",
    low_stock_threshold: 20,
  },

  // ---------------- Proteins ----------------
  {
    ingredient_name: "Chicken",
    unit: "kg",
    low_stock_threshold: 12,
  },
  {
    ingredient_name: "Beef",
    unit: "kg",
    low_stock_threshold: 10,
  },
  {
    ingredient_name: "Mutton",
    unit: "kg",
    low_stock_threshold: 8,
  },
  {
    ingredient_name: "Fish fillet",
    unit: "kg",
    low_stock_threshold: 6,
  },
  {
    ingredient_name: "Eggs",
    unit: "pcs",
    low_stock_threshold: 120,
  },
  {
    ingredient_name: "Yogurt / curd",
    unit: "L",
    low_stock_threshold: 10,
  },
  {
    ingredient_name: "Paneer",
    unit: "kg",
    low_stock_threshold: 6,
  },
  {
    ingredient_name: "Milk",
    unit: "L",
    low_stock_threshold: 15,
  },
  {
    ingredient_name: "Cheese",
    unit: "kg",
    low_stock_threshold: 4,
  },

  // ---------------- Dairy ----------------
  {
    ingredient_name: "Butter",
    unit: "kg",
    low_stock_threshold: 2,
  },
  {
    ingredient_name: "Cream",
    unit: "L",
    low_stock_threshold: 3,
  },

  // ---------------- Vegetables/Produce ----------------
  {
    ingredient_name: "Onions",
    unit: "kg",
    low_stock_threshold: 12,
  },
  {
    ingredient_name: "Tomatoes",
    unit: "kg",
    low_stock_threshold: 12,
  },
  {
    ingredient_name: "Spinach (palak)",
    unit: "kg",
    low_stock_threshold: 5,
  },
  {
    ingredient_name: "Bell peppers",
    unit: "kg",
    low_stock_threshold: 6,
  },
  {
    ingredient_name: "Garlic",
    unit: "kg",
    low_stock_threshold: 1.5,
  },
  {
    ingredient_name: "Ginger",
    unit: "kg",
    low_stock_threshold: 1.5,
  },
  {
    ingredient_name: "Green chilies",
    unit: "kg",
    low_stock_threshold: 1.5,
  },
  {
    ingredient_name: "Lettuce",
    unit: "kg",
    low_stock_threshold: 4,
  },
  {
    ingredient_name: "Cucumber / salad greens",
    unit: "kg",
    low_stock_threshold: 8,
  },
  {
    ingredient_name: "Lemons",
    unit: "pcs",
    low_stock_threshold: 80,
  },
  {
    ingredient_name: "Mango pulp",
    unit: "kg",
    low_stock_threshold: 8,
  },
  {
    ingredient_name: "Apples",
    unit: "kg",
    low_stock_threshold: 10,
  },
  {
    ingredient_name: "Orange juice oranges",
    unit: "kg",
    low_stock_threshold: 10,
  },
  {
    ingredient_name: "Watermelon",
    unit: "kg",
    low_stock_threshold: 15,
  },
  {
    ingredient_name: "Strawberries",
    unit: "kg",
    low_stock_threshold: 5,
  },
  {
    ingredient_name: "Peaches",
    unit: "kg",
    low_stock_threshold: 5,
  },

  // ---------------- Spices & Condiments ----------------
  {
    ingredient_name: "Cooking oil",
    unit: "L",
    low_stock_threshold: 25,
  },
  {
    ingredient_name: "Ghee (clarified butter)",
    unit: "kg",
    low_stock_threshold: 3,
  },
  {
    ingredient_name: "Salt",
    unit: "kg",
    low_stock_threshold: 5,
  },
  {
    ingredient_name: "Black pepper",
    unit: "g",
    low_stock_threshold: 300,
  },
  {
    ingredient_name: "Cumin",
    unit: "g",
    low_stock_threshold: 250,
  },
  {
    ingredient_name: "Coriander powder",
    unit: "g",
    low_stock_threshold: 300,
  },
  {
    ingredient_name: "Turmeric",
    unit: "g",
    low_stock_threshold: 200,
  },
  {
    ingredient_name: "Red chili powder",
    unit: "g",
    low_stock_threshold: 250,
  },
  {
    ingredient_name: "Garam masala",
    unit: "g",
    low_stock_threshold: 200,
  },
  {
    ingredient_name: "Achari / pickle masala",
    unit: "g",
    low_stock_threshold: 150,
  },
  {
    ingredient_name: "Chaat masala",
    unit: "g",
    low_stock_threshold: 200,
  },
  {
    ingredient_name: "Tamarind",
    unit: "kg",
    low_stock_threshold: 3,
  },
  {
    ingredient_name: "Mint",
    unit: "kg",
    low_stock_threshold: 4,
  },
  {
    ingredient_name: "Tomato ketchup",
    unit: "L",
    low_stock_threshold: 8,
  },
  {
    ingredient_name: "Mayonnaise",
    unit: "L",
    low_stock_threshold: 4,
  },
  {
    ingredient_name: "Sugar",
    unit: "kg",
    low_stock_threshold: 20,
  },
  {
    ingredient_name: "Honey",
    unit: "kg",
    low_stock_threshold: 3,
  },
  {
    ingredient_name: "Tea (loose) / chai masala base",
    unit: "pcs",
    low_stock_threshold: 600,
  },
  {
    ingredient_name: "Cardamom",
    unit: "g",
    low_stock_threshold: 200,
  },
  {
    ingredient_name: "Cinnamon",
    unit: "g",
    low_stock_threshold: 200,
  },

  // ---------------- Bakery/Bread ----------------
  {
    ingredient_name: "Biscuits / wafers",
    unit: "pcs",
    low_stock_threshold: 250,
  },

  // ---------------- Beverage base ----------------
  {
    ingredient_name: "Coffee (grounds/instant)",
    unit: "kg",
    low_stock_threshold: 3,
  },
  {
    ingredient_name: "Cold drink syrup/base",
    unit: "L",
    low_stock_threshold: 15,
  },
  {
    ingredient_name: "Rooh Afza syrup/base",
    unit: "L",
    low_stock_threshold: 4,
  },

  // ---------------- Dessert base ----------------
  {
    ingredient_name: "Chocolate (bars/chunks)",
    unit: "kg",
    low_stock_threshold: 2,
  },
  {
    ingredient_name: "Cocoa powder",
    unit: "g",
    low_stock_threshold: 400,
  },
  {
    ingredient_name: "Chocolate syrup",
    unit: "L",
    low_stock_threshold: 4,
  },
  {
    ingredient_name: "Almonds",
    unit: "kg",
    low_stock_threshold: 2,
  },
  {
    ingredient_name: "Rose syrup",
    unit: "L",
    low_stock_threshold: 2,
  },
  {
    ingredient_name: "Corn flour / starch (binding)",
    unit: "kg",
    low_stock_threshold: 1,
  },
];

async function seedIngredients() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const ing of ingredientRecords) {
      await client.query(
        `INSERT INTO inventory (ingredient_name, current_stock, unit, low_stock_threshold)
         VALUES ($1::varchar, 0, $2::varchar, $3::numeric)
         ON CONFLICT (ingredient_name) DO UPDATE SET
           unit = EXCLUDED.unit,
           low_stock_threshold = EXCLUDED.low_stock_threshold`,
        [ing.ingredient_name, ing.unit, ing.low_stock_threshold],
      );
    }

    await client.query("COMMIT");
    console.log(
      `Ingredient seed completed. Seeded/updated ${ingredientRecords.length} ingredients in inventory.`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Ingredient seed failed:", err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedIngredients();

