'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAccount } from '../../lib/accountContext';

const SESSION_SIZE = 20;
const ROUND_SECONDS = 60;
const TILT_THRESHOLD = 22; // องศาที่ต้องเอียงเกินถึงจะนับว่า "ตัดสินแล้ว"
const NEUTRAL_ZONE = 8;    // ต้องเอียงกลับมาใกล้ 0 ก่อนถึงจะนับครั้งต่อไปได้ (กันเด้งซ้ำ)

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
  const dayIdx = stateRow.current_day_index || 1;
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
      <div style={{ fontFamily: 'var(--font-sarabun)', color: '#DCEFE9', fontSize: '0.92rem', marginBottom: 14, lineHeight: 1.6 }}>
        📱 ถือมือถือแนวนอนไว้ที่หน้าผาก ให้เพื่อนเห็นคำ แล้วบอกให้คุณทาย —
        ตอบถูก <b>เอียงขวา</b> ได้แต้ม, ตอบผิด <b>เอียงซ้าย</b> เปลี่ยนคำ มีเวลา {ROUND_SECONDS} วินาที
      </div>
      <button className="choice-card" onClick={() => start(poolToday)}>คำศัพท์วันนี้</button>
      <button className="choice-card" onClick={() => start(poolLearned)}>คำศัพท์ที่เคยเรียน</button>
      <button className="choice-card" onClick={() => start(poolAll)}>คำศัพท์ทั้งหมด (สุ่ม)</button>
    </main>
  );
}

function PlayGame({ pool, onExit }) {
  const [phase, setPhase] = useState('ready'); // ready | playing | done
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [tiltFlash, setTiltFlash] = useState(null); // 'right' | 'left' | null — ให้จอวาบสีตอนตัดสิน
  const [sensorSupported, setSensorSupported] = useState(true);

  const armedRef = useRef(true); // true = พร้อมรับการเอียงครั้งต่อไป (ต้องกลับมาที่ neutral zone ก่อน)
  const timerRef = useRef(null);

  const w = pool[idx % pool.length];

  function goNext(ok) {
    setScore((s) => s + (ok ? 1 : 0));
    if (!ok) setWrongCount((c) => c + 1);
    setIdx((i) => i + 1);
    setTiltFlash(ok ? 'right' : 'left');
    setTimeout(() => setTiltFlash(null), 300);
  }

  function handleOrientation(event) {
    // ใช้ gamma (เอียงซ้าย-ขวา) เป็นหลัก และปรับตามการหมุนจอถ้าเบราว์เซอร์รายงาน screen.orientation
    let tiltValue = event.gamma;
    const orientType = (typeof screen !== 'undefined' && screen.orientation && screen.orientation.type) || '';
    if (orientType.startsWith('landscape')) {
      // ตอนจอหมุนเป็นแนวนอน แกนซ้าย-ขวาจริงจะไปอยู่ที่ beta แทน
      tiltValue = orientType === 'landscape-primary' ? event.beta : -event.beta;
    }
    if (tiltValue == null) return;

    if (!armedRef.current) {
      // รอให้กลับมาใกล้ 0 ก่อนถึงจะยอมรับการเอียงครั้งใหม่
      if (Math.abs(tiltValue) < NEUTRAL_ZONE) armedRef.current = true;
      return;
    }

    if (tiltValue > TILT_THRESHOLD) {
      armedRef.current = false;
      goNext(true);
    } else if (tiltValue < -TILT_THRESHOLD) {
      armedRef.current = false;
      goNext(false);
    }
  }

  async function startRound() {
    // iOS 13+ ต้องขอสิทธิ์ก่อนถึงจะอ่านเซนเซอร์ได้ ต้องเรียกจาก user gesture (การกดปุ่มนี้) เท่านั้น
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== 'granted') setSensorSupported(false);
      }
    } catch (e) {
      setSensorSupported(false);
    }
    window.addEventListener('deviceorientation', handleOrientation);
    setPhase('playing');
    setTimeLeft(ROUND_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          window.removeEventListener('deviceorientation', handleOrientation);
          setPhase('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  if (phase === 'ready') {
    return (
      <main className="wrap">
        <div className="topbar">
          <button className="back-btn" onClick={onExit}>←</button>
          <div className="title">เล่นกับเพื่อน</div>
        </div>
        <div className="card-stage">
          <div className="celebrate">
            <div className="emoji">📱</div>
            <div className="title">พร้อมหรือยัง?</div>
            <div className="sub" style={{ marginTop: 8 }}>
              หมุนมือถือเป็นแนวนอน แล้วยกไว้ที่หน้าผาก<br />
              ให้เพื่อนบอกความหมาย ทายคำศัพท์ให้ถูก<br />
              ทายถูก เอียงขวา · ทายไม่ได้ เอียงซ้าย
            </div>
          </div>
          <button className="primary-btn" style={{ marginTop: 26 }} onClick={startRound}>
            🚀 เริ่มเกม {ROUND_SECONDS} วินาที
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'done') {
    return (
      <main className="wrap">
        <div className="topbar">
          <button className="back-btn" onClick={onExit}>←</button>
          <div className="title">เล่นกับเพื่อน</div>
        </div>
        <div className="card-stage">
          <div className="celebrate">
            <div className="emoji">🏆</div>
            <div className="title">หมดเวลา!</div>
            <div className="sub">ทายถูก {score} คำ · ทายผิด {wrongCount} คำ</div>
          </div>
          <button className="primary-btn" style={{ marginTop: 26 }} onClick={onExit}>เล่นรอบใหม่</button>
          <Link href="/" className="ghost-btn" style={{ textAlign: 'center' }}>กลับหน้าแรก</Link>
        </div>
      </main>
    );
  }

  // phase === 'playing'
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background:
          tiltFlash === 'right' ? '#1F8A57' : tiltFlash === 'left' ? '#D64550' : 'var(--bg-deep)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
        padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', color: 'white', fontFamily: 'var(--font-sarabun)' }}>
        <span>✅ {score}</span>
        <span>⏱ {timeLeft} วิ</span>
      </div>

      {!sensorSupported && (
        <div style={{ position: 'absolute', bottom: 90, color: '#FFD23F', fontFamily: 'var(--font-sarabun)', fontSize: '0.8rem', textAlign: 'center', padding: '0 20px' }}>
          มือถือนี้ใช้เซนเซอร์เอียงไม่ได้ กดปุ่มด้านล่างแทนได้เลย
        </div>
      )}

      <div
        style={{
          width: '100%',
          maxWidth: 640,
          aspectRatio: '16 / 9',
          background: 'var(--paper)',
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          gap: 14,
        }}
      >
        <div
          style={{
            fontFamily: 'inherit',
            fontWeight: 800,
            fontSize: 'clamp(2.2rem, 10vw, 5rem)',
            color: 'var(--ink)',
            textAlign: 'center',
            wordBreak: 'break-word',
            lineHeight: 1.1,
          }}
        >
          {w.en}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-sarabun)',
            fontWeight: 600,
            fontSize: 'clamp(1.4rem, 6vw, 2.6rem)',
            color: 'var(--coral-deep)',
            textAlign: 'center',
            wordBreak: 'break-word',
          }}
        >
          {w.mean}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 20, width: '100%', maxWidth: 640, flexShrink: 0 }}>
        <button className="judge-btn wrong" style={{ flex: 1 }} onClick={() => goNext(false)}>❌ ผิด</button>
        <button className="judge-btn correct" style={{ flex: 1 }} onClick={() => goNext(true)}>✅ ถูก</button>
      </div>
    </div>
  );
}
