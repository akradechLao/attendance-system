"use client";

import { useState, useEffect } from "react";
import { getAllEmployees } from "@/lib/actions";
import { createLeave, getAllLeaves, deleteLeave, LeaveRecord } from "@/lib/leave-actions";
import { LEAVE_TYPES } from "@/lib/leave-constants";

interface Employee {
  id: number;
  name: string;
  groupType: "A" | "B";
}

export default function LeaveManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [leaveType, setLeaveType] = useState("sick");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllEmployees().then(setEmployees).catch(() => {});
    getAllLeaves().then(setLeaves).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!selectedEmpId || !reason.trim()) {
      setMessage({ type: "error", text: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
      return;
    }
    setLoading(true);
    setMessage(null);
    const result = await createLeave(selectedEmpId, leaveType, startDate, endDate, reason.trim());
    setMessage({ type: result.success ? "success" : "error", text: result.message });
    setLoading(false);
    if (result.success) {
      getAllLeaves().then(setLeaves);
      setSelectedEmpId(null);
      setReason("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate(new Date().toISOString().split("T")[0]);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await deleteLeave(id);
    if (result.success) {
      getAllLeaves().then(setLeaves);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 gradient-gold rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-navy">จัดการลางาน</h1>
          <p className="mt-0.5 text-sm text-navy/50">บันทึกและจัดการการลางานของพนักงาน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Form */}
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-navy">บันทึกลางาน</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy/70">พนักงาน</label>
              <select
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                value={selectedEmpId || ""}
                onChange={(e) => setSelectedEmpId(Number(e.target.value) || null)}
              >
                <option value="">-- เลือกพนักงาน --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} (กลุ่ม {emp.groupType})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy/70">ประเภทลา</label>
              <select
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
              >
                {Object.entries(LEAVE_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy/70">วันที่เริ่ม</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy/70">วันที่สิ้นสุด</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy/70">เหตุผล</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                rows={3}
                placeholder="กรอกเหตุผลการลางาน..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!selectedEmpId || loading}
              className="w-full rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "บันทึกลางาน"}
            </button>
            {message && (
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
          </div>
        </div>

        {/* Leave List */}
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-navy">รายการลางานทั้งหมด ({leaves.length})</h2>
          {leaves.length === 0 ? (
            <p className="text-center text-navy/40 py-8">ยังไม่มีรายการลางาน</p>
          ) : (
            <div className="space-y-3">
              {leaves.map((leave) => {
                const typeInfo = LEAVE_TYPES[leave.leaveType] || { label: leave.leaveType, color: "bg-gray-100 text-gray-800" };
                return (
                  <div key={leave.id} className="flex items-start gap-3 rounded-lg border border-cream-dark p-4 hover:bg-cream/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy">{leave.employee.name}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-navy/60">
                        {leave.startDate} - {leave.endDate}
                      </p>
                      <p className="mt-1 text-sm text-navy/50">เหตุผล: {leave.reason}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(leave.id)}
                      className="rounded-lg p-1.5 text-navy/30 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
