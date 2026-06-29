import type { MealEntry, MealType } from "@/types/nutrition";

const id = (mealType: MealType, foodId: string) => `${mealType}-${foodId}-${crypto.randomUUID()}`;
type ChickenFoodId = "chicken-18" | "chicken-23";

const mealTimes: Partial<Record<MealType, string>> = {
  아침: "06:30",
  점심: "12:30",
  간식: "17:00",
  저녁: "20:00",
};

export const mealTemplateSummaries: Record<MealType, { title: string; emoji: string; subtitle: string }> = {
  아침: { title: "균형 아침", emoji: "🌤️", subtitle: "계란·요거트·두유·과일" },
  점심: { title: "바디프로필 점심", emoji: "🍱", subtitle: "잡곡밥·닭가슴살·채소" },
  간식: { title: "운동 전후 간식", emoji: "⚡", subtitle: "프로틴·바나나·크레아틴" },
  저녁: { title: "가벼운 저녁", emoji: "🌙", subtitle: "잡곡밥·닭가슴살·채소" },
  추가섭취: { title: "추가 섭취", emoji: "➕", subtitle: "필요한 음식만 직접 추가" },
  이탈음식: { title: "이탈 기록", emoji: "🍕", subtitle: "정확히 기록하고 다음 끼니 조정" },
};

function entry(mealType: MealType, foodId: string, amount: number, unit: MealEntry["unit"]): MealEntry {
  return { id: id(mealType, foodId), mealType, foodId, amount, unit, time: mealTimes[mealType] };
}

export function createMealTemplate(mealType: MealType, chickenFoodId: ChickenFoodId): MealEntry[] {
  if (mealType === "아침") {
    return [
      entry("아침", "boiled-egg", 3, "개"),
      entry("아침", "greek-yogurt", 90, "g"),
      entry("아침", "maeil-soy", 190, "ml"),
      entry("아침", "apple", 1, "개"),
      entry("아침", "nuts", 20, "g"),
    ];
  }

  if (mealType === "점심") {
    return [
      entry("점심", "mixed-rice", 200, "g"),
      entry("점심", chickenFoodId, 2, "팩"),
      entry("점심", "seaweed", 4, "g"),
      entry("점심", "cherry-tomato", 1, "줌"),
    ];
  }

  if (mealType === "간식") {
    return [
      entry("간식", "protein-shake", 1, "회"),
      entry("간식", "banana", 1, "개"),
      entry("간식", "creatine", 1, "회"),
    ];
  }

  if (mealType === "저녁") {
    return [
      entry("저녁", "mixed-rice", 200, "g"),
      entry("저녁", chickenFoodId, 2, "팩"),
      entry("저녁", "seaweed", 4, "g"),
      entry("저녁", "cherry-tomato", 1, "줌"),
      entry("저녁", "zero-drink", 1, "개"),
    ];
  }

  return [];
}

export function createDefaultMealTemplate(chickenFoodId: ChickenFoodId): MealEntry[] {
  return [
    ...createMealTemplate("아침", chickenFoodId),
    ...createMealTemplate("점심", chickenFoodId),
    ...createMealTemplate("간식", chickenFoodId),
    ...createMealTemplate("저녁", chickenFoodId),
  ];
}
