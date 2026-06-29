"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultFoods } from "@/data/defaultFoods";
import { createDefaultMealTemplate } from "@/data/defaultMealTemplates";
import { todayKey } from "@/lib/date";
import type { DailyLog, FoodItem, GroceryItem, MealEntry, MealType, UserProfile } from "@/types/nutrition";

type NutritionContextValue = {
  profile: UserProfile;
  foods: FoodItem[];
  log: DailyLog;
  groceries: GroceryItem[];
  setDayType: (dayType: DailyLog["dayType"]) => void;
  setWeight: (weightKg: number) => void;
  loadDefaultMeals: (chickenFoodId: "chicken-18" | "chicken-23") => void;
  addEntry: (foodId: string, mealType: MealType) => void;
  updateEntryAmount: (entryId: string, amount: number) => void;
  removeEntry: (entryId: string) => void;
  addFood: (food: FoodItem) => void;
};

const profile: UserProfile = {
  name: "명구",
  gender: "남성",
  age: 37,
  heightCm: 182,
  currentWeightKg: 82,
  targetWeightKg: "76~77",
  targetBodyFatPercent: 10,
};

const defaultLog: DailyLog = {
  date: todayKey(),
  weightKg: 82,
  dayType: "training",
  entries: [],
};

const defaultGroceries: GroceryItem[] = [
  { id: "g1", name: "닭가슴살", needed: "10팩", owned: "0팩", frequent: true },
  { id: "g2", name: "계란", needed: "21개", owned: "0개", frequent: true },
  { id: "g3", name: "두유", needed: "7개", owned: "0개", frequent: true },
  { id: "g4", name: "그릭요거트", needed: "7개", owned: "0개", frequent: true },
  { id: "g5", name: "바나나", needed: "7개", owned: "0개", frequent: true },
];

const NutritionContext = createContext<NutritionContextValue | null>(null);

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const [foods, setFoods] = useState<FoodItem[]>(defaultFoods);
  const [log, setLog] = useState<DailyLog>(defaultLog);
  const [groceries] = useState<GroceryItem[]>(defaultGroceries);

  useEffect(() => {
    const saved = localStorage.getItem("bp-nutrition-mvp");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { foods?: FoodItem[]; log?: DailyLog };
      setFoods(parsed.foods?.length ? parsed.foods : defaultFoods);
      setLog(parsed.log?.date === todayKey() ? parsed.log : { ...defaultLog, date: todayKey() });
    } catch {
      setFoods(defaultFoods);
      setLog(defaultLog);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("bp-nutrition-mvp", JSON.stringify({ foods, log }));
  }, [foods, log]);

  const value = useMemo<NutritionContextValue>(() => ({
    profile,
    foods,
    log,
    groceries,
    setDayType: (dayType) => setLog((current) => ({ ...current, dayType })),
    setWeight: (weightKg) => setLog((current) => ({ ...current, weightKg })),
    loadDefaultMeals: (chickenFoodId) =>
      setLog((current) => ({ ...current, entries: createDefaultMealTemplate(chickenFoodId) })),
    addEntry: (foodId, mealType) => {
      const food = foods.find((item) => item.id === foodId);
      if (!food) return;
      const entry: MealEntry = {
        id: crypto.randomUUID(),
        foodId,
        mealType,
        amount: food.baseAmount,
        unit: food.unit,
      };
      setLog((current) => ({ ...current, entries: [...current.entries, entry] }));
    },
    updateEntryAmount: (entryId, amount) =>
      setLog((current) => ({
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === entryId ? { ...entry, amount: Math.max(0, amount) } : entry,
        ),
      })),
    removeEntry: (entryId) =>
      setLog((current) => ({ ...current, entries: current.entries.filter((entry) => entry.id !== entryId) })),
    addFood: (food) => setFoods((current) => [food, ...current]),
  }), [foods, groceries, log]);

  return <NutritionContext.Provider value={value}>{children}</NutritionContext.Provider>;
}

export function useNutrition() {
  const context = useContext(NutritionContext);
  if (!context) throw new Error("useNutrition must be used inside NutritionProvider");
  return context;
}
