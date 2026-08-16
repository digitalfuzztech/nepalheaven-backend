import heroEverest from "@/assets/hero-everest.jpg";
import destEverest from "@/assets/dest-everest.jpg";
import destAnnapurna from "@/assets/dest-annapurna.jpg";
import destPokhara from "@/assets/dest-pokhara.jpg";
import destChitwan from "@/assets/dest-chitwan.jpg";
import destLumbini from "@/assets/dest-lumbini.jpg";
import destMustang from "@/assets/dest-mustang.jpg";
import destRara from "@/assets/dest-rara.jpg";
import destBandipur from "@/assets/dest-bandipur.jpg";
import destKathmandu from "@/assets/dest-kathmandu.jpg";
import expParagliding from "@/assets/exp-paragliding.jpg";
import ctaLodge from "@/assets/cta-lodge.jpg";

export const images = {
  heroEverest,
  destEverest,
  destAnnapurna,
  destPokhara,
  destChitwan,
  destLumbini,
  destMustang,
  destRara,
  destBandipur,
  destKathmandu,
  expParagliding,
  ctaLodge,
};

export const company = {
  name: "Nepal Heaven",
  tagline: "Heaven on Earth Awaits.",
  phone: "+977 9861840708",
  whatsapp: "+977 9861840708",
  email: "journeys@nepalheaven.com",
  address: "Pulchok, Jhamsikhel Marg, Lalitpur 44600, Nepal",
  hours: [
    { day: "Sunday – Friday", time: "9:00 – 18:30 NPT" },
    { day: "Saturday", time: "10:00 – 15:00 NPT" },
    { day: "Trek support desk", time: "24 hours, every day" },
  ],
};

export type Destination = {
  slug: string;
  name: string;
  region: string;
  image: string;
  altitude: string;
  season: string;
  duration: string;
  difficulty: "Easy" | "Moderate" | "Challenging" | "Strenuous";
  short: string;
  description: string;
  highlights: string[];
  tips: string[];
  included: string[];
  excluded: string[];
  itinerary: { day: string; title: string; detail: string }[];
  category: "Mountains" | "Culture" | "Wildlife" | "Lakes" | "Adventure";
};

