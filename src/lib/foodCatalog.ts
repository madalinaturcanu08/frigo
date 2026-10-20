import type { Category } from './categories';

/**
 * Products the on-device AI matches unknown receipt lines against (session 8).
 * Each product is written in Romanian, Russian and English; the AI compares the *meaning* of a receipt line
 * with every name and suggests the closest product. `food: false` = things that don't go in the fridge.
 *
 * After editing this list, run `npm run ai:catalog` to recompute public/ai/catalog.json.
 */
export interface CatalogProduct {
  ro: string;
  ru: string;
  en: string;
  category: Category;
  food?: false;
}

const p = (ro: string, ru: string, en: string, category: Category, food?: false): CatalogProduct =>
  food === false ? { ro, ru, en, category, food } : { ro, ru, en, category };

export const FOOD_CATALOG: CatalogProduct[] = [
  // dairy
  p('Lapte', 'Молоко', 'Milk', 'dairy'),
  p('Chefir', 'Кефир', 'Kefir', 'dairy'),
  p('Iaurt', 'Йогурт', 'Yogurt', 'dairy'),
  p('Iaurt cu fructe', 'Фруктовый йогурт', 'Fruit yogurt', 'dairy'),
  p('Smântână', 'Сметана', 'Sour cream', 'dairy'),
  p('Unt', 'Сливочное масло', 'Butter', 'dairy'),
  p('Frișcă', 'Сливки', 'Cream', 'dairy'),
  p('Lapte bătut', 'Ряженка', 'Baked fermented milk', 'dairy'),
  p('Brânzică glazurată', 'Сырок глазированный', 'Glazed curd snack', 'dairy'),
  p('Desert de brânză', 'Творожный десерт', 'Curd dessert', 'dairy'),
  p('Lapte condensat', 'Сгущёнка', 'Condensed milk', 'dairy'),
  // cheese
  p('Brânză de vaci', 'Творог', 'Cottage cheese', 'cheese'),
  p('Brânză', 'Брынза', 'Brinza cheese', 'cheese'),
  p('Telemea', 'Брынза', 'Feta-style cheese', 'cheese'),
  p('Cașcaval', 'Сыр', 'Hard cheese', 'cheese'),
  p('Mozzarella', 'Моцарелла', 'Mozzarella', 'cheese'),
  p('Brânză topită', 'Плавленый сыр', 'Processed cheese', 'cheese'),
  p('Urdă', 'Урда', 'Whey cheese', 'cheese'),
  p('Parmezan', 'Пармезан', 'Parmesan', 'cheese'),
  // eggs
  p('Ouă', 'Яйца', 'Eggs', 'eggs'),
  p('Ouă de prepeliță', 'Перепелиные яйца', 'Quail eggs', 'eggs'),
  // meat
  p('Piept de pui', 'Куриное филе', 'Chicken breast', 'meat'),
  p('Pulpe de pui', 'Куриные бёдра', 'Chicken legs', 'meat'),
  p('Aripioare de pui', 'Куриные крылья', 'Chicken wings', 'meat'),
  p('Curcan', 'Индейка', 'Turkey', 'meat'),
  p('Carne de porc', 'Свинина', 'Pork', 'meat'),
  p('Carne de vită', 'Говядина', 'Beef', 'meat'),
  p('Carne tocată', 'Фарш', 'Minced meat', 'meat'),
  p('Cotlet', 'Котлета', 'Cutlet', 'meat'),
  p('Ficat', 'Печень', 'Liver', 'meat'),
  p('Șuncă', 'Ветчина', 'Ham', 'meat'),
  p('Bacon', 'Бекон', 'Bacon', 'meat'),
  p('Salam', 'Колбаса', 'Salami', 'meat'),
  p('Crenvurști', 'Сосиски', 'Hot dogs', 'meat'),
  p('Cârnați', 'Колбаски', 'Sausages', 'meat'),
  p('Pastramă', 'Пастрома', 'Pastrami', 'meat'),
  p('Pelmeni', 'Пельмени', 'Meat dumplings', 'meat'),
  // fish
  p('Pește', 'Рыба', 'Fish', 'fish'),
  p('Somon', 'Лосось', 'Salmon', 'fish'),
  p('Scrumbie', 'Скумбрия', 'Mackerel', 'fish'),
  p('Hering', 'Сельдь', 'Herring', 'fish'),
  p('Ton', 'Тунец', 'Tuna', 'fish'),
  p('Creveți', 'Креветки', 'Shrimp', 'fish'),
  p('Bețișoare de crab', 'Крабовые палочки', 'Crab sticks', 'fish'),
  p('Crap', 'Карп', 'Carp', 'fish'),
  // vegetables
  p('Roșii', 'Помидоры', 'Tomatoes', 'vegetables'),
  p('Castraveți', 'Огурцы', 'Cucumbers', 'vegetables'),
  p('Cartofi', 'Картофель', 'Potatoes', 'vegetables'),
  p('Ceapă', 'Лук', 'Onion', 'vegetables'),
  p('Ceapă verde', 'Зелёный лук', 'Spring onion', 'vegetables'),
  p('Usturoi', 'Чеснок', 'Garlic', 'vegetables'),
  p('Morcovi', 'Морковь', 'Carrots', 'vegetables'),
  p('Varză', 'Капуста', 'Cabbage', 'vegetables'),
  p('Conopidă', 'Цветная капуста', 'Cauliflower', 'vegetables'),
  p('Broccoli', 'Брокколи', 'Broccoli', 'vegetables'),
  p('Ardei', 'Перец', 'Bell pepper', 'vegetables'),
  p('Dovlecei', 'Кабачки', 'Zucchini', 'vegetables'),
  p('Vinete', 'Баклажаны', 'Eggplant', 'vegetables'),
  p('Dovleac', 'Тыква', 'Pumpkin', 'vegetables'),
  p('Sfeclă', 'Свёкла', 'Beetroot', 'vegetables'),
  p('Ridichi', 'Редис', 'Radish', 'vegetables'),
  p('Salată verde', 'Салат', 'Lettuce', 'vegetables'),
  p('Spanac', 'Шпинат', 'Spinach', 'vegetables'),
  p('Ciuperci', 'Грибы', 'Mushrooms', 'vegetables'),
  p('Pătrunjel', 'Петрушка', 'Parsley', 'vegetables'),
  p('Mărar', 'Укроп', 'Dill', 'vegetables'),
  p('Porumb', 'Кукуруза', 'Corn', 'vegetables'),
  p('Mazăre', 'Горошек', 'Peas', 'vegetables'),
  p('Fasole', 'Фасоль', 'Beans', 'vegetables'),
  p('Legume congelate', 'Замороженные овощи', 'Frozen vegetables', 'vegetables'),
  // fruit
  p('Mere', 'Яблоки', 'Apples', 'fruit'),
  p('Pere', 'Груши', 'Pears', 'fruit'),
  p('Banane', 'Бананы', 'Bananas', 'fruit'),
  p('Portocale', 'Апельсины', 'Oranges', 'fruit'),
  p('Mandarine', 'Мандарины', 'Tangerines', 'fruit'),
  p('Lămâi', 'Лимоны', 'Lemons', 'fruit'),
  p('Struguri', 'Виноград', 'Grapes', 'fruit'),
  p('Prune', 'Сливы', 'Plums', 'fruit'),
  p('Piersici', 'Персики', 'Peaches', 'fruit'),
  p('Caise', 'Абрикосы', 'Apricots', 'fruit'),
  p('Cireșe', 'Черешня', 'Cherries', 'fruit'),
  p('Căpșuni', 'Клубника', 'Strawberries', 'fruit'),
  p('Zmeură', 'Малина', 'Raspberries', 'fruit'),
  p('Pepene verde', 'Арбуз', 'Watermelon', 'fruit'),
  p('Pepene galben', 'Дыня', 'Melon', 'fruit'),
  p('Kiwi', 'Киви', 'Kiwi', 'fruit'),
  p('Ananas', 'Ананас', 'Pineapple', 'fruit'),
  p('Avocado', 'Авокадо', 'Avocado', 'fruit'),
  // bread
  p('Pâine', 'Хлеб', 'Bread', 'bread'),
  p('Franzelă', 'Батон', 'White loaf', 'bread'),
  p('Chiflă', 'Булочка', 'Bun', 'bread'),
  p('Lipie', 'Лаваш', 'Flatbread', 'bread'),
  p('Covrigi', 'Бублики', 'Bagels', 'bread'),
  p('Croissant', 'Круассан', 'Croissant', 'bread'),
  p('Plăcintă', 'Пирог', 'Pie', 'bread'),
  p('Cozonac', 'Кекс', 'Sweet bread', 'bread'),
  // ready food
  p('Salată gata preparată', 'Готовый салат', 'Ready-made salad', 'leftovers'),
  p('Pizza', 'Пицца', 'Pizza', 'leftovers'),
  p('Sandviș', 'Сэндвич', 'Sandwich', 'leftovers'),
  p('Sarmale', 'Голубцы', 'Cabbage rolls', 'leftovers'),
  p('Colțunași', 'Вареники', 'Dumplings', 'leftovers'),
  p('Clătite', 'Блины', 'Pancakes', 'leftovers'),
  // sauces
  p('Ketchup', 'Кетчуп', 'Ketchup', 'sauces'),
  p('Maioneză', 'Майонез', 'Mayonnaise', 'sauces'),
  p('Muștar', 'Горчица', 'Mustard', 'sauces'),
  p('Sos de roșii', 'Томатный соус', 'Tomato sauce', 'sauces'),
  p('Pastă de tomate', 'Томатная паста', 'Tomato paste', 'sauces'),
  p('Hrean', 'Хрен', 'Horseradish', 'sauces'),
  p('Gem', 'Варенье', 'Jam', 'sauces'),
  p('Miere', 'Мёд', 'Honey', 'sauces'),
  p('Zacuscă', 'Овощная икра', 'Vegetable spread', 'sauces'),
  p('Murături', 'Соленья', 'Pickles', 'sauces'),
  p('Măsline', 'Оливки', 'Olives', 'sauces'),
  // drinks
  p('Suc', 'Сок', 'Juice', 'drinks'),
  p('Nectar', 'Нектар', 'Nectar', 'drinks'),
  p('Compot', 'Компот', 'Compote', 'drinks'),
  p('Apă', 'Вода', 'Water', 'drinks'),
  p('Apă minerală', 'Минеральная вода', 'Mineral water', 'drinks'),
  p('Limonadă', 'Лимонад', 'Lemonade', 'drinks'),
  p('Cola', 'Кола', 'Cola', 'drinks'),
  p('Ceai rece', 'Холодный чай', 'Iced tea', 'drinks'),
  p('Cvas', 'Квас', 'Kvass', 'drinks'),
  p('Băutură energizantă', 'Энергетик', 'Energy drink', 'drinks'),
  // other food (pantry, sweets)
  p('Paste', 'Макароны', 'Pasta', 'other'),
  p('Orez', 'Рис', 'Rice', 'other'),
  p('Hrișcă', 'Гречка', 'Buckwheat', 'other'),
  p('Fulgi de ovăz', 'Овсянка', 'Oats', 'other'),
  p('Făină', 'Мука', 'Flour', 'other'),
  p('Mălai', 'Кукурузная мука', 'Cornmeal', 'other'),
  p('Zahăr', 'Сахар', 'Sugar', 'other'),
  p('Sare', 'Соль', 'Salt', 'other'),
  p('Ulei', 'Подсолнечное масло', 'Sunflower oil', 'other'),
  p('Cafea', 'Кофе', 'Coffee', 'other'),
  p('Ceai', 'Чай', 'Tea', 'other'),
  p('Cereale', 'Хлопья', 'Cereal', 'other'),
  p('Biscuiți', 'Печенье', 'Biscuits', 'other'),
  p('Napolitane', 'Вафли', 'Wafers', 'other'),
  p('Ciocolată', 'Шоколад', 'Chocolate', 'other'),
  p('Bomboane', 'Конфеты', 'Sweets', 'other'),
  p('Înghețată', 'Мороженое', 'Ice cream', 'other'),
  p('Chipsuri', 'Чипсы', 'Crisps', 'other'),
  p('Semințe', 'Семечки', 'Sunflower seeds', 'other'),
  p('Nuci', 'Орехи', 'Nuts', 'other'),
  p('Conserve', 'Консервы', 'Canned food', 'other'),
  // not food
  p('Detergent', 'Стиральный порошок', 'Laundry detergent', 'other', false),
  p('Detergent de vase', 'Средство для посуды', 'Dish soap', 'other', false),
  p('Săpun', 'Мыло', 'Soap', 'other', false),
  p('Șampon', 'Шампунь', 'Shampoo', 'other', false),
  p('Pastă de dinți', 'Зубная паста', 'Toothpaste', 'other', false),
  p('Periuță de dinți', 'Зубная щётка', 'Toothbrush', 'other', false),
  p('Hârtie igienică', 'Туалетная бумага', 'Toilet paper', 'other', false),
  p('Șervețele', 'Салфетки', 'Napkins', 'other', false),
  p('Bureți de vase', 'Губки для посуды', 'Dish sponges', 'other', false),
  p('Saci de gunoi', 'Мешки для мусора', 'Trash bags', 'other', false),
  p('Pungă', 'Пакет', 'Shopping bag', 'other', false),
  p('Baterii', 'Батарейки', 'Batteries', 'other', false),
  p('Hrană pentru animale', 'Корм для животных', 'Pet food', 'other', false),
  p('Scutece', 'Подгузники', 'Diapers', 'other', false),
  p('Folie alimentară', 'Пищевая плёнка', 'Cling film', 'other', false),
];

/** Changes whenever the list changes, so vectors made for an older list are never used with this one. */
export function catalogFingerprint(list: CatalogProduct[] = FOOD_CATALOG): string {
  let h = 5381;
  for (const ch of list.map((x) => `${x.ro}|${x.ru}|${x.en}|${x.category}|${x.food ?? ''}`).join('\n')) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return `${list.length}-${h.toString(36)}`;
}
