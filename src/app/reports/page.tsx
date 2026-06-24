"use client";

import { useState, useEffect } from "react";
import {
  getAttendanceStats,
  getEmployeeAttendanceHistory,
  getOtSummary,
  generateAttendanceReportPdf,
} from "@/lib/actions";
import { LEAVE_TYPES } from "@/lib/leave-constants";

interface EmployeeStats {
  empId: number;
  name: string;
  groupType: string;
  totalDays: number;
  lateDays: number;
  onTimeDays: number;
  absentDays: number;
  leaveDays: number;
  leaveDetails: Record<string, number>;
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

interface OtSummaryItem {
  empId: number;
  name: string;
  groupType: string;
  totalOtHours: number;
  otDays: number;
  details: { date: string; checkOut: string; otHours: number }[];
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
  const [otSummary, setOtSummary] = useState<OtSummaryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"summary" | "ot">("summary");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfExportEmpId, setPdfExportEmpId] = useState<number | null>(null);

  async function loadStats() {
    setLoading(true);
    const [statsData, otData] = await Promise.all([
      getAttendanceStats(startDate, endDate),
      getOtSummary(startDate, endDate),
    ]);
    setStats(statsData);
    setOtSummary(otData);
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

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      const empIdParam = pdfExportEmpId || undefined;
      const pdfDataUrl = await generateAttendanceReportPdf(startDate, endDate, empIdParam);
      const empName = pdfExportEmpId
        ? stats.find((s) => s.empId === pdfExportEmpId)?.name || "employee"
        : "all-employees";
      const link = document.createElement("a");
      link.href = pdfDataUrl;
      link.download = `attendance-${empName}-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("PDF export error:", error);
    } finally {
      setExportingPdf(false);
    }
  }

  const selectedEmpData = stats.find((s) => s.empId === selectedEmp);

  const totalLate = stats.reduce((s, e) => s + e.lateDays, 0);
  const totalAbsent = stats.reduce((s, e) => s + e.absentDays, 0);
  const totalLeave = stats.reduce((s, e) => s + e.leaveDays, 0);
  const totalWfh = stats.reduce((s, e) => s + e.wfhDays, 0);
  const totalOtHours = otSummary.reduce((s, e) => s + e.totalOtHours, 0);
  const totalOtDays = otSummary.reduce((s, e) => s + e.otDays, 0);

  const totalLeaveByType: Record<string, number> = {};
  for (const emp of stats) {
    for (const [type, days] of Object.entries(emp.leaveDetails)) {
      totalLeaveByType[type] = (totalLeaveByType[type] || 0) + days;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 gradient-gold rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-navy">รายงานสถิติการเข้างาน</h1>
            <p className="mt-0.5 text-sm text-navy/50">ดูข้อมูลย้อนหลัง ขาด ลา มาสาย OT</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pdfExportEmpId || ""}
            onChange={(e) => setPdfExportEmpId(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
          >
            <option value="">ทุกคน</option>
            {stats.map((emp) => (
              <option key={emp.empId} value={emp.empId}>{emp.name}</option>
            ))}
          </select>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || loading}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exportingPdf ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
          </button>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border-l-4 border-l-red-500 bg-red-50 p-4">
          <p className="text-sm text-red-600 font-medium">มาสาย</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{totalLate}</p>
          <p className="text-xs text-red-400">ครั้ง</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-orange-400 bg-orange-50 p-4">
          <p className="text-sm text-orange-600 font-medium">ขาดงาน</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{totalAbsent}</p>
          <p className="text-xs text-orange-400">วัน</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-blue-400 bg-blue-50 p-4">
          <p className="text-sm text-blue-600 font-medium">ลางาน</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalLeave}</p>
          <p className="text-xs text-blue-400">วัน</p>
          {Object.keys(totalLeaveByType).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(totalLeaveByType).map(([type, days]) => (
                <span key={type} className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${LEAVE_TYPES[type]?.color || "bg-gray-100 text-gray-800"}`}>
                  {LEAVE_TYPES[type]?.label || type} {days}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border-l-4 border-l-green-400 bg-green-50 p-4">
          <p className="text-sm text-green-600 font-medium">WFH</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{totalWfh}</p>
          <p className="text-xs text-green-400">วัน</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-purple-400 bg-purple-50 p-4">
          <p className="text-sm text-purple-600 font-medium">OT รวม</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{totalOtHours}</p>
          <p className="text-xs text-purple-400">ชม. ({totalOtDays} วัน)</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-cream-dark">
        <button
          onClick={() => setActiveTab("summary")}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "summary"
              ? "border-gold text-gold-dark"
              : "border-transparent text-navy/50 hover:text-navy"
          }`}
        >
          สถิติพนักงาน
        </button>
        <button
          onClick={() => setActiveTab("ot")}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "ot"
              ? "border-gold text-gold-dark"
              : "border-transparent text-navy/50 hover:text-navy"
          }`}
        >
          สรุป OT
        </button>
      </div>

      {activeTab === "summary" && (
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
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ตรงเวลา</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">สาย</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ขาด</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ลา</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">WFH</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม.ทำ</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">เข้าเฉลี่ย</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">รายละเอียด</th>
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
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${emp.groupType === "A" ? "bg-navy/10 text-navy" : "bg-gold/20 text-gold-dark"}`}>
                          {emp.groupType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-green-600 font-medium">{emp.onTimeDays}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-red-600 font-medium">{emp.lateDays}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-orange-600 font-medium">{emp.absentDays}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-blue-600 font-medium">
                      <div>{emp.leaveDays}</div>
                      {Object.keys(emp.leaveDetails).length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                          {Object.entries(emp.leaveDetails).map(([type, days]) => (
                            <span key={type} className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${LEAVE_TYPES[type]?.color || "bg-gray-100 text-gray-800"}`}>
                              {LEAVE_TYPES[type]?.label || type} {days}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
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
      )}

      {activeTab === "ot" && (
        <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
          <div className="gradient-navy px-6 py-4">
            <h2 className="text-base font-semibold text-white">สรุป OT แต่ละคน</h2>
          </div>
          {loading ? (
            <div className="p-8 space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-cream-dark rounded-lg" />
              ))}
            </div>
          ) : otSummary.length === 0 ? (
            <div className="p-8 text-center text-navy/50">ไม่มีข้อมูล OT</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cream-dark bg-cream/50">
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">ชื่อ</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">กลุ่ม</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">วัน OT</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม. OT รวม</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {otSummary.filter((o) => o.otDays > 0).map((emp) => (
                    <tr key={emp.empId} className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-navy">{emp.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${emp.groupType === "A" ? "bg-navy/10 text-navy" : "bg-gold/20 text-gold-dark"}`}>
                          {emp.groupType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-purple-600">{emp.otDays} วัน</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-bold text-purple-700">{emp.totalOtHours} ชม.</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {emp.details.map((d, i) => (
                            <span key={i} className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                              {new Date(d.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })} ({d.otHours} ชม.)
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {otSummary.filter((o) => o.otDays > 0).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-navy/50">ไม่มีพนักงานที่มี OT ในช่วงนี้</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            rec.status === "ตรงเวลา" ? "bg-green-100 text-green-800" :
                            rec.status === "สาย" ? "bg-red-100 text-red-800" :
                            rec.status === "WFH" ? "bg-blue-100 text-blue-800" :
                            rec.status === "ลา" ? "bg-purple-100 text-purple-800" :
                            "bg-orange-100 text-orange-800"
                          }`}>
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