export const destinations: Destination[] = [
  {
    slug: "everest-region",
    name: "Everest Region",
    region: "Solukhumbu",
    image: destEverest,
    altitude: "2,860 – 5,545 m",
    season: "Mar–May · Sep–Nov",
    duration: "12 – 16 days",
    difficulty: "Challenging",
    category: "Mountains",
    short: "Walk beneath the highest mountain on earth through Sherpa villages and glacier valleys.",
    description:
      "The Khumbu is the theatre of the Himalaya — a landscape of blue-ice glaciers, monastery bells and the impossible north face of Ama Dablam. Our Everest journeys pair classic trekking days with heated lodges, private porters and unhurried acclimatisation so that altitude never rushes the view.",
    highlights: [
      "Sunrise over Everest, Lhotse and Nuptse from Kala Patthar",
      "Butter-lamp ceremony at Tengboche Monastery",
      "Namche Bazaar's Saturday market",
      "Scenic mountain flight into Lukla",
      "Private Sherpa guide and porter throughout",
    ],
    tips: [
      "Break the ascent with two acclimatisation nights in Namche.",
      "Pack a down jacket rated to -15°C even in spring.",
      "Cash is essential above Lukla — ATMs are unreliable.",
    ],
    included: [
      "All permits and TIMS card",
      "Lodge accommodation with private rooms where available",
      "Licensed Sherpa guide and porters",
      "All meals on trek",
      "Domestic flights Kathmandu–Lukla–Kathmandu",
    ],
    excluded: [
      "International flights and Nepal visa",
      "Travel and evacuation insurance",
      "Personal trekking gear",
      "Tips and personal expenses",
    ],
    itinerary: [
      { day: "Day 1", title: "Arrive Kathmandu", detail: "Private transfer, welcome dinner in Thamel and gear check with your guide." },
      { day: "Day 2", title: "Fly to Lukla · trek to Phakding", detail: "Dawn mountain flight, then a gentle riverside walk through pine forest." },
      { day: "Day 4", title: "Namche Bazaar", detail: "Cross the Hillary Suspension Bridge and climb to the Sherpa capital." },
      { day: "Day 7", title: "Tengboche Monastery", detail: "Afternoon prayers with Ama Dablam framed in the courtyard door." },
      { day: "Day 10", title: "Everest Base Camp", detail: "Walk the Khumbu Glacier moraine to the base of the world's highest peak." },
      { day: "Day 11", title: "Kala Patthar sunrise", detail: "Pre-dawn ascent for the definitive Everest panorama." },
      { day: "Day 14", title: "Return to Kathmandu", detail: "Fly back to the valley for a celebratory Newari feast." },
    ],
  },
  {
    slug: "annapurna",
    name: "Annapurna",
    region: "Gandaki",
    image: destAnnapurna,
    altitude: "800 – 5,416 m",
    season: "Mar–May · Oct–Dec",
    duration: "9 – 18 days",
    difficulty: "Moderate",
    category: "Mountains",
    short: "Rice terraces, rhododendron forest and a high pass with a 360° Himalayan horizon.",
    description:
      "Annapurna compresses all of Nepal into a single trail: subtropical valleys, Gurung hill villages, alpine pasture and the wind-scoured Thorong La. It is the most varied trek in the country and the friendliest introduction to Himalayan walking.",
    highlights: [
      "Crossing the 5,416 m Thorong La pass",
      "Sunrise from Poon Hill over Dhaulagiri",
      "Natural hot springs at Tatopani",
      "Gurung hospitality in Ghandruk",
      "Muktinath pilgrimage temple",
    ],
    tips: ["Start early each morning — afternoons cloud over.", "Layer for a 25°C swing between valley and pass."],
    included: ["ACAP permit", "Teahouse accommodation", "Guide and porter", "All trek meals", "Ground transfers"],
    excluded: ["International flights", "Insurance", "Beverages", "Tips"],
    itinerary: [
      { day: "Day 1", title: "Drive to Besisahar", detail: "Scenic road along the Marsyangdi river." },
      { day: "Day 5", title: "Manang", detail: "Acclimatisation day with a walk to Gangapurna glacier lake." },
      { day: "Day 9", title: "Thorong La", detail: "Cross the pass at first light and descend to Muktinath." },
      { day: "Day 12", title: "Poon Hill", detail: "Sunrise panorama across Annapurna South and Machhapuchhre." },
    ],
  },
  {
    slug: "pokhara",
    name: "Pokhara",
    region: "Gandaki",
    image: destPokhara,
    altitude: "822 m",
    season: "All year",
    duration: "3 – 5 days",
    difficulty: "Easy",
    category: "Lakes",
    short: "Lakeside calm beneath the fishtail summit of Machhapuchhre.",
    description:
      "Pokhara is where the Himalaya come down to the water. Mornings begin with mirror-still Phewa Lake, afternoons drift between boutique lakeside cafés and paragliding launches at Sarangkot, and evenings end with the Annapurnas turning rose above the rooftops.",
    highlights: [
      "Dawn boat to Tal Barahi temple",
      "Tandem paragliding from Sarangkot",
      "World Peace Pagoda hike",
      "Cave and waterfall circuit",
      "Lakeside dining terraces",
    ],
    tips: ["Book paragliding for the morning thermals.", "Boats are best hired before 7 am for reflections."],
    included: ["Boutique lake-view hotel", "Private car and driver", "Guided city tour", "Breakfasts"],
    excluded: ["Adventure activity fees", "Lunches and dinners", "Insurance"],
    itinerary: [
      { day: "Day 1", title: "Arrive lakeside", detail: "Sunset boat cruise on Phewa Lake." },
      { day: "Day 2", title: "Sarangkot", detail: "Sunrise viewpoint, then tandem paragliding descent." },
      { day: "Day 3", title: "Peace Pagoda", detail: "Forest walk and lunch above the lake." },
    ],
  },
  {
    slug: "chitwan",
    name: "Chitwan",
    region: "Terai Lowlands",
    image: destChitwan,
    altitude: "150 m",
    season: "Oct–Mar",
    duration: "3 – 4 days",
    difficulty: "Easy",
    category: "Wildlife",
    short: "Rhino, tiger and elephant grasslands in Nepal's first national park.",
    description:
      "A UNESCO World Heritage site of sal forest, elephant grass and slow brown rivers. Chitwan delivers one-horned rhino at close range, gharial crocodiles on the sandbanks, and — for the patient — Bengal tiger tracks pressed into morning mud.",
    highlights: [
      "Dawn jeep safari in the core zone",
      "Canoe drift on the Rapti River",
      "Tharu cultural stick dance",
      "Elephant breeding centre visit",
      "Naturalist-led birding walk",
    ],
    tips: ["Wear neutral colours on safari.", "November to February offers the clearest wildlife sightings."],
    included: ["Jungle lodge full board", "Two safaris daily", "Park permits", "Naturalist guide"],
    excluded: ["Transfers from Kathmandu", "Alcohol", "Insurance"],
    itinerary: [
      { day: "Day 1", title: "Arrive Sauraha", detail: "Sunset over the Rapti and Tharu welcome dinner." },
      { day: "Day 2", title: "Core zone safari", detail: "Full-day jeep safari with picnic lunch." },
      { day: "Day 3", title: "River canoe", detail: "Dawn canoe drift and jungle walk." },
    ],
  },
  {
    slug: "lumbini",
    name: "Lumbini",
    region: "Rupandehi",
    image: destLumbini,
    altitude: "150 m",
    season: "Oct–Mar",
    duration: "2 days",
    difficulty: "Easy",
    category: "Culture",
    short: "The birthplace of the Buddha and its garden of world monasteries.",
    description:
      "Lumbini is quiet in the way only sacred places are. The Maya Devi temple marks the exact birthplace of Siddhartha Gautama; around it, an immense monastic garden holds temples built by nations from Thailand to Germany, linked by still water channels.",
    highlights: [
      "Maya Devi Temple and marker stone",
      "Ashoka Pillar from 249 BCE",
      "International Monastic Zone by bicycle",
      "Eternal Peace Flame",
      "Morning meditation session",
    ],
    tips: ["Cycle the monastic zone — it is far larger than it looks.", "Dress modestly and remove shoes at temples."],
    included: ["Heritage hotel stay", "Private guide", "Entrance fees", "Breakfasts"],
    excluded: ["Flights", "Meals not listed", "Insurance"],
    itinerary: [
      { day: "Day 1", title: "Sacred Garden", detail: "Guided visit to Maya Devi temple and the Ashoka Pillar." },
      { day: "Day 2", title: "Monastic Zone", detail: "Cycle between the world monasteries at sunrise." },
    ],
  },
  {
    slug: "mustang",
    name: "Mustang",
    region: "Trans-Himalaya",
    image: destMustang,
    altitude: "2,800 – 3,840 m",
    season: "May–Oct",
    duration: "10 – 14 days",
    difficulty: "Challenging",
    category: "Adventure",
    short: "A Tibetan kingdom of ochre canyons, cave cities and walled Lo Manthang.",
    description:
      "Beyond the Annapurnas the rain stops and Mustang begins — an arid, wind-carved plateau that stayed a forbidden kingdom until 1992. Sky caves pock the cliffs, monasteries hold 15th-century murals, and the walled capital of Lo Manthang still looks exactly as it did five centuries ago.",
    highlights: [
      "Walled city of Lo Manthang",
      "Chhoser sky caves",
      "Restricted-area permit access",
      "Kali Gandaki gorge, the world's deepest",
      "Tiji festival option in May",
    ],
    tips: ["Afternoon winds are fierce — walk early.", "A restricted-area permit requires a licensed guide."],
    included: ["Restricted area permit", "Guide and jeep support", "Lodges and camps", "All meals"],
    excluded: ["Flights to Jomsom", "Insurance", "Personal gear"],
    itinerary: [
      { day: "Day 1", title: "Fly to Jomsom", detail: "Mountain flight through the Kali Gandaki gorge." },
      { day: "Day 4", title: "Ghami", detail: "Walk past Nepal's longest mani wall." },
      { day: "Day 7", title: "Lo Manthang", detail: "Two nights inside the walled capital." },
    ],
  },
  {
    slug: "rara-lake",
    name: "Rara Lake",
    region: "Karnali",
    image: destRara,
    altitude: "2,990 m",
    season: "Apr–Jun · Sep–Nov",
    duration: "7 – 9 days",
    difficulty: "Moderate",
    category: "Lakes",
    short: "Nepal's largest lake — turquoise, silent and almost entirely untouristed.",
    description:
      "Rara sits inside a national park of blue pine and juniper in Nepal's remote far west. You may share the shoreline with nobody but a herd of Himalayan musk deer. It is the country's most beautiful lake and its best-kept secret.",
    highlights: [
      "Circumnavigate the lake on foot",
      "Sunrise from Murma Top",
      "Rara National Park wildlife",
      "Traditional Karnali villages",
      "Star-filled skies with zero light pollution",
    ],
    tips: ["Flights to Talcha are weather dependent — build in a buffer day."],
    included: ["Domestic flights", "Park permits", "Camping and lodge mix", "Guide and cook"],
    excluded: ["Insurance", "Personal gear", "Tips"],
    itinerary: [
      { day: "Day 1", title: "Fly Nepalgunj–Talcha", detail: "Two short flights into the far west." },
      { day: "Day 3", title: "Rara shoreline", detail: "Full-day lake circuit with picnic." },
      { day: "Day 4", title: "Murma Top", detail: "Sunrise above the lake with the Api-Saipal range beyond." },
    ],
  },
  {
    slug: "bandipur",
    name: "Bandipur",
    region: "Tanahun",
    image: destBandipur,
    altitude: "1,030 m",
    season: "All year",
    duration: "2 days",
    difficulty: "Easy",
    category: "Culture",
    short: "A preserved Newari hill town with a car-free bazaar and Himalayan skyline.",
    description:
      "Bandipur is a living museum of Newari architecture perched on a ridge halfway between Kathmandu and Pokhara. Its main street is closed to traffic, its shuttered wooden façades unchanged for two centuries, and its terrace cafés look straight at the Annapurnas.",
    highlights: [
      "Car-free heritage bazaar",
      "Tundikhel viewpoint at sunrise",
      "Siddha Gufa, Nepal's largest cave",
      "Newari heritage guesthouses",
      "Silk farm and village walks",
    ],
    tips: ["Stay overnight — the day-trippers leave by four and the town becomes yours."],
    included: ["Heritage house stay", "Private transfers", "Guided village walk", "Breakfasts"],
    excluded: ["Meals not listed", "Insurance"],
    itinerary: [
      { day: "Day 1", title: "Arrive Bandipur", detail: "Evening on the bazaar with Himalayan sunset." },
      { day: "Day 2", title: "Siddha Gufa", detail: "Cave walk and descent to the valley." },
    ],
  },
];

