import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This route is called once a day by Vercel Cron (see vercel.json).
// It checks every account with a parent_email set, counts how many
// words were newly learned TODAY, and emails a summary if > 0.

function todayRangeISO() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return { start, end };
}

async function sendSummaryEmail({ parentEmail, studentName, wordCount }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: parentEmail,
      subject: `สรุปการเรียนวันนี้ของ ${studentName}`,
      html: `
        <div style="font-family: sans-serif; padding: 16px;">
          <h2>📚 สรุปการท่องศัพท์วันนี้</h2>
          <p><b>${studentName}</b> เข้ามาเรียนวันนี้ และจำคำศัพท์ใหม่ได้ <b>${wordCount} คำ</b> 🎉</p>
          <p style="color:#888; font-size: 0.85rem;">อีเมลนี้ส่งอัตโนมัติทุกวันจากระบบท่องศัพท์วันละ 10 คำ</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error: ${res.status} ${text}`);
  }
}

export async function GET(request) {
  // Optional protection: only allow Vercel Cron (or a manual call with the right secret) to trigger this
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: accounts, error: accErr } = await supabase
    .from('accounts')
    .select('id, name, parent_email')
    .not('parent_email', 'is', null);

  if (accErr) {
    return NextResponse.json({ error: accErr.message }, { status: 500 });
  }

  const { start, end } = todayRangeISO();
  const results = [];

  for (const acc of accounts || []) {
    const { count, error: countErr } = await supabase
      .from('progress')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', acc.id)
      .eq('status', 'learned')
      .gte('updated_at', start)
      .lt('updated_at', end);

    if (countErr) {
      results.push({ account: acc.name, error: countErr.message });
      continue;
    }

    if (count && count > 0) {
      try {
        await sendSummaryEmail({ parentEmail: acc.parent_email, studentName: acc.name, wordCount: count });
        results.push({ account: acc.name, sent: true, wordCount: count });
      } catch (e) {
        results.push({ account: acc.name, sent: false, error: e.message });
      }
    } else {
      results.push({ account: acc.name, sent: false, reason: 'no activity today' });
    }
  }

  return NextResponse.json({ ok: true, results });
}
