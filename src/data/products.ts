import { CategoryKey } from "./categories";

export type Ingredient = {
  name: string;
  quantity: string;
};

export type Nutrition = {
  calories: number | null;
  protein: string | null;
  carbs: string | null;
  fat: string | null;
  fiber: string | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  whyYoullLikeIt: string;
  price: number | null; // Active Selling Price
  originalPrice?: number | null; // Optional Original/MRP Price (for discount strikethrough)
  isFeatured?: boolean; // Controls display in Featured Platters section
  image: string;
  ingredients: Ingredient[];
  nutrition: Nutrition;
  available: boolean;
  category: CategoryKey;
};

export const products: Product[] = [
  {
    id: "1",
    slug: "classic-overnight-oats",
    name: "Classic Overnight Oats",
    subtitle: "Oats • Milk/Curd • Banana • Chia • Honey",
    shortDescription: "Creamy overnight oats layered with banana, chia seeds, and raw honey.",
    description:
      "A wholesome, creamy bowl of overnight oats layered with chia seeds, fresh banana slices, and a natural drizzle of honey. Prepared ahead so slow-release carbs and clean energy are ready when you are.",
    whyYoullLikeIt:
      "Slow-release energy that keeps you full and focused throughout your morning. Clean, honest ingredients with zero fillers.",
    price: 59,
    originalPrice: 79,
    isFeatured: true,
    image: "/images/classic-overnight-oats.jpg",
    ingredients: [
      { name: "Oats", quantity: "55g" },
      { name: "Milk / curd", quantity: "150ml" },
      { name: "Banana", quantity: "50g" },
      { name: "Chia seeds", quantity: "5g" },
      { name: "Honey", quantity: "7g" },
    ],
    nutrition: {
      calories: 425,
      protein: "15g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "2",
    slug: "egg-and-pb-toast",
    name: "Egg & PB Toast",
    subtitle: "Boiled Eggs • Bread • Peanut Butter",
    shortDescription: "Two boiled eggs paired with toasted bread and wholesome peanut butter.",
    description:
      "Two perfectly boiled eggs served alongside two slices of toasted bread spread generously with peanut butter. A hearty, high-protein platter built for lasting satiety.",
    whyYoullLikeIt:
      "A powerhouse combination of 23g protein and healthy fats. Simple, filling, and genuinely satisfying without heavy seasoning.",
    price: 49,
    originalPrice: null,
    isFeatured: true,
    image: "/images/egg-pb-toast.jpg",
    ingredients: [
      { name: "Boiled eggs", quantity: "2 (~100g)" },
      { name: "Bread", quantity: "2 slices (~50g)" },
      { name: "Peanut butter", quantity: "20g" },
    ],
    nutrition: {
      calories: 430,
      protein: "23g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "3",
    slug: "pb-banana-sandwich",
    name: "PB Banana Sandwich",
    subtitle: "Bread • Peanut Butter • Banana",
    shortDescription: "Three slices of bread stacked with rich peanut butter and fresh banana.",
    description:
      "Three slices of wholesome bread layered with smooth peanut butter and sliced peeled banana. A naturally sweet, energizing sandwich with zero refined sugars.",
    whyYoullLikeIt:
      "Natural sweetness from banana paired with protein and good fats from peanut butter. Clean fuel for work, workouts, or study.",
    price: 49,
    originalPrice: 65,
    isFeatured: false,
    image: "/images/pb-banana-sandwich.jpg",
    ingredients: [
      { name: "Bread", quantity: "3 slices (~75g)" },
      { name: "Peanut butter", quantity: "30g" },
      { name: "Banana", quantity: "~100g peeled" },
    ],
    nutrition: {
      calories: 480,
      protein: "15g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "lunch",
  },
  {
    id: "4",
    slug: "banana-and-egg",
    name: "Banana & Egg",
    subtitle: "Boiled Bananas • Boiled Eggs",
    shortDescription: "Two boiled bananas and two boiled eggs for the cleanest everyday nutrition.",
    description:
      "Two boiled bananas and two perfectly boiled eggs — the simplest, purest everyday platter. Light, clean, easily digestible, and naturally nourishing.",
    whyYoullLikeIt:
      "Minimalist fuel at its finest. Just two whole-food staples delivering clean carbohydrates and bioavailable protein.",
    price: 49,
    originalPrice: null,
    isFeatured: false,
    image: "/images/banana-egg.jpg",
    ingredients: [
      { name: "Boiled banana", quantity: "2 (~200g peeled)" },
      { name: "Boiled eggs", quantity: "2 (~100g)" },
    ],
    nutrition: {
      calories: 350,
      protein: "14g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "5",
    slug: "pancake",
    name: "Honey Pancakes",
    subtitle: "Oat Pancakes • Boiled Egg • Honey",
    shortDescription: "Warm oat pancakes served with a boiled egg and a light drizzle of honey.",
    description:
      "Fluffy oat-based pancakes crafted with mashed banana, egg, milk, and a touch of honey, served with an additional boiled egg for a balanced macro profile.",
    whyYoullLikeIt:
      "Comfort food without the crash. High protein (27g) paired with wholesome complex carbs and gentle natural sweetness.",
    price: 59,
    originalPrice: 79,
    isFeatured: true,
    image: "/images/pancake.jpg",
    ingredients: [
      { name: "Oats", quantity: "40g" },
      { name: "Banana", quantity: "~100g peeled" },
      { name: "Egg in batter", quantity: "1 (~50g)" },
      { name: "Milk", quantity: "30ml" },
      { name: "Honey", quantity: "7g" },
      { name: "Oil/ghee & baking powder", quantity: "~3g" },
      { name: "Boiled egg", quantity: "1" },
    ],
    nutrition: {
      calories: 540,
      protein: "27g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "6",
    slug: "chia-banana-pudding",
    name: "Chia Banana Pudding",
    subtitle: "Chia Seeds • Milk • Banana • Honey • Dates & Nuts",
    shortDescription: "Silky chia pudding infused with fresh banana, honey, and nut crunch.",
    description:
      "A silky, nutrient-dense chia pudding soaked in fresh milk, sweetened with banana slices and raw honey, topped with chopped dates and crunchy mixed nuts.",
    whyYoullLikeIt:
      "Packed with soluble fiber, plant protein, and healthy omega fats. Digestively soothing, filling, and delicately sweet.",
    price: 59,
    originalPrice: null,
    isFeatured: false,
    image: "/images/chia-banana-pudding.jpg",
    ingredients: [
      { name: "Chia seeds", quantity: "20g" },
      { name: "Milk", quantity: "150ml" },
      { name: "Banana", quantity: "~50g peeled" },
      { name: "Honey", quantity: "7g" },
      { name: "Dates / nuts topping", quantity: "~10g" },
    ],
    nutrition: {
      calories: 330,
      protein: "11g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "dinner",
  },
  {
    id: "7",
    slug: "banana-oats-smoothie",
    name: "Banana Oats Smoothie",
    subtitle: "Banana • Oats • Milk • Honey",
    shortDescription: "Thick, drinkable blend of rolled oats, banana, milk, and honey.",
    description:
      "A thick, creamy blend of fresh banana, rolled oats, chilled milk, and honey. Complete morning nutrition in a fast, drinkable format.",
    whyYoullLikeIt:
      "Ideal for mornings on the move. Gives you sustained energy and genuine satiety with no artificial protein powders or syrups.",
    price: 49,
    originalPrice: 65,
    isFeatured: false,
    image: "/images/banana-oats-smoothie.jpg",
    ingredients: [
      { name: "Banana", quantity: "~100g peeled" },
      { name: "Oats", quantity: "20g" },
      { name: "Milk", quantity: "200ml" },
      { name: "Honey", quantity: "7g" },
    ],
    nutrition: {
      calories: 330,
      protein: "11g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "shakes-smoothies",
  },
  {
    id: "8",
    slug: "fruit-overnight-oats",
    name: "Fruit Overnight Oats",
    subtitle: "Oats • Milk/Curd • Chia • Mixed Fruits • Dates & Nuts",
    shortDescription: "Overnight oats layered with chia seeds, fresh fruits, and date-nut crunch.",
    description:
      "Overnight oats layered with chia seeds, fresh mixed fruits (banana, apple, and seasonal fruit), raw honey, and a crunch of dates and nuts.",
    whyYoullLikeIt:
      "A vibrant morning bowl loaded with antioxidants, fiber, and clean natural sugars. Refreshing and filling.",
    price: 79,
    originalPrice: 99,
    isFeatured: true,
    image: "/images/fruit-overnight-oats.jpg",
    ingredients: [
      { name: "Oats", quantity: "55g" },
      { name: "Milk / curd", quantity: "150ml" },
      { name: "Chia seeds", quantity: "5g" },
      { name: "Honey", quantity: "7g" },
      { name: "Mixed fruits", quantity: "90g" },
      { name: "Dates / nuts topping", quantity: "5g" },
    ],
    nutrition: {
      calories: 460,
      protein: "16g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: Product["category"]): Product[] {
  return products.filter((p) => p.category === category);
}

export function getAvailableProducts(): Product[] {
  return products.filter((p) => p.available);
}
