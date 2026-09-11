'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TARGET_DAYS } from '../lib/dayLogic';
import { useAccount } from '../lib/accountContext';
import { getAppState, getProgress } from '../lib/api';

export default function Home() {
  const { account, logout } = useAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appState, setAppState] = useState(null);
  const [learnedCount, setLearnedCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const stateRow = await getAppState(account.id);
        const { count: learned } = await getProgress(account.id, { status: 'learned', count: true });
        const { count: review } = await getProgress(account.id, { status: 'review', count: true });

        setAppState(stateRow);
        setLearnedCount(learned || 0);
        setReviewCount(review || 0);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [account.id]);

  if (loading) {
    return (
      <main className="wrap">
        <div className="loading-note">กำลังโหลด...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="wrap">
        <div className="progress-card">
          <div style={{ fontWeight: 600, color: '#D64550' }}>เชื่อมต่อฐานข้อมูลไม่สำเร็จ</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: 6 }}>{error}</div>
        </div>
      </main>
    );
  }

  const dayIdx = appState.current_day_index || 1;
  const pct = Math.round((dayIdx / TARGET_DAYS) * 100);
  const oxfordUnlocked = dayIdx > 355;

  return (
    <main className="wrap">
      <div className="hi">สวัสดี {account.name} 👋</div>
      <div className="eyebrow">พร้อมท่องศัพท์วันนี้หรือยัง? · ใช้งานได้ถึง {account.expires_at}</div>

      <div className="progress-card">
        <div className="progress-row">
          <span className="label">วันที่ {dayIdx} / {TARGET_DAYS}</span>
          <span className="value">{pct}%</span>
        </div>
        <div className="bar-track"><div className="bar-fill" style={{ width: pct + '%' }} /></div>
        <div className="streak-line">🔥 เรียนติดต่อกัน <b>{appState.current_streak}</b> วัน</div>
      </div>

      {oxfordUnlocked && (
        <Link
          href="/learn"
          className="menu-card"
          style={{
            background: 'linear-gradient(135deg, var(--gold-deep), var(--gold))',
            color: 'var(--ink)',
            border: '2px solid var(--gold-deep)',
          }}
        >
          <div className="row"><div className="icon">🎓</div>
            <div>
              <div className="t">ม.4-6 เตรียมสอบ</div>
              <div className="d" style={{ color: 'var(--ink-soft)' }}>ปลดล็อกแล้ว! คำศัพท์ระดับ Oxford 3000</div>
            </div>
          </div><div className="go">›</div>
        </Link>
      )}

      <Link href="/learn" className="menu-card" style={{ background: 'linear-gradient(135deg, var(--coral), var(--coral-deep))', color: 'white' }}>
        <div className="row"><div className="icon">📚</div>
          <div><div className="t">คำศัพท์วันนี้</div><div className="d" style={{ color: '#FFE1E6' }}>10 คำ</div></div>
        </div><div className="go" style={{ color: 'white' }}>›</div>
      </Link>
