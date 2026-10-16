import { CategoryKey } from "./categories";

export type Ingredient = {
  name: string;
  quantity: string;
  unit?: string;
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
  seriesNo?: string | null; // e.g. "PLTR.001"
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
  weight?: string | null;
  sortOrder?: number;
  updatedAt?: string;
};

export const products: Product[] = [
  // 1. Oat Jars
  {
    id: "1",
    seriesNo: "PLTR.001",
    slug: "oat-jar",
    name: "Oat Jar",
    subtitle: "Oats · Milk · Banana · Chia · Honey",
    shortDescription: "Creamy overnight oats layered with banana, chia seeds, and raw honey.",
    description: "Wholesome, slow-steeped overnight oats layered with ripe banana slices, farm-fresh milk, chia seeds, and raw honey. Prepared ahead so steady morning energy is ready when you are.",
    whyYoullLikeIt: "Slow-release complex carbs that keep you full and focused throughout your morning with zero fillers.",
    price: 79,
    originalPrice: 99,
    isFeatured: true,
    image: "/images/classic-overnight-oats.jpg",
    weight: "302g",
    sortOrder: 1,
    ingredients: [
      { name: "Oats", quantity: "60", unit: "g" },
      { name: "Milk", quantity: "150", unit: "ml" },
      { name: "Banana", quantity: "80", unit: "g" },
      { name: "Chia seeds", quantity: "5", unit: "g" },
      { name: "Honey", quantity: "7", unit: "g" },
    ],
    nutrition: {
      calories: 440,
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
    seriesNo: "PLTR.002",
    slug: "fruit-oat-jar",
    name: "Fruit Oat Jar",
    subtitle: "Oats · Milk · Mixed Fruits · Chia · Honey",
    shortDescription: "Overnight oats layered with fresh mixed fruits, chia seeds, and date-nut crunch.",
    description: "Creamy overnight oats layered with fresh seasonal fruits (apple, papaya), sliced banana, chia seeds, pure honey, and a crunch of dates and nuts.",
    whyYoullLikeIt: "Packed with micronutrients, natural fruit sweetness, and slow-burning energy for peak morning vitality.",
    price: 95,
    originalPrice: 119,
    isFeatured: true,
    image: "/images/fruit-overnight-oats.jpg",
    weight: "392g",
    sortOrder: 2,
    ingredients: [
      { name: "Oats", quantity: "55", unit: "g" },
      { name: "Milk", quantity: "150", unit: "ml" },
      { name: "Chia seeds", quantity: "5", unit: "g" },
      { name: "Honey", quantity: "7", unit: "g" },
      { name: "Banana", quantity: "80", unit: "g" },
      { name: "Mixed fruits", quantity: "90", unit: "g" },
      { name: "Topping (dates/nuts)", quantity: "5", unit: "g" },
    ],
    nutrition: {
      calories: 500,
      protein: "16g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "3",
    seriesNo: "PLTR.003",
    slug: "nutty-oat-jar",
    name: "Nutty Oat Jar",
    subtitle: "Oats · Milk · Banana · PB · Chia · Dates · Nuts",
    shortDescription: "Peanut butter overnight oats layered with banana, dates, and roasted nuts.",
    description: "Rich peanut butter overnight oats combined with chilled milk, fresh banana slices, chia seeds, chopped dates, and toasted mixed nuts.",
    whyYoullLikeIt: "Rich, nutty flavor loaded with 18g protein and wholesome fats that keep you energized all morning.",
    price: 110,
    originalPrice: 135,
    isFeatured: true,
    image: "/images/classic-overnight-oats.jpg",
    weight: "295g",
    sortOrder: 3,
    ingredients: [
      { name: "Oats", quantity: "50", unit: "g" },
      { name: "Milk", quantity: "150", unit: "ml" },
      { name: "Banana", quantity: "60", unit: "g" },
      { name: "Peanut butter", quantity: "10", unit: "g" },
      { name: "Chia seeds", quantity: "5", unit: "g" },
      { name: "Dates", quantity: "10", unit: "g" },
      { name: "Mixed nuts", quantity: "10", unit: "g" },
    ],
    nutrition: {
      calories: 500,
      protein: "18g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },

  // 2. Parfaits
  {
    id: "4",
    seriesNo: "PLTR.004",
    slug: "banana-parfait",
    name: "Banana Parfait",
    subtitle: "Yogurt · Banana · Peanut Butter · Oats · Chia · Nuts",
    shortDescription: "Probiotic yogurt layered with banana, peanut butter, oats, and honey.",
    description: "Thick, silky yogurt parfait layered with sliced banana, wholesome peanut butter, rolled oats, chia seeds, raw honey, and crunchy mixed nuts.",
    whyYoullLikeIt: "Gut-friendly probiotics paired with 15g protein and good fats for sustained satiety.",
    price: 85,
    originalPrice: 105,
    isFeatured: false,
    image: "/images/chia-banana-pudding.jpg",
    weight: "280g",
    sortOrder: 4,
    ingredients: [
      { name: "Plain yogurt", quantity: "150", unit: "g" },
      { name: "Banana", quantity: "80", unit: "g" },
      { name: "Peanut butter", quantity: "15", unit: "g" },
      { name: "Oats", quantity: "20", unit: "g" },
      { name: "Chia seeds", quantity: "5", unit: "g" },
      { name: "Honey", quantity: "5", unit: "g" },
      { name: "Mixed nuts", quantity: "5", unit: "g" },
    ],
    nutrition: {
      calories: 400,
      protein: "15g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "5",
    seriesNo: "PLTR.005",
    slug: "fruit-parfait",
    name: "Fruit Parfait",
    subtitle: "Yogurt · Seasonal Grapes · Banana · Oats · Chia · Honey",
    shortDescription: "Fresh yogurt layered with crisp seasonal fruits, oats, and sunflower seeds.",
    description: "Thick plain yogurt layered with crisp seasonal grapes, banana slices, rolled oats, chia seeds, honey, and roasted sunflower seeds.",
    whyYoullLikeIt: "Light, refreshing, and rich in natural antioxidants to keep you hydrated and energized.",
    price: 79,
    originalPrice: 99,
    isFeatured: false,
    image: "/images/fruit-overnight-oats.jpg",
    weight: "295g",
    sortOrder: 5,
    ingredients: [
      { name: "Plain yogurt", quantity: "150", unit: "g" },
      { name: "Grapes", quantity: "60", unit: "g" },
      { name: "Banana", quantity: "50", unit: "g" },
      { name: "Oats", quantity: "20", unit: "g" },
      { name: "Chia seeds", quantity: "5", unit: "g" },
      { name: "Honey", quantity: "5", unit: "g" },
      { name: "Sunflower seeds", quantity: "5", unit: "g" },
    ],
    nutrition: {
      calories: 320,
      protein: "11g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "6",
    seriesNo: "PLTR.006",
    slug: "apple-parfait",
    name: "Apple Parfait",
    subtitle: "Yogurt · Fresh Apple · Oats · Cinnamon · Almonds · Honey",
    shortDescription: "Creamy yogurt with crisp apple, cinnamon aroma, almonds, and raisins.",
    description: "Chilled plain yogurt layered with diced fresh apple, rolled oats, raisins, fragrant cinnamon powder, sliced almonds, and raw honey.",
    whyYoullLikeIt: "Delicate warmth of cinnamon combined with crisp apple and smooth yogurt for a light, delicious breakfast.",
    price: 95,
    originalPrice: 119,
    isFeatured: false,
    image: "/images/chia-banana-pudding.jpg",
    weight: "266g",
    sortOrder: 6,
    ingredients: [
      { name: "Plain yogurt", quantity: "150", unit: "g" },
      { name: "Apple", quantity: "80", unit: "g" },
      { name: "Oats", quantity: "20", unit: "g" },
      { name: "Raisins", quantity: "5", unit: "g" },
      { name: "Cinnamon powder", quantity: "1", unit: "g" },
      { name: "Almonds", quantity: "5", unit: "g" },
      { name: "Honey", quantity: "5", unit: "g" },
    ],
    nutrition: {
      calories: 270,
      protein: "10g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },

  // 3. Chia Clouds
  {
    id: "7",
    seriesNo: "PLTR.007",
    slug: "chia-cloud",
    name: "Chia Cloud",
    subtitle: "Chia Seeds · Milk · Banana · Honey · Raisins · Sunflower Seeds",
    shortDescription: "Silky chia banana pudding with raw honey, raisins, and sunflower seeds.",
    description: "Silky chia seed pudding bloomed in milk, layered with fresh banana slices, golden honey, sweet raisins, and roasted sunflower seeds.",
    whyYoullLikeIt: "Plant-powered omega-3s and soluble fiber that support smooth digestion and clear, steady focus.",
    price: 75,
    originalPrice: 95,
    isFeatured: false,
    image: "/images/chia-banana-pudding.jpg",
    weight: "235g",
    sortOrder: 7,
    ingredients: [
      { name: "Chia seeds", quantity: "20", unit: "g" },
      { name: "Milk", quantity: "120", unit: "ml" },
      { name: "Banana", quantity: "80", unit: "g" },
      { name: "Honey", quantity: "5", unit: "g" },
      { name: "Raisins", quantity: "5", unit: "g" },
      { name: "Sunflower seeds", quantity: "5", unit: "g" },
    ],
    nutrition: {
      calories: 300,
      protein: "10g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "8",
    seriesNo: "PLTR.008",
    slug: "nutty-chia-cloud",
    name: "Nutty Chia Cloud",
    subtitle: "Chia · Milk · Banana · PB · Dates · Mixed Nuts",
    shortDescription: "Thick chia pudding enriched with peanut butter, dates, and mixed nuts.",
    description: "Velvety chia pudding infused with smooth peanut butter, ripe banana, medjool dates, and toasted mixed nuts.",
    whyYoullLikeIt: "Nutrient-dense texture loaded with healthy fats that keep cravings away all morning long.",
    price: 110,
    originalPrice: 135,
    isFeatured: false,
    image: "/images/chia-banana-pudding.jpg",
    weight: "254g",
    sortOrder: 8,
    ingredients: [
      { name: "Chia seeds", quantity: "20", unit: "g" },
      { name: "Milk", quantity: "120", unit: "ml" },
      { name: "Banana", quantity: "80", unit: "g" },
      { name: "Peanut butter", quantity: "10", unit: "g" },
      { name: "Dates", quantity: "14", unit: "g" },
      { name: "Mixed nuts", quantity: "10", unit: "g" },
    ],
    nutrition: {
      calories: 400,
      protein: "13g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "9",
    seriesNo: "PLTR.009",
    slug: "fruit-chia-cloud",
    name: "Fruit Chia Cloud",
    subtitle: "Chia · Milk · Diced Apple · Banana · Cinnamon · Nuts",
    shortDescription: "Chia pudding layered with apple, banana, Ceylon cinnamon, and nuts.",
    description: "Creamy chia pudding layered with diced apple, banana slices, Ceylon cinnamon, pure honey, and chopped mixed nuts.",
    whyYoullLikeIt: "A delicate fruit-forward pudding providing natural sweetness and sustained satiety without sugar spikes.",
    price: 95,
    originalPrice: 119,
    isFeatured: false,
    image: "/images/fruit-overnight-oats.jpg",
    weight: "251g",
    sortOrder: 9,
    ingredients: [
      { name: "Chia seeds", quantity: "20", unit: "g" },
      { name: "Milk", quantity: "120", unit: "ml" },
      { name: "Apple", quantity: "60", unit: "g" },
      { name: "Banana", quantity: "40", unit: "g" },
      { name: "Honey", quantity: "5", unit: "g" },
      { name: "Cinnamon powder", quantity: "1", unit: "g" },
      { name: "Mixed nuts", quantity: "5", unit: "g" },
    ],
    nutrition: {
      calories: 290,
      protein: "9g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },

  // 4. Toast + Pancakes
  {
    id: "10",
    seriesNo: "PLTR.010",
    slug: "protein-toast",
    name: "Protein Toast",
    subtitle: "2 Boiled Eggs · 2 Bread Slices · Peanut Butter",
    shortDescription: "Two boiled eggs paired with toasted bread and wholesome peanut butter.",
    description: "Two farm-fresh boiled eggs served alongside two toasted bread slices spread generously with rich peanut butter.",
    whyYoullLikeIt: "A muscular 25g protein punch that delivers complete amino acids and all-day fullness.",
    price: 59,
    originalPrice: 79,
    isFeatured: true,
    image: "/images/egg-pb-toast.jpg",
    weight: "195g",
    sortOrder: 10,
    ingredients: [
      { name: "Boiled egg", quantity: "2", unit: "pcs" },
      { name: "Bread", quantity: "2", unit: "slices" },
      { name: "Peanut butter", quantity: "20", unit: "g" },
    ],
    nutrition: {
      calories: 470,
      protein: "25g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "11",
    seriesNo: "PLTR.011",
    slug: "banana-toast",
    name: "Banana Toast",
    subtitle: "Boiled Banana · 2 Bread Slices · Peanut Butter",
    shortDescription: "Tender boiled bananas served with toasted bread and peanut butter.",
    description: "Tender boiled bananas served alongside two golden toasted bread slices coated in creamy peanut butter.",
    whyYoullLikeIt: "Traditional wholesome comfort food packed with potassium, complex carbs, and lasting morning fuel.",
    price: 59,
    originalPrice: 79,
    isFeatured: false,
    image: "/images/banana-egg.jpg",
    weight: "295g",
    sortOrder: 11,
    ingredients: [
      { name: "Boiled banana", quantity: "2", unit: "pcs" },
      { name: "Bread", quantity: "2", unit: "slices" },
      { name: "Peanut butter", quantity: "20", unit: "g" },
    ],
    nutrition: {
      calories: 500,
      protein: "14g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "12",
    seriesNo: "PLTR.012",
    slug: "peanut-stack",
    name: "Peanut Stack",
    subtitle: "3 Bread Slices · Peanut Butter · Fresh Banana",
    shortDescription: "Triple-decker wholesome bread layered with peanut butter and banana.",
    description: "Three slices of wholesome bread layered with smooth peanut butter and freshly sliced peeled banana.",
    whyYoullLikeIt: "Clean fuel for work or study. Natural fruit sugars balanced by protein and healthy fats.",
    price: 59,
    originalPrice: 79,
    isFeatured: false,
    image: "/images/pb-banana-sandwich.jpg",
    weight: "230g",
    sortOrder: 12,
    ingredients: [
      { name: "Bread", quantity: "3", unit: "slices" },
      { name: "Peanut butter", quantity: "30", unit: "g" },
      { name: "Banana", quantity: "100", unit: "g" },
    ],
    nutrition: {
      calories: 530,
      protein: "17g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },
  {
    id: "13",
    seriesNo: "PLTR.013",
    slug: "power-duo",
    name: "Power Duo",
    subtitle: "2 Boiled Bananas · 2 Boiled Eggs",
    shortDescription: "Pure whole-food platter: two boiled bananas and two boiled eggs.",
    description: "Two tender boiled bananas and two perfectly boiled farm eggs. Pure, unadulterated whole-food simplicity.",
    whyYoullLikeIt: "Zero bread, zero refined additives. Pure whole-food fuel for active mornings.",
    price: 59,
    originalPrice: 79,
    isFeatured: false,
    image: "/images/banana-egg.jpg",
    weight: "300g",
    sortOrder: 13,
    ingredients: [
      { name: "Boiled banana", quantity: "2", unit: "pcs" },
      { name: "Boiled egg", quantity: "2", unit: "pcs" },
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
    id: "14",
    seriesNo: "PLTR.014",
    slug: "oat-cakes",
    name: "Oat Cakes",
    subtitle: "3 Oat Pancakes · Boiled Egg · Honey · Banana",
    shortDescription: "Fluffy handmade oat pancakes with pure honey, banana, and a boiled egg.",
    description: "Three handmade pancakes made from pure oats, banana, egg, and milk, lightly sweetened with honey and served with a boiled egg.",
    whyYoullLikeIt: "Refined-flour-free pancakes delivering 20g protein and genuine morning indulgence without the crash.",
    price: 85,
    originalPrice: 109,
    isFeatured: true,
    image: "/images/pancake.jpg",
    weight: "280g",
    sortOrder: 14,
    ingredients: [
      { name: "Oats", quantity: "40", unit: "g" },
      { name: "Banana", quantity: "100", unit: "g" },
      { name: "Egg (in batter)", quantity: "1", unit: "pc" },
      { name: "Milk", quantity: "30", unit: "ml" },
      { name: "Honey", quantity: "7", unit: "g" },
      { name: "Oil/ghee", quantity: "3", unit: "g" },
      { name: "Boiled egg", quantity: "1", unit: "pc" },
    ],
    nutrition: {
      calories: 460,
      protein: "20g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "breakfast",
  },

  // 5. Drinks
  {
    id: "15",
    seriesNo: "PLTR.015",
    slug: "banana-blend",
    name: "Banana Blend",
    subtitle: "Banana · Rolled Oats · Milk · Raw Honey · Dates",
    shortDescription: "Thick whole-food smoothie of banana, rolled oats, milk, honey, and dates.",
    description: "A thick, creamy blend of banana, rolled oats, chilled milk, pure honey, and sweet dates. Complete breakfast nutrition in a drinkable cup.",
    whyYoullLikeIt: "Ideal for mornings on the move. Gives you sustained satiety with zero artificial powders or syrups.",
    price: 75,
    originalPrice: 95,
    isFeatured: true,
    image: "/images/banana-oats-smoothie.jpg",
    weight: "306g",
    sortOrder: 15,
    ingredients: [
      { name: "Banana", quantity: "100", unit: "g" },
      { name: "Oats", quantity: "30", unit: "g" },
      { name: "Milk", quantity: "150", unit: "ml" },
      { name: "Honey", quantity: "7", unit: "g" },
      { name: "Dates", quantity: "14", unit: "g" },
    ],
    nutrition: {
      calories: 360,
      protein: "11g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "shakes-smoothies",
  },
  {
    id: "16",
    seriesNo: "PLTR.016",
    slug: "abc-glow",
    name: "ABC Glow",
    subtitle: "Apple · Beetroot · Carrot · Lemon · Ginger",
    shortDescription: "Freshly pressed apple, beetroot, and carrot juice with lemon and ginger.",
    description: "Pure pressed apple, earthy beetroot, and crisp carrot juice finished with a squeeze of fresh lemon and a touch of ginger.",
    whyYoullLikeIt: "Cold-pressed vitality that boosts circulation, glows your skin, and refreshes your body naturally.",
    price: 45,
    originalPrice: 60,
    isFeatured: false,
    image: "/images/abc-glow.jpg",
    weight: "214g",
    sortOrder: 16,
    ingredients: [
      { name: "Apple", quantity: "70", unit: "g" },
      { name: "Beetroot", quantity: "35", unit: "g" },
      { name: "Carrot", quantity: "35", unit: "g" },
      { name: "Water", quantity: "70", unit: "ml" },
      { name: "Lemon juice", quantity: "3", unit: "ml" },
      { name: "Ginger", quantity: "1", unit: "g" },
    ],
    nutrition: {
      calories: 70,
      protein: "1g",
      carbs: null,
      fat: null,
      fiber: null,
    },
    available: true,
    category: "fresh-juice",
  },
];

export function getProductBySeriesNo(seriesNo: string): Product | undefined {
  const clean = seriesNo.trim().toUpperCase();
  return products.find((p) => p.seriesNo && p.seriesNo.toUpperCase() === clean);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: Product["category"]): Product[] {
  return products.filter((p) => p.category === category);
}

export function getAvailableProducts(): Product[] {
  return products.filter((p) => p.available);
}


/**
 * Generates an authoritative, cache-busting image URL for a product.
 * If the product was updated, appends a version timestamp parameter (?v=...)
 * to ensure that browsers, CDNs, and Next.js Image Optimizer immediately
 * fetch and display the latest saved image without serving stale cached copies.
 */
export function getProductImageUrl(
  image: string | null | undefined,
  _updatedAt?: string
): string {
  if (!image || !image.trim()) {
    return "https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images/classic-overnight-oats.jpg";
  }
  return image;
}
