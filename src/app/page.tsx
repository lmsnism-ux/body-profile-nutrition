"use client";

import { useMemo, useState } from "react";
import { koreanDate } from "@/lib/date";
import { calculateDailyNutrition, calculateEntryNutrition, round, scoreDay, targets } from "@/lib/nutrition";
import { NutritionProvider, useNutrition } from "@/store/NutritionProvider";
import type { FoodItem, MealType, Nutrients } from "@/types/nutrition";

type TabId = "home" | "meals" | "foods";
type NutrientKey = keyof Omit<Nutrients, "fiber">;

const mealTypes: MealType[] = ["아침", "점심", "간식", "저녁", "추가섭취", "이탈음식"];

const nutrientLabels: Record<NutrientKey, { label: string; unit: string; color: string; limit?: boolean }> = {
  calories: { label: "칼로리", unit: "kcal", color: "from-teal-300 to-cyan-200" },
  carbs: { label: "탄수화물", unit: "g", color: "from-violet-300 to-fuchsia-300" },
  protein: { label: "단백질", unit: "g", color: "from-sky-300 to-blue-300" },
  fat: { label: "지방", unit: "g", color: "from-orange-300 to-amber-300" },
  sugar: { label: "당류", unit: "g", color: "from-yellow-200 to-amber-300", limit: true },
  sodium: { label: "나트륨", unit: "mg", color: "from-rose-300 to-red-300", limit: true },
};

