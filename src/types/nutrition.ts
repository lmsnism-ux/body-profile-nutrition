export type Unit = "g" | "ml" | "개" | "팩" | "회" | "줌";

export type MealType =
  | "아침"
  | "점심"
  | "간식"
  | "저녁"
  | "추가섭취"
  | "이탈음식";

export type Nutrients = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  sugar: number;
  sodium: number;
  fiber: number;
};

export type UserProfile = {
  name: string;
  gender: "남성" | "여성";
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: string;
  targetBodyFatPercent: number;
};

export type NutritionTarget = Omit<Nutrients, "fiber">;

export type FoodItem = {
  id: string;
  name: string;
  emoji?: string;
  brand?: string;
  baseAmount: number;
  unit: Unit;
  nutrients: Partial<Nutrients>;
  category: string;
  favorite: boolean;
};

export type MealEntry = {
  id: string;
  foodId: string;
  mealType: MealType;
  amount: number;
  unit: Unit;
  time?: string;
};

export type DailyLog = {
  date: string;
  weightKg: number;
  dayType: "training" | "rest";
  entries: MealEntry[];
};

export type DailyLogsByDate = Record<string, DailyLog>;

export type GroceryItem = {
  id: string;
  name: string;
  needed: string;
  owned: string;
  expiry?: string;
  frequent: boolean;
};