export type Package = {
  slug: string;
  title: string;
  destination: string;
  image: string;
  days: number;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  difficulty: "Easy" | "Moderate" | "Challenging" | "Strenuous";
  style: string;
  short: string;
  highlights: string[];
  itinerary: { day: string; title: string; detail: string }[];
  included: string[];
  excluded: string[];
  tiers: { name: string; note: string; price: number }[];
};

export const packages: Package[] = [
  {
    slug: "everest-base-camp-trek",
    title: "Everest Base Camp Trek",
    destination: "Everest Region",
    image: destEverest,
    days: 14,
    price: 2890,
    oldPrice: 3250,
    rating: 4.9,
    reviews: 412,
    difficulty: "Challenging",
    style: "Signature Trek",
    short: "The definitive Himalayan pilgrimage, walked at a pace that lets you actually see it.",
    highlights: ["Kala Patthar sunrise", "Tengboche Monastery", "Private Sherpa guide", "Heated lodges in Namche"],
    itinerary: [
      { day: "Day 1–2", title: "Kathmandu & Lukla", detail: "Arrival, gear check and the flight into the Khumbu." },
      { day: "Day 3–5", title: "Namche Bazaar", detail: "Ascend to 3,440 m with a full acclimatisation day." },
      { day: "Day 6–9", title: "Tengboche to Lobuche", detail: "Monastery mornings and glacier moraine afternoons." },
      { day: "Day 10–11", title: "Base Camp & Kala Patthar", detail: "The two summit moments of the trek." },
      { day: "Day 12–14", title: "Descent & return", detail: "Retrace to Lukla and fly to Kathmandu." },
    ],
    included: ["All permits", "Lodges and meals on trek", "Sherpa guide and porter", "Lukla flights", "Airport transfers"],
    excluded: ["International flights", "Nepal visa", "Insurance", "Tips"],
    tiers: [
      { name: "Classic", note: "Shared teahouse rooms", price: 2890 },
      { name: "Comfort", note: "Private rooms, en-suite where available", price: 3490 },
      { name: "Signature", note: "Premium lodges, heli return from Lukla", price: 4750 },
    ],
  },
  {
    slug: "annapurna-circuit",
    title: "Annapurna Circuit",
    destination: "Annapurna",
    image: destAnnapurna,
    days: 16,
    price: 2450,
    rating: 4.8,
    reviews: 336,
    difficulty: "Moderate",
    style: "Classic Trek",
    short: "Rice terrace to high desert across the legendary Thorong La pass.",
    highlights: ["Thorong La 5,416 m", "Muktinath temple", "Tatopani hot springs", "Poon Hill sunrise"],
    itinerary: [
      { day: "Day 1–3", title: "Besisahar to Chame", detail: "River gorges and the first snow peaks." },
      { day: "Day 4–7", title: "Manang", detail: "Acclimatisation in the trans-Himalayan valley." },
      { day: "Day 8–10", title: "Thorong La", detail: "The pass, then descent to Muktinath." },
      { day: "Day 11–16", title: "Kali Gandaki & Poon Hill", detail: "Hot springs, rhododendron forest and the final viewpoint." },
    ],
    included: ["ACAP permits", "Teahouses and meals", "Guide and porter", "Transfers"],
    excluded: ["Flights", "Insurance", "Drinks", "Tips"],
    tiers: [
      { name: "Classic", note: "Teahouse trekking", price: 2450 },
      { name: "Comfort", note: "Best available lodges", price: 2980 },
      { name: "Signature", note: "Lodge upgrades and jeep support", price: 3690 },
    ],
  },
  {
    slug: "luxury-nepal-tour",
    title: "Luxury Nepal Tour",
    destination: "Kathmandu · Pokhara · Chitwan",
    image: ctaLodge,
    days: 10,
    price: 5400,
    rating: 5,
    reviews: 128,
    difficulty: "Easy",
    style: "Private Luxury",
    short: "Five-star lodges, private guides and a helicopter morning above the Himalaya.",
    highlights: ["Heritage palace hotels", "Everest heli breakfast", "Private safari lodge", "Chef-led Newari dinner"],
    itinerary: [
      { day: "Day 1–3", title: "Kathmandu Valley", detail: "Private heritage tours of Patan, Bhaktapur and Boudhanath." },
      { day: "Day 4–6", title: "Pokhara", detail: "Lake-view suite, sunrise flight and spa afternoons." },
      { day: "Day 7–9", title: "Chitwan", detail: "Luxury tented camp with private naturalist." },
      { day: "Day 10", title: "Departure", detail: "Private transfer to Tribhuvan International." },
    ],
    included: ["5-star accommodation", "All private transfers", "Helicopter excursion", "Daily breakfast and dinners"],
    excluded: ["International flights", "Insurance", "Spa treatments"],
    tiers: [
      { name: "Signature", note: "Five-star throughout", price: 5400 },
      { name: "Private Jet Set", note: "Heli transfers between regions", price: 8900 },
      { name: "Bespoke", note: "Designed around your dates", price: 11500 },
    ],
  },
  {
    slug: "kathmandu-heritage",
    title: "Kathmandu Heritage",
    destination: "Kathmandu Valley",
    image: destKathmandu,
    days: 4,
    price: 780,
    rating: 4.7,
    reviews: 289,
    difficulty: "Easy",
    style: "Culture",
    short: "Seven UNESCO sites, four courtyards and one very good momo workshop.",
    highlights: ["Patan Durbar Square", "Boudhanath at dusk", "Bhaktapur pottery square", "Newari cooking class"],
    itinerary: [
      { day: "Day 1", title: "Old Kathmandu", detail: "Durbar Square and the hidden bahals of Ason." },
      { day: "Day 2", title: "Patan", detail: "Museum, artisan workshops and courtyard lunch." },
      { day: "Day 3", title: "Bhaktapur", detail: "Full day in the medieval city." },
      { day: "Day 4", title: "Boudha & Pashupati", detail: "Morning kora and evening aarti." },
    ],
    included: ["Boutique hotel", "Private guide", "All entrance fees", "Cooking class"],
    excluded: ["Flights", "Dinners", "Insurance"],
    tiers: [
      { name: "Classic", note: "Boutique hotel", price: 780 },
      { name: "Comfort", note: "Heritage hotel", price: 1150 },
      { name: "Signature", note: "Palace suite and private car", price: 1750 },
    ],
  },
  {
    slug: "pokhara-escape",
    title: "Pokhara Escape",
    destination: "Pokhara",
    image: destPokhara,
    days: 5,
    price: 950,
    rating: 4.8,
    reviews: 204,
    difficulty: "Easy",
    style: "Slow Travel",
    short: "Lake mornings, mountain sunrises and nothing at all on the schedule.",
    highlights: ["Phewa Lake sunrise boat", "Sarangkot viewpoint", "Peace Pagoda walk", "Lakeside spa"],
    itinerary: [
      { day: "Day 1", title: "Arrive", detail: "Lake-view suite and sunset cruise." },
      { day: "Day 2", title: "Sarangkot", detail: "Sunrise and optional paragliding." },
      { day: "Day 3", title: "Peace Pagoda", detail: "Forest hike and long lunch." },
      { day: "Day 4–5", title: "Free days", detail: "Spa, cafés and the old bazaar." },
    ],
    included: ["Lake-view hotel", "Private driver", "Boat and guide", "Breakfasts"],
    excluded: ["Adventure fees", "Meals not listed"],
    tiers: [
      { name: "Classic", note: "Boutique lakeside", price: 950 },
      { name: "Comfort", note: "Resort with spa", price: 1390 },
      { name: "Signature", note: "Hilltop private villa", price: 2150 },
    ],
  },
  {
    slug: "mustang-adventure",
    title: "Mustang Adventure",
    destination: "Upper Mustang",
    image: destMustang,
    days: 12,
    price: 3650,
    rating: 4.9,
    reviews: 96,
    difficulty: "Challenging",
    style: "Expedition",
    short: "Into the former forbidden kingdom of ochre cliffs and sky caves.",
    highlights: ["Lo Manthang walled city", "Chhoser caves", "Restricted permit access", "Tiji festival option"],
    itinerary: [
      { day: "Day 1–2", title: "Jomsom", detail: "Mountain flight and acclimatisation." },
      { day: "Day 3–6", title: "North to Ghami", detail: "Canyon walking and mani walls." },
      { day: "Day 7–9", title: "Lo Manthang", detail: "Two nights inside the walls." },
      { day: "Day 10–12", title: "Return", detail: "Alternate eastern route back to Jomsom." },
    ],
    included: ["Restricted permit", "Guide and jeep backup", "Lodges", "All meals"],
    excluded: ["Flights", "Insurance", "Gear"],
    tiers: [
      { name: "Classic", note: "Lodge trekking", price: 3650 },
      { name: "Comfort", note: "Best lodges plus jeep support", price: 4290 },
      { name: "Signature", note: "Private camp and heli return", price: 6400 },
    ],
  },
  {
    slug: "wildlife-safari",
    title: "Wildlife Safari",
    destination: "Chitwan & Bardia",
    image: destChitwan,
    days: 6,
    price: 1450,
    rating: 4.7,
    reviews: 151,
    difficulty: "Easy",
    style: "Wildlife",
    short: "Rhino at dawn in Chitwan, tiger tracking in wild Bardia.",
    highlights: ["Core zone jeep safaris", "River canoe drift", "Tharu village evening", "Resident naturalist"],
    itinerary: [
      { day: "Day 1–3", title: "Chitwan", detail: "Twice-daily safaris from a riverside lodge." },
      { day: "Day 4–6", title: "Bardia", detail: "Tiger tracking on foot with expert naturalists." },
    ],
    included: ["Lodge full board", "All safaris", "Park permits", "Internal transfers"],
    excluded: ["Flights", "Alcohol", "Insurance"],
    tiers: [
      { name: "Classic", note: "Jungle lodge", price: 1450 },
      { name: "Comfort", note: "Riverfront suite", price: 1980 },
      { name: "Signature", note: "Luxury tented camp", price: 2890 },
    ],
  },
  {
    slug: "helicopter-tour",
    title: "Everest Helicopter Tour",
    destination: "Everest Region",
    image: heroEverest,
    days: 1,
    price: 1190,
    rating: 5,
    reviews: 372,
    difficulty: "Easy",
    style: "Scenic Flight",
    short: "Breakfast at 3,880 m with Everest close enough to touch.",
    highlights: ["Landing at Kala Patthar", "Breakfast at Hotel Everest View", "Four-hour round trip", "Window seat guaranteed"],
    itinerary: [
      { day: "06:30", title: "Depart Kathmandu", detail: "Lift off over the valley rim toward the Khumbu." },
      { day: "07:40", title: "Kala Patthar landing", detail: "Ten minutes on the ground facing Everest." },
      { day: "08:30", title: "Everest View breakfast", detail: "Terrace breakfast with Ama Dablam." },
      { day: "10:30", title: "Return", detail: "Back in Kathmandu before lunch." },
    ],
    included: ["Helicopter charter", "Oxygen and crew", "Breakfast", "Hotel transfers"],
    excluded: ["Insurance", "Personal expenses"],
    tiers: [
      { name: "Shared", note: "Group of five", price: 1190 },
      { name: "Private", note: "Charter the aircraft", price: 4600 },
      { name: "Signature", note: "Private charter plus photographer", price: 5400 },
    ],
  },
];

