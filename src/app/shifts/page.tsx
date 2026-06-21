"use client";

import { useState, useEffect } from "react";
import { getAllEmployees, addShift, getShiftScheduleForWeek, getSaturdayShiftCount } from "@/lib/actions";

interface Employee {
  id: number;
  name: string;
  groupType: "A" | "B";
}

interface ShiftRecord {
  id: number;
  empId: number;
  workDate: string;
  shiftType: string;
  employee: {
    id: number;
    name: string;
    groupType: "A" | "B";
  };
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", { weekday: "short", month: "short", day: "numeric" });
}

const shiftTypeLabels: Record<string, string> = {
  normal: "ปกติ",
  ot: "OT",
  saturday: "เสาร์",
  sunday: "อาทิตย์",
};

export default function ShiftManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [workDate, setWorkDate] = useState(formatDate(new Date()));
  const [shiftType, setShiftType] = useState("normal");
  const [weekStart, setWeekStart] = useState(formatDate(getWeekStart(new Date())));
  const [schedule, setSchedule] = useState<ShiftRecord[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [satCount, setSatCount] = useState(0);

  useEffect(() => {
    getAllEmployees().then(setEmployees);
  }, []);

  const fetchScheduleData = async () => {
    const data = await getShiftScheduleForWeek(weekStart);
    setSchedule(data);

    const saturday = new Date(weekStart);
    const dayOfWeek = saturday.getDay();
    const diff = (6 - dayOfWeek + 7) % 7;
    saturday.setDate(saturday.getDate() + diff);
    const satDate = formatDate(saturday);

    const count = await getSaturdayShiftCount(satDate);
    setSatCount(count);
  };

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    fetchScheduleData();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddShift = async () => {
    if (!selectedEmpId) return;
    setLoading(true);
    setMessage(null);

    const result = await addShift(selectedEmpId, workDate, shiftType);
    setMessage({ type: result.success ? "success" : "error", text: result.message });
    setLoading(false);

    if (result.success) {
      fetchScheduleData();
    }
  };

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 gradient-gold rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-navy">จัดตารางเวร</h1>
          <p className="mt-0.5 text-sm text-navy/50">จัดการตารางเวรรายสัปดาห์</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-navy">เพิ่มเวร</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy/70">พนักงาน</label>
              <select
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                value={selectedEmpId || ""}
                onChange={(e) => setSelectedEmpId(Number(e.target.value) || null)}
              >
                <option value="">-- เลือก --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} (กลุ่ม {emp.groupType})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy/70">วันที่ทำงาน</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy/70">ประเภทเวร</label>
              <select
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
              >
                <option value="normal">ปกติ</option>
                <option value="ot">OT</option>
                <option value="saturday">เสาร์</option>
                <option value="sunday">อาทิตย์</option>
              </select>
            </div>
            <button
              onClick={handleAddShift}
              disabled={!selectedEmpId || loading}
              className="w-full rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "กำลังเพิ่ม..." : "เพิ่มเวร"}
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

        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy">ตารางรายสัปดาห์</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() - 7);
                  setWeekStart(formatDate(d));
                }}
                className="rounded-lg border border-cream-dark px-3 py-1.5 text-sm text-navy/70 hover:bg-cream transition-colors"
              >
                ก่อนหน้า
              </button>
              <span className="text-sm font-medium text-navy/60 px-2">{formatDisplayDate(weekStart)}</span>
              <button
                onClick={() => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + 7);
                  setWeekStart(formatDate(d));
                }}
                className="rounded-lg border border-cream-dark px-3 py-1.5 text-sm text-navy/70 hover:bg-cream transition-colors"
              >
                ถัดไป
              </button>
            </div>
          </div>

          {satCount < 3 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              วันเสาร์ต้องมีอย่างน้อย 3 คน ปัจจุบัน: {satCount} คน
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-dark bg-cream">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-navy/70">
                    พนักงาน
                  </th>
                  {dates.map((d) => (
                    <th key={d} className="px-3 py-3 text-center text-xs font-bold uppercase text-navy/70">
                      {formatDisplayDate(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-cream/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-medium text-navy">{emp.name}</div>
                      <div className="text-xs text-navy/50">กลุ่ม {emp.groupType}</div>
                    </td>
                    {dates.map((d) => {
                      const shift = schedule.find(
                        (s) => s.empId === emp.id && s.workDate === d
                      );
                      return (
                        <td key={d} className="px-3 py-3 text-center">
                          {shift ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                shift.shiftType === "saturday"
                                  ? "bg-orange-100 text-orange-800"
                                  : shift.shiftType === "ot"
                                  ? "bg-purple-100 text-purple-800"
                                  : shift.shiftType === "sunday"
                                  ? "bg-navy/10 text-navy"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {shiftTypeLabels[shift.shiftType] || shift.shiftType}
                            </span>
                          ) : (
                            <span className="text-cream-dark">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
