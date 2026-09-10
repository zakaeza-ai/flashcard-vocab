'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAccount } from '../../lib/accountContext';
import { getPlayDeck, buildSymbolPool } from '../../lib/spotItDeck';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // ตัดตัวที่อ่านสับสน (I, L, O, 0, 1) ออก
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const HAND_SIZE = 4;
const TURN_SECONDS = 8;

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

// จัดตำแหน่ง + มุมหมุนของสัญลักษณ์บนการ์ด แบบตายตัวตาม index (ไม่ใช้ Math.random ตอน render กันภาพกระตุกทุกครั้งที่ re-render)
function symbolLayout(i) {
  const angle = (i * 45 * Math.PI) / 180;
  const radiusPercent = 26 + (i % 4) * 6;
  const x = 50 + radiusPercent * Math.cos(angle);
  const y = 50 + radiusPercent * Math.sin(angle);
  let rotate = (i * 53) % 360;
  if (rotate > 180) rotate -= 360;
  return { x, y, rotate };
}

export default function SpotItSetup() {
  const { account } = useAccount();
  const [mode, setMode] = useState('menu'); // menu | room
  const [roomId, setRoomId] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [roomStatus, setRoomStatus] = useState('waiting');
  const [centerCard, setCenterCard] = useState(null);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState(null);
  const [turnStartedAt, setTurnStartedAt] = useState(null);
  const [winnerPlayerId, setWinnerPlayerId] = useState(null);
  const [tick, setTick] = useState(0); // ใช้แค่บังคับ re-render นับเวลาถอยหลัง

  const passedRef = useRef(false); // กันเรียก passTurn ซ้ำตอนหมดเวลา

  function applyRoomRow(room) {
    setRoomStatus(room.status);
    setCenterCard(room.center_card);
    setCurrentTurnPlayerId(room.current_turn_player_id);
    setTurnStartedAt(room.turn_started_at);
    setWinnerPlayerId(room.winner_player_id);
    passedRef.current = false;
  }

  // โหลดข้อมูลห้อง + ผู้เล่นครั้งแรก และฟังการเปลี่ยนแปลงแบบเรียลไทม์ตอนอยู่ในห้อง
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

    // ระบบสำรอง: ดึงข้อมูลซ้ำทุก 3 วิ เผื่อเรียลไทม์หลุด (พบบ่อยบนมือถือตอนสลับแอป/ล็อกจอ)
    const pollTimer = setInterval(loadAll, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollTimer);
    };
  }, [mode, roomId]);

  // นาฬิกานับเวลาถอยหลังต่อตา — เดินทุก 250ms เฉพาะตอนกำลังเล่น
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

  // ถ้าเป็นตาเรา แล้วเวลาหมด -> ส่งตาต่อไปอัตโนมัติ (แค่เครื่องของคนที่ตาอยู่เป็นคนสั่ง กันชนกัน)
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
    if (!centerIds.includes(symbolId)) return; // แตะผิดสัญลักษณ์ ไม่มีอะไรเกิดขึ้น ลองใหม่ได้

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

  async function createRoom() {
    setBusy(true);
    setError(null);

    const { data: allWords } = await supabase.from('words').select('id, en, mean');
    if (!allWords || allWords.length < 57) {
      setError('คำศัพท์ในระบบมีไม่พอสร้างเกม (ต้องมีอย่างน้อย 57 คำ)');
      setBusy(false);
      return;
    }
    const symbolPool = buildSymbolPool(allWords);
    const deck = getPlayDeck(symbolPool, 32);

    let created = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const code = randomCode();
      const { data, error: insertErr } = await supabase.from('game_rooms').insert({ room_code: code, deck, status: 'waiting' }).select().single();
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
      setError('ไม่พบห้องนี้ เช็ครหัสอีกครั้ง');
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
          <Link href="/" className="back-btn">←</Link>
          <div className="title">Spot It คำศัพท์</div>
        </div>
        <div style={{ fontFamily: 'var(--font-sarabun)', color: 'var(--ink-soft)', fontSize: '0.92rem', marginBottom: 14, lineHeight: 1.6 }}>
          🃏 เกมจับคู่คำศัพท์กับเพื่อน 2-4 คน — การ์ดทุกคู่จะมีคำที่ตรงกันอยู่เสมอ 1 คำ หาให้เจอแล้วแตะลงไป ใครหมดมือก่อนชนะ!
        </div>
        {error && <div className="feedback bad">{error}</div>}
        <button className="choice-card" onClick={createRoom} disabled={busy}>➕ สร้างห้องใหม่</button>
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
          <button className="back-btn" onClick={leaveRoom}>←</button>
          <div className="title">ห้องรอผู้เล่น</div>
        </div>
        <div className="progress-card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>บอกรหัสนี้ให้เพื่อนพิมพ์เข้าห้อง</div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--coral-deep)', marginTop: 6 }}>{roomCode}</div>
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
          <button className="back-btn" onClick={leaveRoom}>←</button>
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
        <button className="back-btn" onClick={leaveRoom}>←</button>
        <div className="title">Spot It คำศัพท์</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
          ตาของ <b style={{ color: 'var(--coral-deep)' }}>{currentPlayer ? currentPlayer.name : '...'}</b>
        </div>
        <div style={{ fontWeight: 700, color: secondsLeft <= 3 ? '#D64550' : 'var(--ink)' }}>⏱ {secondsLeft} วิ</div>
      </div>

      {/* การ์ดกลาง */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', maxWidth: 320, margin: '0 auto', background: 'var(--paper)', borderRadius: '50%', boxShadow: '0 10px 24px rgba(91,68,54,0.15)' }}>
        {(centerCard || []).map((s, i) => {
          const { x, y, rotate } = symbolLayout(i);
          return (
            <div key={s.id} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg)`, textAlign: 'center', width: 56 }}>
              <img src={s.imageUrl} alt="" style={{ width: 30, height: 30 }} />
              <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--ink)' }}>{s.en}</div>
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
          const { x, y, rotate } = symbolLayout(i);
          return (
            <button
              key={s.id}
              onClick={() => playSymbol(s.id)}
              disabled={!isMyTurn}
              style={{
                position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                textAlign: 'center', width: 52, background: 'none', border: 'none', cursor: isMyTurn ? 'pointer' : 'default', padding: 0,
              }}
            >
              <img src={s.imageUrl} alt="" style={{ width: 28, height: 28 }} />
              <div style={{ fontSize: '0.52rem', fontWeight: 700, color: 'var(--ink)' }}>{s.en}</div>
            </button>
          );
        })}
      </div>
    </main>
  );
}
