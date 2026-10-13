import type { Product, Ingredient } from "@/data/products";

interface IngredientsListProps {
  ingredients: Product["ingredients"];
}

export default function IngredientsList({ ingredients }: IngredientsListProps) {
  if (!ingredients || ingredients.length === 0) {
    return (
      <p className="text-[13px] text-stone-500 italic py-2">
        Fresh whole-food ingredients listed upon preparation.
      </p>
    );
  }

  return (
    <ul
      className="divide-y divide-stone-200/70 border-y border-stone-200/70 font-body w-full"
      aria-label="Ingredients"
    >
      {ingredients.map((ingredient, i) => {
        let name = "";
        let amount = "";

        if (typeof ingredient === "string") {
          name = ingredient;
        } else if (ingredient && typeof ingredient === "object") {
          name = ingredient.name || "";
          const qty = (ingredient.quantity || "").trim();
          const unit = (ingredient.unit || "").trim();

          if (qty && unit) {
            // Avoid repeating unit if already present in qty
            if (qty.toLowerCase().endsWith(unit.toLowerCase())) {
              amount = qty;
            } else {
              amount = `${qty}${unit}`;
            }
          } else if (qty) {
            amount = qty;
          }
        }

        return (
          <li
            key={i}
            className="py-2.5 text-[14px] md:text-[15px] text-[#1A1A1A] font-medium flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full bg-[#6B8F56] shrink-0"
              />
              <span className="truncate">{name}</span>
            </div>
            {amount && (
              <span className="text-[13px] md:text-[14px] text-stone-600 font-mono font-medium shrink-0">
                — {amount}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
