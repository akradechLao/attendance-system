import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบบันทึกเวลาเข้า-ออกงาน",
  description: "HR Attendance System - ระบบจัดการเวลาเข้า-ออกงานสำหรับพนักงาน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream">
        <Sidebar />
        <main className="ml-0 min-h-screen p-4 pt-20 lg:ml-64 lg:p-8 lg:pt-8">{children}</main>
      </body>
    </html>
  );
}
