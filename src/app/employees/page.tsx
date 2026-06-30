"use client";

import { useState, useEffect } from "react";

interface Employee {
  id: number;
  name: string;
  groupType: "A" | "B";
  wfhQuota: number;
  preferredOffDay: string | null;
}

interface EmployeeForm {
  name: string;
  groupType: "A" | "B";
  preferredOffDay: string;
}

const emptyForm: EmployeeForm = {
  name: "",
  groupType: "A",
  preferredOffDay: "",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [wfhUsage, setWfhUsage] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | null }>({ text: "", type: null });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [empsRes, usageRes] = await Promise.all([
        fetch("/api/employees").then((r) => r.json()),
        fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "wfh-usage" }) }).then((r) => r.json()).catch(() => ({ data: {} })),
      ]);
      if (empsRes.success) setEmployees(empsRes.data);
      if (usageRes.data) setWfhUsage(usageRes.data);
    } catch (error) {
      console.error("Load error:", error);
      setMessage({ text: "ไม่สามารถโหลดข้อมูลได้", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: null }), 3000);
  }

  function handleAdd() {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  }

  function handleEdit(emp: Employee) {
    setForm({
      name: emp.name,
      groupType: emp.groupType,
      preferredOffDay: emp.preferredOffDay || "",
    });
    setEditId(emp.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      showMessage("กรุณากรอกชื่อพนักงาน", "error");
      return;
    }

    setSubmitting(true);
    try {
      const preferredOffDay = form.preferredOffDay || null;
      const body = editId
        ? { id: editId, name: form.name.trim(), groupType: form.groupType, preferredOffDay }
        : { name: form.name.trim(), groupType: form.groupType, preferredOffDay };

      const res = await fetch("/api/employees", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();

      if (result.success) {
        showMessage(result.message, "success");
        setShowForm(false);
        setForm(emptyForm);
        setEditId(null);
        loadData();
      } else {
        showMessage(result.message || "เกิดข้อผิดพลาด", "error");
      }
    } catch (error) {
      console.error("Submit error:", error);
      showMessage("เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        showMessage(result.message, "success");
        setDeleteConfirm(null);
        loadData();
      } else {
        showMessage(result.message || "เกิดข้อผิดพลาด", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showMessage("เกิดข้อผิดพลาดในการลบ", "error");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 gradient-gold rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-navy">จัดการพนักงาน</h1>
            <p className="mt-0.5 text-sm text-navy/50">เพิ่ม แก้ไข ลบรายชื่อพนักงาน</p>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
        >
          + เพิ่มพนักงาน
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-cream-dark bg-white p-5 shadow-gold">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex rounded-full bg-navy/10 px-2 py-0.5 text-xs font-semibold text-navy">กลุ่ม A</span>
            <span className="text-sm font-medium text-navy">พนักงานออฟฟิศ</span>
          </div>
          <div className="space-y-1 text-sm text-navy/70">
            <p>⏰ เวลาทำงาน: <span className="font-medium text-navy">08:00 - 17:00</span></p>
            <p>🍽️ พักเที่ยง: <span className="font-medium text-navy">11:45 - 12:45</span></p>
            <p>📅 เข้าเวรวันเสาร์ (ผลัดกัน)</p>
          </div>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-5 shadow-gold">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-gold-dark">กลุ่ม B</span>
            <span className="text-sm font-medium text-navy">พนักงานโอที</span>
          </div>
          <div className="space-y-1 text-sm text-navy/70">
            <p>⏰ เวลาทำงาน: <span className="font-medium text-navy">07:00 - 16:00</span></p>
            <p>🔥 โอที: <span className="font-medium text-red-600">16:00 - 20:00 (บังคับ)</span></p>
            <p>🍽️ พักเที่ยง: <span className="font-medium text-navy">11:45 - 12:45</span></p>
          </div>
        </div>
      </div>

      {message.text && message.type && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
          <h2 className="text-lg font-semibold text-navy mb-4">
            {editId ? "แก้ไขพนักงาน" : "เพิ่มพนักงานใหม่"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-navy/70">ชื่อ - นามสกุล</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                  placeholder="กรอกชื่อ-นามสกุล"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/70">กลุ่มพนักงาน</label>
                <select
                  value={form.groupType}
                  onChange={(e) => setForm({ ...form, groupType: e.target.value as "A" | "B" })}
                  className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                >
                  <option value="A">กลุ่ม A - ออฟฟิศ (08:00-17:00, พัก 11:45-12:45)</option>
                  <option value="B">กลุ่ม B - โอที (07:00-16:00 + โอที 16:00-20:00, พัก 11:45-12:45)</option>
                </select>
                <div className="mt-2 rounded-lg bg-cream/50 border border-cream-dark p-3">
                  {form.groupType === "A" ? (
                    <div className="text-xs text-navy/70 space-y-1">
                      <p>⏰ ทำงาน: 08:00 - 17:00</p>
                      <p>🍽️ พักเที่ยง: 11:45 - 12:45</p>
                      <p>📅 เข้าเวรวันเสาร์ (ผลัดกัน)</p>
                    </div>
                  ) : (
                    <div className="text-xs text-navy/70 space-y-1">
                      <p>⏰ ทำงาน: 07:00 - 16:00</p>
                      <p>🔥 โอทีบังคับ: 16:00 - 20:00</p>
                      <p>🍽️ พักเที่ยง: 11:45 - 12:45</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/70">สิทธิ์ WFH</label>
                <div className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/30 px-4 py-2.5 text-navy">
                  1 วัน/เดือน (วันเสาร์)
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/70">วันหยุดประจำ (ถ้ามี)</label>
                <select
                  value={form.preferredOffDay}
                  onChange={(e) => setForm({ ...form, preferredOffDay: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                >
                  <option value="">ไม่ระบุ</option>
                  <option value="Saturday">เสาร์</option>
                  <option value="Sunday">อาทิตย์</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "เพิ่มพนักงาน"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
                className="rounded-lg border border-cream-dark px-4 py-2.5 text-sm font-medium text-navy/70 hover:bg-cream transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
        <div className="gradient-navy px-6 py-4">
          <h2 className="text-base font-semibold text-white">รายชื่อพนักงานทั้งหมด ({employees.length} คน)</h2>
        </div>

        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-cream-dark rounded-lg" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-navy/50">ยังไม่มีพนักงานในระบบ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-dark bg-cream/50">
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">รหัส</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">ชื่อ-นามสกุล</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">กลุ่ม</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">เวลาทำงาน</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">WFH เดือนนี้</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">วันหยุด</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-navy/60 uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors">
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-navy/60">{emp.id}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-navy">{emp.name}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          emp.groupType === "A" ? "bg-navy/10 text-navy" : "bg-gold/20 text-gold-dark"
                        }`}
                      >
                        กลุ่ม {emp.groupType}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-xs text-navy/70">
                      {emp.groupType === "A" ? "08:00-17:00" : "07:00-16:00 (+โอที)"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-navy/70">
                      {wfhUsage[emp.id] || 0} / {emp.wfhQuota} วัน
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-navy/70">
                      {emp.preferredOffDay === "Saturday" ? "เสาร์" : emp.preferredOffDay === "Sunday" ? "อาทิตย์" : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="rounded-lg border border-cream-dark px-3 py-1.5 text-xs font-medium text-navy/70 hover:bg-cream transition-colors"
                        >
                          แก้ไข
                        </button>
                        {deleteConfirm === emp.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(emp.id)}
                              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
                            >
                              ยืนยัน
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-lg border border-cream-dark px-3 py-1.5 text-xs font-medium text-navy/70 hover:bg-cream transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(emp.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            ลบ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
