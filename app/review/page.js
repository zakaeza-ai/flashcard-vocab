'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAccount } from '../../lib/accountContext';

function speak(text) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

export default function Review() {
  const { account } = useAccount();
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: progressRows } = await supabase
        .from('progress')
        .select('word_id')
        .eq('account_id', account.id)
        .eq('status', 'review');
      const ids = (progressRows || []).map((r) => r.word_id);
      if (ids.length) {
        const { data: wordRows } = await supabase.from('words').select('*').in('id', ids);
        setWords(wordRows || []);
      }
      setLoading(false);
    }
    load();
  }, [account.id]);

  return (
    <main className="wrap">
      <div className="topbar">
        <Link href="/" className="back-btn">←</Link>
        <div className="title">คำที่ต้องทบทวน</div>
      </div>

      {loading && <div className="loading-note">กำลังโหลด...</div>}

      {!loading && words.length === 0 && (
        <div className="loading-note">ยังไม่มีคำที่ต้องทบทวนตอนนี้ 🎉</div>
      )}

      {!loading && words.map((w) => (
        <div key={w.id} className="menu-card" style={{ cursor: 'default' }}>
          <div className="row">
            <div>
              <div className="t">{w.en}</div>
              <div className="d">{w.read} · {w.mean}</div>
            </div>
          </div>
          <button className="nav-btn" onClick={() => speak(w.en)} style={{ background: 'var(--bg)' }}>🔊</button>
        </div>
      ))}

      {!loading && words.length > 0 && (
        <Link href="/test" className="primary-btn" style={{ marginTop: 14 }}>ไปทำแบบทดสอบคำเหล่านี้</Link>
      )}
    </main>
  );
}
