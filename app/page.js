'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TARGET_DAYS } from '../lib/dayLogic';
import { useAccount } from '../lib/accountContext';
import { getHomeSummary } from '../lib/api';

// การ์ดเมนูหลัก — แถวเดียวเต็มความกว้าง (เหมือนหน้าอื่นๆในแอปที่ใช้ .wrap ความกว้างเต็มจอ ไม่ได้ถูกบีบแบบ preview ที่โชว์ในแชท)
// รองรับทั้งไอคอนรูปจริง (img) และอีโมจิ (icon) — ถ้ามี img จะโชว์รูปแทนอีโมจิ
function MenuTile({ href, icon, img, title, sub, bg }) {
  return (
    <Link
      href={href}
      style={{
        background: bg,
        borderRadius: 16,
        padding: '13px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textDecoration: 'none',
      }}
    >
      {img ? (
        <img src={img} alt="" style={{ width: 34, height: 34, flexShrink: 0, objectFit: 'contain' }} />
      ) : (
        <div style={{ fontSize: '1.6rem', flexShrink: 0, lineHeight: 1 }}>{icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#2B2118', lineHeight: 1.25 }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: '#5C5347', lineHeight: 1.25, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ color: '#5C5347', fontSize: '1.2rem' }}>›</div>
    </Link>
  );
}

// กล่องสถิติด้านล่าง — ใส่พื้นหลังพาสเทลของตัวเองให้เห็นชัด ไม่กลืนกับพื้นหลังแอป
function StatBox({ n, l, bg }) {
  return (
    <div className="stat-box" style={{ background: bg, flex: 1 }}>
      <div className="n" style={{ color: '#2B2118', fontWeight: 800 }}>{n}</div>
      <div className="l">{l}</div>
    </div>
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

      {/* เมนูหลัก 6 รายการ — แถวเดียวเต็มความกว้าง สีพาสเทลแยกตามหมวด ตัวหนังสือดำหนาทุกแถว */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
        <MenuTile
          href="/learn" img="/icons/book.png" title="คำศัพท์วันนี้" sub="10 คำ"
          bg="linear-gradient(135deg, #FF8A5C, #FF6A3D)"
        />
        <MenuTile
          href="/test" icon="📝" title="แบบทดสอบ" sub="ฟังแล้วพิมพ์ / เรียง"
          bg="#D6EFCB"
        />
        <MenuTile
          href="/play" img="/icons/kids.png" title="เล่นกับเพื่อน" sub="ทายคำศัพท์เกม"
          bg="#CFEAFB"
        />
        <MenuTile
          href="/spotit" img="/icons/magnifier-boy.png" title="Spot It คำศัพท์" sub="จับคู่ 2-4 คน"
          bg="#F6D9EC"
        />
        <MenuTile
          href="/review" img="/icons/refresh.png" title="คำที่ต้องทบทวน" sub={`${reviewCount} คำ`}
          bg="#CDF0E3"
        />
        <MenuTile
          href="/leaderboard" img="/icons/trophy.png" title="อันดับคะแนน" sub="ดูอันดับทุกคน"
          bg="#B9E3B0"
        />
      </div>

      <div className="stat-row" style={{ gap: 10 }}>
        <StatBox n={`❤️ ${learnedCount}`} l="คำที่จำได้" bg="#FDE1E7" />
        <StatBox n={`🔥 ${appState.current_streak}`} l="วันติดต่อกัน" bg="#FBD5D5" />
      </div>
      <div className="stat-row" style={{ marginTop: 10 }}>
        <StatBox n={`⭐ Lv.${Math.floor(learnedCount / 100) + 1}`} l="เลเวลปัจจุบัน" bg="#CFE3FA" />
      </div>

      <button className="review-mark-btn" style={{ display: 'block', margin: '20px auto 0' }} onClick={logout}>
        ออกจากระบบ
      </button>
    </main>
  );
}
