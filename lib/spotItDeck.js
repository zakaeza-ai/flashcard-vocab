// ---------- ไอคอนตกแต่งระดับ 2 (ป.4-6) — หลอกตาเล็กน้อย ไม่อิงความหมาย ----------
export const DECORATIVE_ICONS_LEVEL2 = [
  '⭐', '🌟', '✨', '💫', '🎯', '🎈', '🎉', '🎊', '🔥', '💧',
  '🌈', '⚡', '🔷', '🔶', '🔵', '🟢', '🟡', '🟣', '🟠', '💠',
  '🎨', '🎵', '🍀', '🌸', '🦋', '🐚', '🌙', '☀️', '❄️', '🌊',
];
// เก็บชื่อเดิมไว้ให้โค้ดที่อาจอ้างอิงอยู่แล้วไม่พัง
export const DECORATIVE_ICONS = DECORATIVE_ICONS_LEVEL2;

// ---------- ไอคอนตกแต่งระดับ 3 (ม.1-3) — ชุดใหม่ แนวน่ารัก แยกจากระดับ 2 ----------
export const DECORATIVE_ICONS_LEVEL3 = [
  '🐰', '🐻', '🐼', '🦄', '🍬', '🍭', '🍩', '🧁', '🍦', '🎀',
  '🩷', '🧸', '🌷', '🍓', '🍒', '🥨', '🍪', '🐤', '🐹', '🦔',
  '🐢', '🦕', '🦖', '🐳', '🐬', '🦩', '🦚', '🌼', '🍉', '🍇',
];

