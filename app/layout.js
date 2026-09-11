import { Baloo_2, Sarabun } from 'next/font/google';
import './globals.css';
import { AccountProvider } from '../lib/accountContext';

const baloo = Baloo_2({
  subsets: ['latin', 'thai'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-baloo',
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
      <body className={`${baloo.className} ${baloo.variable} ${sarabun.variable}`}>
        <AccountProvider>{children}</AccountProvider>
      </body>
    </html>
  );
}
