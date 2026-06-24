"use client";

import { useState, useEffect } from "react";
import {
  getAttendanceStats,
  getEmployeeAttendanceHistory,
} from "@/lib/actions";

interface EmployeeStats {
  empId: number;
  name: string;
  groupType: string;
  totalDays: number;
  lateDays: number;
  onTimeDays: number;
  absentDays: number;
  leaveDays: number;
  wfhDays: number;
  totalWorkHours: number;
  avgCheckIn: string;
}

interface DailyRecord {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: number | null;
}

export default function ReportsPage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [startDate, setStartDate] = useState(formatDate(firstDay));
  const [endDate, setEndDate] = useState(formatDate(lastDay));
  const [stats, setStats] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<number | null>(null);
  const [history, setHistory] = useState<DailyRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function loadStats() {
    setLoading(true);
    const data = await getAttendanceStats(startDate, endDate);
    setStats(data);
    setLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleLoad() {
    await loadStats();
    setSelectedEmp(null);
    setHistory([]);
  }

  async function handleViewHistory(empId: number) {
    setSelectedEmp(empId);
    setLoadingHistory(true);
    const data = await getEmployeeAttendanceHistory(empId, startDate, endDate);
    setHistory(data);
    setLoadingHistory(false);
  }

  const selectedEmpData = stats.find((s) => s.empId === selectedEmp);

  const totalLate = stats.reduce((s, e) => s + e.lateDays, 0);
  const totalAbsent = stats.reduce((s, e) => s + e.absentDays, 0);
  const totalLeave = stats.reduce((s, e) => s + e.leaveDays, 0);
  const totalWfh = stats.reduce((s, e) => s + e.wfhDays, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 gradient-gold rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-navy">รายงานสถิติการเข้างาน</h1>
          <p className="mt-0.5 text-sm text-navy/50">ดูข้อมูลย้อนหลัง ขาด ลา มาสาย</p>
        </div>
      </div>

      <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
        <h2 className="text-lg font-semibold text-navy mb-4">เลือกช่วงวันที่</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-navy/70">ตั้งแต่วันที่</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy/70">ถึงวันที่</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <button
            onClick={handleLoad}
            disabled={loading}
            className="rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "กำลังโหลด..." : "แสดงรายงาน"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border-l-4 border-l-red-500 bg-red-50 p-5">
          <p className="text-sm text-red-600 font-medium">มาสายทั้งหมด</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{totalLate}</p>
          <p className="text-xs text-red-400 mt-1">ครั้ง</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-orange-400 bg-orange-50 p-5">
          <p className="text-sm text-orange-600 font-medium">ขาดงาน</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{totalAbsent}</p>
          <p className="text-xs text-orange-400 mt-1">วัน</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-blue-400 bg-blue-50 p-5">
          <p className="text-sm text-blue-600 font-medium">ลางาน</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{totalLeave}</p>
          <p className="text-xs text-blue-400 mt-1">วัน</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-green-400 bg-green-50 p-5">
          <p className="text-sm text-green-600 font-medium">Work From Home</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{totalWfh}</p>
          <p className="text-xs text-green-400 mt-1">วัน</p>
        </div>
      </div>

      <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
        <div className="gradient-navy px-6 py-4">
          <h2 className="text-base font-semibold text-white">สถิติพนักงานแต่ละคน</h2>
        </div>
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-cream-dark rounded-lg" />
            ))}
          </div>
        ) : stats.length === 0 ? (
          <div className="p-8 text-center text-navy/50">ไม่มีข้อมูลในช่วงวันที่เลือก</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-dark bg-cream/50">
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">ชื่อ</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">กลุ่ม</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">มาตรงเวลา</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">มาสาย</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ขาด</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ลา</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">WFH</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม.ทำงาน</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">เข้างานเฉลี่ย</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ดูรายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((emp) => (
                  <tr
                    key={emp.empId}
                    className={`border-b border-cream-dark/50 transition-colors ${
                      selectedEmp === emp.empId ? "bg-gold/10" : "hover:bg-cream/30"
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-navy">{emp.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          emp.groupType === "A" ? "bg-navy/10 text-navy" : "bg-gold/20 text-gold-dark"
                        }`}
                      >
                        {emp.groupType}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-green-600 font-medium">{emp.onTimeDays}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-red-600 font-medium">{emp.lateDays}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-orange-600 font-medium">{emp.absentDays}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-blue-600 font-medium">{emp.leaveDays}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-green-600 font-medium">{emp.wfhDays}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{emp.totalWorkHours} ชม.</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{emp.avgCheckIn}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewHistory(emp.empId)}
                        className="rounded-lg border border-cream-dark px-3 py-1.5 text-xs font-medium text-navy/70 hover:bg-cream transition-colors"
                      >
                        ดูรายวัน
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedEmp && selectedEmpData && (
        <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
          <div className="gradient-navy px-6 py-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              รายละเอียด {selectedEmpData.name} (กลุ่ม {selectedEmpData.groupType})
            </h2>
            <button
              onClick={() => { setSelectedEmp(null); setHistory([]); }}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
            >
              ปิด
            </button>
          </div>
          {loadingHistory ? (
            <div className="p-8 space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-cream-dark rounded-lg" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-navy/50">ไม่มีข้อมูล</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cream-dark bg-cream/50">
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">วันที่</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">วัน</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">เวลาเข้า</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">เวลาออก</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม.ทำงาน</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((rec) => {
                    const d = new Date(rec.date);
                    const dayName = d.toLocaleDateString("th-TH", { weekday: "short" });
                    return (
                      <tr key={rec.date} className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-navy">{rec.date}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{dayName}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{rec.checkIn || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{rec.checkOut || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{rec.workHours !== null ? `${rec.workHours} ชม.` : "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              rec.status === "ตรงเวลา"
                                ? "bg-green-100 text-green-800"
                                : rec.status === "สาย"
                                ? "bg-red-100 text-red-800"
                                : rec.status === "WFH"
                                ? "bg-blue-100 text-blue-800"
                                : rec.status === "ลา"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
