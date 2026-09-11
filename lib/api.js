// Helper ฝั่ง client สำหรับคุยกับ /api/progress, /api/app-state, /api/home-summary
// แทนการเรียก supabase.from('progress') / supabase.from('app_state') ตรงจาก browser
// (ปิด anon key ไม่ให้แตะ 2 ตารางนี้แล้ว — ต้องผ่าน API route ที่ใช้ service role key ฝั่ง server เท่านั้น)

async function apiGet(url) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'เรียก API ไม่สำเร็จ');
  return json;
}

async function apiSend(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'เรียก API ไม่สำเร็จ');
  return json;
}

// ---------- home-summary (รวม app_state + นับ learned/review เป็น 1 request) ----------

// ใช้แทนการเรียก getAppState + getProgress(learned) + getProgress(review) แยก 3 ครั้งบนหน้าแรก
// คืนค่า { appState, learnedCount, reviewCount }
export async function getHomeSummary(accountId) {
  return apiGet(`/api/home-summary?account_id=${encodeURIComponent(accountId)}`);
}

// ---------- app_state ----------

// ดึง app_state ของ account (สร้างแถวใหม่ให้อัตโนมัติถ้ายังไม่มี — เหมือนโค้ดเดิมที่กระจายอยู่หลายไฟล์)
export async function getAppState(accountId) {
  const { row } = await apiGet(`/api/app-state?account_id=${encodeURIComponent(accountId)}`);
  return row;
}

// อัปเดตบางฟิลด์ของ app_state เช่น { current_day_index }, { last_active_date, current_streak }
export async function patchAppState(accountId, patch) {
  const { row } = await apiSend('/api/app-state', 'PATCH', { account_id: accountId, patch });
  return row;
}

// ---------- progress ----------

// options: { status: 'learned' | ['review','learned'], wordIds: [1,2,3], count: true }
// - count:true  -> คืน { count }
// - ไม่ใส่ count -> คืน { rows: [{word_id, status}, ...] }
export async function getProgress(accountId, { status, wordIds, count } = {}) {
  const params = new URLSearchParams({ account_id: accountId });
  if (status) params.set('status', Array.isArray(status) ? status.join(',') : status);
  if (wordIds && wordIds.length) params.set('word_id', wordIds.join(','));
  if (count) params.set('count', 'true');
  return apiGet(`/api/progress?${params.toString()}`);
}

// upsert แถว progress หนึ่งคำ
export async function upsertProgress(accountId, wordId, status) {
  const { row } = await apiSend('/api/progress', 'POST', { account_id: accountId, word_id: wordId, status });
  return row;
}