export const activities = [
  { name: "Trekking", detail: "Teahouse and expedition routes across every range.", icon: "Footprints" },
  { name: "Hiking", detail: "Short valley walks and ridge-line day hikes.", icon: "Mountain" },
  { name: "Paragliding", detail: "Tandem flights above Phewa Lake.", icon: "Wind" },
  { name: "Rafting", detail: "Trishuli and Bhote Koshi white water.", icon: "Waves" },
  { name: "Mountain Flight", detail: "One-hour dawn flights along the Himalaya.", icon: "Plane" },
  { name: "Bungee", detail: "160 m jump over the Bhote Koshi gorge.", icon: "ArrowDownWideNarrow" },
  { name: "Zipline", detail: "The world's steepest zipline in Sarangkot.", icon: "Zap" },
  { name: "Safari", detail: "Jeep, canoe and walking safaris in the Terai.", icon: "Binoculars" },
];

export const experienceCategories = [
  { slug: "adventure", name: "Adventure", detail: "Peaks, rivers and thermals for active travellers.", description: "Adventure in Nepal can mean walking beneath the highest peaks, crossing high passes, exploring Mustang's valleys or seeing the Himalaya from the air. These journeys favour active days, capable local guides and routes where the landscape sets the pace.", image: expParagliding, highlights: ["Active mountain and high-valley journeys", "Experienced local guides and carefully paced itineraries", "Trekking, overland and scenic flight options"] },
  { slug: "luxury-tours", name: "Luxury Tours", detail: "Thoughtful stays, private guides and seamless transfers.", description: "Travel privately with flexible guiding and smooth connections between Nepal's cultural and mountain regions. Luxury here is about time, comfort and access arranged around you.", image: ctaLodge, highlights: ["Private guiding and flexible daily pacing", "Characterful premium hotels and lodges", "Smooth road, air and helicopter connections where included"] },
  { slug: "culture", name: "Culture", detail: "Newari courtyards, sacred places and living heritage.", description: "Explore Nepal through the communities, sacred places and artistic traditions that shape everyday life. These journeys make room for conversation, unhurried heritage walks and context from local guides.", image: destKathmandu, highlights: ["Living heritage in Kathmandu Valley and beyond", "Temples, monasteries, courtyards and traditional towns", "Local interpretation connecting history with daily life"] },
  { slug: "wellness", name: "Wellness", detail: "Restorative landscapes and an unhurried pace.", description: "Slow the itinerary down with peaceful lakeside settings, gentle walks and time to reset. Wellness can stand alone or become a restorative beginning or ending to a wider Nepal trip.", image: destPokhara, highlights: ["Restful stays in calm natural settings", "Space for gentle movement and reflection", "Flexible pacing suited to a restorative journey"] },
  { slug: "photography", name: "Photography", detail: "Patient itineraries shaped around Himalayan light.", description: "Follow the light from Kathmandu's old streets to Mustang's sculpted valleys, Pokhara's lakeshore and Himalayan viewpoints. Routes allow time to observe, wait and return.", image: destMustang, highlights: ["Landscape, street and cultural photography", "Unhurried sunrise, sunset and changing-light windows", "Heritage streets and mountain panoramas"] },
  { slug: "pilgrimage", name: "Pilgrimage", detail: "Sacred places approached with respect and context.", description: "Visit places of Buddhist and Hindu devotion, from Kathmandu Valley shrines to Muktinath on the Annapurna route. These journeys welcome pilgrims and culturally curious travellers alike.", image: destLumbini, highlights: ["Sacred sites interpreted with sensitivity", "Time for reflection and observance", "Spiritual traditions within Himalayan landscapes"] },
  { slug: "food-tours", name: "Food Tours", detail: "Markets, family kitchens and regional flavours.", description: "Discover Nepal through the meals and ingredients connecting its regions and communities. Food-focused journeys pair heritage exploration with markets, local eateries and welcoming dining rooms.", image: destBandipur, highlights: ["Local markets and neighbourhood food stops", "Newari and regional culinary traditions", "Food experiences woven into cultural sightseeing"] },
  { slug: "family-trips", name: "Family Trips", detail: "Gentle itineraries with variety for different generations.", description: "Balance wildlife, lakes, heritage and manageable travel days. Private pacing leaves room to pause, adapt and enjoy Nepal together.", image: destChitwan, highlights: ["Wildlife, nature and cultural variety", "Flexible private pacing for different ages", "Comfortable bases and manageable travel days"] },
  { slug: "honeymoon", name: "Honeymoon", detail: "Private escapes shaped around mountains and lakes.", description: "Combine beautiful stays, private guiding and memorable scenery without turning the trip into a rigid schedule. These journeys leave room for privacy, comfort and shared time.", image: destRara, highlights: ["Private guiding and thoughtful stays", "Romantic lake and mountain settings", "Flexible itineraries with room for unplanned moments"] },
];
export const experiencePackageMappings: Record<string, string[]> = {
  adventure: ["everest-base-camp-trek", "annapurna-circuit", "mustang-adventure", "helicopter-tour"], "luxury-tours": ["luxury-nepal-tour", "helicopter-tour"], culture: ["kathmandu-heritage", "luxury-nepal-tour", "mustang-adventure"], wellness: ["pokhara-escape", "luxury-nepal-tour"], photography: ["mustang-adventure", "pokhara-escape", "helicopter-tour"], pilgrimage: ["kathmandu-heritage", "annapurna-circuit"], "food-tours": ["kathmandu-heritage", "luxury-nepal-tour"], "family-trips": ["wildlife-safari", "pokhara-escape", "luxury-nepal-tour"], honeymoon: ["luxury-nepal-tour", "pokhara-escape", "helicopter-tour"],
};

