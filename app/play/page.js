'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAccount } from '../../lib/accountContext';
import { getAppState, getProgress } from '../../lib/api';

const SESSION_SIZE = 20;
const ROUND_SECONDS = 60;
const SHOW_SOLO_MODE = false; // ซ่อนตัวเลือก "เล่นคนเดียว" ไว้ก่อน (ยังทดสอบไม่ได้เพราะ iPhone ไม่รองรับฟังเสียง) — เปลี่ยนเป็น true เพื่อเปิดกลับมา
const TILT_THRESHOLD = 22; // องศาที่ต้องเอียงเกินถึงจะนับว่า "ตัดสินแล้ว"
const NEUTRAL_ZONE = 8;    // ต้องเอียงกลับมาใกล้ 0 ก่อนถึงจะนับครั้งต่อไปได้ (กันเด้งซ้ำ)
const MIN_TILT_GAP_MS = 500; // ต้องห่างจากครั้งก่อนอย่างน้อยเท่านี้ กันสัญญาณสั่นตัดสินซ้ำเร็วเกิน
const START_GRACE_MS = 700;  // ไม่รับค่าเอียงช่วงแรกหลังกดเริ่ม กันมือถือเอียงค้างจากตอนกดปุ่ม

function getOrientationType() {
  if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.type) {
    return screen.orientation.type;
  }
  if (typeof window !== 'undefined' && typeof window.orientation === 'number') {
    if (window.orientation === 90) return 'landscape-primary';
    if (window.orientation === -90 || window.orientation === 270) return 'landscape-secondary';
  }
  if (typeof window !== 'undefined' && window.innerWidth > window.innerHeight) return 'landscape-primary';
  return 'portrait-primary';
}
function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function normalizeSpeech(text) {
  return text.trim().toUpperCase().replace(/[^A-Z]/g, '');
}

// เสียงพูดตัวอักษรบางตัวมักถูกแปลงเป็นคำอื่นที่ออกเสียงคล้ายกัน ตารางนี้ช่วยแปลงกลับ
const LETTER_SOUND_MAP = {
  A: 'A', AY: 'A', HEY: 'A',
  B: 'B', BE: 'B', BEE: 'B',
  C: 'C', SEE: 'C', SEA: 'C',
  D: 'D', DEE: 'D',
  E: 'E', EE: 'E',
  F: 'F', EFF: 'F', EF: 'F',
  G: 'G', GEE: 'G',
  H: 'H', AITCH: 'H', HAICH: 'H',
  I: 'I', EYE: 'I',
  J: 'J', JAY: 'J',
  K: 'K', KAY: 'K',
  L: 'L', EL: 'L', ELL: 'L',
  M: 'M', EM: 'M',
  N: 'N', EN: 'N',
  O: 'O', OH: 'O',
  P: 'P', PEA: 'P', PEE: 'P',
  Q: 'Q', CUE: 'Q', QUEUE: 'Q',
  R: 'R', ARE: 'R', AR: 'R',
  S: 'S', ES: 'S', ESS: 'S',
  T: 'T', TEA: 'T', TEE: 'T',
  U: 'U', YOU: 'U', EWE: 'U',
  V: 'V', VEE: 'V',
  W: 'W', DOUBLEU: 'W',
  X: 'X', EX: 'X', ECKS: 'X',
  Y: 'Y', WHY: 'Y',
  Z: 'Z', ZEE: 'Z', ZED: 'Z',
};

function tokenToLetter(token) {
  const clean = token.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) return null;
  if (LETTER_SOUND_MAP[clean]) return LETTER_SOUND_MAP[clean];
  if (clean.length === 1) return clean;
  return null; // ฟังไม่ออกว่าเป็นตัวไหน ข้ามไป
}

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

async function poolToday(accountId) {
  const stateRow = await getAppState(accountId);
  const dayIdx = stateRow.current_day_index || 1;
  const { data: words } = await supabase.from('words').select('id, en, mean').eq('day_index', dayIdx);
  return shuffle([...(words || [])]);
}

