"use client";

import { useState, useEffect } from "react";
import {
  getAllEmployees,
  requestWfh,
  cancelWfh,
  getWfhRecords,
  getWfhOfMonthBulk,
} from "@/lib/actions";

interface Employee {
  id: number;
  name: string;
  groupType: "A" | "B";
  wfhQuota: number;
}

interface WfhRecord {
  id: number;
  empId: number;
  date: string;
  reason: string;
  status: string;
  createdAt: Date;
  employee: { id: number; name: string; groupType: string };
}

export default function WfhPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<WfhRecord[]>([]);
  const [wfhUsage, setWfhUsage] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | null }>({ text: "", type: null });
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    const [emps, recs, usage] = await Promise.all([
      getAllEmployees(),
      getWfhRecords(),
      getWfhOfMonthBulk(),
    ]);
    setEmployees(emps);
    setRecords(recs);
    setWfhUsage(usage);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: null }), 3000);
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmp) {
      showMessage("กรุณาเลือกพนักงาน", "error");
      return;
    }
    if (!selectedDate) {
      showMessage("กรุณาเลือกวันที่", "error");
      return;
    }

    const dayOfWeek = new Date(selectedDate).getDay();
    if (dayOfWeek !== 6) {
      showMessage("WFH ได้เฉพาะวันเสาร์เท่านั้น", "error");
      return;
    }

    setSubmitting(true);
    const result = await requestWfh(selectedEmp, selectedDate, reason);
    setSubmitting(false);

    if (result.success) {
      showMessage(result.message, "success");
      setSelectedEmp(0);
      setSelectedDate("");
      setReason("");
      loadData();
    } else {
      showMessage(result.message, "error");
    }
  }

  async function handleCancel(id: number) {
    const result = await cancelWfh(id);
    if (result.success) {
      showMessage(result.message, "success");
      loadData();
    } else {
      showMessage(result.message, "error");
    }
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthName = now.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  const thisMonthRecords = records.filter((r) => r.date.startsWith(currentMonth));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 gradient-gold rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-navy">Work From Home (WFH)</h1>
          <p className="mt-0.5 text-sm text-navy/50">ขอสิทธิ์ WFH วันเสาร์ คนละ 1 วัน/เดือน</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
          <h2 className="text-lg font-semibold text-navy mb-4">ขอ WFH วันเสาร์</h2>
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy/70">พนักงาน</label>
              <select
                value={selectedEmp}
                onChange={(e) => setSelectedEmp(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              >
                <option value={0}>-- เลือกพนักงาน --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id} disabled={(wfhUsage[emp.id] || 0) >= emp.wfhQuota}>
                    {emp.name} (ใช้ไป {(wfhUsage[emp.id] || 0)}/{emp.wfhQuota} วัน)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy/70">วันที่ต้องการ WFH (วันเสาร์)</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy/70">เหตุผล (ถ้ามี)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                placeholder="กรอกเหตุผล (ไม่บังคับ)"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "กำลังส่ง..." : "ขอ WFH"}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
          <h2 className="text-lg font-semibold text-navy mb-4">สรุปสิทธิ์ WFH เดือนนี้</h2>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-cream-dark rounded-lg" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <p className="text-navy/50 text-sm">ยังไม่มีพนักงานในระบบ</p>
          ) : (
            <div className="space-y-3">
              {employees.map((emp) => {
                const used = wfhUsage[emp.id] || 0;
                const remaining = emp.wfhQuota - used;
                return (
                  <div key={emp.id} className="flex items-center justify-between rounded-lg border border-cream-dark p-3">
                    <div>
                      <p className="text-sm font-medium text-navy">{emp.name}</p>
                      <p className="text-xs text-navy/50">กลุ่ม {emp.groupType}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${remaining > 0 ? "text-green-600" : "text-red-500"}`}>
                        เหลือ {remaining} วัน
                      </p>
                      <p className="text-xs text-navy/40">ใช้ไป {used}/{emp.wfhQuota}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
        <div className="gradient-navy px-6 py-4">
          <h2 className="text-base font-semibold text-white">ประวัติ WFH เดือน{monthName}</h2>
        </div>
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-cream-dark rounded-lg" />
            ))}
          </div>
        ) : thisMonthRecords.length === 0 ? (
          <div className="p-8 text-center text-navy/50">ยังไม่มีรายการ WFH เดือนนี้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-dark bg-cream/50">
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold text-navy/60 uppercase">วันที่</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold text-navy/60 uppercase">พนักงาน</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold text-navy/60 uppercase">เหตุผล</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold text-navy/60 uppercase">สถานะ</th>
                  <th className="whitespace-nowrap px-6 py-3 text-right text-xs font-semibold text-navy/60 uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {thisMonthRecords.map((rec) => (
                  <tr key={rec.id} className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-navy">
                      {new Date(rec.date).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-navy">{rec.employee.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-navy/70">{rec.reason || "-"}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        อนุมัติแล้ว
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleCancel(rec.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        ยกเลิก
                      </button>
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
