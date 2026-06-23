"use client";

import { useState, useEffect } from "react";

interface OfficeLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("200");
  const [submitting, setSubmitting] = useState(false);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/office-locations");
      const data = await res.json();
      if (data.success) setLocations(data.data);
    } catch {
      setMessage({ type: "error", text: "ไม่สามารถโหลดข้อมูลได้" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/office-locations");
        const data = await res.json();
        if (!cancelled && data.success) setLocations(data.data);
      } catch {
        if (!cancelled) setMessage({ type: "error", text: "ไม่สามารถโหลดข้อมูลได้" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const resetForm = () => {
    setName("");
    setLatitude("");
    setLongitude("");
    setRadiusMeters("200");
    setEditId(null);
    setShowForm(false);
    setMessage(null);
  };

  const handleEdit = (loc: OfficeLocation) => {
    setName(loc.name);
    setLatitude(String(loc.latitude));
    setLongitude(String(loc.longitude));
    setRadiusMeters(String(loc.radiusMeters));
    setEditId(loc.id);
    setShowForm(true);
    setMessage(null);
  };

  const handleSubmit = async () => {
    if (!name || !latitude || !longitude) {
      setMessage({ type: "error", text: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const url = editId ? `/api/office-locations/${editId}` : "/api/office-locations";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, latitude, longitude, radiusMeters }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: editId ? "แก้ไขสำเร็จ" : "เพิ่มสำเร็จ" });
        resetForm();
        fetchLocations();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch {
      setMessage({ type: "error", text: "เกิดข้อผิดพลาด" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("ต้องการลบตำแหน่งนี้?")) return;

    try {
      const res = await fetch(`/api/office-locations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchLocations();
      }
    } catch {
      setMessage({ type: "error", text: "ไม่สามารถลบได้" });
    }
  };

  const handleToggleActive = async (loc: OfficeLocation) => {
    try {
      const res = await fetch(`/api/office-locations/${loc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !loc.isActive }),
      });
      const data = await res.json();
      if (data.success) fetchLocations();
    } catch {
      setMessage({ type: "error", text: "ไม่สามารถอัพเดตได้" });
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "เบราว์เซอร์ไม่รองรับ GPS" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude));
        setLongitude(String(pos.coords.longitude));
        setMessage({ type: "success", text: "ดึงพิกัดปัจจุบันสำเร็จ" });
      },
      () => {
        setMessage({ type: "error", text: "ไม่สามารถดึงพิกัดได้" });
      }
    );
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-cream-dark rounded" />
        <div className="h-64 bg-cream-dark rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 gradient-gold rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-navy">ตั้งค่าตำแหน่งออฟฟิศ</h1>
            <p className="mt-0.5 text-sm text-navy/50">จัดการตำแหน่งอ้างอิงสำหรับเช็คอิน-ออก (รัศมี 200 เมตร)</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
        >
          {showForm ? "ยกเลิก" : "+ เพิ่มตำแหน่ง"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
          <h2 className="mb-4 text-lg font-semibold text-navy">
            {editId ? "แก้ไขตำแหน่ง" : "เพิ่มตำแหน่งใหม่"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-navy/70">ชื่อตำแหน่ง</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                placeholder="เช่น ออฟฟิศสาขากรุงเทพ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy/70">รัศมี (เมตร)</label>
              <input
                type="number"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                min="50"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy/70">ละติจูด</label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                placeholder="13.7563"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy/70">ลองจิจูด</label>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                placeholder="100.5018"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={useCurrentLocation}
              className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-2 text-sm font-medium text-gold-dark hover:bg-gold/10 transition-colors"
            >
              📍 ใช้พิกัดปัจจุบัน
            </button>
            {latitude && longitude && (
              <span className="text-sm text-navy/50">
                พิกัดปัจจุบัน: {parseFloat(latitude).toFixed(6)}, {parseFloat(longitude).toFixed(6)}
              </span>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg gradient-navy px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "เพิ่มตำแหน่ง"}
            </button>
            <button
              onClick={resetForm}
              className="rounded-lg border border-cream-dark px-4 py-2.5 text-sm font-medium text-navy/70 hover:bg-cream transition-colors"
            >
              ยกเลิก
            </button>
          </div>

          {message && (
            <div className={`mt-4 rounded-lg p-3 text-sm border ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}>
              {message.text}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
        <h2 className="mb-4 text-lg font-semibold text-navy">รายการตำแหน่งทั้งหมด ({locations.length})</h2>
        {locations.length === 0 ? (
          <p className="text-center text-navy/40 py-8">ยังไม่มีตำแหน่งที่ตั้ง</p>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => (
              <div key={loc.id} className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                loc.isActive ? "border-gold/30 bg-gold/5" : "border-cream-dark bg-gray-50"
              }`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy">{loc.name}</span>
                    {loc.isActive && (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        ใช้งาน
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-navy/50">
                    พิกัด: {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)} | รัศมี: {loc.radiusMeters} เมตร
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(loc)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      loc.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {loc.isActive ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                  </button>
                  <button
                    onClick={() => handleEdit(loc)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gold-dark hover:bg-gold/10 transition-colors"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(loc.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
