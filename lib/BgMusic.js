'use client';

import { useEffect, useRef, useState } from 'react';

export default function BgMusic() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().catch(() => {});
      setPlaying(true);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(91,68,54,0.08)',
        border: '1px solid rgba(91,68,54,0.15)',
        borderRadius: 999,
        padding: '6px 12px',
        marginBottom: 12,
        width: 'fit-content',
      }}
    >
      <audio ref={audioRef} src="/bgm.mp3" loop preload="none" />
      <button
        onClick={toggle}
        style={{
          background: 'none',
          border: 'none',
          color: '#2B6CB0',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
        title={playing ? 'ปิดเพลง' : 'เปิดเพลงเบาๆ ระหว่างทำแบบทดสอบ'}
      >
        {playing ? '🔊' : '🔈'} เพลงเบาๆ
      </button>
      {playing && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={{ width: 60 }}
        />
      )}
    </div>
  );
}