export const testimonials = [
  {
    name: "Amelia Hartford",
    country: "United Kingdom",
    trip: "Everest Base Camp Trek",
    quote:
      "Fourteen days and not a single detail out of place. Our Sherpa guide Pemba read the altitude better than any app, and the lodges were far above what we expected.",
    rating: 5,
  },
  {
    name: "Daniel Okafor",
    country: "Canada",
    trip: "Luxury Nepal Tour",
    quote:
      "The helicopter breakfast above Khumbu is the single best travel morning of my life. Nepal Heaven handled everything — we just showed up and were astonished.",
    rating: 5,
  },
  {
    name: "Sofia Marchetti",
    country: "Italy",
    trip: "Annapurna Circuit",
    quote:
      "I travelled solo and never once felt alone or unsafe. Thoughtful, warm, professional people who clearly love their own country.",
    rating: 5,
  },
  {
    name: "Kenji Watanabe",
    country: "Japan",
    trip: "Upper Mustang",
    quote:
      "Lo Manthang felt like walking into the 15th century. The permits, jeeps and camps were arranged flawlessly, which let us focus entirely on the landscape.",
    rating: 5,
  },
];

export const stats = [
  { value: 1000, suffix: "+", label: "Happy Travellers" },
  { value: 250, suffix: "+", label: "Curated Tours" },
  { value: 98, suffix: "%", label: "Positive Reviews" },
  { value: 15, suffix: "+", label: "Years of Experience" },
];

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readingTime: string;
  author: { name: string; role: string };
  image: string;
  body: string[];
};

