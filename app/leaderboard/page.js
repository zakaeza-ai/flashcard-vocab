'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAccount } from '../../lib/accountContext';

function levelOf(words) {
  return Math.floor(words / 100) + 1;
}

function rankBadge(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export default function Leaderboard() {
  const { account } = useAccount();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('leaderboard')
        .select('*')
        .order('words_learned', { ascending: false });
      if (err) { setError(err.message); setLoading(false); return; }
      setRows(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="wrap">
      <div className="topbar">
        <Link href="/" className="back-btn">←</Link>
        <div className="title">🏆 อันดับคะแนน</div>
      </div>

      <div style={{ fontFamily: 'var(--font-sarabun)', color: '#DCEFE9', fontSize: '0.88rem', marginBottom: 14 }}>
        จัดอันดับจากจำนวนคำศัพท์ที่จำได้สะสมทั้งหมด — ทุกคนเห็นอันดับเดียวกัน
      </div>

      {loading && <div className="loading-note">กำลังโหลด...</div>}
      {error && (
        <div className="progress-card">
          <div style={{ fontWeight: 600, color: '#D64550' }}>โหลดอันดับไม่สำเร็จ</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: 6 }}>{error}</div>
        </div>
      )}

      {!loading && !error && rows.map((row, i) => {
        const rank = i + 1;
        const isMe = row.account_id === account.id;
        return (
          <div
            key={row.account_id}
            className="menu-card"
            style={{
              cursor: 'default',
              background: isMe ? 'linear-gradient(135deg, var(--coral), var(--coral-deep))' : 'var(--paper)',
              color: isMe ? 'white' : 'var(--ink)',
            }}
          >
            <div className="row">
              <div className="icon" style={{ fontSize: rank <= 3 ? '1.8rem' : '1.1rem', width: 40, textAlign: 'center' }}>
                {rankBadge(rank)}
              </div>
              <div>
                <div className="t">{row.name}{isMe ? ' (คุณ)' : ''}</div>
                <div className="d" style={{ color: isMe ? '#FFE1E6' : 'var(--ink-soft)' }}>
                  Lv.{levelOf(row.words_learned)} · จำได้ {row.words_learned} คำ
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {!loading && !error && rows.length === 0 && (
        <div className="loading-note">ยังไม่มีข้อมูลอันดับตอนนี้</div>
      )}
    </main>
  );
}