// ---------- คลังสัญลักษณ์ระดับ 1 (ป.1-3) — คำง่าย + emoji ความหมายตรงตัว ----------
// index ในอาร์เรย์นี้ไม่ผูกกับ symbol id โดยตรงอีกต่อไป (สุ่มหยิบตอนสร้างห้องแทน)
export const SYMBOLS = [
  { en: 'CAT', emoji: '🐱', mean: 'แมว' },
  { en: 'DOG', emoji: '🐶', mean: 'สุนัข' },
  { en: 'FISH', emoji: '🐟', mean: 'ปลา' },
  { en: 'BIRD', emoji: '🐦', mean: 'นก' },
  { en: 'APPLE', emoji: '🍎', mean: 'แอปเปิ้ล' },
  { en: 'BANANA', emoji: '🍌', mean: 'กล้วย' },
  { en: 'SUN', emoji: '☀️', mean: 'ดวงอาทิตย์' },
  { en: 'MOON', emoji: '🌙', mean: 'ดวงจันทร์' },
  { en: 'STAR', emoji: '⭐', mean: 'ดาว' },
  { en: 'TREE', emoji: '🌳', mean: 'ต้นไม้' },
  { en: 'FLOWER', emoji: '🌸', mean: 'ดอกไม้' },
  { en: 'BOOK', emoji: '📖', mean: 'หนังสือ' },
  { en: 'PEN', emoji: '🖊️', mean: 'ปากกา' },
  { en: 'CAR', emoji: '🚗', mean: 'รถยนต์' },
  { en: 'BUS', emoji: '🚌', mean: 'รถบัส' },
  { en: 'TRAIN', emoji: '🚆', mean: 'รถไฟ' },
  { en: 'BOAT', emoji: '⛵', mean: 'เรือ' },
  { en: 'HOUSE', emoji: '🏠', mean: 'บ้าน' },
  { en: 'SCHOOL', emoji: '🏫', mean: 'โรงเรียน' },
  { en: 'BALL', emoji: '⚽', mean: 'ลูกบอล' },
  { en: 'BALLOON', emoji: '🎈', mean: 'ลูกโป่ง' },
  { en: 'CAKE', emoji: '🎂', mean: 'เค้ก' },
  { en: 'EGG', emoji: '🥚', mean: 'ไข่' },
  { en: 'MILK', emoji: '🥛', mean: 'นม' },
  { en: 'BREAD', emoji: '🍞', mean: 'ขนมปัง' },
  { en: 'RICE', emoji: '🍚', mean: 'ข้าว' },
  { en: 'CHICKEN', emoji: '🐔', mean: 'ไก่' },
  { en: 'COW', emoji: '🐮', mean: 'วัว' },
  { en: 'PIG', emoji: '🐷', mean: 'หมู' },
  { en: 'DUCK', emoji: '🦆', mean: 'เป็ด' },
  { en: 'RABBIT', emoji: '🐰', mean: 'กระต่าย' },
  { en: 'LION', emoji: '🦁', mean: 'สิงโต' },
  { en: 'ELEPHANT', emoji: '🐘', mean: 'ช้าง' },
  { en: 'MONKEY', emoji: '🐵', mean: 'ลิง' },
  { en: 'BUTTERFLY', emoji: '🦋', mean: 'ผีเสื้อ' },
  { en: 'BEE', emoji: '🐝', mean: 'ผึ้ง' },
  { en: 'UMBRELLA', emoji: '☂️', mean: 'ร่ม' },
  { en: 'CLOCK', emoji: '🕐', mean: 'นาฬิกา' },
  { en: 'KEY', emoji: '🔑', mean: 'กุญแจ' },
  { en: 'DOOR', emoji: '🚪', mean: 'ประตู' },
  { en: 'CHAIR', emoji: '🪑', mean: 'เก้าอี้' },
  { en: 'TABLE', emoji: '🛎️', mean: 'โต๊ะ' },
  { en: 'PHONE', emoji: '☎️', mean: 'โทรศัพท์' },
  { en: 'COMPUTER', emoji: '💻', mean: 'คอมพิวเตอร์' },
  { en: 'SHOE', emoji: '👟', mean: 'รองเท้า' },
  { en: 'HAT', emoji: '🎩', mean: 'หมวก' },
  { en: 'SHIRT', emoji: '👕', mean: 'เสื้อ' },
  { en: 'GLASSES', emoji: '👓', mean: 'แว่นตา' },
  { en: 'HEART', emoji: '❤️', mean: 'หัวใจ' },
  { en: 'SMILE', emoji: '😊', mean: 'รอยยิ้ม' },
  { en: 'RAIN', emoji: '🌧️', mean: 'ฝน' },
  { en: 'SNOW', emoji: '❄️', mean: 'หิมะ' },
  { en: 'FIRE', emoji: '🔥', mean: 'ไฟ' },
  { en: 'ICE', emoji: '🧊', mean: 'น้ำแข็ง' },
  { en: 'WATER', emoji: '💧', mean: 'น้ำ' },
  { en: 'MOUNTAIN', emoji: '⛰️', mean: 'ภูเขา' },
   { en: 'BEACH', emoji: '🏖️', mean: 'ชายหาด' },
  { en: 'FROG', emoji: '🐸', mean: 'กบ' },
  { en: 'SNAKE', emoji: '🐍', mean: 'งู' },
  { en: 'TIGER', emoji: '🐯', mean: 'เสือ' },
  { en: 'BEAR', emoji: '🐻', mean: 'หมี' },
  { en: 'PANDA', emoji: '🐼', mean: 'แพนด้า' },
  { en: 'KOALA', emoji: '🐨', mean: 'โคอาล่า' },
  { en: 'HORSE', emoji: '🐴', mean: 'ม้า' },
  { en: 'SHEEP', emoji: '🐑', mean: 'แกะ' },
  { en: 'GOAT', emoji: '🐐', mean: 'แพะ' },
  { en: 'CAMEL', emoji: '🐫', mean: 'อูฐ' },
  { en: 'TURTLE', emoji: '🐢', mean: 'เต่า' },
  { en: 'CRAB', emoji: '🦀', mean: 'ปู' },
  { en: 'SHRIMP', emoji: '🦐', mean: 'กุ้ง' },
  { en: 'OCTOPUS', emoji: '🐙', mean: 'ปลาหมึก' },
  { en: 'WHALE', emoji: '🐳', mean: 'ปลาวาฬ' },
  { en: 'DOLPHIN', emoji: '🐬', mean: 'ปลาโลมา' },
  { en: 'SHARK', emoji: '🦈', mean: 'ปลาฉลาม' },
  { en: 'SPIDER', emoji: '🕷️', mean: 'แมงมุม' },
  { en: 'ANT', emoji: '🐜', mean: 'มด' },
  { en: 'SNAIL', emoji: '🐌', mean: 'หอยทาก' },
  { en: 'OWL', emoji: '🦉', mean: 'นกฮูก' },
  { en: 'PENGUIN', emoji: '🐧', mean: 'เพนกวิน' },
  { en: 'PARROT', emoji: '🦜', mean: 'นกแก้ว' },
  { en: 'PEACOCK', emoji: '🦚', mean: 'นกยูง' },
  { en: 'ORANGE', emoji: '🍊', mean: 'ส้ม' },
  { en: 'GRAPE', emoji: '🍇', mean: 'องุ่น' },
  { en: 'WATERMELON', emoji: '🍉', mean: 'แตงโม' },
  { en: 'STRAWBERRY', emoji: '🍓', mean: 'สตรอว์เบอร์รี' },
  { en: 'PINEAPPLE', emoji: '🍍', mean: 'สับปะรด' },
  { en: 'PEACH', emoji: '🍑', mean: 'ท้อ' },
  { en: 'CHERRY', emoji: '🍒', mean: 'เชอร์รี' },
  { en: 'LEMON', emoji: '🍋', mean: 'เลมอน' },
  { en: 'CARROT', emoji: '🥕', mean: 'แครอท' },
  { en: 'CORN', emoji: '🌽', mean: 'ข้าวโพด' },
  { en: 'POTATO', emoji: '🥔', mean: 'มันฝรั่ง' },
  { en: 'TOMATO', emoji: '🍅', mean: 'มะเขือเทศ' },
  { en: 'MUSHROOM', emoji: '🍄', mean: 'เห็ด' },
  { en: 'ICE CREAM', emoji: '🍨', mean: 'ไอศกรีม' },
  { en: 'CANDY', emoji: '🍬', mean: 'ลูกอม' },
  { en: 'COOKIE', emoji: '🍪', mean: 'คุกกี้' },
  { en: 'DONUT', emoji: '🍩', mean: 'โดนัท' },
  { en: 'PIZZA', emoji: '🍕', mean: 'พิซซ่า' },
  { en: 'HAMBURGER', emoji: '🍔', mean: 'แฮมเบอร์เกอร์' },
  { en: 'GUITAR', emoji: '🎸', mean: 'กีตาร์' },
  { en: 'BICYCLE', emoji: '🚲', mean: 'จักรยาน' },
  { en: 'AIRPLANE', emoji: '✈️', mean: 'เครื่องบิน' },
];

