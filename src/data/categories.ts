export const MENU_CATEGORIES = [
  {
    key: "breakfast",
    displayName: "The Morning Edit",
    description: "Wholesome, slow-release breakfast platters to start your day right.",
  },
  {
    key: "lunch",
    displayName: "Midday Plates",
    description: "Satisfying, high-protein midday fuel built for lasting satiety.",
  },
  {
    key: "dinner",
    displayName: "Evening Plates",
    description: "Light, nourishing plates for an effortless, wholesome evening.",
  },
  {
    key: "shakes-smoothies",
    displayName: "Blended Goodness",
    description: "Thick, drinkable whole-food blends with clean macros.",
  },
  {
    key: "fresh-juice",
    displayName: "Fresh Press",
    description: "Pure, freshly pressed fruit and vegetable juices.",
  },
] as const;

export type CategoryKey = (typeof MENU_CATEGORIES)[number]["key"];

export const VALID_CATEGORY_KEYS: readonly CategoryKey[] = MENU_CATEGORIES.map(
  (c) => c.key
);

export function isValidCategoryKey(key: unknown): key is CategoryKey {
  return typeof key === "string" && VALID_CATEGORY_KEYS.includes(key as CategoryKey);
}

export function getCategoryDisplayName(key: string): string {
  const match = MENU_CATEGORIES.find((c) => c.key === key);
  if (match) return match.displayName;
  switch (key) {
    case "oats":
    case "eggs":
    case "pancake":
    case "fruit":
      return "The Morning Edit";
    case "sandwich":
      return "Midday Plates";
    case "pudding":
      return "Evening Plates";
    case "smoothie":
      return "Blended Goodness";
    default:
      return key.charAt(0).toUpperCase() + key.slice(1);
  }
}

export function normalizeCategoryKey(key: string): CategoryKey {
  switch (key) {
    case "breakfast":
    case "oats":
    case "eggs":
    case "pancake":
    case "fruit":
      return "breakfast";
    case "lunch":
    case "sandwich":
      return "lunch";
    case "dinner":
    case "pudding":
      return "dinner";
    case "shakes-smoothies":
    case "smoothie":
      return "shakes-smoothies";
    case "fresh-juice":
      return "fresh-juice";
    default:
      return "breakfast";
  }
}