export const posts: Post[] = [
  {
    slug: "best-time-to-trek-in-nepal",
    title: "The Honest Guide to the Best Time to Trek in Nepal",
    excerpt:
      "Autumn gets the postcards, but spring gets the rhododendrons and winter gets the empty trails. Here is how to choose your season.",
    category: "Trekking",
    date: "12 March 2026",
    readingTime: "8 min read",
    author: { name: "Pemba Sherpa", role: "Head of Mountain Operations" },
    image: destEverest,
    body: [
      "Nepal has two headline trekking seasons and two quietly excellent ones. Most visitors arrive in October and November, when post-monsoon air gives the sharpest mountain views of the year and the trails hum with company.",
      "Spring, from March to May, is our own favourite. The rhododendron forests below 3,500 m turn scarlet, expedition teams fill Base Camp with atmosphere, and the light softens into something photographers chase for years.",
      "Winter trekking is genuinely underrated at lower altitudes. Ghandruk, Poon Hill and the Kathmandu rim stay walkable, the skies are glass-clear, and you will often have a viewpoint entirely to yourself.",
      "Monsoon, June to August, is the season for Mustang and Dolpo — rain-shadow regions where the clouds break against the Annapurnas and never arrive.",
    ],
  },
  {
    slug: "packing-list-himalaya",
    title: "What to Actually Pack for the Himalaya",
    excerpt: "After fifteen years of gear checks in Thamel, this is the list we hand every client the night before they fly to Lukla.",
    category: "Preparation",
    date: "28 February 2026",
    readingTime: "6 min read",
    author: { name: "Anisha Rai", role: "Client Experience Lead" },
    image: destAnnapurna,
    body: [
      "The single most common mistake is over-packing. Your porter carries a strict weight limit, and anything above it is redistributed to you at 4,000 m.",
      "Bring a down jacket rated to -15°C, two merino base layers, one softshell, and a rain shell that genuinely seals. Everything else is negotiable.",
      "Buy the small things in Kathmandu. Duffels, liners, trekking poles and thermals are excellent value in Thamel and save you baggage fees.",
    ],
  },
  {
    slug: "48-hours-in-kathmandu",
    title: "48 Hours in Kathmandu, Beyond the Guidebook",
    excerpt: "Courtyard shrines, sixth-generation metalworkers and the momo counter locals actually queue for.",
    category: "Culture",
    date: "19 February 2026",
    readingTime: "7 min read",
    author: { name: "Bikash Shrestha", role: "Cultural Guide" },
    image: destKathmandu,
    body: [
      "Start before six at Boudhanath, when the kora belongs to the residents rather than the cameras. The butter lamps are lit, the pigeons rise on cue, and the stupa is at its most alive.",
      "Spend the middle of the day in Patan. The museum is the best in the country, and the courtyards behind the Durbar Square hide Buddhist bahals almost nobody visits.",
      "Finish in Ason, the old market crossroads, where the spice stalls have been trading in the same doorways for four hundred years.",
    ],
  },
  {
    slug: "altitude-sickness-explained",
    title: "Altitude Sickness, Explained Without the Panic",
    excerpt: "What acclimatisation actually does to your body, and the simple rules that keep our clients walking.",
    category: "Health",
    date: "04 February 2026",
    readingTime: "9 min read",
    author: { name: "Dr. Sunita Gurung", role: "Expedition Medical Advisor" },
    image: destMustang,
    body: [
      "Above 2,500 m your body begins a genuine physiological adaptation. Handled patiently, it is safe for the overwhelming majority of travellers.",
      "The rules are boring and they work: climb high, sleep low, never gain more than 500 m of sleeping altitude per day above 3,000 m, and take a rest day every 1,000 m.",
      "Descent is the only cure that always works. Every Nepal Heaven itinerary is built with descent options and a satellite communicator on every trek.",
    ],
  },
  {
    slug: "chitwan-wildlife-guide",
    title: "A Field Guide to Spotting Rhino in Chitwan",
    excerpt: "Where to look, when to go and why the canoe beats the jeep more often than you would think.",
    category: "Wildlife",
    date: "21 January 2026",
    readingTime: "5 min read",
    author: { name: "Rajesh Chaudhary", role: "Senior Naturalist" },
    image: destChitwan,
    body: [
      "Chitwan holds over 700 greater one-horned rhino. In the cool hours they graze the elephant grass near river channels, which is exactly where a slow canoe puts you.",
      "Book the first safari slot of the morning. Wildlife activity collapses after nine, and so does the light.",
      "Wear neutral colours, keep conversation low, and trust your naturalist over your own eyes — they see movement you will not.",
    ],
  },
  {
    slug: "mustang-forbidden-kingdom",
    title: "Mustang: Inside the Last Forbidden Kingdom",
    excerpt: "The walled capital of Lo Manthang only opened to outsiders in 1992. It still feels like a privilege.",
    category: "Destinations",
    date: "09 January 2026",
    readingTime: "10 min read",
    author: { name: "Pemba Sherpa", role: "Head of Mountain Operations" },
    image: destMustang,
    body: [
      "Mustang lies in the rain shadow of the Annapurnas, which is why it looks less like Nepal and more like the Tibetan plateau it culturally belongs to.",
      "The walled city of Lo Manthang has four monasteries, one royal palace and a maze of whitewashed lanes barely wide enough for two loaded mules.",
      "Come in May for the Tiji festival, when masked dancers re-enact the defeat of a demon across three days in the palace square.",
    ],
  },
];

