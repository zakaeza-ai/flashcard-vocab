import { useState } from "react";

// วางไฟล์นี้ที่ lib/RenewalNotice.js (ข้างๆ BgMusic.js)
// ใช้งาน: <RenewalNotice expireDate={account.expires_at} studentName={account.name} />
//
// หมายเหตุ: ระบบ login เดิม (accountContext.js) บล็อกบัญชีที่หมดอายุแล้วอยู่แล้ว
// (ทั้งตอน restore session และตอนใส่ PIN ใหม่) ดังนั้น component นี้มีหน้าที่แค่
// "เตือนล่วงหน้า" ก่อนหมดอายุเท่านั้น ไม่ต้องมี modal บล็อกซ้ำ

const WARN_DAYS_BEFORE = 7; // จะโชว์ banner เตือนก่อนหมดอายุกี่วัน
const LINE_CONTACT_URL = "https://line.me/ti/p/qWXzwCBTE5";

function daysUntil(dateStr) {
  // expires_at เป็น date string เช่น "2026-09-16"
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function formatThaiDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RenewalNotice({ expireDate, studentName }) {
  const [dismissed, setDismissed] = useState(false);

  if (!expireDate || dismissed) return null;

  const daysLeft = daysUntil(expireDate);
  const isNearExpiry = daysLeft >= 0 && daysLeft <= WARN_DAYS_BEFORE;

  if (!isNearExpiry) return null;

  return (
    <div
      style={{
        background: "#fff8e1",
        borderRadius: 8,
        padding: "12px 16px",
        margin: "0 0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#7a5b00" }}>
          {studentName ? `${studentName} ` : ""}สมาชิกจะหมดอายุใน {daysLeft} วัน
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#7a5b00" }}>
          หมดอายุวันที่ {formatThaiDate(expireDate)} — ต่อสมาชิกเพื่อเรียนต่อได้ไม่สะดุด
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <a
          href={LINE_CONTACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            background: "#7a5b00",
            color: "#fff",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          ต่อสมาชิก
        </a>
        <button
          onClick={() => setDismissed(true)}
          style={{
            border: "none",
            background: "transparent",
            color: "#7a5b00",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ปิด
        </button>
      </div>
    </div>
  );
}