const tabItems: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "home", label: "홈", icon: "⌂" },
  { id: "meals", label: "식단", icon: "+" },
  { id: "foods", label: "음식 DB", icon: "⌕" },
];

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
    <main className="min-h-dvh bg-[#0B0F14] text-[#F5F7FA]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[radial-gradient(circle_at_top,#17212B_0,#0B0F14_42%)]">
        <div className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
          {tab === "home" && <HomeView goMeals={() => setTab("meals")} />}
          {tab === "meals" && <MealsView />}
          {tab === "foods" && <FoodsView />}
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-white/10 bg-[#10151C]/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-2 rounded-[1.35rem] bg-white/[0.04] p-1.5">
            {tabItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-bold transition active:scale-[0.98] ${
                  tab === item.id ? "bg-white text-[#111827] shadow-lg shadow-black/30" : "text-[#9CA3AF]"
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
  const { profile, log, setDayType, setWeight, foods, loadDefaultMeals } = useNutrition();
  const total = useMemo(() => calculateDailyNutrition(log.entries, foods), [foods, log.entries]);
  const target = targets[log.dayType];
  const hasDeviation = log.entries.some((entry) => entry.mealType === "이탈음식");
  const score = scoreDay(total, target, hasDeviation);
  const mealCount = log.entries.length;
  const caloriePercent = Math.min(120, Math.round((total.calories / target.calories) * 100));

  return (
    <section className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#9CA3AF]">{koreanDate(log.date)}</p>
          <h1 className="mt-1 text-[2rem] font-black leading-tight tracking-normal">{profile.name}의 오늘</h1>
        </div>
        <span className="rounded-full bg-[#5EEAD4]/15 px-3 py-1.5 text-xs font-bold text-[#5EEAD4]">
          D-Body Profile
        </span>
      </header>

      <div className="rounded-[1.75rem] bg-white p-5 text-[#111827] shadow-2xl shadow-black/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#6B7280]">오늘 섭취</p>
            <p className="mt-2 text-5xl font-black tracking-normal">{round(total.calories)}</p>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">/ {target.calories} kcal · {caloriePercent}%</p>
          </div>
          <div className="rounded-2xl bg-[#ECFEFF] px-4 py-3 text-right">
            <p className="text-xs font-bold text-[#0F766E]">식단 점수</p>
            <p className="text-3xl font-black text-[#111827]">{score}</p>
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#5EEAD4] to-[#60A5FA] transition-all duration-500"
            style={{ width: `${Math.min(100, caloriePercent)}%` }}
          />
        </div>
        <button
          onClick={() => {
            if (mealCount === 0) loadDefaultMeals("chicken-23");
            goMeals();
          }}
          className="mt-5 w-full rounded-2xl bg-[#111827] py-4 text-base font-black text-white transition active:scale-[0.99]"
        >
          {mealCount === 0 ? "기본 식단 바로 입력" : "오늘 식단 수정하기"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="오늘 체중">
          <div className="flex items-end gap-1">
            <input
              value={log.weightKg}
              onChange={(event) => setWeight(Number(event.target.value))}
              className="w-24 bg-transparent text-4xl font-black outline-none"
              type="number"
              step="0.1"
              inputMode="decimal"
            />
            <span className="pb-1.5 text-sm font-bold text-[#9CA3AF]">kg</span>
          </div>
        </InfoCard>
        <InfoCard label="목표">
          <p className="text-4xl font-black">{profile.targetWeightKg}</p>
          <p className="mt-1 text-xs font-semibold text-[#9CA3AF]">kg · 체지방 {profile.targetBodyFatPercent}%</p>
        </InfoCard>
      </div>

      <div className="rounded-[1.35rem] bg-[#151A21] p-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <SegmentButton active={log.dayType === "training"} onClick={() => setDayType("training")}>
            운동일
          </SegmentButton>
          <SegmentButton active={log.dayType === "rest"} onClick={() => setDayType("rest")}>
            휴식일
          </SegmentButton>
        </div>
      </div>

      <div className="space-y-3">
        {(Object.keys(nutrientLabels) as NutrientKey[]).map((key) => (
          <ProgressRow key={key} name={key} value={total[key]} target={target[key]} />
        ))}
      </div>
    </section>
  );
}

function MealsView() {
  const { log, foods, loadDefaultMeals, addEntry, updateEntryAmount, removeEntry } = useNutrition();
  const [chicken, setChicken] = useState<"chicken-18" | "chicken-23">("chicken-23");
  const favoriteFoods = foods.filter((food) => food.favorite);
  const total = useMemo(() => calculateDailyNutrition(log.entries, foods), [foods, log.entries]);

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm font-medium text-[#9CA3AF]">기본 식단을 불러오고 실제 먹은 양만 수정하세요</p>
        <h1 className="mt-1 text-[2rem] font-black tracking-normal">오늘 식단</h1>
      </header>

      <div className="rounded-[1.75rem] bg-[#151A21] p-4 shadow-xl shadow-black/20">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#0B0F14] p-1.5">
          <SegmentButton active={chicken === "chicken-18"} onClick={() => setChicken("chicken-18")}>
            닭 18g
          </SegmentButton>
          <SegmentButton active={chicken === "chicken-23"} onClick={() => setChicken("chicken-23")}>
            닭 23g
          </SegmentButton>
        </div>
        <button
          onClick={() => loadDefaultMeals(chicken)}
          className="mt-3 w-full rounded-2xl bg-[#5EEAD4] py-4 text-base font-black text-[#111827] shadow-lg shadow-teal-950/30 transition active:scale-[0.99]"
        >
          오늘 기본 식단 불러오기
        </button>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MetricPill label="kcal" value={round(total.calories)} />
          <MetricPill label="단백질" value={`${round(total.protein)}g`} />
          <MetricPill label="입력" value={`${log.entries.length}개`} />
        </div>
      </div>

      {mealTypes.map((mealType) => {
        const entries = log.entries.filter((entry) => entry.mealType === mealType);
        const mealTotal = calculateDailyNutrition(entries, foods);

        return (
          <div key={mealType} className="rounded-[1.5rem] bg-[#151A21] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{mealType}</h2>
                <p className="mt-0.5 text-xs font-semibold text-[#9CA3AF]">
                  {entries.length ? `${round(mealTotal.calories)}kcal · 단백질 ${round(mealTotal.protein)}g` : "미입력"}
                </p>
              </div>
              <select
                aria-label={`${mealType} 음식 추가`}
                className="max-w-36 rounded-2xl bg-[#0B0F14] px-3 py-3 text-sm font-bold outline-none"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) addEntry(event.target.value, mealType);
                  event.target.value = "";
                }}
              >
                <option value="">+ 추가</option>
                {favoriteFoods.map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-3">
              {entries.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0B0F14]/80 px-4 py-5 text-center text-sm font-semibold text-[#9CA3AF]">
                  음식 추가 버튼으로 기록하세요
                </div>
              )}
              {entries.map((entry) => {
                const food = foods.find((item) => item.id === entry.foodId);
                const nutrition = calculateEntryNutrition(entry, food);
                return (
                  <div key={entry.id} className="rounded-2xl bg-[#0B0F14] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black">{food?.name ?? "삭제된 음식"}</p>
                        <p className="mt-1 text-xs font-semibold text-[#9CA3AF]">
                          {entry.time ? `${entry.time} · ` : ""}
                          {round(nutrition.calories)}kcal · 단백질 {round(nutrition.protein)}g
                        </p>
                      </div>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-300"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2">
                      <AmountButton onClick={() => updateEntryAmount(entry.id, entry.amount - stepFor(entry.unit))}>-</AmountButton>
                      <div className="flex h-12 items-center rounded-2xl bg-white/[0.06] px-3">
                        <input
                          className="min-w-0 flex-1 bg-transparent text-center text-xl font-black outline-none"
                          type="number"
                          value={entry.amount}
                          step={stepFor(entry.unit)}
                          inputMode="decimal"
                          onChange={(event) => updateEntryAmount(entry.id, Number(event.target.value))}
                        />
                        <span className="w-8 text-center text-sm font-bold text-[#9CA3AF]">{entry.unit}</span>
                      </div>
                      <AmountButton onClick={() => updateEntryAmount(entry.id, entry.amount + stepFor(entry.unit))}>+</AmountButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function FoodsView() {
  const { foods, addFood } = useNutrition();
  const [query, setQuery] = useState("");
  const filtered = foods.filter((food) => `${food.name} ${food.brand ?? ""} ${food.category}`.includes(query.trim()));

  function addCustomFood() {
    const name = prompt("음식명을 입력하세요.");
    if (!name) return;
    addFood({
      id: crypto.randomUUID(),
      name,
      baseAmount: 100,
      unit: "g",
      category: "직접등록",
      favorite: true,
      nutrients: { calories: 0, carbs: 0, protein: 0, fat: 0, sugar: 0, sodium: 0 },
    });
  }

  return (
    <section className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#9CA3AF]">자주 먹는 음식과 기준량</p>
          <h1 className="mt-1 text-[2rem] font-black tracking-normal">음식 DB</h1>
        </div>
        <button
          onClick={addCustomFood}
          className="shrink-0 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#111827] transition active:scale-[0.98]"
        >
          직접 등록
        </button>
      </header>
      <div className="sticky top-0 z-10 -mx-5 bg-[#0B0F14]/90 px-5 py-2 backdrop-blur-xl">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="음식명, 브랜드, 카테고리 검색"
          className="w-full rounded-2xl bg-[#151A21] px-4 py-4 text-base font-bold outline-none placeholder:text-[#6B7280]"
        />
      </div>
      <div className="space-y-3">
        {filtered.map((food) => (
          <FoodCard key={food.id} food={food} />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-[1.5rem] bg-[#151A21] p-6 text-center text-sm font-bold text-[#9CA3AF]">
            검색 결과가 없습니다
          </div>
        )}
      </div>
    </section>
  );
}

function ProgressRow({ name, value, target }: { name: NutrientKey; value: number; target: number }) {
  const meta = nutrientLabels[name];
  const percent = target ? Math.round((value / target) * 100) : 0;
  const status = meta.limit ? (value <= target ? "적정" : "경고") : percent < 90 ? "부족" : percent <= 110 ? "적정" : "초과";
  const remain = Math.max(0, target - value);
  const width = Math.min(100, percent);

  return (
    <div className="rounded-[1.35rem] bg-[#151A21] p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black">{meta.label}</p>
          <p className="mt-1 text-sm font-semibold text-[#9CA3AF]">
            {round(value)} / {target}
            {meta.unit} · {percent}%
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-500`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-3 text-xs font-bold text-[#9CA3AF]">
        {remain <= 0 ? `${meta.label} 목표 달성` : `${meta.label} ${round(remain)}${meta.unit} 남음`}
      </p>
    </div>
  );
}

function FoodCard({ food }: { food: FoodItem }) {
  const n = food.nutrients;
  return (
    <div className="rounded-[1.5rem] bg-[#151A21] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black">{food.name}</p>
          <p className="mt-1 text-sm font-semibold text-[#9CA3AF]">
            {food.brand ? `${food.brand} · ` : ""}
            {food.baseAmount}
            {food.unit} 기준 · {food.category}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-[#F5F7FA]">
          {food.favorite ? "즐겨찾기" : "일반"}
        </span>
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

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.35rem] bg-[#151A21] p-4">
      <p className="text-xs font-bold text-[#9CA3AF]">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl py-3 text-sm font-black transition active:scale-[0.98] ${
        active ? "bg-white text-[#111827]" : "text-[#9CA3AF]"
      }`}
    >
      {children}
    </button>
  );
}

function AmountButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="h-12 rounded-2xl bg-white/[0.08] text-xl font-black transition active:scale-[0.95]">
      {children}
    </button>
  );
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#0B0F14] px-2 py-3">
      <p className="text-xs font-bold text-[#9CA3AF]">{label}</p>
      <p className="mt-1 truncate text-base font-black">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "적정" | "부족" | "초과" | "경고" }) {
  const className =
    status === "적정"
      ? "bg-green-500/15 text-green-300"
      : status === "부족"
        ? "bg-yellow-400/15 text-yellow-200"
        : "bg-red-500/15 text-red-300";

  return <span className={`rounded-full px-3 py-1.5 text-xs font-black ${className}`}>{status}</span>;
}

function Mini({ label, value, unit = "" }: { label: string; value?: number; unit?: string }) {
  return (
    <div className="rounded-2xl bg-[#0B0F14] p-3">
      <p className="text-xs font-bold text-[#9CA3AF]">{label}</p>
      <p className="mt-1 truncate font-black">
        {value ?? "-"}
        {value !== undefined ? unit : ""}
      </p>
    </div>
  );
}

function stepFor(unit: string) {
  return unit === "g" || unit === "ml" ? 10 : 1;
}

export default App;
