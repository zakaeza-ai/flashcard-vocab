import { useState } from "react";

// วางไฟล์นี้ที่ components/RenewalNotice.js
// ใช้งาน: <RenewalNotice expireDate={account.expire_date} studentName={account.name} level={account.grade_label} />
// expireDate: string หรือ Date ที่ Supabase ส่งมา (คอลัมน์ accounts.expire_date — ถ้าชื่อคอลัมน์จริงไม่ใช่นี้ แค่เปลี่ยนตอนดึงข้อมูลตอน login/dashboard แล้ว pass เข้ามาให้ตรง)

const WARN_DAYS_BEFORE = 7; // จะโชว์ banner เตือนก่อนหมดอายุกี่วัน
const LINE_CONTACT_URL = "https://line.me/ti/p/~yourlineid"; // TODO: เปลี่ยนเป็นลิงก์ LINE จริง

function daysUntil(dateInput) {
  const target = new Date(dateInput);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function formatThaiDate(dateInput) {
  return new Date(dateInput).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RenewalNotice({ expireDate, studentName, level }) {
  const [dismissed, setDismissed] = useState(false);

  if (!expireDate) return null;

  const daysLeft = daysUntil(expireDate);
  const isExpired = daysLeft < 0;
  const isNearExpiry = daysLeft >= 0 && daysLeft <= WARN_DAYS_BEFORE;

  // หมดอายุแล้ว -> บล็อกหน้าจอทั้งหมด ไม่มีปุ่มปิด
  if (isExpired) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "24px 20px",
            width: 320,
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: "8px 0 4px" }}>
            สมาชิกหมดอายุแล้ว
          </p>
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px" }}>
            หมดอายุเมื่อวันที่ {formatThaiDate(expireDate)}
            <br />
            ต่อสมาชิกเพื่อกลับมาเรียนต่อได้ทันที
          </p>

          {(studentName || level) && (
            <div
              style={{
                background: "#f5f5f5",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 12,
                textAlign: "left",
                fontSize: 13,
                color: "#555",
              }}
            >
              {studentName && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>ผู้เรียน</span>
                  <span>{studentName}</span>
                </div>
              )}
              {level && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span>ระดับ</span>
                  <span>{level}</span>
                </div>
              )}
            </div>
          )}

          <a
            href={LINE_CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              width: "100%",
              padding: "10px 0",
              borderRadius: 8,
              border: "1px solid #ccc",
              textDecoration: "none",
              color: "#333",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            ติดต่อต่อสมาชิก (LINE)
          </a>
        </div>
      </div>
    );
  }

  // ใกล้หมดอายุ -> banner เตือน ไม่บล็อกการใช้งาน
  if (isNearExpiry && !dismissed) {
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
            สมาชิกจะหมดอายุใน {daysLeft} วัน
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

  return null;
}
