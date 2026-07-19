import pool from "./db.js";

// Run once against your existing database:
//   node src/config/migrate-fastfood.js
// (or add "migrate:fastfood": "node src/config/migrate-fastfood.js" to package.json scripts)

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ---------------------------------------------------------
    // STEP 1 — Rename "Confectionery & Snacks Counter" -> "Confectionery"
    // ---------------------------------------------------------
    const renameResult = await client.query(
      `UPDATE categories SET name = $1 WHERE name = $2 RETURNING id`,
      ["Confectionery", "Confectionery & Snacks Counter"],
    );
    if (renameResult.rowCount > 0) {
      console.log(
        "Category renamed: 'Confectionery & Snacks Counter' -> 'Confectionery'",
      );
    } else {
      console.log(
        "Rename skipped (category already renamed, or not found).",
      );
    }

    // ---------------------------------------------------------
    // STEP 2 — Create "Fast Food" category if it doesn't exist
    // ---------------------------------------------------------
    let fastFoodId;
    const existingFastFood = await client.query(
      `SELECT id FROM categories WHERE name = $1`,
      ["Fast Food"],
    );

    if (existingFastFood.rowCount === 0) {
      const inserted = await client.query(
        `INSERT INTO categories (name, icon, display_order)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ["Fast Food", "burger", 4],
      );
      fastFoodId = inserted.rows[0].id;
      console.log("Fast Food category created.");
    } else {
      fastFoodId = existingFastFood.rows[0].id;
      console.log("Fast Food category already exists — reusing it.");
    }

    // ---------------------------------------------------------
    // STEP 3 — Fix display_order for ALL categories
    // ---------------------------------------------------------
    const orderMap = {
      Breakfast: 1,
      Meals: 2,
      Lunch: 3,
      "Fast Food": 4,
      Dinner: 5,
      Snacks: 6,
      Beverages: 7,
      Desserts: 8,
      Confectionery: 9,
    };

    for (const [name, order] of Object.entries(orderMap)) {
      await client.query(
        `UPDATE categories SET display_order = $1 WHERE name = $2`,
        [order, name],
      );
    }
    console.log("Category display order updated for all categories.");

    // ---------------------------------------------------------
    // STEP 4 — Move fast-food-style items OUT of Snacks INTO Fast Food
    // ---------------------------------------------------------
    const snacksResult = await client.query(
      `SELECT id FROM categories WHERE name = $1`,
      ["Snacks"],
    );

    if (snacksResult.rowCount === 0) {
      console.log("Snacks category not found — skipping item move step.");
    } else {
      const snacksId = snacksResult.rows[0].id;

      // Only items that actually exist under Snacks in your seed data
      const itemsToMove = [
        "Chicken Burger",
        "Chicken Shawarma",
        "Chicken Roll (Paratha Roll)",
        "Club Sandwich",
        "Zinger Burger Combo",
        "Mini Pizza - Chicken Tikka",
        "Mini Pizza - Chicken Fajita",
        "Loaded Fries",
      ];

      const moveResult = await client.query(
        `UPDATE menu_items
         SET category_id = $1
         WHERE name = ANY($2::text[])
           AND category_id = $3
         RETURNING id, name`,
        [fastFoodId, itemsToMove, snacksId],
      );

      console.log(`${moveResult.rowCount} item(s) moved to Fast Food:`);
      moveResult.rows.forEach((r) => console.log(`   - ${r.name}`));
    }

    await client.query("COMMIT");
    console.log("Migration completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();