export const faqs = [
  {
    category: "Visa",
    items: [
      { q: "Do I need a visa for Nepal?", a: "Most nationalities receive a visa on arrival at Tribhuvan International Airport. Bring USD in cash and a passport photo; 15, 30 and 90 day options are available. We send a personalised visa brief with every booking." },
      { q: "How long should my passport be valid?", a: "At least six months beyond your date of entry, with two blank pages." },
    ],
  },
  {
    category: "Currency & Money",
    items: [
      { q: "What currency should I bring?", a: "The Nepalese Rupee (NPR) is the local currency. USD and EUR exchange easily in Kathmandu and Pokhara. Carry cash above Lukla and in the far west — card acceptance is unreliable." },
      { q: "How much should I budget for tips?", a: "A guideline is USD 10–12 per day for your guide and USD 7–8 per day for a porter, shared across the group." },
    ],
  },
  {
    category: "Safety",
    items: [
      { q: "Is Nepal safe for solo travellers?", a: "Yes. Nepal has one of the lowest violent crime rates in Asia and a long tradition of hosting independent travellers. All our guides are licensed, first-aid certified and carry satellite communicators on remote routes." },
      { q: "What happens in a medical emergency?", a: "Every itinerary includes a documented evacuation plan. We coordinate directly with helicopter operators and CIWEC Hospital. Comprehensive insurance covering evacuation above 5,000 m is mandatory." },
    ],
  },
  {
    category: "Packing",
    items: [
      { q: "Can I rent gear in Kathmandu?", a: "Yes — down jackets, sleeping bags, poles and duffels are all available to rent or buy in Thamel at excellent value. Your guide will run a full gear check before departure." },
      { q: "What is the luggage limit on trek?", a: "Porters carry a maximum of 15 kg shared between two trekkers. Extra luggage is stored securely at your Kathmandu hotel." },
    ],
  },
  {
    category: "Weather",
    items: [
      { q: "What is the weather like at altitude?", a: "Expect 15–20°C in the sun and below freezing after dark above 4,000 m. Spring and autumn are the most stable; monsoon affects everything except Mustang and Dolpo." },
      { q: "Will flights be delayed?", a: "Mountain flights to Lukla and Jomsom are weather dependent. We build buffer days into every fly-in itinerary." },
    ],
  },
  {
    category: "Permits",
    items: [
      { q: "Which permits do I need?", a: "Most treks require a national park or conservation area permit plus a TIMS card. Restricted areas such as Upper Mustang and Dolpo require a special permit and a licensed guide. We arrange all of it." },
      { q: "Can I trek without a guide?", a: "Since 2023 independent trekking without a licensed guide is prohibited in Nepal's national parks. Every Nepal Heaven trip includes one." },
    ],
  },
];

