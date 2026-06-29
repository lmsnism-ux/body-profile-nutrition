"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultFoods } from "@/data/defaultFoods";
import { cloneDefaultMealTemplates, createDefaultMealTemplate, createMealTemplate } from "@/data/defaultMealTemplates";
import { todayKey } from "@/lib/date";
import { targets } from "@/lib/nutrition";
import type { DailyLog, DailyLogsByDate, FoodItem, GroceryItem, MealEntry, MealTemplates, MealType, NutritionTarget, Unit, UserProfile } from "@/types/nutrition";

type NutritionTargetsByDay = Record<DailyLog["dayType"], NutritionTarget>;

type NutritionContextValue = {
  profile: UserProfile;
  foods: FoodItem[];
  log: DailyLog;
  logsByDate: DailyLogsByDate;
  selectedDate: string;
  nutritionTargets: NutritionTargetsByDay;
  mealTemplates: MealTemplates;
  groceries: GroceryItem[];
  selectDate: (date: string) => void;
  setWeight: (weightKg: number) => void;
  updateTarget: (dayType: DailyLog["dayType"], key: keyof NutritionTarget, value: number) => void;
  loadDefaultMeals: (mode?: "replace" | "append") => void;
  applyMealTemplate: (mealType: MealType) => void;
  updateMealTemplateFood: (mealType: MealType, index: number, foodId: string) => void;
  updateMealTemplateAmount: (mealType: MealType, index: number, amount: number) => void;
  addFoodToMealTemplate: (mealType: MealType, foodId: string) => void;
  removeFoodFromMealTemplate: (mealType: MealType, index: number) => void;
  addEntry: (foodId: string, mealType: MealType) => void;
  rotateMealFood: (mealType: MealType, foodIds: string[]) => void;
  replaceMealFood: (mealType: MealType, currentFoodIds: string[], nextFoodId: string) => void;
  updateEntryAmount: (entryId: string, amount: number) => void;
  removeEntry: (entryId: string) => void;
  addFood: (food: FoodItem) => void;
  updateFood: (food: FoodItem) => void;
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
const storageKey = "bp-nutrition-mvp-v2";

type StoredNutritionState = {
  foods: FoodItem[];
  logsByDate: DailyLogsByDate;
  selectedDate: string;
  nutritionTargets: NutritionTargetsByDay;
  mealTemplates: MealTemplates;
};

function createEmptyLog(date: string, weightKg = 82): DailyLog {
  return {
    ...defaultLog,
    date,
    weightKg,
    entries: [],
  };
}

function readInitialState(): StoredNutritionState {
  const fallback = {
    foods: defaultFoods,
    logsByDate: { [todayKey()]: defaultLog },
    selectedDate: todayKey(),
    nutritionTargets: targets,
    mealTemplates: cloneDefaultMealTemplates(),
  };

  if (typeof window === "undefined") return fallback;

  localStorage.removeItem("bp-nutrition-mvp");

  const saved = localStorage.getItem(storageKey);
  if (!saved) return fallback;

  try {
    const parsed = JSON.parse(saved) as {
      foods?: FoodItem[];
      log?: DailyLog;
      logsByDate?: DailyLogsByDate;
      selectedDate?: string;
      nutritionTargets?: NutritionTargetsByDay;
      mealTemplates?: MealTemplates;
    };
    const foods = parsed.foods?.length ? mergeDefaultFoodMetadata(parsed.foods) : defaultFoods;
    const nutritionTargets = parsed.nutritionTargets ?? targets;
    const mealTemplates = parsed.mealTemplates ?? cloneDefaultMealTemplates();

    if (parsed.logsByDate && Object.keys(parsed.logsByDate).length) {
      const selectedDate = todayKey();
      const logsByDate = parsed.logsByDate[selectedDate]
        ? parsed.logsByDate
        : { ...parsed.logsByDate, [selectedDate]: createEmptyLog(selectedDate, findLatestWeight(parsed.logsByDate, selectedDate)) };
      return {
        foods,
        logsByDate,
        selectedDate,
        nutritionTargets,
        mealTemplates,
      };
    }

    if (parsed.log) {
      return {
        foods,
        logsByDate: {
          [parsed.log.date]: parsed.log,
          [todayKey()]: parsed.log.date === todayKey() ? parsed.log : createEmptyLog(todayKey(), parsed.log.weightKg || 82),
        },
        selectedDate: parsed.log.date === todayKey() ? parsed.log.date : todayKey(),
        nutritionTargets,
        mealTemplates,
      };
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function mergeDefaultFoodMetadata(foods: FoodItem[]) {
  const mergedFoods = foods.map((food) => {
    const defaultFood = defaultFoods.find((item) => item.id === food.id);
    if (!defaultFood) return food;

    const mergedFood = {
      ...food,
      emoji: food.emoji ?? defaultFood.emoji,
      nutrients: {
        ...defaultFood.nutrients,
        ...food.nutrients,
      },
    };
    if (food.id === "maeil-soy") {
      return {
        ...mergedFood,
        name: defaultFood.name,
        brand: defaultFood.brand,
      };
    }
    if (food.id === "chicken-18" || food.id === "nuldam-protein-bread") {
      return {
        ...mergedFood,
        name: defaultFood.name,
        brand: defaultFood.brand,
      };
    }

    return mergedFood;
  });

  const savedIds = new Set(mergedFoods.map((food) => food.id));
  return [
    ...mergedFoods,
    ...defaultFoods.filter((food) => !savedIds.has(food.id)),
  ];
}

function findLatestWeight(logsByDate: DailyLogsByDate, date: string) {
  const previous = Object.values(logsByDate)
    .filter((log) => log.date < date && log.weightKg > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return previous?.weightKg ?? 82;
}

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const [initialState] = useState(readInitialState);
  const [foods, setFoods] = useState<FoodItem[]>(initialState.foods);
  const [selectedDate, setSelectedDate] = useState(initialState.selectedDate);
  const [logsByDate, setLogsByDate] = useState<DailyLogsByDate>(initialState.logsByDate);
  const [nutritionTargets, setNutritionTargets] = useState<NutritionTargetsByDay>(initialState.nutritionTargets);
  const [mealTemplates, setMealTemplates] = useState<MealTemplates>(initialState.mealTemplates);
  const [groceries] = useState<GroceryItem[]>(defaultGroceries);
  const log = logsByDate[selectedDate] ?? createEmptyLog(selectedDate);

  const updateSelectedLog = useCallback((updater: (current: DailyLog) => DailyLog) => {
    setLogsByDate((current) => {
      const currentLog = current[selectedDate] ?? createEmptyLog(selectedDate);
      return {
        ...current,
        [selectedDate]: updater(currentLog),
      };
    });
  }, [selectedDate]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ foods, logsByDate, selectedDate, nutritionTargets, mealTemplates }));
  }, [foods, logsByDate, mealTemplates, selectedDate, nutritionTargets]);

  const value = useMemo<NutritionContextValue>(() => ({
    profile,
    foods,
    log,
    logsByDate,
    selectedDate,
    nutritionTargets,
    mealTemplates,
    groceries,
    selectDate: (date) => {
      setSelectedDate(date);
      setLogsByDate((current) => current[date] ? current : { ...current, [date]: createEmptyLog(date, findLatestWeight(current, date)) });
    },
    setWeight: (weightKg) => updateSelectedLog((current) => ({ ...current, weightKg })),
    updateTarget: (dayType, key, value) =>
      setNutritionTargets((current) => ({
        ...current,
        [dayType]: {
          ...current[dayType],
          [key]: Math.max(0, value),
        },
      })),
    loadDefaultMeals: (mode = "replace") =>
      updateSelectedLog((current) => {
        const template = createDefaultMealTemplate(mealTemplates);
        return { ...current, entries: mode === "append" ? [...current.entries, ...template] : template };
      }),
    applyMealTemplate: (mealType) =>
      updateSelectedLog((current) => ({
        ...current,
        entries: [
          ...current.entries.filter((entry) => entry.mealType !== mealType),
          ...createMealTemplate(mealType, mealTemplates),
        ],
      })),
    updateMealTemplateFood: (mealType, index, foodId) => {
      const food = foods.find((item) => item.id === foodId);
      if (!food) return;
      setMealTemplates((current) => ({
        ...current,
        [mealType]: (current[mealType] ?? []).map((item, itemIndex) =>
          itemIndex === index ? { foodId, amount: food.baseAmount, unit: food.unit } : item,
        ),
      }));
    },
    updateMealTemplateAmount: (mealType, index, amount) =>
      setMealTemplates((current) => ({
        ...current,
        [mealType]: (current[mealType] ?? []).map((item, itemIndex) =>
          itemIndex === index ? { ...item, amount: Math.max(0, amount) } : item,
        ),
      })),
    addFoodToMealTemplate: (mealType, foodId) => {
      const food = foods.find((item) => item.id === foodId);
      if (!food) return;
      setMealTemplates((current) => ({
        ...current,
        [mealType]: [...(current[mealType] ?? []), { foodId, amount: food.baseAmount, unit: food.unit as Unit }],
      }));
    },
    removeFoodFromMealTemplate: (mealType, index) =>
      setMealTemplates((current) => ({
        ...current,
        [mealType]: (current[mealType] ?? []).filter((_, itemIndex) => itemIndex !== index),
      })),
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
      updateSelectedLog((current) => ({ ...current, entries: [...current.entries, entry] }));
    },
    rotateMealFood: (mealType, foodIds) => {
      const availableFoodIds = foodIds.filter((foodId) => foods.some((food) => food.id === foodId));
      if (!availableFoodIds.length) return;

      updateSelectedLog((current) => {
        const currentEntry = current.entries.find((entry) => entry.mealType === mealType && availableFoodIds.includes(entry.foodId));
        const currentIndex = currentEntry ? availableFoodIds.indexOf(currentEntry.foodId) : -1;
        const nextFoodId = availableFoodIds[(currentIndex + 1) % availableFoodIds.length];
        const nextFood = foods.find((food) => food.id === nextFoodId);
        if (!nextFood) return current;

        const nextEntry: MealEntry = {
          id: currentEntry?.id ?? crypto.randomUUID(),
          foodId: nextFoodId,
          mealType,
          amount: nextFood.baseAmount,
          unit: nextFood.unit,
          time: currentEntry?.time,
        };

        if (currentEntry) {
          return {
            ...current,
            entries: current.entries.map((entry) => entry.id === currentEntry.id ? nextEntry : entry),
          };
        }

        return { ...current, entries: [...current.entries, nextEntry] };
      });
    },
    replaceMealFood: (mealType, currentFoodIds, nextFoodId) => {
      const nextFood = foods.find((food) => food.id === nextFoodId);
      if (!nextFood) return;

      updateSelectedLog((current) => {
        const currentEntry = current.entries.find((entry) => entry.mealType === mealType && currentFoodIds.includes(entry.foodId));
        const nextEntry: MealEntry = {
          id: currentEntry?.id ?? crypto.randomUUID(),
          foodId: nextFoodId,
          mealType,
          amount: nextFood.baseAmount,
          unit: nextFood.unit,
          time: currentEntry?.time,
        };

        if (!currentEntry) return { ...current, entries: [...current.entries, nextEntry] };

        return {
          ...current,
          entries: current.entries.map((entry) => entry.id === currentEntry.id ? nextEntry : entry),
        };
      });
    },
    updateEntryAmount: (entryId, amount) =>
      updateSelectedLog((current) => ({
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === entryId ? { ...entry, amount: Math.max(0, amount) } : entry,
        ),
      })),
    removeEntry: (entryId) =>
      updateSelectedLog((current) => ({ ...current, entries: current.entries.filter((entry) => entry.id !== entryId) })),
    addFood: (food) => setFoods((current) => [food, ...current]),
    updateFood: (food) => setFoods((current) => current.map((item) => item.id === food.id ? food : item)),
  }), [foods, groceries, log, logsByDate, mealTemplates, nutritionTargets, selectedDate, updateSelectedLog]);

  return <NutritionContext.Provider value={value}>{children}</NutritionContext.Provider>;
}

export function useNutrition() {
  const context = useContext(NutritionContext);
  if (!context) throw new Error("useNutrition must be used inside NutritionProvider");
  return context;
}
