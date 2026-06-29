"use client";

import { useMemo, useState } from "react";
import { addDays, koreanDate, monthDates, todayKey, weekDates } from "@/lib/date";
import { mealTemplateSummaries } from "@/data/defaultMealTemplates";
import { calculateDailyNutrition, calculateEntryNutrition, round, scoreDay, targetForWeight } from "@/lib/nutrition";
import { NutritionProvider, useNutrition } from "@/store/NutritionProvider";
import type { DailyLog, FoodItem, MealTemplates, MealType, Nutrients, NutritionTarget, Unit } from "@/types/nutrition";

type TabId = "home" | "meals" | "analysis" | "foods";
type NutrientKey = keyof Omit<Nutrients, "fiber">;
type FoodForm = {
  name: string;
  emoji: string;
  brand: string;
  baseAmount: number;
  unit: Unit;
  category: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  sugar: number;
  sodium: number;
};

const units: Unit[] = ["g", "ml", "개", "팩", "회", "줌"];

const nutrientLabels: Record<NutrientKey, { label: string; unit: string; accent: string; limit?: boolean }> = {
  calories: { label: "칼로리", unit: "kcal", accent: "#0F766E" },
  carbs: { label: "탄수화물", unit: "g", accent: "#2563EB" },
  protein: { label: "단백질", unit: "g", accent: "#7C3AED" },
  fat: { label: "지방", unit: "g", accent: "#F59E0B" },
  sugar: { label: "당류", unit: "g", accent: "#E11D48", limit: true },
  sodium: { label: "나트륨", unit: "mg", accent: "#DC2626", limit: true },
};

const tabItems: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "home", label: "홈", icon: "⌂" },
  { id: "meals", label: "식단", icon: "+" },
  { id: "analysis", label: "분석", icon: "↗" },
  { id: "foods", label: "음식", icon: "⌕" },
];

const coreMeals: MealType[] = ["아침", "점심", "간식", "저녁"];

const rotationGroups = [
  { label: "채소", emoji: "🥬", foodIds: ["cucumber", "cabbage", "frozen-vegetables", "cherry-tomato"] },
  { label: "단백질", emoji: "🍗", foodIds: ["chicken-18", "chicken-thigh", "beef", "deli-bbq", "nuldam-protein-bread", "maeil-soy", "tofu", "boiled-egg"] },
  { label: "과일", emoji: "🫐", foodIds: ["banana", "blueberry", "avocado", "apple"] },
];

const mealRoleGroups = [
  { label: "탄수화물", emoji: "🍚", foodIds: ["mixed-rice", "banana", "blueberry", "nuldam-protein-bread", "maeil-soy"] },
  { label: "단백질", emoji: "🍗", foodIds: ["chicken-18", "chicken-thigh", "beef", "deli-bbq", "nuldam-protein-bread", "maeil-soy", "tofu", "boiled-egg", "protein-shake"] },
  { label: "지방", emoji: "🥑", foodIds: ["nuts", "avocado", "boiled-egg", "tofu"] },
  { label: "채소", emoji: "🥬", foodIds: ["cucumber", "cabbage", "frozen-vegetables", "cherry-tomato"] },
  { label: "과일", emoji: "🫐", foodIds: ["blueberry", "banana", "avocado", "apple"] },
];

const emptyFoodForm: FoodForm = {
  name: "",
  emoji: "🍽️",
  brand: "",
  baseAmount: 100,
  unit: "g",
  category: "직접등록",
  calories: 0,
  carbs: 0,
  protein: 0,
  fat: 0,
  sugar: 0,
  sodium: 0,
};

function App() {
  return (
    <NutritionProvider>
      <NutritionApp />
    </NutritionProvider>
  );
}