export const galleryItems = [
  { image: destEverest, title: "Prayer flags, Khumbu", category: "Mountains", span: "tall" },
  { image: destPokhara, title: "Phewa Lake at dusk", category: "Lakes", span: "wide" },
  { image: destKathmandu, title: "Durbar Square dawn", category: "Culture", span: "normal" },
  { image: destChitwan, title: "Rhino in the grasslands", category: "Wildlife", span: "tall" },
  { image: destMustang, title: "Kali Gandaki canyons", category: "Mountains", span: "normal" },
  { image: expParagliding, title: "Thermals over Sarangkot", category: "Adventure", span: "wide" },
  { image: destRara, title: "Rara shoreline", category: "Lakes", span: "tall" },
  { image: destBandipur, title: "Bandipur bazaar", category: "Festivals", span: "normal" },
  { image: destLumbini, title: "Maya Devi at sunset", category: "Culture", span: "normal" },
  { image: destAnnapurna, title: "Annapurna alpenglow", category: "Mountains", span: "wide" },
  { image: heroEverest, title: "Everest above the clouds", category: "Mountains", span: "tall" },
  { image: ctaLodge, title: "Lodge terrace, Himalaya", category: "Festivals", span: "normal" },
];

export const team = [
  { name: "Pemba Sherpa", role: "Founder & Head of Mountain Operations", bio: "Six Everest summits and twenty years leading in the Khumbu." },
  { name: "Anisha Rai", role: "Client Experience Lead", bio: "Designs every itinerary detail from arrival tea to departure transfer." },
  { name: "Bikash Shrestha", role: "Cultural Programme Director", bio: "Newari art historian and the reason our heritage tours are unmatched." },
  { name: "Dr. Sunita Gurung", role: "Expedition Medical Advisor", bio: "High-altitude physician and our safety protocol architect." },
];

export const milestones = [
  { year: "2011", title: "Founded in Kathmandu", detail: "Pemba leads the first Nepal Heaven group to Everest Base Camp." },
  { year: "2015", title: "Rebuilding together", detail: "After the earthquake we fund school reconstruction in three Solukhumbu villages." },
  { year: "2018", title: "Luxury division launches", detail: "Private heli journeys and five-star valley itineraries begin." },
  { year: "2022", title: "Carbon-positive operations", detail: "Every trip offsets at 120% and porters move to insured contracts." },
  { year: "2026", title: "Fifteen years", detail: "Over 10,000 travellers hosted across 250 curated journeys." },
];

export const awards = [
  "World Travel Awards — Nepal's Leading Tour Operator 2025",
  "Travellers' Choice Best of the Best 2024",
  "Nepal Tourism Board Excellence in Safety 2023",
  "Condé Nast Traveller Specialist List 2026",
];

export const partners = ["Nepal Tourism Board", "TAAN", "NMA", "IATA", "Adventure Travel Trade Association"];

export const whyUs = [
  { title: "Trusted Guides", detail: "Licensed, insured, first-aid certified and paid well above the industry standard.", icon: "ShieldCheck" },
  { title: "Best Price Promise", detail: "Transparent pricing with no hidden permit or transfer fees, ever.", icon: "BadgeDollarSign" },
  { title: "Custom Trips", detail: "Every itinerary is redrawn around your dates, pace and appetite for altitude.", icon: "PenLine" },
  { title: "24/7 Support", detail: "A real person on the phone in Kathmandu at any hour of your journey.", icon: "Headphones" },
  { title: "Verified Hotels", detail: "We personally inspect every lodge, camp and hotel we put you in.", icon: "BedDouble" },
  { title: "Safe Travel", detail: "Satellite communicators, evacuation plans and altitude protocols as standard.", icon: "HeartPulse" },
];
