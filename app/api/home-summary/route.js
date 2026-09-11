import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL หรือ SUPABASE_SERVICE_ROLE_KEY ไม่ได้ตั้งค่าไว้');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// GET /api/home-summary?account_id=xxx
// รวม 3 สิ่งที่หน้าแรกต้องใช้ไว้ใน 1 request เดียว (เดิมเรียก /api/app-state + /api/progress x2 แยกกัน)
// - app_state ของ account นี้ (สร้างให้อัตโนมัติถ้ายังไม่มี เหมือนเดิม)
// - จำนวนคำที่ status = 'learned'
// - จำนวนคำที่ status = 'review'
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    if (!accountId) return NextResponse.json({ error: 'account_id is required' }, { status: 400 });

    const supabase = getServiceClient();

    // ยิง 3 คำขอไปที่ Supabase พร้อมกัน (จากฝั่ง server เร็วกว่ามาก เพราะ server อยู่ใกล้ Supabase
    // และไม่ต้องเสียเวลา round-trip ระหว่าง browser <-> Vercel หลายรอบเหมือนเดิม)
    const [stateResult, learnedResult, reviewResult] = await Promise.all([
      supabase.from('app_state').select('*').eq('account_id', accountId).single(),
      supabase.from('progress').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('status', 'learned'),
      supabase.from('progress').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('status', 'review'),
    ]);

    let appState = stateResult.data;
    if (stateResult.error && stateResult.error.code === 'PGRST116') {
      const { data: created, error: createErr } = await supabase
        .from('app_state')
        .insert({ account_id: accountId })
        .select()
        .single();
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
      appState = created;
    } else if (stateResult.error) {
      return NextResponse.json({ error: stateResult.error.message }, { status: 500 });
    }

    if (learnedResult.error) return NextResponse.json({ error: learnedResult.error.message }, { status: 500 });
    if (reviewResult.error) return NextResponse.json({ error: reviewResult.error.message }, { status: 500 });

    return NextResponse.json({
      appState,
      learnedCount: learnedResult.count || 0,
      reviewCount: reviewResult.count || 0,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
