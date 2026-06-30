"use client";

import { useState, useEffect } from "react";
import { getAttendanceWithPhotos, getAllEmployees } from "@/lib/actions";
import { getPhotoSrc } from "@/lib/photo-utils";

interface PhotoRecord {
  id: number;
  date: string;
  employeeName: string;
  groupType: string;
  checkIn: string | null;
  checkInPhoto: string | null;
  checkOut: string | null;
  checkOutPhoto: string | null;
  status: string | null;
  latLong: string | null;
}

interface Employee {
  id: number;
  name: string;
}

export default function PhotoHistoryPage() {
  const [records, setRecords] = useState<PhotoRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);

    setEndDate(formatDate(today));
    setStartDate(formatDate(twoWeeksAgo));

    getAllEmployees().then(setEmployees);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadData();
    }
  }, [startDate, endDate, selectedEmp]);

  function formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  async function loadData() {
    setLoading(true);
    const data = await getAttendanceWithPhotos(startDate, endDate);
    setRecords(data);
    setLoading(false);
  }

  const filtered = selectedEmp
    ? records.filter((r) => {
        const emp = employees.find((e) => e.id === selectedEmp);
        return emp && r.employeeName === emp.name;
      })
    : records;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 gradient-gold rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-navy">ประวัติภาพเช็คอิน-ออก</h1>
          <p className="mt-0.5 text-sm text-navy/50">ดูภาพย้อนหลัง 2 สัปดาห์</p>
        </div>
      </div>

      <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-navy/70">พนักงาน</label>
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(Number(e.target.value))}
              className="mt-1 rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            >
              <option value={0}>ทุกคน</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy/70">จากวันที่</label>
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
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-cream-dark" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-cream-dark bg-white p-12 text-center text-navy/50 shadow-gold">
          ไม่พบรายการที่มีภาพเช็คอิน-ออก
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((rec) => (
            <div
              key={rec.id}
              className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden"
            >
              <div className="gradient-navy px-4 py-3">
                <p className="text-sm font-semibold text-white">{rec.employeeName}</p>
                <p className="text-xs text-white/70">
                  {new Date(rec.date).toLocaleDateString("th-TH", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {rec.checkInPhoto ? (
                    <div>
                      <p className="mb-1 text-xs text-navy/50">
                        เช็คอิน {rec.checkIn}
                      </p>
                      <img
                        src={getPhotoSrc(rec.checkInPhoto)}
                        alt="Check-in"
                        className="h-28 w-full cursor-pointer rounded-lg object-cover border border-cream-dark hover:ring-2 hover:ring-gold transition-all"
                        onClick={() => setSelectedPhoto(getPhotoSrc(rec.checkInPhoto))}
                      />
                    </div>
                  ) : (
                    <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-cream-dark bg-cream/30">
                      <span className="text-xs text-navy/30">ไม่มีภาพ</span>
                    </div>
                  )}
                  {rec.checkOutPhoto ? (
                    <div>
                      <p className="mb-1 text-xs text-navy/50">
                        เช็คออก {rec.checkOut}
                      </p>
                      <img
                        src={getPhotoSrc(rec.checkOutPhoto)}
                        alt="Check-out"
                        className="h-28 w-full cursor-pointer rounded-lg object-cover border border-cream-dark hover:ring-2 hover:ring-gold transition-all"
                        onClick={() => setSelectedPhoto(getPhotoSrc(rec.checkOutPhoto))}
                      />
                    </div>
                  ) : (
                    <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-cream-dark bg-cream/30">
                      <span className="text-xs text-navy/30">ไม่มีภาพ</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-navy/50">
                  <span className={rec.status === "late" ? "font-medium text-red-600" : rec.status === "on_time" ? "font-medium text-green-600" : ""}>
                    {rec.status === "late" ? "สาย" : rec.status === "on_time" ? "ตรงเวลา" : "-"}
                  </span>
                  {rec.latLong && (
                    <span className="max-w-[120px] truncate">{rec.latLong}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="Full size photo"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
          <button
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            onClick={() => setSelectedPhoto(null)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
