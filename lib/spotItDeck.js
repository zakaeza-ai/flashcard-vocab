// ---------- ไอคอนตกแต่งเล่นๆ (ไม่อิงความหมายคำ แค่ให้ดูมีสีสัน) ----------
// ใช้ตอนสร้างสำรับจากคำศัพท์จริง (เช่นสุ่มจากคลัง 4,260 คำ) ที่ไม่มีรูปผูกกับคำแต่ละคำ
export const DECORATIVE_ICONS = [
  '⭐', '🌟', '✨', '💫', '🎯', '🎈', '🎉', '🎊', '🔥', '💧',
  '🌈', '⚡', '🔷', '🔶', '🔵', '🟢', '🟡', '🟣', '🟠', '💠',
  '🎨', '🎵', '🍀', '🌸', '🦋', '🐚', '🌙', '☀️', '❄️', '🌊',
];

// ---------- คลังสัญลักษณ์สำรอง 57 คำ (ใช้ตอนไม่ได้ส่งคำจากภายนอกเข้ามา) ----------
// index ในอาร์เรย์นี้คือ "symbol id" ที่อัลกอริทึมด้านล่างใช้อ้างอิง ห้ามสลับลำดับหลัง deploy จริง
// เพราะถ้าสลับ symbol id ที่เคย generate ไว้แล้วจะผิดคู่ (ถ้าจะสลับคำ ให้สลับแค่ en/emoji/mean ในตำแหน่งเดิม)
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
];

const ORDER = 7; // จำนวนเฉพาะ n -> คำ/ใบ = n+1 = 8, จำนวนการ์ดทั้งหมด = n²+n+1 = 57
const TWEMOJI_VERSION = '14.0.2'; // ล็อกเวอร์ชันไว้ กันลิงก์เปลี่ยนแบบไม่คาดคิดถ้า Twemoji อัปเดต

// แปลงตัวอักษรอิโมจิเป็นลิงก์รูปภาพ Twemoji (SVG) — หน้าตาเหมือนกันทุกเครื่อง ไม่ขึ้นกับฟอนต์อิโมจิของแต่ละ OS
export function emojiToImageUrl(emoji) {
  const codepoints = Array.from(emoji)
    .map((c) => c.codePointAt(0).toString(16))
    .filter((hex) => hex !== 'fe0f') // Twemoji ตัด variation selector ออกจากชื่อไฟล์
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

// สร้างสำรับเต็ม 57 ใบ x 8 คำ/ใบ — ทุกคู่ใบตรงกันแค่ 1 สัญลักษณ์เสมอ
// อ้างอิงโครงสร้าง finite projective plane อันดับ n (n ต้องเป็นจำนวนเฉพาะ)
export function generateFullDeck(n = ORDER) {
  const cards = [];

  // ใบที่ 1: สัญลักษณ์ 0..n (กลุ่มแรก)
  cards.push(Array.from({ length: n + 1 }, (_, i) => i));

  // n ใบถัดมา: มีสัญลักษณ์ 0 ร่วม + กลุ่มที่สองคนละบล็อก
  for (let i = 0; i < n; i++) {
    const card = [0];
    for (let j = 0; j < n; j++) card.push(n + 1 + n * i + j);
    cards.push(card);
  }

  // n² ใบที่เหลือ: มีสัญลักษณ์ 1..n ตัวใดตัวหนึ่งร่วม + คัดจากกลุ่มที่สองตาม Latin square
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const card = [i + 1];
      for (let k = 0; k < n; k++) {
        card.push(n + 1 + n * k + ((i * k + j) % n));
      }
      cards.push(card);
    }
  }

  return cards; // 57 การ์ด แต่ละใบเป็น array ของ symbol id (0-56) ยาว 8 ตัว
}

// เช็คว่าทุกคู่การ์ดในสำรับ ตรงกันแค่ 1 สัญลักษณ์จริงไหม (ใช้ตอนพัฒนา/เทส ไม่ต้องเรียกตอนรันจริง)
export function verifyDeck(cards) {
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const shared = cards[i].filter((s) => cards[j].includes(s));
      if (shared.length !== 1) {
        return { ok: false, cardA: i, cardB: j, shared };
      }
    }
  }
  return { ok: true };
}

// แปลงรายการคำ ({id, en, mean}) จากฐานข้อมูลจริง ให้เป็นคลังสัญลักษณ์ 57 ตัวพร้อมไอคอนตกแต่งสุ่ม
// ไอคอนที่ได้ "ไม่ได้สื่อความหมายของคำ" แค่ให้ดูมีสีสันน่าเล่น — ตัวที่ใช้จับคู่จริงคือคำ+ความหมายเท่านั้น
export function buildSymbolPool(words) {
  if (!words || words.length < 57) {
    throw new Error('ต้องมีคำอย่างน้อย 57 คำถึงจะสร้างสำรับได้');
  }
  const picked = shuffle(words).slice(0, 57);
  return picked.map((w, i) => {
    const icon = DECORATIVE_ICONS[Math.floor(Math.random() * DECORATIVE_ICONS.length)];
    return {
      id: i, // ต้องเป็น 0..56 เรียงตามตำแหน่ง ให้ตรงกับ symbol id ที่ generateFullDeck() ใช้อ้างอิง
      en: w.en,
      mean: w.mean,
      emoji: icon,
      imageUrl: emojiToImageUrl(icon),
    };
  });
}

// สุ่มหยิบการ์ดมาใช้เล่นจริง (ค่าเริ่มต้น 32 ใบ) — ยังคงสมบัติ "ตรงกันแค่ 1 สัญลักษณ์" อยู่ เพราะเป็น subset ของสำรับที่ถูกต้อง
// symbolPool: อาร์เรย์ 57 สัญลักษณ์ (จาก buildSymbolPool หรือ SYMBOLS สำรองด้านบน)
export function getPlayDeck(symbolPool = SYMBOLS.map((s, id) => ({ id, ...s, imageUrl: emojiToImageUrl(s.emoji) })), cardCount = 32) {
  const fullDeck = generateFullDeck();
  const picked = shuffle(fullDeck).slice(0, cardCount);
  // แปลง symbol id เป็นข้อมูลคำเต็ม พร้อมสุ่มลำดับการวางในแต่ละใบให้ดูเป็นธรรมชาติ
  return picked.map((symbolIds) => shuffle(symbolIds).map((id) => symbolPool[id]));
}
