import type { Product } from "@/data/products";

interface NutritionGridProps {
  nutrition: Product["nutrition"];
  weight?: string | null;
}

type NutritionItem = {
  label: string;
  value: string;
};

export default function NutritionGrid({ nutrition, weight }: NutritionGridProps) {
  const items: NutritionItem[] = [];

  if (weight && weight.trim()) {
    const cleanWeight = weight.trim();
    items.push({
      label: "Serving Size",
      value: cleanWeight.toLowerCase().includes("g") ? cleanWeight : `${cleanWeight}g`,
    });
  }

  if (nutrition.calories !== null && nutrition.calories !== undefined) {
    items.push({
      label: "Calories",
      value: `Approx. ${nutrition.calories} kcal`,
    });
  }

  if (nutrition.protein !== null && nutrition.protein !== undefined) {
    items.push({
      label: "Protein",
      value: `Approx. ${nutrition.protein}`,
    });
  }

  if (nutrition.carbs !== null && nutrition.carbs !== undefined) {
    items.push({
      label: "Carbohydrates",
      value: `Approx. ${nutrition.carbs}`,
    });
  }

  if (nutrition.fat !== null && nutrition.fat !== undefined) {
    items.push({
      label: "Fat",
      value: `Approx. ${nutrition.fat}`,
    });
  }

  if (nutrition.fiber !== null && nutrition.fiber !== undefined) {
    items.push({
      label: "Fiber",
      value: `Approx. ${nutrition.fiber}`,
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-[13px] text-[#1A1A1A]/50 font-body italic">
        Approximate nutrition values being updated.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 py-3 border-y border-stone-200/70">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col">
            <span className="text-[20px] md:text-[24px] font-heading font-800 text-[#1E3A2E] leading-tight">
              {item.value}
            </span>
            <span className="text-[11px] font-heading font-semibold tracking-[0.08em] uppercase text-[#1A1A1A]/50 mt-1">
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#1A1A1A]/40 mt-2 font-body">
        *Estimated nutritional values calculated from whole ingredient recipes.
      </p>
    </div>
  );
}
