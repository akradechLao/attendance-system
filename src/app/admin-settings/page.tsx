"use client";

import { useState, useEffect } from "react";
import { getAdminUser, updateAdminCredentials } from "@/lib/actions";

export default function AdminSettingsPage() {
  const [currentUsername, setCurrentUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAdminUser()
      .then((user) => {
        if (user) {
          setCurrentUsername(user.username);
          setNewUsername(user.username);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword) {
      setMessage({ type: "error", text: "กรุณากรอกรหัสผ่านเดิม" });
      return;
    }

    if (!newUsername || !newPassword) {
      setMessage({ type: "error", text: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านใหม่" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "รหัสผ่านใหม่ไม่ตรงกัน" });
      return;
    }

    setSubmitting(true);
    const result = await updateAdminCredentials(currentPassword, newUsername, newPassword);
    setMessage({ type: result.success ? "success" : "error", text: result.message });

    if (result.success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentUsername(newUsername);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-cream-dark rounded" />
        <div className="h-64 bg-cream-dark rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 gradient-gold rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-navy">ตั้งค่าบัญชีผู้ดูแล</h1>
          <p className="mt-0.5 text-sm text-navy/50">แก้ไขชื่อผู้ใช้และรหัสผ่านสำหรับเข้าสู่ระบบ</p>
        </div>
      </div>

      <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold max-w-lg">
        <h2 className="mb-6 text-lg font-semibold text-navy">เปลี่ยนข้อมูลเข้าสู่ระบบ</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy/70">ชื่อผู้ใช้ปัจจุบัน</label>
            <input
              type="text"
              value={currentUsername}
              disabled
              className="mt-1 w-full rounded-lg border border-cream-dark bg-gray-100 px-4 py-2.5 text-navy cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy/70">รหัสผ่านเดิม</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              placeholder="กรอกรหัสผ่านเดิม"
              required
            />
          </div>

          <div className="border-t border-cream-dark pt-4">
            <h3 className="text-sm font-semibold text-navy mb-3">ข้อมูลใหม่</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy/70">ชื่อผู้ใช้ใหม่</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              placeholder="กรอกชื่อผู้ใช้ใหม่"
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy/70">รหัสผ่านใหม่</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              placeholder="กรอกรหัสผ่านใหม่"
              required
              minLength={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy/70">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              required
            />
          </div>

          {message && (
            <div className={`rounded-lg p-3 text-sm border ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg gradient-navy px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </form>
      </div>
    </div>
  );
}
