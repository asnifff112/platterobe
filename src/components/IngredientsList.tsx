import type { Product } from "@/data/products";

interface IngredientsListProps {
  ingredients: Product["ingredients"];
}

export default function IngredientsList({ ingredients }: IngredientsListProps) {
  return (
    <ul
      className="divide-y divide-stone-200/70 border-y border-stone-200/70 font-body w-full"
      aria-label="Ingredients"
    >
      {ingredients.map((ingredient, i) => {
        const name = typeof ingredient === "string" ? ingredient : ingredient.name;
        return (
          <li
            key={i}
            className="py-2.5 text-[14px] md:text-[15px] text-[#1A1A1A] font-medium flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full bg-[#6B8F56] shrink-0"
            />
            <span>{name}</span>
          </li>
        );
      })}
    </ul>
  );
}
