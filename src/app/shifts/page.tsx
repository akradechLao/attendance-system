"use client";

import { useState, useEffect, useCallback } from "react";

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
  normal: "เข้างาน",
  ot: "โอที",
  saturday: "เข้างาน",
  sunday: "เข้างาน",
  wfh: "WFH",
  holiday: "หยุด",
};

const shiftTypeColors: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  ot: "bg-purple-100 text-purple-800",
  saturday: "bg-blue-100 text-blue-800",
  sunday: "bg-blue-100 text-blue-800",
  wfh: "bg-orange-100 text-orange-800",
  holiday: "bg-gray-100 text-gray-600",
};

export default function ShiftManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [weekStart, setWeekStart] = useState(formatDate(getWeekStart(new Date())));
  const [schedule, setSchedule] = useState<ShiftRecord[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoBooking, setAutoBooking] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ empId: number; date: string; x: number; y: number } | null>(null);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });

  const dayNames = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

  const fetchSchedule = useCallback(async () => {
    const res = await fetch(`/api/shifts?start=${weekStart}&end=${dates[6]}`);
    const data = await res.json();
    if (data.success) setSchedule(data.data);
  }, [weekStart, dates]);

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then((data) => {
      if (data.success) setEmployees(data.data);
    });
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleAutoBookWeekdays = async () => {
    setAutoBooking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto-book-weekdays", weekStart }),
      });
      const result = await res.json();
      setMessage({ type: result.success ? "success" : "error", text: result.message });
      if (result.success) fetchSchedule();
    } catch {
      setMessage({ type: "error", text: "เกิดข้อผิดพลาด" });
    } finally {
      setAutoBooking(false);
    }
  };

  const handleToggleWeekend = async (empId: number, workDate: string, shiftType: string) => {
    setContextMenu(null);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-weekend", empId, workDate, shiftType }),
      });
      const result = await res.json();
      if (result.success) fetchSchedule();
    } catch {
      console.error("Toggle weekend error");
    }
  };

  const handleCellRightClick = (e: React.MouseEvent, empId: number, date: string) => {
    e.preventDefault();
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setContextMenu({ empId, date, x: e.clientX, y: e.clientY });
    }
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const isWeekend = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  const hasWeekdayShifts = () => {
    return dates.some((d) => {
      if (isWeekend(d)) return false;
      return schedule.some((s) => s.workDate === d);
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 gradient-gold rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-navy">จัดตารางเวร</h1>
          <p className="mt-0.5 text-sm text-navy/50">จัดการตารางเข้างานรายสัปดาห์</p>
        </div>
      </div>

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-cream-dark bg-white p-5 shadow-gold lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-navy">จัดการสัปดาห์</h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() - 7);
                setWeekStart(formatDate(d));
              }}
              className="rounded-lg border border-cream-dark px-3 py-2 text-sm text-navy/70 hover:bg-cream transition-colors"
            >
              ← ก่อนหน้า
            </button>
            <button
              onClick={() => {
                setWeekStart(formatDate(getWeekStart(new Date())));
              }}
              className="rounded-lg border border-gold px-3 py-2 text-sm font-medium text-gold-dark hover:bg-gold/10 transition-colors"
            >
              สัปดาห์นี้
            </button>
            <button
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + 7);
                setWeekStart(formatDate(d));
              }}
              className="rounded-lg border border-cream-dark px-3 py-2 text-sm text-navy/70 hover:bg-cream transition-colors"
            >
              ถัดไป →
            </button>
          </div>

          <div className="text-sm text-navy/70">
            <p className="font-medium text-navy">{formatDisplayDate(weekStart)}</p>
            <p>ถึง {formatDisplayDate(dates[6])}</p>
          </div>

          <div className="border-t border-cream-dark pt-4 space-y-3">
            <button
              onClick={handleAutoBookWeekdays}
              disabled={autoBooking}
              className="w-full rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {autoBooking ? "กำลังบุ๊ค..." : "บุ๊ควันจันทร์-ศุกร์"}
            </button>
            <p className="text-xs text-navy/50">บุ๊ควันทำงานอัตโนมัติตามกลุ่มพนักงาน</p>
          </div>

          <div className="border-t border-cream-dark pt-4">
            <h3 className="text-sm font-semibold text-navy mb-2">วันหยุด/WFH (คลิกขวา)</h3>
            <p className="text-xs text-navy/50">คลิกขวาที่ช่องวันเสาร์-อาทิตย์ เพื่อเลือก</p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300"></span> เข้างาน</div>
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-purple-100 border border-purple-300"></span> เข้างาน + OT</div>
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-orange-100 border border-orange-300"></span> WFH</div>
              <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded bg-gray-100 border border-gray-300"></span> หยุด</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-cream-dark bg-white p-5 shadow-gold lg:col-span-3 overflow-x-auto">
          <div className="mb-3">
            {!hasWeekdayShifts() && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                ยังไม่มีตารางวันจันทร์-ศุกร์ กด &quot;บุ๊ควันจันทร์-ศุกร์&quot; เพื่อบันทึกอัตโนมัติ
              </div>
            )}
          </div>

          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-cream-dark">
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-navy/70">พนักงาน</th>
                {dates.map((d, i) => {
                  const dayOfWeek = new Date(d).getDay();
                  const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
                  return (
                    <th
                      key={d}
                      className={`px-2 py-3 text-center text-xs font-bold uppercase ${
                        isWeekendDay ? "text-orange-600 bg-orange-50/50" : "text-navy/70"
                      }`}
                    >
                      <div>{dayNames[dayOfWeek]}</div>
                      <div className="font-normal">{new Date(d).getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/50">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-cream/30 transition-colors">
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="font-medium text-navy text-sm">{emp.name}</div>
                    <div className="text-xs text-navy/50">กลุ่ม {emp.groupType}</div>
                  </td>
                  {dates.map((d) => {
                    const shift = schedule.find(
                      (s) => s.empId === emp.id && s.workDate === d
                    );
                    const dayOfWeek = new Date(d).getDay();
                    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

                    return (
                      <td
                        key={d}
                        className={`px-2 py-3 text-center ${isWeekendDay ? "bg-orange-50/30" : ""}`}
                        onContextMenu={(e) => handleCellRightClick(e, emp.id, d)}
                      >
                        {shift ? (
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              shiftTypeColors[shift.shiftType] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {shiftTypeLabels[shift.shiftType] || shift.shiftType}
                          </span>
                        ) : (
                          <span className="text-cream-dark text-xs">-</span>
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

      {contextMenu && (
        <div
          className="fixed z-50 rounded-xl border border-cream-dark bg-white shadow-navy p-2 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <p className="px-3 py-1 text-xs text-navy/50 font-medium">
            {formatDisplayDate(contextMenu.date)}
          </p>
          <button
            onClick={() => handleToggleWeekend(contextMenu.empId, contextMenu.date, "ot")}
            className="w-full text-left rounded-lg px-3 py-2 text-sm text-navy hover:bg-purple-50 transition-colors"
          >
            เข้างาน + OT
          </button>
          <button
            onClick={() => handleToggleWeekend(contextMenu.empId, contextMenu.date, "wfh")}
            className="w-full text-left rounded-lg px-3 py-2 text-sm text-navy hover:bg-orange-50 transition-colors"
          >
            WFH
          </button>
          <button
            onClick={() => handleToggleWeekend(contextMenu.empId, contextMenu.date, "normal")}
            className="w-full text-left rounded-lg px-3 py-2 text-sm text-navy hover:bg-green-50 transition-colors"
          >
            เข้างาน
          </button>
          <button
            onClick={() => handleToggleWeekend(contextMenu.empId, contextMenu.date, "holiday")}
            className="w-full text-left rounded-lg px-3 py-2 text-sm text-navy hover:bg-gray-50 transition-colors"
          >
            หยุด
          </button>
          <hr className="my-1 border-cream-dark" />
          <button
            onClick={() => handleToggleWeekend(contextMenu.empId, contextMenu.date, "off")}
            className="w-full text-left rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            ลบ
          </button>
        </div>
      )}
    </div>
  );
}
