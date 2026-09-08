'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { currentDayIndex } from '../../lib/dayLogic';
import { useAccount } from '../../lib/accountContext';

const WORDS_PER_DAY = 10;

function speak(text) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function getPool(accountId) {
  let { data: stateRow } = await supabase.from('app_state').select('*').eq('account_id', accountId).single();
  if (!stateRow) {
    const { data: created } = await supabase.from('app_state').insert({ account_id: accountId }).select().single();
    stateRow = created;
  }
  const dayIdx = currentDayIndex(stateRow.start_date);
  const { data: dayWords } = await supabase.from('words').select('*').eq('day_index', dayIdx);
  if (dayWords && dayWords.length) return shuffle([...dayWords]);
  const { data: anyWords } = await supabase.from('words').select('*').limit(WORDS_PER_DAY);
  return shuffle([...(anyWords || [])]);
}

async function markResult(accountId, wordId, ok) {
  await supabase.from('progress').upsert({
    account_id: accountId,
    word_id: wordId,
    status: ok ? 'learned' : 'review',
    updated_at: new Date().toISOString(),
  });
}

export default function TestMenu() {
  const { account } = useAccount();
  const [mode, setMode] = useState('menu'); // menu | listen | scramble | meaning
  return (
    <main className="wrap">
      <div className="topbar">
        <Link href="/" className="back-btn">←</Link>
        <div className="title">แบบทดสอบ</div>
      </div>

      {mode === 'menu' && (
        <>
          <button className="menu-card" onClick={() => setMode('listen')}>
            <div className="row"><div className="icon">🔊</div>
              <div><div className="t">ฟังแล้วพิมพ์</div><div className="d">ฟังเสียงแล้วพิมพ์คำศัพท์</div></div>
            </div><div className="go">›</div>
          </button>
          <button className="menu-card" onClick={() => setMode('meaning')}>
            <div className="row"><div className="icon">🧠</div>
              <div><div className="t">ดูความหมายแล้วพิมพ์</div><div className="d">เห็นคำแปล/รูป แล้วสะกดคำศัพท์</div></div>
            </div><div className="go">›</div>
          </button>
          <button className="menu-card" onClick={() => setMode('scramble')}>
            <div className="row"><div className="icon">🔤</div>
              <div><div className="t">เรียงตัวอักษร</div><div className="d">แตะตัวอักษรให้เรียงถูก</div></div>
            </div><div className="go">›</div>
          </button>
        </>
      )}

      {mode === 'listen' && <ListenType accountId={account.id} onExit={() => setMode('menu')} />}
      {mode === 'meaning' && <MeaningType accountId={account.id} onExit={() => setMode('menu')} />}
      {mode === 'scramble' && <Scramble accountId={account.id} onExit={() => setMode('menu')} />}
    </main>
  );
}

function ResultScreen({ correct, total, onExit }) {
  return (
    <div className="card-stage">
      <div className="celebrate">
        <div className="emoji">{correct === total ? '🏆' : '✅'}</div>
        <div className="title">ทำแบบทดสอบเสร็จแล้ว</div>
        <div className="sub">ถูก {correct} / {total} คำ</div>
      </div>
      <button className="primary-btn" style={{ marginTop: 26 }} onClick={onExit}>กลับเมนูแบบทดสอบ</button>
    </div>
  );
}

/* ---------- Test A: listen & type ---------- */
function ListenType({ accountId, onExit }) {
  const [pool, setPool] = useState(null);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => { getPool(accountId).then(setPool); }, [accountId]);
  useEffect(() => { if (pool && pool[idx]) speak(pool[idx].en); }, [pool, idx]);

  if (!pool) return <div className="loading-note">กำลังโหลด...</div>;
  if (idx >= pool.length) return <ResultScreen correct={correct} total={pool.length} onExit={onExit} />;
  const w = pool[idx];

  async function check() {
    const ok = value.trim().toUpperCase() === w.en.toUpperCase();
    await markResult(accountId, w.id, ok);
    setFeedback(ok ? { ok: true, text: '❤️ ถูกต้อง!' } : { ok: false, text: '❌ คำตอบคือ ' + w.en });
    setAnswered(true);
    if (ok) setCorrect((c) => c + 1);
  }
  function next() { setIdx((i) => i + 1); setValue(''); setFeedback(null); setAnswered(false); }

  return (
    <div className="test-box">
      <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{idx + 1} / {pool.length}</div>
      <button className="speak-btn" style={{ margin: '10px auto 0' }} onClick={() => speak(w.en)}>🔊</button>
      <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: 6 }}>แตะเพื่อฟังซ้ำ</div>
      <input
        className="type-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !answered && check()}
        placeholder="พิมพ์คำศัพท์ที่ได้ยิน"
        disabled={answered}
      />
      {feedback && <div className={'feedback ' + (feedback.ok ? 'ok' : 'bad')}>{feedback.text}</div>}
      <button className="primary-btn" style={{ marginTop: 16 }} onClick={answered ? next : check}>
        {answered ? 'ถัดไป' : 'ตรวจคำตอบ'}
      </button>
    </div>
  );
}

