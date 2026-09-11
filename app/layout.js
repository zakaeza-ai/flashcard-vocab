import { Mitr, Sarabun } from 'next/font/google';
import './globals.css';
import { AccountProvider } from '../lib/accountContext';

const mitr = Mitr({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-mitr',
});

const sarabun = Sarabun({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-sarabun',
});

export const metadata = {
  title: 'ท่องศัพท์วันละ 10 คำ',
  description: 'ระบบฝึกจำคำศัพท์ภาษาอังกฤษวันละ 10 คำ ต่อเนื่อง 365 วัน',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={`${mitr.className} ${mitr.variable} ${sarabun.variable}`}>
        <AccountProvider>{children}</AccountProvider>
      </body>
    </html>
  );
}