function NutritionApp() {
  const [tab, setTab] = useState<TabId>("home");

  return (
    <main className="min-h-dvh bg-[#E9EEF5] text-[#151923]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#F7F9FC] shadow-2xl shadow-slate-300/60">
        <div className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
          {tab === "home" && <HomeView goMeals={() => setTab("meals")} />}
          {tab === "meals" && <MealsView />}
          {tab === "analysis" && <AnalysisView />}
          {tab === "foods" && <FoodsView />}
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-slate-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-1">
            {tabItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                aria-label={item.label}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-extrabold transition active:scale-[0.98] ${
                  tab === item.id ? "bg-[#111827] text-white shadow-lg shadow-slate-300" : "text-[#7B8494]"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}

function HomeView({ goMeals }: { goMeals: () => void }) {
  const { profile, log, logsByDate, selectedDate, selectDate, setWeight, foods, loadDefaultMeals } = useNutrition();
  const total = useMemo(() => calculateDailyNutrition(log.entries, foods), [foods, log.entries]);
  const target = targetForWeight(log.weightKg, log.dayType);
  const hasDeviation = log.entries.some((entry) => entry.mealType === "이탈음식");
  const score = scoreDay(total, target, hasDeviation);
  const mealCount = log.entries.length;
  const proteinPercent = Math.min(120, Math.round((total.protein / target.protein) * 100));
  const dateOptions = useMemo(() => weekDates(todayKey()), []);
  const previousWeight = useMemo(() => findPreviousWeight(logsByDate, selectedDate, log.weightKg || profile.currentWeightKg), [log.weightKg, logsByDate, profile.currentWeightKg, selectedDate]);
  const weekSummary = useMemo(() => summarizePeriod(dateOptions, logsByDate, foods, selectedDate), [dateOptions, foods, logsByDate, selectedDate]);
  const monthSummary = useMemo(() => summarizePeriod(monthDates(selectedDate), logsByDate, foods, selectedDate), [foods, logsByDate, selectedDate]);

  return (
    <section className="space-y-4">
      <AppHeader
        eyebrow={koreanDate(selectedDate)}
        title={`${profile.name}의 식단`}
        aside="단백질 기준"
      />

      <DateRail dates={dateOptions} selectedDate={selectedDate} onSelect={selectDate} />

      <div className="rounded-lg bg-[#111827] p-5 text-white shadow-xl shadow-slate-300">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-300">오늘 남은 단백질</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-5xl font-black tracking-normal">{round(Math.max(0, target.protein - total.protein))}</p>
              <span className="pb-1.5 text-sm font-extrabold text-slate-300">g</span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-300">
              {round(total.protein)} / {target.protein}g · 체중 {round(log.weightKg)}kg 기준
            </p>
          </div>
          <ScoreDial score={score} />
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/12">
          <div
            className="h-full rounded-full bg-[#2DD4BF] transition-all duration-500"
            style={{ width: `${Math.min(100, proteinPercent)}%` }}
          />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <GoalTile label="칼로리" value={Math.max(0, target.calories - total.calories)} unit="kcal" tone="green" />
          <GoalTile label="단백질" value={Math.max(0, target.protein - total.protein)} unit="g" tone="violet" />
          <GoalTile label="탄수" value={Math.max(0, target.carbs - total.carbs)} unit="g" tone="blue" />
        </div>
        <button
          onClick={() => {
            if (mealCount === 0) loadDefaultMeals("replace");
            goMeals();
          }}
          className="mt-5 h-13 w-full rounded-lg bg-white text-base font-black text-[#111827] shadow-lg shadow-black/20 transition active:scale-[0.99]"
        >
          {mealCount === 0 ? "기본 식단으로 시작" : "오늘 식단 수정"}
        </button>
      </div>

      <WeightControl key={selectedDate} weight={log.weightKg} previousWeight={previousWeight} heightCm={profile.heightCm} onChange={setWeight} />

      <MealFlowOverview log={log} foods={foods} target={target} goMeals={goMeals} />

      <InfoCard label="체중 기반 자동 목표">
        <div className="grid grid-cols-3 gap-2 text-center">
          <MetricPill label="단백질" value={`${target.protein}g`} />
          <MetricPill label="탄수" value={`${target.carbs}g`} />
          <MetricPill label="칼로리" value={target.calories} />
        </div>
      </InfoCard>

      <FocusNote total={total} target={target} hasDeviation={hasDeviation} />

      <TrendPanel week={weekSummary} month={monthSummary} />

      <div className="space-y-2">
        {(["protein", "carbs", "fat", "calories"] as NutrientKey[]).map((key) => (
          <ProgressRow key={key} name={key} value={total[key]} target={target[key]} />
        ))}
      </div>
    </section>
  );
}

function MealsView() {
  const {
    log,
    foods,
    mealTemplates,
    loadDefaultMeals,
    applyMealTemplate,
    addEntry,
    rotateMealFood,
    replaceMealFood,
    updateMealTemplateFood,
    updateMealTemplateAmount,
    addFoodToMealTemplate,
    removeFoodFromMealTemplate,
    updateEntryAmount,
    removeEntry,
  } = useNutrition();
  const [selectedMeal, setSelectedMeal] = useState<MealType>("아침");
  const favoriteFoods = foods.filter((food) => food.favorite);
  const total = useMemo(() => calculateDailyNutrition(log.entries, foods), [foods, log.entries]);
  const selectedEntries = log.entries.filter((entry) => entry.mealType === selectedMeal);
  const selectedTotal = calculateDailyNutrition(selectedEntries, foods);
  const template = mealTemplateSummaries[selectedMeal];

  function loadTemplate(mode: "replace" | "append") {
    if (mode === "replace" && log.entries.length > 0 && !window.confirm("현재 식단을 지우고 기본 식단으로 바꿀까요?")) {
      return;
    }
    loadDefaultMeals(mode);
  }

  function addCurrentMealTemplate() {
    applyMealTemplate(selectedMeal);
  }

  return (
    <section className="space-y-4">
      <AppHeader eyebrow={koreanDate(log.date)} title="오늘 식단" aside={`${log.entries.length}개 입력`} />

      <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={addCurrentMealTemplate}
            className="h-12 rounded-lg bg-[#111827] text-sm font-black text-white transition active:scale-[0.99]"
          >
            {selectedMeal} 템플릿 적용
          </button>
          <button
            onClick={() => loadTemplate("replace")}
            className="h-12 rounded-lg bg-[#EEF2F7] text-sm font-black text-[#111827] transition active:scale-[0.99]"
          >
            하루 전체 세팅
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MetricPill label="kcal" value={round(total.calories)} />
          <MetricPill label="단백질" value={`${round(total.protein)}g`} />
          <MetricPill label="입력" value={`${log.entries.length}개`} />
        </div>
      </div>

      <MealSwitcher selectedMeal={selectedMeal} entries={log.entries} foods={foods} onSelect={setSelectedMeal} />

      <TemplateEditor
        mealType={selectedMeal}
        foods={foods}
        mealTemplates={mealTemplates}
        onReplace={updateMealTemplateFood}
        onAmount={updateMealTemplateAmount}
        onAdd={addFoodToMealTemplate}
        onRemove={removeFoodFromMealTemplate}
      />

      <div className="rounded-lg bg-[#111827] p-4 text-white shadow-xl shadow-slate-300">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-300">{template.emoji} {template.title}</p>
            <h2 className="mt-1 text-2xl font-black">{selectedMeal} 빠른 추가</h2>
            <p className="mt-1 text-sm font-bold text-slate-300">{template.subtitle}</p>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2 text-right">
            <p className="text-xs font-black text-slate-300">현재</p>
            <p className="text-lg font-black">{round(selectedTotal.calories)}kcal</p>
          </div>
        </div>
        <button
          onClick={addCurrentMealTemplate}
          className="mt-4 h-14 w-full rounded-lg bg-white text-base font-black text-[#111827] transition active:scale-[0.99]"
        >
          {template.emoji} {selectedMeal} 템플릿 한 번에 적용
        </button>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">로테이션</h2>
            <p className="mt-1 text-xs font-bold text-[#7B8494]">{selectedMeal}에 맞춰 같은 종류 음식만 바꿉니다</p>
          </div>
          <span className="rounded-md bg-[#ECFDF5] px-3 py-1.5 text-xs font-black text-[#047857]">한 번 터치</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {rotationGroups.map((group) => (
            <button
              key={group.label}
              onClick={() => rotateMealFood(selectedMeal, group.foodIds)}
              className="rounded-lg bg-[#F8FAFC] px-3 py-3 text-left ring-1 ring-slate-200 transition active:scale-[0.98]"
            >
              <p className="text-2xl">{group.emoji}</p>
              <p className="mt-1 text-sm font-black">{group.label}</p>
              <p className="mt-0.5 text-[0.68rem] font-bold text-[#7B8494]">다음 음식</p>
            </button>
          ))}
        </div>
      </div>

      <RoleSwapPanel mealType={selectedMeal} entries={selectedEntries} foods={foods} onReplace={replaceMealFood} />

      <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{selectedMeal} 기록</h2>
            <p className="mt-0.5 text-xs font-bold text-[#7B8494]">
              {selectedEntries.length ? `${round(selectedTotal.calories)}kcal · 단백질 ${round(selectedTotal.protein)}g` : "아직 비어 있어요"}
            </p>
          </div>
          <select
            aria-label={`${selectedMeal} 음식 추가`}
            className="max-w-36 rounded-lg bg-[#F1F5F9] px-3 py-3 text-sm font-extrabold text-[#111827] outline-none"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) addEntry(event.target.value, selectedMeal);
              event.target.value = "";
            }}
          >
            <option value="">음식 추가</option>
            {favoriteFoods.map((food) => (
              <option key={food.id} value={food.id}>
                {food.emoji ? `${food.emoji} ` : ""}{food.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-2">
          {selectedEntries.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-[#F8FAFC] px-4 py-6 text-center">
              <p className="text-3xl">{template.emoji}</p>
              <p className="mt-2 text-sm font-black text-[#111827]">{selectedMeal} 템플릿을 한 번 눌러 시작하세요</p>
              <p className="mt-1 text-xs font-bold text-[#7B8494]">나중에 음식별 양만 조정하면 됩니다</p>
            </div>
          )}
          {selectedEntries.map((entry) => {
            const food = foods.find((item) => item.id === entry.foodId);
            const nutrition = calculateEntryNutrition(entry, food);
            return (
              <div key={entry.id} className="rounded-lg bg-[#F8FAFC] p-3 ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-2xl shadow-sm ring-1 ring-slate-200">
                      {food?.emoji ?? "🍽️"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-black">{food?.name ?? "삭제된 음식"}</p>
                      <p className="mt-1 text-xs font-bold text-[#7B8494]">
                        {entry.time ? `${entry.time} · ` : ""}
                        {round(nutrition.calories)}kcal · 단백질 {round(nutrition.protein)}g
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="rounded-md bg-[#FFF1F2] px-3 py-1.5 text-xs font-black text-[#E11D48]"
                  >
                    삭제
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2">
                  <AmountButton onClick={() => updateEntryAmount(entry.id, entry.amount - stepFor(entry.unit))}>-</AmountButton>
                  <div className="flex h-12 items-center rounded-lg bg-white px-3 ring-1 ring-slate-200">
                    <input
                      aria-label={`${food?.name ?? "음식"} 섭취량`}
                      className="min-w-0 flex-1 bg-transparent text-center text-xl font-black outline-none"
                      type="number"
                      value={entry.amount}
                      step={stepFor(entry.unit)}
                      inputMode="decimal"
                      onChange={(event) => updateEntryAmount(entry.id, Number(event.target.value))}
                    />
                    <span className="w-8 text-center text-sm font-bold text-[#7B8494]">{entry.unit}</span>
                  </div>
                  <AmountButton onClick={() => updateEntryAmount(entry.id, entry.amount + stepFor(entry.unit))}>+</AmountButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TemplateEditor({
  mealType,
  foods,
  mealTemplates,
  onReplace,
  onAmount,
  onAdd,
  onRemove,
}: {
  mealType: MealType;
  foods: FoodItem[];
  mealTemplates: MealTemplates;
  onReplace: (mealType: MealType, index: number, foodId: string) => void;
  onAmount: (mealType: MealType, index: number, amount: number) => void;
  onAdd: (mealType: MealType, foodId: string) => void;
  onRemove: (mealType: MealType, index: number) => void;
}) {
  const plan = mealTemplates[mealType] ?? [];
  const favoriteFoods = foods.filter((food) => food.favorite);

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">기본 템플릿 편집</h2>
          <p className="mt-1 text-xs font-bold text-[#7B8494]">바꾸면 다음 템플릿 적용부터 그대로 들어갑니다</p>
        </div>
        <select
          aria-label={`${mealType} 템플릿 음식 추가`}
          className="max-w-32 rounded-md bg-[#F1F5F9] px-2 py-2 text-xs font-black text-[#111827] outline-none"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) onAdd(mealType, event.target.value);
            event.target.value = "";
          }}
        >
          <option value="">추가</option>
          {favoriteFoods.map((food) => (
            <option key={food.id} value={food.id}>
              {food.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 space-y-2">
        {plan.map((item, index) => {
          const food = foods.find((food) => food.id === item.foodId);
          return (
            <div key={`${mealType}-${index}-${item.foodId}`} className="rounded-lg bg-[#F8FAFC] p-3 ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-xl ring-1 ring-slate-200">
                  {food?.emoji ?? "🍽️"}
                </div>
                <select
                  aria-label={`${mealType} 템플릿 음식 교체`}
                  value={item.foodId}
                  onChange={(event) => onReplace(mealType, index, event.target.value)}
                  className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-sm font-black text-[#111827] outline-none ring-1 ring-slate-200"
                >
                  {favoriteFoods.map((food) => (
                    <option key={food.id} value={food.id}>
                      {food.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onRemove(mealType, index)}
                  className="rounded-md bg-[#FFF1F2] px-3 py-2 text-xs font-black text-[#E11D48]"
                >
                  삭제
                </button>
              </div>
              <div className="mt-2 grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2">
                <AmountButton onClick={() => onAmount(mealType, index, item.amount - stepFor(item.unit))}>-</AmountButton>
                <div className="flex h-11 items-center rounded-lg bg-white px-3 ring-1 ring-slate-200">
                  <input
                    aria-label={`${food?.name ?? "음식"} 템플릿 기준량`}
                    value={item.amount}
                    type="number"
                    inputMode="decimal"
                    onChange={(event) => onAmount(mealType, index, Number(event.target.value))}
                    className="min-w-0 flex-1 bg-transparent text-center text-lg font-black outline-none"
                  />
                  <span className="w-8 text-center text-xs font-bold text-[#7B8494]">{item.unit}</span>
                </div>
                <AmountButton onClick={() => onAmount(mealType, index, item.amount + stepFor(item.unit))}>+</AmountButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleSwapPanel({
  mealType,
  entries,
  foods,
  onReplace,
}: {
  mealType: MealType;
  entries: DailyLog["entries"];
  foods: FoodItem[];
  onReplace: (mealType: MealType, currentFoodIds: string[], nextFoodId: string) => void;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <h2 className="text-xl font-black">역할별 음식 교체</h2>
        <p className="mt-1 text-xs font-bold text-[#7B8494]">같은 역할 안에서 터치하면 현재 음식이 바로 바뀝니다</p>
      </div>
      <div className="mt-4 space-y-3">
        {mealRoleGroups.map((group) => {
          const currentEntry = entries.find((entry) => group.foodIds.includes(entry.foodId));
          const currentFood = foods.find((food) => food.id === currentEntry?.foodId);
          const choices = group.foodIds
            .map((foodId) => foods.find((food) => food.id === foodId))
            .filter((food): food is FoodItem => Boolean(food));

          return (
            <div key={group.label} className="rounded-lg bg-[#F8FAFC] p-3 ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black">
                  {group.emoji} {group.label}
                </p>
                <p className="truncate text-xs font-bold text-[#7B8494]">{currentFood ? currentFood.name : "미설정"}</p>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {choices.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => onReplace(mealType, group.foodIds, food.id)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-left text-xs font-black transition active:scale-[0.98] ${
                      currentFood?.id === food.id ? "bg-[#111827] text-white" : "bg-white text-[#111827] ring-1 ring-slate-200"
                    }`}
                  >
                    <span className="mr-1">{food.emoji ?? "🍽️"}</span>
                    {food.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeightControl({
  weight,
  previousWeight,
  heightCm,
  onChange,
}: {
  weight: number;
  previousWeight: number;
  heightCm: number;
  onChange: (weight: number) => void;
}) {
  const [draft, setDraft] = useState(String(weight || previousWeight));

  function commit(value: string) {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) return;
    const rounded = round(next);
    setDraft(String(rounded));
    onChange(rounded);
  }

  function step(delta: number) {
    const base = Number(draft) || weight || previousWeight;
    const next = round(Math.max(30, base + delta));
    setDraft(String(next));
    onChange(next);
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#7B8494]">오늘 체중</p>
          <p className="mt-1 text-sm font-bold text-[#7B8494]">키 {heightCm}cm 고정 · 전일 {round(previousWeight)}kg 기준</p>
        </div>
        <span className="rounded-md bg-[#F1F5F9] px-3 py-1.5 text-xs font-black text-[#566174]">0 방지</span>
      </div>
      <div className="mt-4 grid grid-cols-[3.25rem_1fr_3.25rem] items-center gap-2">
        <AmountButton onClick={() => step(-0.1)}>-</AmountButton>
        <div className="flex h-14 items-center rounded-lg bg-[#F8FAFC] px-3 ring-1 ring-slate-200">
          <input
            aria-label="오늘 체중"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => commit(draft)}
            className="min-w-0 flex-1 bg-transparent text-center text-3xl font-black outline-none"
            type="number"
            step="0.1"
            inputMode="decimal"
          />
          <span className="w-8 text-center text-sm font-bold text-[#7B8494]">kg</span>
        </div>
        <AmountButton onClick={() => step(0.1)}>+</AmountButton>
      </div>
    </div>
  );
}

function MealFlowOverview({ log, foods, target, goMeals }: { log: DailyLog; foods: FoodItem[]; target: NutritionTarget; goMeals: () => void }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">오늘 섭취 흐름</h2>
          <p className="mt-1 text-xs font-bold text-[#7B8494]">아침부터 저녁까지 채워진 정도</p>
        </div>
        <button onClick={goMeals} className="rounded-md bg-[#111827] px-3 py-2 text-xs font-black text-white">
          수정
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {coreMeals.map((mealType) => {
          const entries = log.entries.filter((entry) => entry.mealType === mealType);
          const total = calculateDailyNutrition(entries, foods);
          const percent = Math.min(100, Math.round((total.protein / Math.max(1, target.protein / 4)) * 100));
          const summary = mealTemplateSummaries[mealType];

          return (
            <div key={mealType} className="grid grid-cols-[2.5rem_4rem_1fr_3.4rem] items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#F8FAFC] text-xl ring-1 ring-slate-200">{summary.emoji}</div>
              <p className="text-sm font-black">{mealType}</p>
              <div className="h-2 overflow-hidden rounded-full bg-[#E5EAF1]">
                <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-right text-xs font-black text-[#566174]">{entries.length ? `${round(total.protein)}g` : "비어있음"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type PeriodSummary = {
  days: number;
  progressDays: number;
  recordedDays: number;
  avgWeight: number;
  weights: Array<{ date: string; value: number }>;
  proteins: Array<{ date: string; value: number }>;
};

function TrendPanel({ week, month }: { week: PeriodSummary; month: PeriodSummary }) {
  const [view, setView] = useState<"week" | "month">("week");
  const summary = view === "week" ? week : month;
  const title = view === "week" ? "이번 주" : "이번 달";

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">누적 기록</h2>
          <p className="mt-1 text-xs font-bold text-[#7B8494]">월요일 기준 흐름만 간단히 봅니다</p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F1F5F9] p-1">
          <button
            onClick={() => setView("week")}
            className={`rounded-md px-3 py-2 text-xs font-black ${view === "week" ? "bg-white text-[#111827] shadow-sm" : "text-[#7B8494]"}`}
          >
            주간
          </button>
          <button
            onClick={() => setView("month")}
            className={`rounded-md px-3 py-2 text-xs font-black ${view === "month" ? "bg-white text-[#111827] shadow-sm" : "text-[#7B8494]"}`}
          >
            월간
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-[#F8FAFC] p-3 ring-1 ring-slate-200">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[#7B8494]">{title}</p>
            <p className="mt-1 text-2xl font-black">
              {summary.progressDays}/{summary.days}
            </p>
            <p className="mt-1 text-xs font-bold text-[#7B8494]">{view === "week" ? "월요일부터 오늘까지" : "이번 달 오늘까지"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-[#7B8494]">평균 체중</p>
            <p className="mt-1 text-2xl font-black">{summary.avgWeight ? `${round(summary.avgWeight)}kg` : "-"}</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <CompactBars title="체중" items={summary.weights} unit="kg" tone="#111827" />
          <CompactBars title="단백질" items={summary.proteins} unit="g" tone="#7C3AED" />
        </div>
      </div>
    </div>
  );
}

function CompactBars({ title, items, unit, tone }: { title: string; items: Array<{ date: string; value: number }>; unit: string; tone: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const recorded = items.filter((item) => item.value > 0);
  const latest = recorded.at(-1)?.value ?? 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-black text-[#7B8494]">{title}</p>
        <p className="text-xs font-bold text-[#7B8494]">{latest ? `${round(latest)}${unit}` : "기록 없음"}</p>
      </div>
      <div className="flex h-14 items-end gap-1 rounded-lg bg-white px-2 py-2 ring-1 ring-slate-200">
        {items.map((item) => (
          <div
            key={item.date}
            className="min-w-0 flex-1 rounded-sm"
            style={{
              height: `${item.value ? Math.max(8, (item.value / max) * 100) : 4}%`,
              backgroundColor: item.value ? tone : "#E5EAF1",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AnalysisView() {
  const { logsByDate, foods } = useNutrition();
  const today = todayKey();
  const days = useMemo(() => [-6, -5, -4, -3, -2, -1, 0].map((offset) => addDays(today, offset)), [today]);
  const summaries = days.map((date) => {
    const log = logsByDate[date] ?? createDisplayLog(date);
    const total = calculateDailyNutrition(log.entries, foods);
    const target = targetForWeight(log.weightKg, log.dayType);
    return {
      date,
      log,
      total,
      score: scoreDay(total, target, log.entries.some((entry) => entry.mealType === "이탈음식")),
      caloriePercent: target.calories ? Math.min(120, Math.round((total.calories / target.calories) * 100)) : 0,
      proteinHit: total.protein >= target.protein * 0.9,
      hasEntries: log.entries.length > 0,
    };
  });
  const recorded = summaries.filter((item) => item.hasEntries);
  const avgCalories = recorded.length ? recorded.reduce((sum, item) => sum + item.total.calories, 0) / recorded.length : 0;
  const avgScore = recorded.length ? recorded.reduce((sum, item) => sum + item.score, 0) / recorded.length : 0;
  const proteinHits = recorded.filter((item) => item.proteinHit).length;
  const deviations = recorded.reduce((sum, item) => sum + item.log.entries.filter((entry) => entry.mealType === "이탈음식").length, 0);
  const weights = summaries.filter((item) => item.log.weightKg > 0).map((item) => item.log.weightKg);
  const weightDelta = weights.length >= 2 ? weights[weights.length - 1] - weights[0] : 0;

  return (
    <section className="space-y-4">
      <AppHeader eyebrow="최근 7일 흐름" title="분석" aside={`${recorded.length}일 기록`} />

      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="평균 칼로리">
          <p className="text-3xl font-black">{recorded.length ? round(avgCalories) : "-"}</p>
          <p className="mt-1 text-xs font-bold text-[#7B8494]">기록 {recorded.length}일</p>
        </InfoCard>
        <InfoCard label="평균 점수">
          <p className="text-3xl font-black">{recorded.length ? round(avgScore) : "-"}</p>
          <p className="mt-1 text-xs font-bold text-[#7B8494]">100점 기준</p>
        </InfoCard>
        <InfoCard label="단백질 달성">
          <p className="text-3xl font-black">{proteinHits}/{recorded.length || 0}</p>
          <p className="mt-1 text-xs font-bold text-[#7B8494]">목표 90% 이상</p>
        </InfoCard>
        <InfoCard label="체중 변화">
          <p className="text-3xl font-black">{weights.length >= 2 ? `${weightDelta > 0 ? "+" : ""}${round(weightDelta)}` : "-"}</p>
          <p className="mt-1 text-xs font-bold text-[#7B8494]">kg · 기록 기준</p>
        </InfoCard>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">주간 실행력</h2>
            <p className="mt-1 text-xs font-bold text-[#7B8494]">목표 칼로리 대비 섭취량</p>
          </div>
          <span className="rounded-md bg-[#FFF1F2] px-3 py-1.5 text-xs font-black text-[#E11D48]">
            이탈 {deviations}회
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {summaries.map((item) => (
            <div key={item.date} className="grid grid-cols-[3.4rem_1fr_3.2rem] items-center gap-3">
              <div>
                <p className="text-xs font-bold text-[#7B8494]">{item.date === today ? "오늘" : koreanDate(item.date).slice(-3)}</p>
                <p className="text-sm font-black">{item.date.slice(8)}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#E5EAF1]">
                <div
                  className={`h-full rounded-full ${item.hasEntries ? "bg-[#111827]" : "bg-slate-300"}`}
                  style={{ width: `${Math.min(100, item.caloriePercent)}%` }}
                />
              </div>
              <p className="text-right text-xs font-black text-[#566174]">{item.hasEntries ? item.score : "-"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-black">다음 개선 포인트</h2>
        <div className="mt-3 space-y-2">
          {recorded.length === 0 && <Insight text="아직 분석할 식단 기록이 없습니다. 오늘 식단부터 입력해 주세요." />}
          {recorded.length > 0 && proteinHits < recorded.length && <Insight text="단백질 달성일이 부족합니다. 간식에 프로틴 또는 닭가슴살을 먼저 보강하는 편이 좋습니다." />}
          {recorded.length > 0 && deviations > 0 && <Insight text="이탈음식이 기록되었습니다. 다음 날은 칼로리보다 단백질과 나트륨 회복을 우선 확인하세요." />}
          {recorded.length > 0 && avgCalories < 1800 && <Insight text="평균 칼로리가 낮습니다. 운동 수행감이 떨어지면 탄수화물을 조금 올리는 전략이 필요합니다." />}
          {recorded.length > 0 && proteinHits === recorded.length && deviations === 0 && <Insight text="최근 기록의 기본 흐름이 좋습니다. 이제 체중 추세를 보며 탄수화물 양을 미세 조정하면 됩니다." />}
        </div>
      </div>
    </section>
  );
}

function FoodsView() {
  const { foods, addFood, updateFood } = useNutrition();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FoodForm>(emptyFoodForm);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const normalizedQuery = normalizeSearch(query);
  const filtered = foods.filter((food) =>
    normalizeSearch(`${food.name} ${food.brand ?? ""} ${food.category}`).includes(normalizedQuery),
  );
  const canSubmit = form.name.trim().length > 0 && form.baseAmount > 0 && (form.calories > 0 || form.protein > 0);

  function updateForm<K extends keyof FoodForm>(key: K, value: FoodForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openNewFoodForm() {
    setEditingFoodId(null);
    setForm(emptyFoodForm);
    setShowAdvancedForm(false);
    setFormOpen((current) => !current);
  }

  function editFood(food: FoodItem) {
    setEditingFoodId(food.id);
    setForm(foodToForm(food));
    setShowAdvancedForm(true);
    setFormOpen(true);
  }

  function saveFood() {
    if (!canSubmit) return;
    const currentFood = foods.find((food) => food.id === editingFoodId);
    const nextFood: FoodItem = {
      id: editingFoodId ?? crypto.randomUUID(),
      name: form.name.trim(),
      emoji: form.emoji.trim() || "🍽️",
      brand: form.brand.trim() || undefined,
      baseAmount: form.baseAmount,
      unit: form.unit,
      category: form.category.trim() || "직접등록",
      favorite: currentFood?.favorite ?? true,
      nutrients: {
        calories: form.calories,
        carbs: form.carbs,
        protein: form.protein,
        fat: form.fat,
        sugar: form.sugar,
        sodium: form.sodium,
      },
    };

    if (editingFoodId) {
      updateFood(nextFood);
    } else {
      addFood(nextFood);
    }

    setForm(emptyFoodForm);
    setEditingFoodId(null);
    setShowAdvancedForm(false);
    setFormOpen(false);
  }

  return (
    <section className="space-y-4">
      <AppHeader eyebrow={`${foods.length}개 음식`} title="음식 DB" aside="검색" />

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="예: 아보카도, 블루베리, 두부"
          className="h-12 min-w-0 flex-1 rounded-lg bg-white px-4 text-base font-bold text-[#111827] shadow-sm outline-none ring-1 ring-slate-200 placeholder:text-[#9CA3AF]"
        />
        <button
          onClick={openNewFoodForm}
          className="h-12 shrink-0 rounded-lg bg-[#111827] px-4 text-sm font-black text-white shadow-lg shadow-slate-300 transition active:scale-[0.98]"
        >
          {formOpen ? "닫기" : "직접 입력"}
        </button>
      </div>

      {formOpen && (
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">{editingFoodId ? "음식 수정" : "음식 등록"}</h2>
              <p className="mt-1 text-xs font-bold text-[#7B8494]">처음엔 음식명, 칼로리, 단백질만 넣어도 됩니다</p>
            </div>
            {editingFoodId && (
              <button
                onClick={() => {
                  setEditingFoodId(null);
                  setForm(emptyFoodForm);
                  setShowAdvancedForm(false);
                }}
                className="rounded-md bg-[#EEF2F7] px-3 py-1.5 text-xs font-black text-[#111827]"
              >
                새 음식
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="음식명" value={form.name} onChange={(value) => updateForm("name", value)} />
            <TextField label="이모지" value={form.emoji} onChange={(value) => updateForm("emoji", value)} />
            <NumberField label="기준량" value={form.baseAmount} onChange={(value) => updateForm("baseAmount", value)} />
            <label className="block">
              <span className="text-xs font-bold text-[#7B8494]">단위</span>
              <select
                value={form.unit}
                onChange={(event) => updateForm("unit", event.target.value as Unit)}
                className="mt-1 h-12 w-full rounded-lg bg-[#F1F5F9] px-3 text-sm font-black text-[#111827] outline-none ring-1 ring-slate-200"
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <NumberField label="칼로리" value={form.calories} onChange={(value) => updateForm("calories", value)} unit="kcal" />
            <NumberField label="단백질" value={form.protein} onChange={(value) => updateForm("protein", value)} unit="g" />
          </div>
          <button
            onClick={() => setShowAdvancedForm((current) => !current)}
            className="mt-3 w-full rounded-lg bg-[#F1F5F9] px-4 py-3 text-sm font-black text-[#111827]"
          >
            {showAdvancedForm ? "선택 입력 닫기" : "브랜드·탄수·지방 등 선택 입력"}
          </button>
          {showAdvancedForm && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <TextField label="브랜드" value={form.brand} onChange={(value) => updateForm("brand", value)} />
              <TextField label="카테고리" value={form.category} onChange={(value) => updateForm("category", value)} />
              <NumberField label="탄수" value={form.carbs} onChange={(value) => updateForm("carbs", value)} unit="g" />
              <NumberField label="지방" value={form.fat} onChange={(value) => updateForm("fat", value)} unit="g" />
              <NumberField label="당류" value={form.sugar} onChange={(value) => updateForm("sugar", value)} unit="g" />
              <NumberField label="나트륨" value={form.sodium} onChange={(value) => updateForm("sodium", value)} unit="mg" />
            </div>
          )}
          <button
            disabled={!canSubmit}
            onClick={saveFood}
            className="mt-4 h-13 w-full rounded-lg bg-[#111827] text-base font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-[#9CA3AF] active:scale-[0.99]"
          >
            {editingFoodId ? "수정 저장" : "음식 저장"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((food) => (
          <FoodCard key={food.id} food={food} onEdit={() => editFood(food)} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg bg-white p-6 text-center text-sm font-bold text-[#7B8494] shadow-sm ring-1 ring-slate-200">
            검색 결과가 없습니다
          </div>
        )}
      </div>
    </section>
  );
}

function AppHeader({ eyebrow, title, aside }: { eyebrow: string; title: string; aside: string }) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-extrabold text-[#7B8494]">{eyebrow}</p>
        <h1 className="mt-1 text-[2rem] font-black leading-tight tracking-normal">{title}</h1>
      </div>
      <span className="rounded-md bg-white px-3 py-1.5 text-xs font-black text-[#111827] shadow-sm ring-1 ring-slate-200">
        {aside}
      </span>
    </header>
  );
}

function MealSwitcher({
  selectedMeal,
  entries,
  foods,
  onSelect,
}: {
  selectedMeal: MealType;
  entries: DailyLog["entries"];
  foods: FoodItem[];
  onSelect: (mealType: MealType) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {coreMeals.map((mealType) => {
        const mealEntries = entries.filter((entry) => entry.mealType === mealType);
        const total = calculateDailyNutrition(mealEntries, foods);
        const summary = mealTemplateSummaries[mealType];
        const active = selectedMeal === mealType;

        return (
          <button
            key={mealType}
            onClick={() => onSelect(mealType)}
            className={`min-h-[5.75rem] rounded-lg p-2 text-left shadow-sm transition active:scale-[0.98] ${
              active ? "bg-[#111827] text-white" : "bg-white text-[#111827] ring-1 ring-slate-200"
            }`}
          >
            <p className="text-2xl">{summary.emoji}</p>
            <p className="mt-1 text-sm font-black">{mealType}</p>
            <p className={`mt-0.5 text-[0.68rem] font-black ${active ? "text-slate-300" : "text-[#7B8494]"}`}>
              {mealEntries.length ? `${round(total.calories)}kcal` : "비어있음"}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function DateRail({ dates, selectedDate, onSelect }: { dates: string[]; selectedDate: string; onSelect: (date: string) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {dates.map((date) => (
        <button
          key={date}
          onClick={() => onSelect(date)}
          className={`min-h-16 rounded-lg px-1 py-2 text-center shadow-sm transition ${
            selectedDate === date ? "bg-[#111827] text-white" : "bg-white text-[#7B8494] ring-1 ring-slate-200"
          }`}
        >
          <p className="text-[0.63rem] font-extrabold">{date === todayKey() ? "오늘" : weekdayLabel(date)}</p>
          <p className="mt-1 text-base font-black">{Number(date.slice(8))}</p>
        </button>
      ))}
    </div>
  );
}

function ScoreDial({ score }: { score: number }) {
  return (
    <div
      className="grid h-22 w-22 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(#2DD4BF ${score * 3.6}deg, rgba(255,255,255,0.14) 0deg)` }}
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-[#111827] text-center">
        <p className="text-[0.65rem] font-black text-slate-300">점수</p>
        <p className="-mt-1 text-2xl font-black">{score}</p>
      </div>
    </div>
  );
}

function FocusNote({ total, target, hasDeviation }: { total: Nutrients; target: NutritionTarget; hasDeviation: boolean }) {
  let text = "지금 흐름은 안정적입니다. 다음 식사도 같은 기준으로 기록하면 됩니다.";
  let tone = "border-[#2DD4BF]/30 bg-[#ECFDF5] text-[#065F46]";
  if (total.protein < target.protein * 0.75) text = "단백질이 아직 부족합니다. 다음 끼니에는 단백질 음식을 먼저 채우세요.";
  if (total.calories > target.calories * 1.1) {
    text = "칼로리가 목표를 넘었습니다. 남은 식사는 단백질과 채소 중심으로 가볍게 맞추세요.";
    tone = "border-[#F59E0B]/30 bg-[#FFFBEB] text-[#92400E]";
  }
  if (total.sodium > target.sodium) {
    text = "나트륨이 목표를 넘었습니다. 가공식품과 국물 섭취를 줄이는 쪽이 좋습니다.";
    tone = "border-[#E11D48]/30 bg-[#FFF1F2] text-[#9F1239]";
  }
  if (hasDeviation) {
    text = "이탈음식이 기록되었습니다. 오늘은 추가 제한보다 남은 기록을 정확히 남기는 것이 우선입니다.";
    tone = "border-[#E11D48]/30 bg-[#FFF1F2] text-[#9F1239]";
  }

  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <p className="text-xs font-black">오늘의 초점</p>
      <p className="mt-2 text-sm font-extrabold leading-6">{text}</p>
    </div>
  );
}

function ProgressRow({ name, value, target }: { name: NutrientKey; value: number; target: number }) {
  const meta = nutrientLabels[name];
  const percent = target ? Math.round((value / target) * 100) : 0;
  const status = meta.limit ? (value <= target ? "적정" : "경고") : percent < 90 ? "부족" : percent <= 110 ? "적정" : "초과";
  const remain = target - value;
  const width = Math.min(100, percent);

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black">{meta.label}</p>
          <p className="mt-1 text-sm font-bold text-[#7B8494]">
            {round(value)} / {target}
            {meta.unit} · {percent}%
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E5EAF1]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: meta.accent }}
        />
      </div>
      <p className="mt-3 text-xs font-bold text-[#7B8494]">
        {remain <= 0
          ? `${meta.label} ${meta.limit ? `${round(Math.abs(remain))}${meta.unit} 초과` : "목표 달성"}`
          : `${meta.label} ${round(remain)}${meta.unit} 남음`}
      </p>
    </div>
  );
}

function FoodCard({ food, onEdit }: { food: FoodItem; onEdit: () => void }) {
  const n = food.nutrients;
  const missing = (Object.keys(nutrientLabels) as NutrientKey[]).filter((key) => n[key] === undefined).length;

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black">{food.name}</p>
          <p className="mt-1 text-sm font-bold text-[#7B8494]">
            {food.brand ? `${food.brand} · ` : ""}
            {food.baseAmount}
            {food.unit} 기준 · {food.category}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-md px-3 py-1.5 text-xs font-black ${missing ? "bg-[#FFFBEB] text-[#92400E]" : "bg-[#F1F5F9] text-[#566174]"}`}>
            {missing ? "보완필요" : food.favorite ? "즐겨찾기" : "일반"}
          </span>
          <button
            onClick={onEdit}
            className="rounded-md bg-[#ECFDF5] px-3 py-1.5 text-xs font-black text-[#047857]"
          >
            수정
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <Mini label="kcal" value={n.calories} />
        <Mini label="탄수" value={n.carbs} unit="g" />
        <Mini label="단백" value={n.protein} unit="g" />
        <Mini label="지방" value={n.fat} unit="g" />
        <Mini label="당류" value={n.sugar} unit="g" />
        <Mini label="나트륨" value={n.sodium} unit="mg" />
      </div>
    </div>
  );
}

function foodToForm(food: FoodItem): FoodForm {
  return {
    name: food.name,
    emoji: food.emoji ?? "🍽️",
    brand: food.brand ?? "",
    baseAmount: food.baseAmount,
    unit: food.unit,
    category: food.category,
    calories: food.nutrients.calories ?? 0,
    carbs: food.nutrients.carbs ?? 0,
    protein: food.nutrients.protein ?? 0,
    fat: food.nutrients.fat ?? 0,
    sugar: food.nutrients.sugar ?? 0,
    sodium: food.nutrients.sodium ?? 0,
  };
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#7B8494]">{label}</span>
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-12 w-full rounded-lg bg-[#F1F5F9] px-3 text-sm font-black text-[#111827] outline-none ring-1 ring-slate-200"
      />
    </label>
  );
}

function NumberField({ label, value, onChange, unit }: { label: string; value: number; onChange: (value: number) => void; unit?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#7B8494]">{label}</span>
      <div className="mt-1 flex h-12 items-center rounded-lg bg-[#F1F5F9] px-3 ring-1 ring-slate-200">
        <input
          aria-label={label}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          type="number"
          inputMode="decimal"
          className="min-w-0 flex-1 bg-transparent text-sm font-black text-[#111827] outline-none"
        />
        {unit && <span className="text-xs font-bold text-[#7B8494]">{unit}</span>}
      </div>
    </label>
  );
}

function GoalTile({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: "violet" | "blue" | "rose" | "green" }) {
  const toneClass = {
    violet: "bg-[#F5F3FF] text-[#6D28D9]",
    blue: "bg-[#EFF6FF] text-[#1D4ED8]",
    rose: "bg-[#FFF1F2] text-[#BE123C]",
    green: "bg-[#ECFDF5] text-[#047857]",
  }[tone];

  return (
    <div className={`rounded-lg px-3 py-3 ${toneClass}`}>
      <p className="text-[0.68rem] font-black">{label} 남음</p>
      <p className="mt-1 truncate text-lg font-black">
        {round(value)}
        <span className="ml-0.5 text-xs opacity-70">{unit}</span>
      </p>
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-black text-[#7B8494]">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function AmountButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="h-12 rounded-lg bg-[#EEF2F7] text-xl font-black text-[#111827] transition active:scale-[0.95]">
      {children}
    </button>
  );
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-[#F8FAFC] px-2 py-3">
      <p className="text-xs font-black text-[#7B8494]">{label}</p>
      <p className="mt-1 truncate text-base font-black">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "적정" | "부족" | "초과" | "경고" }) {
  const className =
    status === "적정"
      ? "bg-[#ECFDF5] text-[#047857]"
      : status === "부족"
        ? "bg-[#FFFBEB] text-[#92400E]"
        : "bg-[#FFF1F2] text-[#BE123C]";

  return <span className={`rounded-md px-3 py-1.5 text-xs font-black ${className}`}>{status}</span>;
}

function Mini({ label, value, unit = "" }: { label: string; value?: number; unit?: string }) {
  return (
    <div className="rounded-lg bg-[#F8FAFC] p-3">
      <p className="text-xs font-black text-[#7B8494]">{label}</p>
      <p className="mt-1 truncate font-black">
        {value ?? "-"}
        {value !== undefined ? unit : ""}
      </p>
    </div>
  );
}

function Insight({ text }: { text: string }) {
  return <p className="rounded-lg bg-[#F8FAFC] px-4 py-3 text-sm font-bold leading-6 text-[#566174]">{text}</p>;
}

function stepFor(unit: string) {
  return unit === "g" || unit === "ml" ? 10 : 1;
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/\s/g, "");
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(new Date(`${date}T00:00:00`));
}

function findPreviousWeight(logsByDate: Record<string, DailyLog>, selectedDate: string, fallback: number) {
  const previous = Object.values(logsByDate)
    .filter((log) => log.date < selectedDate && log.weightKg > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return previous?.weightKg ?? fallback;
}

function summarizePeriod(dates: string[], logsByDate: Record<string, DailyLog>, foods: FoodItem[], currentDate: string): PeriodSummary {
  const items = dates.map((date) => {
    const log = logsByDate[date];
    const total = calculateDailyNutrition(log?.entries ?? [], foods);
    return {
      date,
      weight: log?.weightKg && log.weightKg > 0 ? log.weightKg : 0,
      protein: total.protein,
      recorded: Boolean(log && (log.entries.length > 0 || log.weightKg > 0)),
    };
  });
  const recorded = items.filter((item) => item.recorded);
  const weights = items.filter((item) => item.weight > 0);
  const progressDays = Math.max(1, items.filter((item) => item.date <= currentDate).length);

  return {
    days: dates.length,
    progressDays,
    recordedDays: recorded.length,
    avgWeight: weights.length ? weights.reduce((sum, item) => sum + item.weight, 0) / weights.length : 0,
    weights: items.map((item) => ({ date: item.date, value: item.weight })),
    proteins: items.map((item) => ({ date: item.date, value: item.protein })),
  };
}

function createDisplayLog(date: string): DailyLog {
  return {
    date,
    weightKg: 0,
    dayType: "training",
    entries: [],
  };
}

export default App;