/* ---------- Test B: see meaning/image, type the word ---------- */
function MeaningType({ accountId, onExit }) {
  const [pool, setPool] = useState(null);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => { getPool(accountId).then(setPool); }, [accountId]);

  if (!pool) return <div className="loading-note">กำลังโหลด...</div>;
  if (idx >= pool.length) return <ResultScreen correct={correct} total={pool.length} onExit={onExit} />;
  const w = pool[idx];

  async function check() {
    const ok = value.trim().toUpperCase() === w.en.toUpperCase();
    await markResult(accountId, w.id, ok);
    setFeedback(ok ? { ok: true, text: '❤️ ถูกต้อง!' } : { ok: false, text: '❌ คำตอบคือ ' + w.en });
    setAnswered(true);
    if (ok) setCorrect((c) => c + 1);
  }
  function next() { setIdx((i) => i + 1); setValue(''); setFeedback(null); setAnswered(false); }

  return (
    <div className="test-box">
      <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{idx + 1} / {pool.length}</div>
      {w.image_url ? (
        <img src={w.image_url} alt="" style={{ maxHeight: 120, margin: '8px auto', display: 'block' }} />
      ) : null}
      <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '1.6rem', fontWeight: 600, color: 'var(--coral-deep)', marginTop: 10 }}>
        {w.mean}
      </div>
      <input
        className="type-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !answered && check()}
        placeholder="พิมพ์คำศัพท์ภาษาอังกฤษ"
        disabled={answered}
      />
      {feedback && <div className={'feedback ' + (feedback.ok ? 'ok' : 'bad')}>{feedback.text}</div>}
      <button className="primary-btn" style={{ marginTop: 16 }} onClick={answered ? next : check}>
        {answered ? 'ถัดไป' : 'ตรวจคำตอบ'}
      </button>
    </div>
  );
}

/* ---------- Test C: unscramble letters ---------- */
function Scramble({ accountId, onExit }) {
  const [pool, setPool] = useState(null);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [order, setOrder] = useState(null);
  const [placed, setPlaced] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => { getPool(accountId).then(setPool); }, [accountId]);

  useEffect(() => {
    if (!pool || !pool[idx]) return;
    const w = pool[idx];
    let letters = w.en.split('').map((_, i) => i);
    let shuffled = shuffle([...letters]);
    if (w.en.length > 1) {
      while (shuffled.every((v, i) => v === letters[i])) shuffled = shuffle([...letters]);
    }
    setOrder(shuffled);
  }, [pool, idx]);

  if (!pool) return <div className="loading-note">กำลังโหลด...</div>;
  if (idx >= pool.length) return <ResultScreen correct={correct} total={pool.length} onExit={onExit} />;
  const w = pool[idx];
  if (!order) return <div className="loading-note">กำลังโหลด...</div>;

  const placedSet = new Set(placed);
  const answer = placed.map((i) => w.en[i]).join('');
  const doneAll = placed.length === w.en.length;

  async function check() {
    const ok = answer.toUpperCase() === w.en.toUpperCase();
    await markResult(accountId, w.id, ok);
    setFeedback(ok ? { ok: true, text: '❤️ ถูกต้อง!' } : { ok: false, text: '❌ คำตอบคือ ' + w.en });
    setAnswered(true);
    if (ok) setCorrect((c) => c + 1);
  }
  function next() {
    setIdx((i) => i + 1); setOrder(null); setPlaced([]); setFeedback(null); setAnswered(false);
  }

  return (
    <div className="test-box">
      <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{idx + 1} / {pool.length}</div>
      <div style={{ fontFamily: 'var(--font-sarabun)', color: 'var(--ink-soft)' }}>ความหมาย: <b>{w.mean}</b></div>
      <button className="speak-btn" style={{ margin: '10px auto 0' }} onClick={() => speak(w.en)}>🔊</button>
      <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: 6 }}>แตะเพื่อฟังซ้ำ</div>
      <div className="answer-slot">{answer || '\u00A0'}</div>
      <div className="letters-row">
        {order.map((i) => (
          <button
            key={i}
            className={'letter-tile' + (placedSet.has(i) ? ' placed' : '')}
            disabled={placedSet.has(i) || answered}
            onClick={() => setPlaced((p) => [...p, i])}
          >
            {w.en[i]}
          </button>
        ))}
      </div>
      {feedback && <div className={'feedback ' + (feedback.ok ? 'ok' : 'bad')}>{feedback.text}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="ghost-btn" style={{ marginTop: 0, background: 'var(--bg)', color: 'white' }} onClick={() => setPlaced([])} disabled={answered}>↺ ล้าง</button>
        <button
          className="primary-btn"
          onClick={answered ? next : check}
          disabled={!answered && !doneAll}
          style={!answered && !doneAll ? { opacity: 0.5 } : {}}
        >
          {answered ? 'ถัดไป' : 'ตรวจคำตอบ'}
        </button>
      </div>
    </div>
  );
}
