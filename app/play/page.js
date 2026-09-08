'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { currentDayIndex } from '../../lib/dayLogic';
import { useAccount } from '../../lib/accountContext';

const SESSION_SIZE = 20;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function poolToday(accountId) {
  let { data: stateRow } = await supabase.from('app_state').select('*').eq('account_id', accountId).single();
  if (!stateRow) {
    const { data: created } = await supabase.from('app_state').insert({ account_id: accountId }).select().single();
    stateRow = created;
  }
  const dayIdx = currentDayIndex(stateRow.start_date);
  const { data: words } = await supabase.from('words').select('id, en, mean').eq('day_index', dayIdx);
  return shuffle([...(words || [])]);
}

async function poolLearned(accountId) {
  const { data: progressRows } = await supabase.from('progress').select('word_id').eq('account_id', accountId).eq('status', 'learned');
  const ids = (progressRows || []).map((r) => r.word_id);
  if (ids.length === 0) return [];
  const { data: words } = await supabase.from('words').select('id, en, mean').in('id', ids);
  return shuffle([...(words || [])]).slice(0, SESSION_SIZE);
}

async function poolAll() {
  const { data: words } = await supabase.from('words').select('id, en, mean');
  return shuffle([...(words || [])]).slice(0, SESSION_SIZE);
}

export default function PlaySetup() {
  const { account } = useAccount();
  const [loading, setLoading] = useState(false);
  const [pool, setPool] = useState(null);

  async function start(getPool) {
    setLoading(true);
    const words = await getPool(account.id);
    if (words.length === 0) {
      setLoading(false);
      alert('ยังไม่มีคำศัพท์ในหมวดนี้ ลองเลือกหมวดอื่นดูก่อนนะ');
      return;
    }
    setPool(words);
    setLoading(false);
  }

  if (loading) return <main className="wrap"><div className="loading-note">กำลังโหลด...</div></main>;

  if (pool) return <PlayGame pool={pool} onExit={() => setPool(null)} />;

  return (
    <main className="wrap">
      <div className="topbar">
        <Link href="/" className="back-btn">←</Link>
        <div className="title">เล่นกับเพื่อน</div>
      </div>
      <div style={{ fontFamily: 'var(--font-sarabun)', color: '#DCEFE9', fontSize: '0.92rem', marginBottom: 14 }}>
        ยกจอให้เพื่อนดูคำศัพท์ แล้วเพื่อนบอกความหมายให้คุณสะกดคำ — ตัดสินผลเองด้วยปุ่ม ✅ / ❌
      </div>
      <button className="choice-card" onClick={() => start(poolToday)}>คำศัพท์วันนี้</button>
      <button className="choice-card" onClick={() => start(poolLearned)}>คำศัพท์ที่เคยเรียน</button>
      <button className="choice-card" onClick={() => start(poolAll)}>คำศัพท์ทั้งหมด (สุ่ม)</button>
    </main>
  );
}

function PlayGame({ pool, onExit }) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [hidden, setHidden] = useState(false);

  if (idx >= pool.length) {
    return (
      <main className="wrap">
        <div className="card-stage">
          <div className="celebrate">
            <div className="emoji">{score === pool.length ? '🏆' : '🎉'}</div>
            <div className="title">เล่นจบแล้ว</div>
            <div className="sub">ทายถูก {score} / {pool.length} คำ</div>
          </div>
          <button className="primary-btn" style={{ marginTop: 26 }} onClick={onExit}>เล่นรอบใหม่</button>
          <Link href="/" className="ghost-btn" style={{ textAlign: 'center' }}>กลับหน้าแรก</Link>
        </div>
      </main>
    );
  }

  const w = pool[idx];

  function next(ok) {
    setScore((s) => s + (ok ? 1 : 0));
    setIdx((i) => i + 1);
    setHidden(false);
  }

  return (
    <main className="wrap">
      <div className="topbar">
        <button className="back-btn" onClick={onExit}>←</button>
        <div className="title">เล่นกับเพื่อน</div>
      </div>
      <div className="play-score">✅ {score} · {idx + 1}/{pool.length}</div>
      <div className="card-stage">
        <div className="flashcard">
          {hidden ? (
            <div className="play-hidden">❓</div>
          ) : (
            <>
              <div className="word">{w.en}</div>
              <div className="meaning" style={{ marginTop: 10 }}>{w.mean}</div>
            </>
          )}
        </div>
        <button className="ghost-btn" style={{ maxWidth: 220 }} onClick={() => setHidden((h) => !h)}>
          👁 {hidden ? 'แสดงคำศัพท์' : 'ซ่อนคำศัพท์'}
        </button>
        <div className="judge-row">
          <button className="judge-btn wrong" onClick={() => next(false)}>❌ ผิด</button>
          <button className="judge-btn correct" onClick={() => next(true)}>✅ ถูก</button>
        </div>
      </div>
    </main>
  );
}
