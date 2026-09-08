'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { todayStr, daysBetween } from '../../lib/dayLogic';
import { useAccount } from '../../lib/accountContext';

const WORDS_PER_DAY = 10;
const TARGET_DAYS = 365;

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

export default function Learn() {
  const { account } = useAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wordsById, setWordsById] = useState({});
  const [queue, setQueue] = useState([]); // array of word ids still needing a heart this session
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isReviewDay, setIsReviewDay] = useState(false);
  const [justMissed, setJustMissed] = useState(false);
  const touchStartX = useRef(null);
  const dayIdxRef = useRef(1);
  const isReviewDayRef = useRef(false);

  useEffect(() => {
    async function load() {
      let { data: stateRow, error: stateErr } = await supabase
        .from('app_state').select('*').eq('account_id', account.id).single();

      if (stateErr && stateErr.code === 'PGRST116') {
        const { data: created, error: createErr } = await supabase
          .from('app_state').insert({ account_id: account.id }).select().single();
        if (createErr) { setError(createErr.message); setLoading(false); return; }
        stateRow = created;
      } else if (stateErr) {
        setError(stateErr.message); setLoading(false); return;
      }

      const dayIdx = stateRow.current_day_index || 1;
      dayIdxRef.current = dayIdx;

      const { data: dayWords, error: wordsErr } = await supabase
        .from('words').select('*').eq('day_index', dayIdx).order('id', { ascending: true });
      if (wordsErr) { setError(wordsErr.message); setLoading(false); return; }

      let sessionWords = dayWords;
      let reviewDay = false;

      if (!sessionWords || sessionWords.length === 0) {
        reviewDay = true;
        const { data: progressRows } = await supabase
          .from('progress').select('word_id, status').eq('account_id', account.id).in('status', ['review', 'learned']);
        let ids = (progressRows || []).map((p) => p.word_id);
        if (ids.length === 0) {
          const { data: anyWords } = await supabase.from('words').select('*').limit(WORDS_PER_DAY);
          sessionWords = anyWords || [];
        } else {
          ids = shuffle(ids).slice(0, WORDS_PER_DAY);
          const { data: reviewWords } = await supabase.from('words').select('*').in('id', ids);
          sessionWords = reviewWords || [];
        }
      }
      setIsReviewDay(reviewDay);
      isReviewDayRef.current = reviewDay;

      const t = todayStr();
      if (stateRow.last_active_date !== t) {
        const newStreak = stateRow.last_active_date && daysBetween(stateRow.last_active_date, t) === 1
          ? stateRow.current_streak + 1 : 1;
        await supabase.from('app_state').update({ last_active_date: t, current_streak: newStreak }).eq('account_id', account.id);
        setStreak(newStreak);
      } else {
        setStreak(stateRow.current_streak);
      }

      // Check which of today's words are already marked learned for this account —
      // reopening the page after finishing shouldn't force re-hearting the same words.
      const sessionIds = (sessionWords || []).map((w) => w.id);
      const { data: learnedRows } = await supabase
        .from('progress')
        .select('word_id')
        .eq('account_id', account.id)
        .eq('status', 'learned')
        .in('word_id', sessionIds);
      const alreadyLearnedIds = new Set((learnedRows || []).map((r) => r.word_id));

      const byId = {};
      (sessionWords || []).forEach((w) => { byId[w.id] = w; });
      setWordsById(byId);
      setTotalCount(sessionIds.length);

      const remainingIds = sessionIds.filter((id) => !alreadyLearnedIds.has(id));
      setMasteredCount(sessionIds.length - remainingIds.length);

      if (remainingIds.length === 0 && sessionIds.length > 0) {
        setQueue([]);
        setDone(true);
      } else {
        setQueue(remainingIds);
      }
      setLoading(false);
    }
    load();
  }, [account.id]);

  async function markLearned(wordId) {
    await supabase.from('progress').upsert({
      account_id: account.id, word_id: wordId, status: 'learned', updated_at: new Date().toISOString(),
    });
    setJustMissed(false);
    setMasteredCount((c) => c + 1);
    setQueue((q) => {
      const rest = q.filter((id) => id !== wordId);
      if (rest.length === 0) setDone(true);
      return rest;
    });
  }

  async function markStillLearning(wordId) {
    await supabase.from('progress').upsert({
      account_id: account.id, word_id: wordId, status: 'review', updated_at: new Date().toISOString(),
    });
    setJustMissed(true);
    // send this word to the back of the queue so it comes around again
    setQueue((q) => {
      const rest = q.filter((id) => id !== wordId);
      return [...rest, wordId];
    });
  }

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    // swipe just peeks at the next/prev word in queue without affecting mastery
    if (Math.abs(dx) > 50 && queue.length > 1) {
      setQueue((q) => {
        if (dx < 0) return [...q.slice(1), q[0]];
        return [q[q.length - 1], ...q.slice(0, -1)];
      });
      setJustMissed(false);
    }
    touchStartX.current = null;
  }

  if (loading) return <main className="wrap"><div className="loading-note">กำลังโหลด...</div></main>;
  if (error) return (
    <main className="wrap">
      <div className="progress-card">
        <div style={{ fontWeight: 600, color: '#D64550' }}>โหลดคำศัพท์ไม่สำเร็จ</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: 6 }}>{error}</div>
      </div>
    </main>
  );

  if (done) {
    return (
      <main className="wrap">
        <div className="card-stage">
          <div className="celebrate">
            <div className="emoji">🎉</div>
            <div className="title">วันนี้เรียนครบแล้ว</div>
            <div className="sub">{totalCount} / {totalCount} คำ จำได้หมดแล้ว</div>
            <div className="sub" style={{ marginTop: 10 }}>🔥 เรียนติดต่อกัน {streak} วัน</div>
            {!isReviewDay && <div className="sub" style={{ marginTop: 10 }}>ไปทำแบบทดสอบ "ฟังแล้วพิมพ์" ให้ผ่านครบทุกคำ เพื่อปลดล็อกคำศัพท์ชุดถัดไป</div>}
          </div>
          {!isReviewDay ? (
            <Link href="/test" className="primary-btn" style={{ marginTop: 26 }}>ไปทำแบบทดสอบ</Link>
          ) : (
            <Link href="/" className="primary-btn" style={{ marginTop: 26 }}>กลับหน้าแรก</Link>
          )}
        </div>
      </main>
    );
  }

  if (totalCount === 0) {
    return <main className="wrap"><div className="loading-note">ยังไม่มีคำศัพท์สำหรับวันนี้</div></main>;
  }

  const w = wordsById[queue[0]];
  const remaining = queue.length;

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="back-btn" style={{ opacity: 0.35, cursor: 'default' }} title="กดจำได้ให้ครบทุกคำก่อน ถึงจะออกได้">🔒</div>
        <div className="title">{isReviewDay ? 'วันทบทวน' : 'คำศัพท์วันนี้'}</div>
      </div>

      <div className="loading-note" style={{ padding: '0 0 10px', fontSize: '0.85rem' }}>
        กด ❤️ ให้ครบทุกคำก่อนถึงจะกลับหน้าแรกได้ — เหลืออีก {remaining} คำ
      </div>

      <div className="card-stage">
        <div className="flashcard" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {w.grade_label && <div className="grade-tag">{w.grade_label}</div>}
          {w.image_url && <img src={w.image_url} alt={w.en} className="flashcard-img" />}
          <div className="word">{w.en}</div>
          <div className="reading">{w.read}</div>
          <div className="meaning">{w.mean}</div>
          <button className="speak-btn" onClick={() => speak(w.en)}>🔊</button>
        </div>
        <div className="card-counter">จำได้แล้ว {masteredCount} / {totalCount}{justMissed ? ' · จะวนกลับมาคำนี้อีกครั้ง' : ''}</div>
        <div className="card-controls">
          <button className="heart-btn" onClick={() => markLearned(w.id)} style={{ width: '100%' }}>🤍 จำได้</button>
        </div>
        <button className="review-mark-btn" onClick={() => markStillLearning(w.id)}>
          😕 คำนี้ยังไม่ค่อยจำได้ (วนมาใหม่)
        </button>
      </div>
    </main>
  );
}
