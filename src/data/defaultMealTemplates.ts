import type { MealEntry, MealType } from "@/types/nutrition";

const id = (mealType: MealType, foodId: string) => `${mealType}-${foodId}-${crypto.randomUUID()}`;

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

export const mealTemplatePlan: Partial<Record<MealType, Array<{ foodId: string; amount: number; unit: MealEntry["unit"] }>>> = {
  아침: [
    { foodId: "boiled-egg", amount: 3, unit: "개" },
    { foodId: "greek-yogurt", amount: 90, unit: "g" },
    { foodId: "maeil-soy", amount: 190, unit: "ml" },
    { foodId: "blueberry", amount: 100, unit: "g" },
    { foodId: "nuts", amount: 20, unit: "g" },
  ],
  점심: [
    { foodId: "mixed-rice", amount: 200, unit: "g" },
    { foodId: "chicken-18", amount: 2, unit: "팩" },
    { foodId: "seaweed", amount: 4, unit: "g" },
    { foodId: "cherry-tomato", amount: 1, unit: "줌" },
  ],
  간식: [
    { foodId: "protein-shake", amount: 1, unit: "회" },
    { foodId: "banana", amount: 1, unit: "개" },
    { foodId: "creatine", amount: 1, unit: "회" },
  ],
  저녁: [
    { foodId: "mixed-rice", amount: 200, unit: "g" },
    { foodId: "chicken-18", amount: 2, unit: "팩" },
    { foodId: "seaweed", amount: 4, unit: "g" },
    { foodId: "cherry-tomato", amount: 1, unit: "줌" },
    { foodId: "zero-drink", amount: 1, unit: "개" },
  ],
};

function entry(mealType: MealType, foodId: string, amount: number, unit: MealEntry["unit"]): MealEntry {
  return { id: id(mealType, foodId), mealType, foodId, amount, unit, time: mealTimes[mealType] };
}

export function createMealTemplate(mealType: MealType): MealEntry[] {
  return (mealTemplatePlan[mealType] ?? []).map((item) => entry(mealType, item.foodId, item.amount, item.unit));
}

export function createDefaultMealTemplate(): MealEntry[] {
  return [
    ...createMealTemplate("아침"),
    ...createMealTemplate("점심"),
    ...createMealTemplate("간식"),
    ...createMealTemplate("저녁"),
  ];
}