async function poolLearned(accountId) {
  const { rows: progressRows } = await getProgress(accountId, { status: 'learned' });
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
      <div style={{ fontFamily: 'var(--font-sarabun)', color: 'var(--ink-soft)', fontSize: '0.92rem', marginBottom: 14, lineHeight: 1.6 }}>
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
  const [mode, setMode] = useState('friend'); // friend (หันจอออก) | solo (หันจอเข้าตัวเอง)
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [tiltFlash, setTiltFlash] = useState(null); // 'right' | 'left' | null — ให้จอวาบสีตอนตัดสิน
  const [sensorSupported, setSensorSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [typedLetters, setTypedLetters] = useState([]);

  const armedRef = useRef(true); // true = พร้อมรับการเอียงครั้งต่อไป (ต้องกลับมาที่ neutral zone ก่อน)
  const timerRef = useRef(null);
  const modeRef = useRef(mode); // handleOrientation อ่านค่านี้แทน state เพราะ closure ของ event listener ไม่รีเฟรช
  const recognitionRef = useRef(null);
  const wordRef = useRef(null); // ให้ onresult อ้างคำปัจจุบันได้เสมอ ไม่ใช้ค่าเก่าจาก closure
  const idxRef = useRef(0);
    const typedLettersRef = useRef([]); // แหล่งความจริงของตัวอักษรที่สะกดมาแล้ว (sync ไม่รอ re-render)
  const lastTriggerRef = useRef(0);   // เวลาที่ตัดสินครั้งล่าสุด กันตัดสินซ้ำเร็วเกิน
  const startedAtRef = useRef(0);     // เวลาที่กดเริ่มเกม กันเอียงค้างจากตอนกดปุ่ม
  const receivedOrientationRef = useRef(false); // true ทันทีที่มีสัญญาณเอียงเข้ามาจริงสักครั้ง — ใช้เช็คว่าเครื่องนี้มีเซนเซอร์จริงไหม (โน้ตบุ๊คไม่มีจะไม่มีสัญญาณเข้ามาเลย)

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const w = pool[idx % pool.length];

  useEffect(() => { wordRef.current = w; typedLettersRef.current = []; setTypedLetters([]); }, [w]);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  useEffect(() => {
    if (phase === 'playing') speak(w.en);
  }, [idx, phase]);

  // โหมดเล่นคนเดียว + เบราว์เซอร์รองรับฟังเสียง -> เริ่มฟังใหม่ทุกครั้งที่เปลี่ยนคำ
  useEffect(() => {
    if (phase !== 'playing' || mode !== 'solo') return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    startListening();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // กันไม่ให้ auto-restart ตอน cleanup
        recognitionRef.current.stop();
      }
    };
  }, [idx, phase, mode]);

  function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const target = normalizeSpeech(wordRef.current.en).split('');
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const transcript = result[0].transcript;
        const tokens = transcript.trim().split(/\s+/);
        for (const token of tokens) {
          if (typedLettersRef.current.length >= target.length) break;
          const letter = tokenToLetter(token);
          if (!letter) continue;
          typedLettersRef.current = [...typedLettersRef.current, letter];
        }
      }
      setTypedLetters([...typedLettersRef.current]);

      if (typedLettersRef.current.length >= target.length) {
        const allCorrect = target.every((ch, i) => typedLettersRef.current[i] === ch);
        if (allCorrect) {
          setTimeout(() => goNext(true), 400); // หน่วงนิดให้เห็นสีเขียวครบก่อนเปลี่ยนคำ
        } else {
          // สะกดครบแต่ผิดบางตัว -> โชว์สีแดงแป๊บนึงแล้วเคลียร์ให้ลองสะกดใหม่
          setTimeout(() => {
            typedLettersRef.current = [];
            setTypedLetters([]);
          }, 900);
        }
      }
    };
    recognition.onend = () => {
      setListening(false);
      // ยังอยู่คำเดิม (ยังไม่ได้เปลี่ยนคำ) แปลว่ายังสะกดไม่ครบ/ไม่ถูก -> ฟังต่ออัตโนมัติ
      if (modeRef.current === 'solo') {
        try { recognition.start(); setListening(true); } catch (e) {}
      }
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        recognitionRef.current = null; // ปิดระบบฟังถาวรถ้าไม่ได้รับสิทธิ์ไมค์
      }
    };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); } catch (e) {}
  }

  function goNext(ok) {
    setScore((s) => s + (ok ? 1 : 0));
    if (!ok) setWrongCount((c) => c + 1);
    setIdx((i) => i + 1);
    setTiltFlash(ok ? 'right' : 'left');
    setTimeout(() => setTiltFlash(null), 300);
  }

  function handleOrientation(event) {
    // ต้องมีค่าจริง (ไม่ใช่ null) ถึงจะถือว่ามีเซนเซอร์จริง — บางเบราว์เซอร์บนคอมยิง
    // event นี้มาให้สักครั้งแต่ค่าเป็น null ทั้งหมด (ไม่มีเซนเซอร์จริง แค่ fire ตามสเปก)
    if (event.beta != null || event.gamma != null) {
      receivedOrientationRef.current = true;
    }
    const orientType = getOrientationType();
    let tiltValue = event.gamma;
    if (orientType.startsWith('landscape')) {
      tiltValue = orientType === 'landscape-primary' ? event.beta : -event.beta;
    }
    tiltValue = -tiltValue; // ยืนยันจากการทดสอบจริงแล้วว่าทิศทางกลับข้างกัน (เอียงขวาจริง = ค่าติดลบ) เลยกลับเครื่องหมายให้ตรง

    if (tiltValue == null) return;
    if (Date.now() - startedAtRef.current < START_GRACE_MS) return;

    if (modeRef.current === 'solo') tiltValue = -tiltValue;

    if (!armedRef.current) {
      if (Math.abs(tiltValue) < NEUTRAL_ZONE) armedRef.current = true;
      return;
    }

    if (Date.now() - lastTriggerRef.current < MIN_TILT_GAP_MS) return;

    if (tiltValue > TILT_THRESHOLD) {
      armedRef.current = false;
      lastTriggerRef.current = Date.now();
      goNext(true);
    } else if (tiltValue < -TILT_THRESHOLD) {
      armedRef.current = false;
      lastTriggerRef.current = Date.now();
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
        armedRef.current = true;
    lastTriggerRef.current = 0;
    startedAtRef.current = Date.now();
    receivedOrientationRef.current = false;
    window.addEventListener('deviceorientation', handleOrientation);
    // ถ้าผ่านไป 1.5 วิ ยังไม่มีสัญญาณเอียงเข้ามาเลย (เช่นเล่นบนโน้ตบุ๊คที่ไม่มี gyroscope)
    // ให้ถือว่าเครื่องนี้ใช้เซนเซอร์ไม่ได้ เปิดปุ่ม ✅/❌ ให้กดแทน
    setTimeout(() => {
      if (!receivedOrientationRef.current) setSensorSupported(false);
    }, 1500);
    setPhase('playing');
    setTimeLeft(ROUND_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          window.removeEventListener('deviceorientation', handleOrientation);
          if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
          }
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
              {SHOW_SOLO_MODE && mode === 'solo'
                ? <>หมุนมือถือเป็นแนวนอน หันจอเข้าหาตัวเอง<br />ฟังเสียงคำศัพท์ ทายจากความหมายที่เห็น</>
                : <>หมุนมือถือเป็นแนวนอน แล้วยกไว้ที่หน้าผาก<br />ให้เพื่อนบอกความหมาย ทายคำศัพท์ให้ถูก</>}
              <br />
              ทายถูก เอียงขวา · ทายไม่ได้ เอียงซ้าย
            </div>
          </div>

          {SHOW_SOLO_MODE && (
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 20 }}>
              <button
                className="ghost-btn"
                style={{ marginTop: 0, background: mode === 'friend' ? 'var(--coral)' : undefined, color: mode === 'friend' ? 'white' : undefined }}
                onClick={() => setMode('friend')}
              >
                👥 เล่นกับเพื่อน
              </button>
              <button
                className="ghost-btn"
                style={{ marginTop: 0, background: mode === 'solo' ? 'var(--coral)' : undefined, color: mode === 'solo' ? 'white' : undefined }}
                onClick={() => setMode('solo')}
              >
                🙋 เล่นคนเดียว
              </button>
            </div>
          )}

          <button className="primary-btn" style={{ marginTop: 16 }} onClick={startRound}>
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
        padding: '16px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 'calc(14px + env(safe-area-inset-top, 0px))',
          left: 'calc(36px + env(safe-area-inset-left, 0px))',
          right: 'calc(36px + env(safe-area-inset-right, 0px))',
          display: 'flex',
          justifyContent: 'space-between',
          color: 'white',
          fontFamily: 'var(--font-sarabun)',
          fontSize: '1.4rem',
          fontWeight: 700,
        }}
      >
        <span style={{ background: 'rgba(0,0,0,0.25)', padding: '6px 18px', borderRadius: 999 }}>✅ {score}</span>
        <span style={{ background: 'rgba(0,0,0,0.25)', padding: '6px 18px', borderRadius: 999 }}>⏱ {timeLeft} วิ</span>
      </div>

      {!sensorSupported && (
        <div style={{ position: 'absolute', bottom: 90, color: 'var(--ink)', fontFamily: 'var(--font-sarabun)', fontSize: '0.8rem', textAlign: 'center', padding: '0 20px', background: 'rgba(255,255,255,0.6)', borderRadius: 12 }}>
          มือถือนี้ใช้เซนเซอร์เอียงไม่ได้ กดปุ่มด้านล่างแทนได้เลย
        </div>
      )}

      <div
        onClick={() => speak(w.en)}
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
          cursor: 'pointer',
        }}
      >
        {mode === 'friend' && (
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
        )}
        {mode === 'solo' && (
          <>
            <div style={{ fontSize: '2.4rem' }}>{listening ? '🎤' : '🔊'}</div>
            {listening && (
              <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                กำลังฟัง... สะกดคำศัพท์ทีละตัวอักษร
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {w.en.split('').map((targetChar, i) => {
                const said = typedLetters[i];
                const isCorrect = said && said === targetChar.toUpperCase();
                const isWrong = said && said !== targetChar.toUpperCase();
                return (
                  <div
                    key={i}
                    style={{
                      width: 36,
                      height: 44,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                      background: isCorrect ? '#DFF3E8' : isWrong ? '#FBE2E4' : 'var(--paper-edge)',
                      color: isCorrect ? '#1F8A57' : isWrong ? '#D64550' : 'var(--ink-soft)',
                    }}
                  >
                    {said || ''}
                  </div>
                );
              })}
            </div>
          </>
        )}
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

            {!sensorSupported && (
        <div style={{ display: 'flex', gap: 16, marginTop: 14, width: '100%', maxWidth: 640, flexShrink: 0 }}>
          <button className="judge-btn wrong" style={{ flex: 1 }} onClick={() => goNext(false)}>❌ ผิด</button>
          <button className="judge-btn correct" style={{ flex: 1 }} onClick={() => goNext(true)}>✅ ถูก</button>
        </div>
      )}
    </div>
  );
}
