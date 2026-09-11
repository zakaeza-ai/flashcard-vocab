'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAccount } from '../../lib/accountContext';
import { getPlayDeck, buildSymbolPool, buildLevel1Pool, DECORATIVE_ICONS_LEVEL2, DECORATIVE_ICONS_LEVEL3, SYMBOL_COUNT } from '../../lib/spotItDeck';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const HAND_SIZE = 4;
const TURN_SECONDS = 45;

const LEVEL_LABEL = { 1: 'ง่าย (ป.1-3)', 2: 'กลาง (ป.4-6)', 3: 'ยาก (ม.1-3)' };
const LEVEL_GRADES = { 2: ['ป.4', 'ป.5', 'ป.6'], 3: ['ม.1', 'ม.2', 'ม.3'] };

function randomCode(length = 4) {
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// โชว์สัญลักษณ์ตาม variant ที่สุ่มไว้ตอนสร้างสำรับ — รูป / คำอังกฤษ / คำไทย
// คำยาวลดฟอนต์ลงอัตโนมัติ + ไม่ตัดขึ้นบรรทัดใหม่ กันข้อความล้นออกนอกวง
function SymbolFace({ s }) {
  if (s.variant === 'image') {
    return <img src={s.imageUrl} alt="" style={{ width: 56, height: 56 }} />;
  }
  const text = s.variant === 'th' ? s.mean : s.en;
  const fontSize = text.length > 8 ? '0.75rem' : text.length > 5 ? '0.92rem' : '1.1rem';
  return (
    <div style={{ fontSize, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
      {text}
    </div>
  );
}

// ตำแหน่งแรก (i === 0) = จุดกลางวงเสมอ ตรงกับที่ getPlayDeck บังคับ variant 'image' ไว้
// ที่เหลือ (7 ตำแหน่ง) กระจายเป็นวงรอบ โดยหมุนข้อความให้ชี้ตามแนวรัศมี อ่านง่ายและไม่ยื่นออกนอกวงแบบสุ่ม
function symbolLayout(i, total) {
  if (i === 0) {
    return { x: 50, y: 50, rotate: 0 };
  }
  const ringTotal = total - 1;
  const ringIndex = i - 1;
  const angle = (ringIndex * (360 / ringTotal) * Math.PI) / 180;
  const radiusPercent = 34;
  const x = 50 + radiusPercent * Math.cos(angle);
  const y = 50 + radiusPercent * Math.sin(angle);
  let rotate = (angle * 180) / Math.PI + 90;
  if (rotate > 180) rotate -= 360;
  return { x, y, rotate };
}

// เสียงติ๊งตอนจับคู่ถูก — สร้างเสียงเองด้วย Web Audio ไม่ต้องมีไฟล์เสียง
function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

// อ่านออกเสียงคำอังกฤษตอนจับคู่ถูก
function speakWord(word) {
  try {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  } catch (e) {}
}

export default function SpotItSetup() {
  const { account } = useAccount();
  const [mode, setMode] = useState('menu');
  const [levelChoice, setLevelChoice] = useState(1);
  const [roomId, setRoomId] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [roomLevel, setRoomLevel] = useState(1);
  const [players, setPlayers] = useState([]);
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [roomStatus, setRoomStatus] = useState('waiting');
  const [centerCard, setCenterCard] = useState(null);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState(null);
  const [turnStartedAt, setTurnStartedAt] = useState(null);
  const [winnerPlayerId, setWinnerPlayerId] = useState(null);
  const [tick, setTick] = useState(0);

  const passedRef = useRef(false);

  function applyRoomRow(room) {
    setRoomStatus(room.status);
    setCenterCard(room.center_card);
    setCurrentTurnPlayerId(room.current_turn_player_id);
    setTurnStartedAt(room.turn_started_at);
    setWinnerPlayerId(room.winner_player_id);
    setRoomLevel(room.level || 1);
    passedRef.current = false;
  }

  useEffect(() => {
    if (mode !== 'room' || !roomId) return;

    async function loadAll() {
      const [{ data: room }, { data: playerRows }] = await Promise.all([
        supabase.from('game_rooms').select('*').eq('id', roomId).single(),
        supabase.from('game_players').select('*').eq('room_id', roomId).order('seat_order', { ascending: true }),
      ]);
      if (room) applyRoomRow(room);
      setPlayers(playerRows || []);
    }
    loadAll();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` }, async () => {
        const { data } = await supabase.from('game_players').select('*').eq('room_id', roomId).order('seat_order', { ascending: true });
        setPlayers(data || []);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` }, (payload) => {
        applyRoomRow(payload.new);
      })
      .subscribe();

    const pollTimer = setInterval(loadAll, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollTimer);
    };
  }, [mode, roomId]);

  useEffect(() => {
    if (roomStatus !== 'playing') return;
    const timer = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(timer);
  }, [roomStatus]);

  const myPlayer = players.find((p) => p.account_id === account.id);
  const isMyTurn = myPlayer && currentTurnPlayerId === myPlayer.id;
  const secondsLeft = turnStartedAt
    ? Math.max(0, TURN_SECONDS - Math.floor((Date.now() - new Date(turnStartedAt).getTime()) / 1000))
    : TURN_SECONDS;

  useEffect(() => {
    if (roomStatus !== 'playing' || !isMyTurn) return;
    if (secondsLeft <= 0 && !passedRef.current) {
      passedRef.current = true;
      passTurn();
    }
  }, [secondsLeft, isMyTurn, roomStatus]);

  function nextPlayerId(currentId) {
    const idx = players.findIndex((p) => p.id === currentId);
    const next = players[(idx + 1) % players.length];
    return next.id;
  }

  async function passTurn() {
    await supabase
      .from('game_rooms')
      .update({ current_turn_player_id: nextPlayerId(currentTurnPlayerId), turn_started_at: new Date().toISOString() })
      .eq('id', roomId);
  }

  async function playSymbol(symbolId) {
    if (!isMyTurn || !myPlayer) return;
    const topCard = (myPlayer.hand || [])[0];
    if (!topCard) return;
    const centerIds = (centerCard || []).map((s) => s.id);
    if (!centerIds.includes(symbolId)) return;

    const matched = (centerCard || []).find((s) => s.id === symbolId);
    playDing();
    if (matched) speakWord(matched.en);

    const newHand = myPlayer.hand.slice(1);
    await supabase.from('game_players').update({ hand: newHand }).eq('id', myPlayer.id);

    if (newHand.length === 0) {
      await supabase
        .from('game_rooms')
        .update({ status: 'finished', winner_player_id: myPlayer.id, center_card: topCard, current_turn_player_id: null })
        .eq('id', roomId);
    } else {
      await supabase
        .from('game_rooms')
        .update({ center_card: topCard, current_turn_player_id: nextPlayerId(myPlayer.id), turn_started_at: new Date().toISOString() })
        .eq('id', roomId);
    }
  }

  // ดึงคลังสัญลักษณ์ตามระดับที่หัวห้องเลือก
  async function buildPoolForLevel(level) {
    if (level === 1) return buildLevel1Pool();
    const grades = LEVEL_GRADES[level];
    const { data: words, error: wordsErr } = await supabase.from('words').select('id, en, mean').in('grade_label', grades);
    if (wordsErr) throw new Error('ดึงคำศัพท์ไม่สำเร็จ');
    const iconSet = level === 2 ? DECORATIVE_ICONS_LEVEL2 : DECORATIVE_ICONS_LEVEL3;
    return buildSymbolPool(words, iconSet);
  }

  async function createRoom(level) {
    setBusy(true);
    setError(null);

    let symbolPool;
    try {
      symbolPool = await buildPoolForLevel(level);
    } catch (e) {
      setError(e.message || `คำศัพท์ระดับนี้มีไม่พอสร้างเกม (ต้องมีอย่างน้อย ${SYMBOL_COUNT} คำ)`);
      setBusy(false);
      return;
    }
       const deck = getPlayDeck(symbolPool, 24, level);

    let created = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const code = randomCode();
      const { data, error: insertErr } = await supabase
        .from('game_rooms')
        .insert({ room_code: code, deck, status: 'waiting', level })
        .select()
        .single();
      if (!insertErr) created = data;
    }
    if (!created) {
      setError('สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง');
      setBusy(false);
      return;
    }

    const { error: joinErr } = await supabase
      .from('game_players')
      .insert({ room_id: created.id, account_id: account.id, name: account.name, hand: [], seat_order: 0 });
    if (joinErr) {
      setError('เข้าห้องไม่สำเร็จ ลองใหม่อีกครั้ง');
      setBusy(false);
      return;
    }

    setRoomId(created.id);
    setRoomCode(created.room_code);
    setRoomLevel(level);
    setMode('room');
    setBusy(false);
  }

  async function joinRoom() {
    const code = joinInput.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setError(null);

    const { data: room, error: findErr } = await supabase.from('game_rooms').select('*').eq('room_code', code).single();
    if (findErr || !room) {
      setError('ไม่พบห้องนี้ ลองเช็ครหัสอีกครั้ง');
      setBusy(false);
      return;
    }
    if (room.status !== 'waiting') {
      setError('ห้องนี้เริ่มเล่นไปแล้ว เข้าร่วมไม่ได้');
      setBusy(false);
      return;
    }

    const { data: existingPlayers } = await supabase.from('game_players').select('*').eq('room_id', room.id);
    const alreadyIn = (existingPlayers || []).find((p) => p.account_id === account.id);
    if (!alreadyIn) {
      if ((existingPlayers || []).length >= MAX_PLAYERS) {
        setError('ห้องนี้เต็มแล้ว (4 คน)');
        setBusy(false);
        return;
      }
      const { error: joinErr } = await supabase
        .from('game_players')
        .insert({ room_id: room.id, account_id: account.id, name: account.name, hand: [], seat_order: (existingPlayers || []).length });
      if (joinErr) {
        setError('เข้าห้องไม่สำเร็จ ลองใหม่อีกครั้ง');
        setBusy(false);
        return;
      }
    }

    setRoomId(room.id);
    setRoomCode(room.room_code);
    setRoomLevel(room.level || 1);
    setMode('room');
    setBusy(false);
  }

  async function leaveRoom() {
    if (myPlayer) await supabase.from('game_players').delete().eq('id', myPlayer.id);
    setRoomId(null);
    setRoomCode('');
    setPlayers([]);
    setMode('menu');
  }

  async function startGame() {
    setBusy(true);
    const { data: room } = await supabase.from('game_rooms').select('deck').eq('id', roomId).single();
    const deck = shuffle(room.deck);
    const sortedPlayers = [...players].sort((a, b) => a.seat_order - b.seat_order);

    for (let i = 0; i < sortedPlayers.length; i++) {
      const hand = deck.slice(i * HAND_SIZE, i * HAND_SIZE + HAND_SIZE);
      await supabase.from('game_players').update({ hand }).eq('id', sortedPlayers[i].id);
    }
    const center = deck[sortedPlayers.length * HAND_SIZE];

    await supabase
      .from('game_rooms')
      .update({
        status: 'playing',
        center_card: center,
        current_turn_player_id: sortedPlayers[0].id,
        turn_started_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    setBusy(false);
  }

  const isHost = players.length > 0 && players[0].account_id === account.id;


  // ---------------- หน้าเมนู ----------------
  if (mode === 'menu') {
    return (
      <main className="wrap">
        <div className="topbar">
          <Link href="/" className="back-btn">🚪</Link>
          <div className="title">Spot It คำศัพท์</div>
        </div>
        <div style={{ fontFamily: 'var(--font-sarabun)', color: 'var(--ink-soft)', fontSize: '0.92rem', marginBottom: 14, lineHeight: 1.6 }}>
          🃏 เกมจับคู่คำศัพท์กับเพื่อน 2-4 คน — การ์ดทุกคู่จะมีคำที่ตรงกันอยู่เสมอ 1 คำ หาให้เจอแล้วแตะลงไป ใครหมดมือก่อนชนะ!
        </div>

        <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: 8 }}>เลือกระดับความยาก</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[1, 2, 3].map((lv) => (
            <button
              key={lv}
              onClick={() => setLevelChoice(lv)}
              className="choice-card"
              style={{
                flex: 1,
                padding: '10px 6px',
                fontSize: '0.85rem',
                background: levelChoice === lv ? 'var(--coral-deep)' : undefined,
                color: levelChoice === lv ? 'white' : undefined,
              }}
            >
              {LEVEL_LABEL[lv]}
            </button>
          ))}
        </div>

        {error && <div className="feedback bad">{error}</div>}
        <button className="choice-card" onClick={() => createRoom(levelChoice)} disabled={busy}>➕ สร้างห้องใหม่</button>
        <div style={{ marginTop: 16 }}>
          <input
            className="type-input"
            style={{ textTransform: 'uppercase', marginTop: 0 }}
            placeholder="รหัสห้อง 4 ตัว"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            maxLength={4}
          />
          <button className="primary-btn" style={{ marginTop: 12 }} onClick={joinRoom} disabled={busy}>เข้าห้อง</button>
        </div>
      </main>
    );
  }

  // ---------------- ห้องรอผู้เล่น ----------------
  if (roomStatus === 'waiting') {
    return (
      <main className="wrap">
        <div className="topbar">
          <button className="back-btn" onClick={leaveRoom}>🚪</button>
          <div className="title">ห้องรอผู้เล่น</div>
        </div>
        <div className="progress-card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>บอกรหัสนี้ให้เพื่อนพิมพ์เข้าห้อง</div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--coral-deep)', marginTop: 6 }}>{roomCode}</div>
          <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: 4 }}>ระดับ: {LEVEL_LABEL[roomLevel]}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.9rem', color: 'var(--ink-soft)', margin: '16px 0 8px' }}>
          ผู้เล่นในห้อง ({players.length}/{MAX_PLAYERS})
        </div>
        {players.map((p) => (
          <div key={p.id} className="menu-card" style={{ cursor: 'default' }}>
            <div className="row">
              <div className="icon">🙋</div>
              <div>
                <div className="t">{p.name}</div>
                {p.account_id === players[0].account_id && <div className="d">หัวห้อง</div>}
              </div>
            </div>
          </div>
        ))}
        {isHost ? (
          <button className="primary-btn" style={{ marginTop: 16 }} onClick={startGame} disabled={players.length < MIN_PLAYERS || busy}>
            {players.length < MIN_PLAYERS ? `รออีกอย่างน้อย ${MIN_PLAYERS - players.length} คน` : '🚀 เริ่มเกม'}
          </button>
        ) : (
          <div className="loading-note">รอหัวห้องกดเริ่มเกม...</div>
        )}
      </main>
    );
  }

  // ---------------- จบเกม ----------------
  if (roomStatus === 'finished') {
    const winner = players.find((p) => p.id === winnerPlayerId);
    return (
      <main className="wrap">
        <div className="topbar">
          <button className="back-btn" onClick={leaveRoom}>🚪</button>
          <div className="title">Spot It คำศัพท์</div>
        </div>
        <div className="card-stage">
          <div className="celebrate">
            <div className="emoji">🏆</div>
            <div className="title">{winner ? `${winner.name} ชนะ!` : 'เกมจบแล้ว'}</div>
            <div className="sub">ทิ้งการ์ดในมือหมดก่อนใคร</div>
          </div>
          <button className="primary-btn" style={{ marginTop: 26 }} onClick={leaveRoom}>กลับหน้าแรก</button>
        </div>
      </main>
    );
  }

  // ---------------- กำลังเล่น ----------------
  const myTopCard = myPlayer && myPlayer.hand && myPlayer.hand[0];
  const currentPlayer = players.find((p) => p.id === currentTurnPlayerId);

  return (
    <main className="wrap">
      <div className="topbar">
        <button className="back-btn" onClick={leaveRoom}>🚪</button>
        <div className="title">Spot It คำศัพท์</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
          ตาของ <b style={{ color: 'var(--coral-deep)' }}>{currentPlayer ? currentPlayer.name : '...'}</b>
        </div>
        <div style={{ fontWeight: 700, color: secondsLeft <= 5 ? '#D64550' : 'var(--ink)' }}>⏱ {secondsLeft} วิ</div>
      </div>

      {/* การ์ดกลาง */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', maxWidth: 320, margin: '0 auto', background: 'var(--paper)', borderRadius: '50%', boxShadow: '0 10px 24px rgba(91,68,54,0.15)' }}>
           {(centerCard || []).map((s, i) => {
          const { x, y, rotate } = symbolLayout(i, (centerCard || []).length);
          return (
            <div key={s.id} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg)`, textAlign: 'center', width: 92 }}>
              <SymbolFace s={s} />
            </div>
          );
        })}
      </div>

      {/* การ์ดในมือเรา (เห็นแค่ใบบนสุด) */}
      <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.85rem', color: 'var(--ink-soft)', margin: '18px 0 8px', textAlign: 'center' }}>
        การ์ดในมือคุณ ({myPlayer ? myPlayer.hand.length : 0} ใบ) — {isMyTurn ? 'แตะสัญลักษณ์ที่ตรงกับการ์ดกลาง!' : 'รอตาคุณ...'}
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          maxWidth: 280,
          margin: '0 auto',
          background: isMyTurn ? 'var(--paper)' : 'var(--paper-edge)',
          borderRadius: '50%',
          opacity: isMyTurn ? 1 : 0.6,
        }}
      >
           {(myTopCard || []).map((s, i) => {
          const { x, y, rotate } = symbolLayout(i, (myTopCard || []).length);
          return (
            <button
              key={s.id}
              onClick={() => playSymbol(s.id)}
              disabled={!isMyTurn}
              style={{
                position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                textAlign: 'center', width: 92, background: 'none', border: 'none', cursor: isMyTurn ? 'pointer' : 'default', padding: 0,
              }}
            >
              <SymbolFace s={s} />
            </button>
          );
        })}
      </div>
    </main>
  );
}
