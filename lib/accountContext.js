'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { todayStr } from './dayLogic';
import RenewalNotice from './RenewalNotice';
const AccountContext = createContext(null);
const STORAGE_KEY = 'flashcard-account-id';

export function useAccount() {
  return useContext(AccountContext);
}

export function AccountProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (savedId) {
        const { data } = await supabase.from('accounts').select('*').eq('id', savedId).single();
        if (data && data.expires_at >= todayStr()) {
          setAccount(data);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    }
    restore();
  }, []);

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAccount(null);
  }

  function onLoggedIn(acc) {
    localStorage.setItem(STORAGE_KEY, acc.id);
    setAccount(acc);
  }

  if (loading) {
    return <main className="wrap"><div className="loading-note">กำลังโหลด...</div></main>;
  }

  if (!account) {
    return <PinLogin onLoggedIn={onLoggedIn} />;
  }

  return (
  <AccountContext.Provider value={{ account, logout }}>
    <RenewalNotice expireDate={account.expires_at} studentName={account.name} />
    {children}
  </AccountContext.Provider>
);
}

function PinLogin({ onLoggedIn }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    const { data, error: err } = await supabase.from('accounts').select('*').eq('pin', pin).single();
    setChecking(false);
    if (err || !data) {
      setError('รหัส PIN ไม่ถูกต้อง');
      return;
    }
    if (data.expires_at < todayStr()) {
      setError('บัญชีนี้หมดอายุการใช้งานแล้ว กรุณาติดต่อผู้ดูแลเพื่อต่ออายุ');
      return;
    }
    onLoggedIn(data);
  }

  return (
    <main className="wrap">
      <div className="card-stage">
        <div className="celebrate" style={{ marginBottom: 20 }}>
          <div className="emoji">🔑</div>
          <div className="title">ใส่รหัส PIN</div>
          <div className="sub">เพื่อเข้าใช้งานท่องศัพท์วันละ 10 คำ</div>
        </div>
        <form onSubmit={submit} style={{ width: '100%' }}>
          <input
            className="type-input"
            style={{ textTransform: 'none' }}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="รหัส PIN"
            inputMode="numeric"
            autoFocus
          />
          {error && <div className="feedback bad">{error}</div>}
          <button className="primary-btn" style={{ marginTop: 16 }} type="submit" disabled={checking || !pin}>
            {checking ? 'กำลังตรวจสอบ...' : 'เข้าใช้งาน'}
          </button>
        </form>
      </div>
    </main>
  );
}
