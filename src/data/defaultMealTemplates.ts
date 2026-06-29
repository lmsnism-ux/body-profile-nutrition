import type { MealEntry, MealType } from "@/types/nutrition";

const id = (mealType: MealType, foodId: string) => `${mealType}-${foodId}-${crypto.randomUUID()}`;

export function createDefaultMealTemplate(chickenFoodId: "chicken-18" | "chicken-23"): MealEntry[] {
  return [
    { id: id("아침", "boiled-egg"), mealType: "아침", foodId: "boiled-egg", amount: 3, unit: "개", time: "06:30" },
    { id: id("아침", "greek-yogurt"), mealType: "아침", foodId: "greek-yogurt", amount: 90, unit: "g", time: "06:30" },
    { id: id("아침", "maeil-soy"), mealType: "아침", foodId: "maeil-soy", amount: 190, unit: "ml", time: "06:30" },
    { id: id("아침", "apple"), mealType: "아침", foodId: "apple", amount: 1, unit: "개", time: "06:30" },
    { id: id("아침", "nuts"), mealType: "아침", foodId: "nuts", amount: 20, unit: "g", time: "06:30" },
    { id: id("점심", "mixed-rice"), mealType: "점심", foodId: "mixed-rice", amount: 200, unit: "g", time: "12:30" },
    { id: id("점심", chickenFoodId), mealType: "점심", foodId: chickenFoodId, amount: 2, unit: "팩", time: "12:30" },
    { id: id("점심", "seaweed"), mealType: "점심", foodId: "seaweed", amount: 4, unit: "g", time: "12:30" },
    { id: id("점심", "cherry-tomato"), mealType: "점심", foodId: "cherry-tomato", amount: 1, unit: "줌", time: "12:30" },
    { id: id("간식", "protein-shake"), mealType: "간식", foodId: "protein-shake", amount: 1, unit: "회", time: "17:00" },
    { id: id("간식", "banana"), mealType: "간식", foodId: "banana", amount: 1, unit: "개", time: "17:00" },
    { id: id("간식", "creatine"), mealType: "간식", foodId: "creatine", amount: 1, unit: "회", time: "17:00" },
    { id: id("저녁", "mixed-rice"), mealType: "저녁", foodId: "mixed-rice", amount: 200, unit: "g", time: "20:00" },
    { id: id("저녁", chickenFoodId), mealType: "저녁", foodId: chickenFoodId, amount: 2, unit: "팩", time: "20:00" },
    { id: id("저녁", "seaweed"), mealType: "저녁", foodId: "seaweed", amount: 4, unit: "g", time: "20:00" },
    { id: id("저녁", "cherry-tomato"), mealType: "저녁", foodId: "cherry-tomato", amount: 1, unit: "줌", time: "20:00" },
    { id: id("저녁", "zero-drink"), mealType: "저녁", foodId: "zero-drink", amount: 1, unit: "개", time: "20:00" },
  ];
}
