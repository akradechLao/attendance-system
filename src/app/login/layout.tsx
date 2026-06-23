import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ - HR Attendance",
  description: "ลงชื่อเข้าใช้ระบบจัดการเวลาเข้า-ออกงาน",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full bg-cream">
        {children}
      </body>
    </html>
  );
}
