'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAccount } from '../../lib/accountContext';
import { getPlayDeck } from '../../lib/spotItDeck';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // ตัดตัวที่อ่านสับสน (I, L, O, 0, 1) ออก
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

function randomCode(length = 4) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export default function SpotItSetup() {
  const { account } = useAccount();
  const [mode, setMode] = useState('menu'); // menu | lobby
  const [roomId, setRoomId] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // โหลดรายชื่อผู้เล่นครั้งแรก + ฟังการเปลี่ยนแปลงแบบเรียลไทม์ตอนอยู่ในห้อง
  useEffect(() => {
    if (mode !== 'lobby' || !roomId) return;

    async function loadPlayers() {
      const { data } = await supabase
        .from('game_players')
        .select('*')
        .eq('room_id', roomId)
        .order('seat_order', { ascending: true });
      setPlayers(data || []);
    }
    loadPlayers();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        () => loadPlayers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, roomId]);

  async function createRoom() {
    setBusy(true);
    setError(null);
    const deck = getPlayDeck(32);

    // สุ่มรหัสห้องแล้วลอง insert — ถ้าชนกับห้องเดิม (unique constraint) สุ่มใหม่ ลองได้ไม่เกิน 5 รอบ
    let created = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const code = randomCode();
      const { data, error: insertErr } = await supabase
        .from('game_rooms')
        .insert({ room_code: code, deck, status: 'waiting' })
        .select()
        .single();
      if (!insertErr) created = data;
    }

    if (!created) {
      setError('สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง');
      setBusy(false);
      return;
    }

    const { error: joinErr } = await supabase.from('game_players').insert({
      room_id: created.id,
      account_id: account.id,
      name: account.name,
      hand: [],
      seat_order: 0,
    });
    if (joinErr) {
      setError('เข้าห้องไม่สำเร็จ ลองใหม่อีกครั้ง');
      setBusy(false);
      return;
    }

    setRoomId(created.id);
    setRoomCode(created.room_code);
    setMode('lobby');
    setBusy(false);
  }

  async function joinRoom() {
    const code = joinInput.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setError(null);

    const { data: room, error: findErr } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', code)
      .single();

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

    const { data: existingPlayers } = await supabase
      .from('game_players')
      .select('*')
      .eq('room_id', room.id);

    const alreadyIn = (existingPlayers || []).find((p) => p.account_id === account.id);
    if (!alreadyIn) {
      if ((existingPlayers || []).length >= MAX_PLAYERS) {
        setError('ห้องนี้เต็มแล้ว (4 คน)');
        setBusy(false);
        return;
      }
      const { error: joinErr } = await supabase.from('game_players').insert({
        room_id: room.id,
        account_id: account.id,
        name: account.name,
        hand: [],
        seat_order: (existingPlayers || []).length,
      });
      if (joinErr) {
        setError('เข้าห้องไม่สำเร็จ ลองใหม่อีกครั้ง');
        setBusy(false);
        return;
      }
    }

    setRoomId(room.id);
    setRoomCode(room.room_code);
    setMode('lobby');
    setBusy(false);
  }

  async function leaveRoom() {
    const me = players.find((p) => p.account_id === account.id);
    if (me) {
      await supabase.from('game_players').delete().eq('id', me.id);
    }
    setRoomId(null);
    setRoomCode('');
    setPlayers([]);
    setMode('menu');
  }

  function startGame() {
    // เฟสถัดไปจะทำหน้าเล่นเกมจริง (แจกไพ่ + เปิดการ์ดกลาง) ตอนนี้ห้องรอผู้เล่นใช้งานได้ครบแล้ว
    alert('ห้องพร้อมแล้ว! หน้าเล่นเกมจริงจะเปิดใช้งานในเฟสถัดไป');
  }

  const isHost = players.length > 0 && players[0].account_id === account.id;

  if (mode === 'menu') {
    return (
      <main className="wrap">
        <div className="topbar">
          <Link href="/" className="back-btn">←</Link>
          <div className="title">Spot It คำศัพท์</div>
        </div>

        <div style={{ fontFamily: 'var(--font-sarabun)', color: 'var(--ink-soft)', fontSize: '0.92rem', marginBottom: 14, lineHeight: 1.6 }}>
          🃏 เกมจับคู่คำศัพท์กับเพื่อน 2-4 คน — การ์ดทุกคู่จะมีคำที่ตรงกันอยู่เสมอ 1 คำ หาให้เจอแล้ววางลงไป ใครหมดมือก่อนชนะ!
        </div>

        {error && <div className="feedback bad">{error}</div>}

        <button className="choice-card" onClick={createRoom} disabled={busy}>
          ➕ สร้างห้องใหม่
        </button>

        <div style={{ marginTop: 16 }}>
          <input
            className="type-input"
            style={{ textTransform: 'uppercase', marginTop: 0 }}
            placeholder="รหัสห้อง 4 ตัว"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            maxLength={4}
          />
          <button className="primary-btn" style={{ marginTop: 12 }} onClick={joinRoom} disabled={busy}>
            เข้าห้อง
          </button>
        </div>
      </main>
    );
  }

  // mode === 'lobby'
  return (
    <main className="wrap">
      <div className="topbar">
        <button className="back-btn" onClick={leaveRoom}>←</button>
        <div className="title">ห้องรอผู้เล่น</div>
      </div>

      <div className="progress-card" style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-sarabun)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
          บอกรหัสนี้ให้เพื่อนพิมพ์เข้าห้อง
        </div>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--coral-deep)', marginTop: 6 }}>
          {roomCode}
        </div>
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
        <button
          className="primary-btn"
          style={{ marginTop: 16 }}
          onClick={startGame}
          disabled={players.length < MIN_PLAYERS}
        >
          {players.length < MIN_PLAYERS ? `รออีกอย่างน้อย ${MIN_PLAYERS - players.length} คน` : '🚀 เริ่มเกม'}
        </button>
      ) : (
        <div className="loading-note">รอหัวห้องกดเริ่มเกม...</div>
      )}
    </main>
  );
}
