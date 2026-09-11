import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL หรือ SUPABASE_SERVICE_ROLE_KEY ไม่ได้ตั้งค่าไว้');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// GET /api/app-state?account_id=xxx
// เหมือนโค้ดเดิมที่กระจายอยู่หลายไฟล์: ถ้ายังไม่มีแถวของ account นี้ สร้างให้อัตโนมัติ แล้วคืนแถวเสมอ
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    if (!accountId) return NextResponse.json({ error: 'account_id is required' }, { status: 400 });

    const supabase = getServiceClient();
    let { data: row, error } = await supabase.from('app_state').select('*').eq('account_id', accountId).single();

    if (error && error.code === 'PGRST116') {
      const { data: created, error: createErr } = await supabase
        .from('app_state')
        .insert({ account_id: accountId })
        .select()
        .single();
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
      row = created;
    } else if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ row });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/app-state  { account_id, patch: { current_day_index, last_active_date, current_streak, ... } }
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { account_id, patch } = body || {};
    if (!account_id || !patch) {
      return NextResponse.json({ error: 'account_id and patch is required' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('app_state')
      .update(patch)
      .eq('account_id', account_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ row: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
