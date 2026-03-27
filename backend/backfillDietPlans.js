import "dotenv/config";
import { prisma } from "./src/db/config.js";

const MEAL_TIME_ALIASES = {
  "early morning": "EARLY_MORNING",
  breakfast: "BREAKFAST",
  "mid morning": "MID_MORNING",
  lunch: "LUNCH",
  evening: "EVENING",
  dinner: "DINNER",
};

const normalizeMealTime = (value = "") => {
  const normalized = String(value).trim().toLowerCase().replace(/[_-]+/g, " ");
  return MEAL_TIME_ALIASES[normalized] || "OTHER";
};

const parseDietChart = (dietChartValue) => {
  if (!dietChartValue) return [];

  let dietChart = dietChartValue;
  if (typeof dietChartValue === "string") {
    try {
      dietChart = JSON.parse(dietChartValue);
    } catch {
      dietChart = { items: [dietChartValue] };
    }
  }

  if (Array.isArray(dietChart)) {
    dietChart = { items: dietChart };
  }

  if (typeof dietChart !== "object" || dietChart === null) {
    return [];
  }

  const items = [];

  const addFoodLine = (line, isAvoid = false, fallbackMealTime = "OTHER") => {
    if (line == null) return;

    if (typeof line === "object" && !Array.isArray(line)) {
      const mealTime = normalizeMealTime(line.mealTime || line.meal || fallbackMealTime);
      const name = String(line.itemName || line.item || line.food || line.name || "").trim();
      const notes = line.notes ? String(line.notes) : null;
      const avoid = typeof line.isAvoid === "boolean" ? line.isAvoid : isAvoid;
      if (name) {
        items.push({ mealTime, itemName: name, notes, isAvoid: avoid });
      }
      return;
    }

    const raw = String(line).trim();
    if (!raw) return;

    let mealTime = fallbackMealTime;
    let foodsText = raw;
    const splitIndex = raw.indexOf(":");

    if (splitIndex >= 0) {
      const mealLabel = raw.slice(0, splitIndex).trim();
      foodsText = raw.slice(splitIndex + 1).trim();
      mealTime = normalizeMealTime(mealLabel);
    }

    const foods = foodsText
      .split(",")
      .map((food) => food.trim())
      .filter(Boolean);

    if (foods.length === 0 && foodsText) {
      foods.push(foodsText);
    }

    for (const itemName of foods) {
      items.push({
        mealTime,
        itemName,
        notes: null,
        isAvoid,
      });
    }
  };

  const addCollection = (collection, isAvoid = false, fallbackMealTime = "OTHER") => {
    if (!collection) return;
    if (Array.isArray(collection)) {
      for (const line of collection) addFoodLine(line, isAvoid, fallbackMealTime);
      return;
    }
    addFoodLine(collection, isAvoid, fallbackMealTime);
  };

  addCollection(dietChart.items, false, "OTHER");
  addCollection(dietChart.pathya, false, "OTHER");
  addCollection(dietChart.recommended, false, "OTHER");
  addCollection(dietChart.apathya, true, "OTHER");
  addCollection(dietChart.avoid, true, "OTHER");

  // Fallback for shape like { breakfast: [...], lunch: [...], notes: ... }
  for (const [key, value] of Object.entries(dietChart)) {
    if (["items", "pathya", "recommended", "apathya", "avoid", "notes"].includes(key)) {
      continue;
    }

    const mealTime = normalizeMealTime(key);
    if (mealTime === "OTHER") continue;

    if (Array.isArray(value)) {
      for (const line of value) addFoodLine(line, false, mealTime);
    } else {
      addFoodLine(value, false, mealTime);
    }
  }

  const deduped = new Map();
  for (const entry of items) {
    const name = String(entry.itemName || "").trim();
    if (!name) continue;
    const key = `${entry.mealTime}|${name.toLowerCase()}|${entry.isAvoid ? 1 : 0}`;
    if (!deduped.has(key)) {
      deduped.set(key, {
        mealTime: entry.mealTime || "OTHER",
        itemName: name,
        notes: entry.notes || null,
        isAvoid: Boolean(entry.isAvoid),
      });
    }
  }

  return [...deduped.values()];
};

const main = async () => {
  const plans = await prisma.treatmentPlan.findMany({
    select: {
      id: true,
      dietChart: true,
      dietPlan: {
        select: {
          id: true,
          items: {
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  let scanned = 0;
  let skippedNoDiet = 0;
  let skippedAlreadyBackfilled = 0;
  let backfilledPlans = 0;
  let insertedItems = 0;

  for (const plan of plans) {
    scanned += 1;

    const parsedItems = parseDietChart(plan.dietChart);
    if (parsedItems.length === 0) {
      skippedNoDiet += 1;
      continue;
    }

    if (plan.dietPlan?.items?.length) {
      skippedAlreadyBackfilled += 1;
      continue;
    }

    const dietPlan = await prisma.dietPlan.upsert({
      where: { treatmentPlanId: plan.id },
      create: {
        treatmentPlanId: plan.id,
        title: "Doctor Prescribed Diet Plan",
      },
      update: {},
    });

    await prisma.dietItem.deleteMany({ where: { dietPlanId: dietPlan.id } });

    if (parsedItems.length > 0) {
      await prisma.dietItem.createMany({
        data: parsedItems.map((item) => ({
          dietPlanId: dietPlan.id,
          mealTime: item.mealTime,
          itemName: item.itemName,
          notes: item.notes,
          isAvoid: item.isAvoid,
        })),
      });
    }

    backfilledPlans += 1;
    insertedItems += parsedItems.length;
  }

  console.log("Diet backfill summary:");
  console.log(`- Treatment plans scanned: ${scanned}`);
  console.log(`- Skipped (no parsable diet chart): ${skippedNoDiet}`);
  console.log(`- Skipped (already has diet items): ${skippedAlreadyBackfilled}`);
  console.log(`- Backfilled plans: ${backfilledPlans}`);
  console.log(`- Diet items inserted: ${insertedItems}`);
};

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
