import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// รันบน Edge Runtime แทน Node.js เดิม — cold start เร็วขึ้นมาก และรันใกล้ผู้ใช้กว่า
// (ทำได้เพราะ supabase-js ใช้ fetch ธรรมดา ไม่พึ่ง Node API ที่ Edge ไม่รองรับ)
export const runtime = 'edge';

// ใช้ SUPABASE_SERVICE_ROLE_KEY (ตัวแปร env ฝั่ง server เท่านั้น — ห้ามมี NEXT_PUBLIC_ นำหน้า
// เด็ดขาด เพราะจะถูกส่งไป browser) แทน anon key ที่ frontend เคยใช้เรียกตรง
function getServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL หรือ SUPABASE_SERVICE_ROLE_KEY ไม่ได้ตั้งค่าไว้');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// GET /api/progress?account_id=xxx&status=learned,review&word_id=1,2,3&count=true
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    if (!accountId) return NextResponse.json({ error: 'account_id is required' }, { status: 400 });

    const statusParam = searchParams.get('status');
    const wordIdParam = searchParams.get('word_id');
    const countOnly = searchParams.get('count') === 'true';

    const supabase = getServiceClient();

    if (countOnly) {
      let query = supabase.from('progress').select('*', { count: 'exact', head: true }).eq('account_id', accountId);
      if (statusParam) query = query.eq('status', statusParam);
      const { count, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ count: count || 0 });
    }

    let query = supabase.from('progress').select('word_id, status').eq('account_id', accountId);
    if (statusParam) {
      const statuses = statusParam.split(',');
      query = statuses.length > 1 ? query.in('status', statuses) : query.eq('status', statuses[0]);
    }
    if (wordIdParam) {
      query = query.in('word_id', wordIdParam.split(',').map(Number));
    }
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/progress  { account_id, word_id, status }
export async function POST(request) {
  try {
    const body = await request.json();
    const { account_id, word_id, status } = body || {};
    if (!account_id || !word_id || !status) {
      return NextResponse.json({ error: 'account_id, word_id, status is required' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('progress')
      .upsert({ account_id, word_id, status, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ row: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