// n=5 (จำนวนเฉพาะ) -> สัญลักษณ์/ใบ = n+1 = 6, จำนวนการ์ดทั้งหมด = n²+n+1 = 31
export const ORDER = 5;
export const SYMBOL_COUNT = ORDER * ORDER + ORDER + 1; // 31

const TWEMOJI_VERSION = '14.0.2';

export function emojiToImageUrl(emoji) {
  const codepoints = Array.from(emoji)
    .map((c) => c.codePointAt(0).toString(16))
    .filter((hex) => hex !== 'fe0f')
    .join('-');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@${TWEMOJI_VERSION}/assets/svg/${codepoints}.svg`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// สร้างสำรับเต็ม n²+n+1 ใบ x (n+1) สัญลักษณ์/ใบ — ทุกคู่ใบตรงกันแค่ 1 สัญลักษณ์เสมอ
export function generateFullDeck(n = ORDER) {
  const cards = [];
  cards.push(Array.from({ length: n + 1 }, (_, i) => i));
  for (let i = 0; i < n; i++) {
    const card = [0];
    for (let j = 0; j < n; j++) card.push(n + 1 + n * i + j);
    cards.push(card);
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const card = [i + 1];
      for (let k = 0; k < n; k++) {
        card.push(n + 1 + n * k + ((i * k + j) % n));
      }
      cards.push(card);
    }
  }
  return cards;
}

export function verifyDeck(cards) {
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const shared = cards[i].filter((s) => cards[j].includes(s));
      if (shared.length !== 1) return { ok: false, cardA: i, cardB: j, shared };
    }
  }
  return { ok: true };
}

// ระดับ 1: หยิบจาก SYMBOLS (มี emoji ความหมายตรงตัวอยู่แล้ว) — ไม่ต้องดึงจาก DB
export function buildLevel1Pool(n = ORDER) {
  const symbolCount = n * n + n + 1;
  const picked = shuffle(SYMBOLS).slice(0, symbolCount);
  return picked.map((w, i) => ({
    id: i,
    en: w.en,
    mean: w.mean,
    emoji: w.emoji,
    imageUrl: emojiToImageUrl(w.emoji),
  }));
}

// ระดับ 2/3: หยิบจากคำที่ query มาจาก DB ตามช่วงชั้น + ไอคอนตกแต่งสุ่มตามชุดที่ส่งมา
export function buildSymbolPool(words, iconSet = DECORATIVE_ICONS_LEVEL2, n = ORDER) {
  const symbolCount = n * n + n + 1;
  if (!words || words.length < symbolCount) {
    throw new Error(`ต้องมีคำอย่างน้อย ${symbolCount} คำถึงจะสร้างสำรับได้`);
  }
  const picked = shuffle(words).slice(0, symbolCount);
  return picked.map((w, i) => {
    const icon = iconSet[Math.floor(Math.random() * iconSet.length)];
    return {
      id: i,
      en: w.en,
      mean: w.mean,
      emoji: icon,
      imageUrl: emojiToImageUrl(icon),
    };
  });
}

export function getPlayDeck(symbolPool, cardCount = 24, n = ORDER) {
  const fullDeck = generateFullDeck(n);
  const picked = shuffle(fullDeck).slice(0, Math.min(cardCount, fullDeck.length));
  return picked.map((symbolIds) => shuffle(symbolIds).map((id) => symbolPool[id]));
}
