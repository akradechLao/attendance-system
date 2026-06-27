"use client";

import { useState, useEffect, use } from "react";
import { getEmployeeMonthlyStats, getAllEmployees } from "@/lib/actions";
import { getPhotoSrc } from "@/lib/photo-utils";
import { LEAVE_TYPES } from "@/lib/leave-constants";

interface Employee {
  id: number;
  name: string;
  groupType: string;
}

interface HistoryItem {
  date: string;
  dayName: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: number | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
}

interface MonthlyStats {
  employee: { id: number; name: string; groupType: string };
  month: string;
  totalDays: number;
  lateDays: number;
  onTimeDays: number;
  absentDays: number;
  leaveDays: number;
  wfhDays: number;
  workDays: number;
  leaveDetails: Record<string, number>;
  history: HistoryItem[];
}

const STATUS_COLORS: Record<string, string> = {
  "ตรงเวลา": "bg-green-100 text-green-800",
  "สาย": "bg-red-100 text-red-800",
  "WFH": "bg-blue-100 text-blue-800",
  "ลา": "bg-purple-100 text-purple-800",
  "ขาด": "bg-orange-100 text-orange-800",
};

export default function EmployeeHistoryPage({ params }: { params: Promise<{ empId: string }> }) {
  const { empId } = use(params);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number>(Number(empId) || 0);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    getAllEmployees().then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedEmpId) {
      setLoading(true);
      getEmployeeMonthlyStats(selectedEmpId, year, month)
        .then(setStats)
        .finally(() => setLoading(false));
    }
  }, [selectedEmpId, year, month]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 gradient-gold rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-navy">ประวัติการเข้างาน</h1>
          <p className="mt-0.5 text-sm text-navy/50">ดูสถิติและประวัติย้อนหลังของพนักงาน</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-cream-dark bg-white p-4 shadow-gold">
        <div>
          <label className="block text-sm font-medium text-navy/70 mb-1">พนักงาน</label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(Number(e.target.value))}
            className="rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
          >
            <option value={0}>-- เลือกพนักงาน --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name} (กลุ่ม {emp.groupType})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-navy/70 mb-1">เดือน</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>เดือน {i + 1}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-navy/70 mb-1">ปี</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y + 543}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-navy/40">กำลังโหลดข้อมูล...</div>
      )}

      {!loading && !stats && selectedEmpId > 0 && (
        <div className="text-center py-12 text-navy/40">ไม่มีข้อมูล</div>
      )}

      {!loading && stats && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.onTimeDays}</div>
              <div className="text-xs text-green-500 mt-1">ตรงเวลา</div>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.lateDays}</div>
              <div className="text-xs text-red-500 mt-1">สาย</div>
            </div>
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.absentDays}</div>
              <div className="text-xs text-orange-500 mt-1">ขาด</div>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.leaveDays}</div>
              <div className="text-xs text-purple-500 mt-1">ลา</div>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.wfhDays}</div>
              <div className="text-xs text-blue-500 mt-1">WFH</div>
            </div>
            <div className="rounded-xl bg-cream border border-cream-dark p-4 text-center">
              <div className="text-2xl font-bold text-navy">{stats.totalDays}</div>
              <div className="text-xs text-navy/50 mt-1">วันทำงานรวม</div>
            </div>
          </div>

          {Object.keys(stats.leaveDetails).length > 0 && (
            <div className="rounded-xl border border-cream-dark bg-white p-4 shadow-gold">
              <h3 className="text-sm font-semibold text-navy mb-3">รายละเอียดลางาน</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.leaveDetails).map(([type, days]) => (
                  <span key={type} className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${LEAVE_TYPES[type]?.color || "bg-gray-100 text-gray-800"}`}>
                    {LEAVE_TYPES[type]?.label || type} {days} วัน
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
            <div className="gradient-navy px-6 py-4">
              <h2 className="text-base font-semibold text-white">
                ประวัติเดือน {new Date(year, month - 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cream-dark bg-cream/50">
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">วันที่</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">วัน</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">เข้า</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ออก</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม.</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">สถานะ</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ภาพ</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.history.map((rec) => (
                    <tr key={rec.date} className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-navy">{rec.date}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/60">{rec.dayName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{rec.checkIn || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{rec.checkOut || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">
                        {rec.workHours !== null ? `${rec.workHours}` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[rec.status] || "bg-gray-100 text-gray-800"}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                           {rec.checkInPhoto && (
                            <button
                              onClick={() => setSelectedPhoto(getPhotoSrc(rec.checkInPhoto))}
                              className="rounded bg-green-100 p-1 text-green-600 hover:bg-green-200 transition-colors"
                              title="ภาพเช็คอิน"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          )}
                           {rec.checkOutPhoto && (
                            <button
                              onClick={() => setSelectedPhoto(getPhotoSrc(rec.checkOutPhoto))}
                              className="rounded bg-navy/10 p-1 text-navy hover:bg-navy/20 transition-colors"
                              title="ภาพเช็คออก"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          )}
                          {!rec.checkInPhoto && !rec.checkOutPhoto && (
                            <span className="text-xs text-navy/30">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto}
              alt="Attendance photo"
              className="w-full rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-3 -right-3 rounded-full bg-white p-2 shadow-lg hover:bg-gray-100"
            >
              <svg className="h-5 w-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
