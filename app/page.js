'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TARGET_DAYS } from '../lib/dayLogic';
import { useAccount } from '../lib/accountContext';
import { getHomeSummary } from '../lib/api';

// การ์ดเมนูหลักแบบ tile สีพาสเทลแยกตามหมวด — จัด 2 คอลัมน์/แถว ให้ 6 รายการ + สถิติด้านล่างพอดีจอมือถือไม่ต้องเลื่อน
function MenuTile({ href, icon, title, sub, bg }) {
  return (
    <Link
      href={href}
      style={{
        background: bg,
        borderRadius: 16,
        padding: '12px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        textDecoration: 'none',
        color: 'white',
        minHeight: 64,
      }}
    >
      <div style={{ fontSize: '1.6rem', flexShrink: 0, lineHeight: 1 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.25 }}>{title}</div>
        <div style={{ fontSize: '0.68rem', opacity: 0.92, lineHeight: 1.25, marginTop: 2 }}>{sub}</div>
      </div>
    </Link>
  );
}

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
        const { appState: stateRow, learnedCount: learned, reviewCount: review } = await getHomeSummary(account.id);
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
  // ตำแหน่งตัวการ์ตูนวิ่งตามแถบ % — กันไม่ให้ล้นออกไปนอกกรอบซ้าย/ขวาตอน % ต่ำมากหรือสูงมาก
  const runnerPct = Math.min(94, Math.max(2, pct));

  return (
    <main className="wrap">
      <div className="hi">สวัสดี {account.name} 👋</div>
      <div className="eyebrow">พร้อมท่องศัพท์วันนี้หรือยัง? · ใช้งานได้ถึง {account.expires_at}</div>

      <div className="progress-card">
        <div className="progress-row">
          <span className="label">วันที่ {dayIdx} / {TARGET_DAYS}</span>
          <span className="value">{pct}%</span>
        </div>
        <div style={{ position: 'relative', margin: '14px 0 4px' }}>
          <div className="bar-track"><div className="bar-fill" style={{ width: pct + '%' }} /></div>
          <div
            style={{
              position: 'absolute',
              left: `${runnerPct}%`,
              top: '50%',
              transform: 'translate(-50%, -78%)',
              fontSize: '1.35rem',
              transition: 'left 0.4s ease',
            }}
          >
            🐯
          </div>
        </div>
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
            marginBottom: 12,
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

      {/* เมนูหลัก 6 รายการ สีพาสเทลแยกตามหมวด จัด 2 คอลัมน์/แถว = 3 แถว พอดีจอมือถือไม่ต้องเลื่อน */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <MenuTile href="/learn" icon="📚" title="คำศัพท์วันนี้" sub="10 คำ" bg="#FF8A65" />
        <MenuTile href="/test" icon="📝" title="แบบทดสอบ" sub="ฟังแล้วพิมพ์ / เรียง" bg="#FFB74D" />
        <MenuTile href="/play" icon="👥" title="เล่นกับเพื่อน" sub="ทายคำศัพท์เกม" bg="#64B5F6" />
        <MenuTile href="/spotit" icon="🃏" title="Spot It คำศัพท์" sub="จับคู่ 2-4 คน" bg="#BA68C8" />
        <MenuTile href="/review" icon="🔄" title="คำที่ต้องทบทวน" sub={`${reviewCount} คำ`} bg="#4DB6AC" />
        <MenuTile href="/leaderboard" icon="🏆" title="อันดับคะแนน" sub="ดูอันดับทุกคน" bg="#F06292" />
      </div>

      <div className="stat-row">
        <div className="stat-box"><div className="n">❤️ {learnedCount}</div><div className="l">คำที่จำได้</div></div>
        <div className="stat-box"><div className="n">🔥 {appState.current_streak}</div><div className="l">วันติดต่อกัน</div></div>
      </div>
      <div className="stat-row" style={{ marginTop: 10 }}>
        <div className="stat-box"><div className="n">⭐ Lv.{Math.floor(learnedCount / 100) + 1}</div><div className="l">เลเวลปัจจุบัน</div></div>
      </div>

      <button className="review-mark-btn" style={{ display: 'block', margin: '20px auto 0' }} onClick={logout}>
        ออกจากระบบ
      </button>
    </main>
  );
}
