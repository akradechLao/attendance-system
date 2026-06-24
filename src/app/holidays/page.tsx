"use client";

import { useState, useEffect } from "react";
import {
  getCompanyHolidays,
  addCompanyHoliday,
  deleteCompanyHoliday,
} from "@/lib/actions";

interface Holiday {
  id: number;
  date: string;
  name: string;
  year: number;
}

const THAI_HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "วันขึ้นปีใหม่" },
  { date: "2026-04-06", name: "วันจักรี" },
  { date: "2026-04-13", name: "วันสงกรานต์" },
  { date: "2026-04-14", name: "วันสงกรานต์" },
  { date: "2026-04-15", name: "วันสงกรานต์" },
  { date: "2026-05-01", name: "วันแรงงานแห่งชาติ" },
  { date: "2026-05-04", name: "วันฉัตรมงคล" },
  { date: "2026-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี" },
  { date: "2026-07-28", name: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว" },
  { date: "2026-08-12", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ" },
  { date: "2026-10-13", name: "วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศร" },
  { date: "2026-10-23", name: "วันปิยมหาราช" },
  { date: "2026-12-05", name: "วันคล้ายวันพระบรมราชสมภพพระบาทสมเด็จพระบรมชนกาธิเบศร / วันพ่อแห่งชาติ" },
  { date: "2026-12-10", name: "วันรัฐธรรมนูญ" },
  { date: "2026-12-31", name: "วันสิ้นปี" },
];

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | null }>({ text: "", type: null });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  async function loadHolidays() {
    try {
      setLoading(true);
      const data = await getCompanyHolidays(selectedYear);
      setHolidays(data);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHolidays();
  }, [selectedYear]);

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: null }), 3000);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !name.trim()) {
      showMessage("กรุณากรอกข้อมูลให้ครบทุกช่อง", "error");
      return;
    }
    const result = await addCompanyHoliday(date, name.trim());
    if (result.success) {
      showMessage(result.message, "success");
      setDate("");
      setName("");
      loadHolidays();
    } else {
      showMessage(result.message, "error");
    }
  }

  async function handleDelete(id: number) {
    const result = await deleteCompanyHoliday(id);
    if (result.success) {
      showMessage(result.message, "success");
      setDeleteConfirm(null);
      loadHolidays();
    } else {
      showMessage(result.message, "error");
    }
  }

  async function handleAddAll2026() {
    let added = 0;
    for (const h of THAI_HOLIDAYS_2026) {
      const result = await addCompanyHoliday(h.date, h.name);
      if (result.success) added++;
    }
    showMessage(`เพิ่มวันหยุดราชการปี 2026 สำเร็จ ${added} วัน`, "success");
    loadHolidays();
  }

  const thaiYear = selectedYear + 543;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 gradient-gold rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-navy">วันหยุดบริษัท</h1>
            <p className="mt-0.5 text-sm text-navy/50">จัดการวันหยุดราชการ/บริษัท ปี {thaiYear}</p>
          </div>
        </div>
        <button
          onClick={handleAddAll2026}
          className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-2.5 text-sm font-medium text-gold-dark hover:bg-gold/10 transition-colors"
        >
          📅 เพิ่มวันหยุดราชการ ปี 2026
        </button>
      </div>

      <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
        <h2 className="text-lg font-semibold text-navy mb-4">เพิ่มวันหยุด</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-navy/70">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              required
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-navy/70">ชื่อวันหยุด</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
              placeholder="เช่น วันสงกรานต์"
              required
            />
          </div>
          <button
            type="submit"
            className="rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
          >
            เพิ่มวันหยุด
          </button>
        </form>
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

      <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
        <div className="gradient-navy px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            วันหยุดราชการ/บริษัท ปี {thaiYear} ({holidays.length} วัน)
          </h2>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg bg-white/20 px-3 py-1.5 text-sm text-white border border-white/30 focus:outline-none"
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y} className="text-navy">
                ปี {y + 543} ({y})
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-cream-dark rounded-lg" />
            ))}
          </div>
        ) : holidays.length === 0 ? (
          <div className="p-8 text-center text-navy/50">ยังไม่มีวันหยุดในปีนี้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-dark bg-cream/50">
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold text-navy/60 uppercase">วันที่</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold text-navy/60 uppercase">วัน</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold text-navy/60 uppercase">ชื่อวันหยุด</th>
                  <th className="whitespace-nowrap px-6 py-3 text-right text-xs font-semibold text-navy/60 uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => {
                  const d = new Date(h.date);
                  const dayName = d.toLocaleDateString("th-TH", { weekday: "long" });
                  return (
                    <tr key={h.id} className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-navy font-medium">
                        {new Date(h.date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-navy/70">{dayName}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-navy/70">{h.name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {deleteConfirm === h.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDelete(h.id)}
                              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
                            >
                              ยืนยันลบ
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
                            onClick={() => setDeleteConfirm(h.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            ลบ
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
        <h2 className="text-lg font-semibold text-navy mb-3">📋 กฎระเบียบการเข้างาน</h2>
        <div className="space-y-3 text-sm text-navy/70">
          <div className="rounded-lg bg-cream/50 p-3">
            <p className="font-medium text-navy">📅 วันทำงาน: จันทร์ - เสาร์</p>
            <p className="mt-1">ทุกคนต้องเข้างานอย่างน้อย 6 วัน/สัปดาห์</p>
          </div>
          <div className="rounded-lg bg-cream/50 p-3">
            <p className="font-medium text-navy">🏖️ วันหยุดประจำสัปดาห์: 1 วัน</p>
            <p className="mt-1">ทุกคนมีสิทธิ์หยุด 1 วัน/สัปดาห์ (ไม่นับวันหยุดบริษัท)</p>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="font-medium text-blue-800">🏠 กรณี WFH วันเสาร์</p>
            <p className="mt-1 text-blue-700">WFH ถือเป็นวันทำงาน = มีสิทธิ์หยุดวันอาทิตย์</p>
          </div>
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
            <p className="font-medium text-orange-800">⚠️ กรณีถูกจัดให้หยุดวันเสาร์</p>
            <p className="mt-1 text-orange-700">ต้องมาทำงานวันอาทิตย์แทน (เพราะได้หยุดweekly ไปแล้ว)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
