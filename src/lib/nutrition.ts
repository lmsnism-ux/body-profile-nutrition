import type { DailyLog, FoodItem, MealEntry, Nutrients, NutritionTarget } from "@/types/nutrition";

export const emptyNutrients: Nutrients = {
  calories: 0,
  carbs: 0,
  protein: 0,
  fat: 0,
  sugar: 0,
  sodium: 0,
  fiber: 0,
};

export const targets: Record<DailyLog["dayType"], NutritionTarget> = {
  training: { calories: 2200, carbs: 240, protein: 165, fat: 55, sugar: 50, sodium: 2000 },
  rest: { calories: 2000, carbs: 190, protein: 165, fat: 60, sugar: 50, sodium: 2000 },
};

export function targetForWeight(weightKg: number, dayType: DailyLog["dayType"]): NutritionTarget {
  const safeWeight = weightKg > 0 ? weightKg : 82;
  const protein = Math.round(safeWeight * 2);
  const fat = Math.round(safeWeight * (dayType === "training" ? 0.65 : 0.7));
  const calories = Math.round(safeWeight * (dayType === "training" ? 27 : 24));
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    calories,
    carbs,
    protein,
    fat,
    sugar: 50,
    sodium: 2000,
  };
}

export function calculateEntryNutrition(entry: MealEntry, food?: FoodItem): Nutrients {
  if (!food) return emptyNutrients;
  const ratio = entry.amount / food.baseAmount;

  return {
    calories: (food.nutrients.calories ?? 0) * ratio,
    carbs: (food.nutrients.carbs ?? 0) * ratio,
    protein: (food.nutrients.protein ?? 0) * ratio,
    fat: (food.nutrients.fat ?? 0) * ratio,
    sugar: (food.nutrients.sugar ?? 0) * ratio,
    sodium: (food.nutrients.sodium ?? 0) * ratio,
    fiber: (food.nutrients.fiber ?? 0) * ratio,
  };
}

export function calculateDailyNutrition(entries: MealEntry[], foods: FoodItem[]): Nutrients {
  return entries.reduce((sum, entry) => {
    const next = calculateEntryNutrition(entry, foods.find((food) => food.id === entry.foodId));
    return {
      calories: sum.calories + next.calories,
      carbs: sum.carbs + next.carbs,
      protein: sum.protein + next.protein,
      fat: sum.fat + next.fat,
      sugar: sum.sugar + next.sugar,
      sodium: sum.sodium + next.sodium,
      fiber: sum.fiber + next.fiber,
    };
  }, emptyNutrients);
}

export function scoreDay(total: Nutrients, target: NutritionTarget, hasDeviation: boolean) {
  let score = 0;
  const ratio = (value: number, goal: number) => (goal === 0 ? 0 : value / goal);

  const calorie = ratio(total.calories, target.calories);
  const protein = ratio(total.protein, target.protein);
  const fat = ratio(total.fat, target.fat);
  const carbs = ratio(total.carbs, target.carbs);

  if (calorie >= 0.9 && calorie <= 1.1) score += 30;
  if (protein >= 0.9) score += 25;
  if (fat >= 0.7 && fat <= 1.2) score += 15;
  if (carbs >= 0.8 && carbs <= 1.2) score += 15;
  score += 15;
  if (total.sugar > target.sugar) score -= 8;
  if (total.sodium > target.sodium) score -= 8;
  if (hasDeviation) score -= 20;

  return Math.max(0, Math.min(100, score));
}

export function round(value: number) {
  return Math.round(value * 10) / 10;
}
