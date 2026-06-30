"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { checkIn, checkOut, getAllEmployees, getTodayAttendance, getEmployeeWeeklyStats } from "@/lib/actions";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getPhotoSrc } from "@/lib/photo-utils";

interface Employee {
  id: number;
  name: string;
  groupType: "A" | "B";
  wfhQuota: number;
  preferredOffDay: string | null;
}

interface AttendanceRecord {
  id: number;
  checkIn: string | null;
  checkInPhoto: string | null;
  checkOut: string | null;
  checkOutPhoto: string | null;
  status: "late" | "on_time" | null;
  latLong: string | null;
  date: string;
  employee: {
    id: number;
    name: string;
    groupType: "A" | "B";
  };
}

export default function EmployeePortal() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"checkin" | "checkout" | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showWeeklyHistory, setShowWeeklyHistory] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<{
    days: { date: string; dayName: string; checkIn: string | null; checkOut: string | null; status: string; workHours: number | null }[];
    lateDays: number;
    onTimeDays: number;
    absentDays: number;
    workHours: number;
  } | null>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { latitude, longitude, error: geoError, getLocation } = useGeolocation();

  useEffect(() => {
    getAllEmployees().then(setEmployees).catch(() => {});
    getTodayAttendance().then(setTodayRecords).catch(() => {});
  }, []);

  useEffect(() => {
    if (showCamera && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showCamera]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setMessage({ type: "error", text: "ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง" });
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.6);
  }, []);

  const uploadPhoto = async (dataUrl: string, type: string, empId: number): Promise<string | null> => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${type}.jpg`, { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("photo", file);
      formData.append("type", type);
      formData.append("empId", String(empId));

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await uploadRes.json();

      if (data.success) return data.imageUrl;
      console.error("Upload failed:", data.error);
      return null;
    } catch (err) {
      console.error("Upload error:", err);
      return null;
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedEmpId || !confirmAction) return;

    setConfirmAction(null);
    setLoading(true);
    setMessage(null);
    setDistanceInfo(null);

    const { latLong } = await getLocation();
    const finalLatLong = latLong || "GPS not available";

    let photoUrl: string | undefined;
    let photoFailed = false;
    if (capturedPhoto) {
      const uploaded = await uploadPhoto(capturedPhoto, confirmAction, selectedEmpId);
      if (uploaded) {
        photoUrl = uploaded;
      } else {
        photoFailed = true;
      }
    }

    stopCamera();
    setCapturedPhoto(null);

    const result = confirmAction === "checkin"
      ? await checkIn(selectedEmpId, finalLatLong, photoUrl)
      : await checkOut(selectedEmpId, finalLatLong, photoUrl);

    const warningText = photoFailed ? " (รูปถ่ายไม่สำเร็จ)" : "";
    setMessage({ type: result.success ? "success" : "error", text: result.message + warningText });
    if (result.distanceInfo) setDistanceInfo(result.distanceInfo);
    setLoading(false);

    if (result.success) {
      getTodayAttendance().then(setTodayRecords);
    }
  };

  const openConfirmDialog = (action: "checkin" | "checkout") => {
    setCapturedPhoto(null);
    setConfirmAction(action);
    setShowCamera(true);
    startCamera();
  };

  const handleCancel = () => {
    setConfirmAction(null);
    setCapturedPhoto(null);
    stopCamera();
  };

  const handleShowWeeklyHistory = async () => {
    if (!selectedEmpId) return;
    setLoadingWeekly(true);
    setShowWeeklyHistory(true);
    try {
      const data = await getEmployeeWeeklyStats(selectedEmpId);
      if (data) {
        setWeeklyStats({
          days: data.days,
          lateDays: data.lateDays,
          onTimeDays: data.onTimeDays,
          absentDays: data.absentDays,
          workHours: data.workHours,
        });
      }
    } catch {
    } finally {
      setLoadingWeekly(false);
    }
  };

  const myTodayRecord = todayRecords.find((r) => r.employee.id === selectedEmpId);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 gradient-gold rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-navy">เช็คอิน - ออกงาน</h1>
          <p className="mt-0.5 text-sm text-navy/50">บันทึกเวลาเข้า-ออกงานพร้อมยืนยันตัวตนด้วยภาพและ GPS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
          <h2 className="mb-4 text-lg font-semibold text-navy">เลือกพนักงาน</h2>
          <select
            className="w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
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

          {selectedEmployee && (
            <div className="mt-4 rounded-lg gradient-gold-subtle p-4 border border-gold/20">
              <p className="text-sm text-navy/70">
                <span className="font-semibold text-navy">เวลาทำงาน:</span>{" "}
                {selectedEmployee.groupType === "A"
                  ? "08:00 - 17:00 (จันทร์-ศุกร์)"
                  : "07:00 - 16:00, OT 17:00-20:00"}
              </p>
              {selectedEmployee.groupType === "B" && selectedEmployee.preferredOffDay && (
                <p className="mt-1 text-sm text-navy/70">
                  <span className="font-semibold text-navy">วันหยุด:</span> {selectedEmployee.preferredOffDay}
                </p>
              )}
            </div>
          )}

          {geoError && (
            <div className="mt-4 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700 border border-yellow-200">
              GPS Error: {geoError}
            </div>
          )}

          {latitude && longitude && (
            <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">
              ตำแหน่ง GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          )}

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => openConfirmDialog("checkin")}
              disabled={!selectedEmpId || loading}
              className="flex-1 rounded-lg bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-green-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "กำลังดำเนินการ..." : "เช็คอิน"}
            </button>
            <button
              onClick={() => openConfirmDialog("checkout")}
              disabled={!selectedEmpId || loading}
              className="flex-1 rounded-lg gradient-navy px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "กำลังดำเนินการ..." : "เช็คออก"}
            </button>
          </div>

          {selectedEmpId && (
            <button
              onClick={handleShowWeeklyHistory}
              className="mt-3 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-sm font-medium text-navy/70 hover:bg-cream transition-colors flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              ดูประวัติสัปดาห์นี้
            </button>
          )}

          {message && (
            <div
              className={`mt-4 rounded-lg p-4 text-sm font-medium border ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {distanceInfo && (
            <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-700 border border-blue-200">
              {distanceInfo}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
          <h2 className="mb-4 text-lg font-semibold text-navy">บันทึกวันนี้</h2>
          {myTodayRecord ? (
            <div className="space-y-3">
              <div className="flex justify-between border-b border-cream-dark py-2">
                <span className="text-sm text-navy/50">เข้างาน</span>
                <span className="font-medium text-navy">{myTodayRecord.checkIn || "-"}</span>
              </div>
              {myTodayRecord.checkInPhoto && (
                <div className="border-b border-cream-dark py-2">
                  <span className="text-sm text-navy/50">ภาพเช็คอิน</span>
                  <img
                    src={getPhotoSrc(myTodayRecord.checkInPhoto)}
                    alt="Check-in photo"
                    className="mt-2 h-24 w-32 rounded-lg object-cover border border-cream-dark"
                  />
                </div>
              )}
              <div className="flex justify-between border-b border-cream-dark py-2">
                <span className="text-sm text-navy/50">ออกงาน</span>
                <span className="font-medium text-navy">{myTodayRecord.checkOut || "-"}</span>
              </div>
              {myTodayRecord.checkOutPhoto && (
                <div className="border-b border-cream-dark py-2">
                  <span className="text-sm text-navy/50">ภาพเช็คออก</span>
                  <img
                    src={getPhotoSrc(myTodayRecord.checkOutPhoto)}
                    alt="Check-out photo"
                    className="mt-2 h-24 w-32 rounded-lg object-cover border border-cream-dark"
                  />
                </div>
              )}
              <div className="flex justify-between border-b border-cream-dark py-2">
                <span className="text-sm text-navy/50">สถานะ</span>
                <span
                  className={`font-medium ${
                    myTodayRecord.status === "late" ? "text-red-600" : myTodayRecord.status === "on_time" ? "text-green-600" : "text-navy/30"
                  }`}
                >
                  {myTodayRecord.status === "late" ? "สาย" : myTodayRecord.status === "on_time" ? "ตรงเวลา" : "-"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-navy/50">GPS</span>
                <span className="max-w-[200px] truncate font-medium text-navy">
                  {myTodayRecord.latLong || "-"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-center text-navy/40 py-8">ยังไม่มีบันทึกวันนี้</p>
          )}
        </div>
      </div>

      {/* Camera & Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-cream-dark bg-white p-6 shadow-navy">
            <div className="text-center">
              <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                confirmAction === "checkin" ? "bg-green-50" : "bg-navy/10"
              }`}>
                <svg className={`h-8 w-8 ${confirmAction === "checkin" ? "text-green-600" : "text-navy"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-navy">
                {confirmAction === "checkin" ? "ยืนยันเช็คอิน?" : "ยืนยันเช็คออก?"}
              </h3>
              <p className="mt-2 text-sm text-navy/60">
                {selectedEmployee && `${selectedEmployee.name} `}
                {confirmAction === "checkin" ? "กรุณาถ่ายภาพเพื่อยืนยันตัวตน" : "กรุณาถ่ายภาพเพื่อยืนยันตัวตน"}
              </p>

              {/* Camera Section */}
              <div className="mt-4">
                {!showCamera && !capturedPhoto && (
                  <button
                    onClick={startCamera}
                    className="mx-auto flex items-center gap-2 rounded-lg border border-cream-dark bg-cream px-4 py-2 text-sm text-navy hover:bg-cream-dark transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    เปิดกล้อง
                  </button>
                )}

                {showCamera && !capturedPhoto && (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="mx-auto h-40 w-full max-w-xs rounded-lg object-cover border-2 border-cream-dark sm:h-48 sm:max-w-sm"
                      style={{ transform: "scaleX(-1)" }}
                    />
                    <button
                      onClick={() => {
                        const photo = capturePhoto();
                        if (photo) {
                          setCapturedPhoto(photo);
                          stopCamera();
                        }
                      }}
                      className="mt-3 mx-auto flex items-center gap-2 rounded-full bg-red-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-red-600 transition-colors"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      ถ่ายภาพ
                    </button>
                  </div>
                )}

                {capturedPhoto && (
                  <div className="relative inline-block">
                    <img
                      src={capturedPhoto}
                      alt="Captured"
                      className="mx-auto h-40 w-full max-w-xs rounded-lg object-cover border-2 border-green-400 sm:h-48 sm:max-w-sm"
                    />
                    <div className="absolute top-2 right-2 rounded-full bg-green-500 p-1">
                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <button
                      onClick={() => {
                        setCapturedPhoto(null);
                        setShowCamera(true);
                        startCamera();
                      }}
                      className="mt-2 mx-auto flex items-center gap-1 text-xs text-navy/50 hover:text-navy transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      ถ่ายใหม่
                    </button>
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 rounded-lg border border-cream-dark px-4 py-2.5 text-sm font-medium text-navy/70 hover:bg-cream transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={!capturedPhoto}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                    confirmAction === "checkin"
                      ? "bg-green-600 hover:bg-green-700"
                      : "gradient-navy hover:shadow-md"
                  }`}
                >
                  ยืนยัน
                </button>
              </div>
              {!capturedPhoto && (
                <p className="mt-2 text-xs text-navy/40">กรุณาถ่ายภาพก่อนกดยืนยัน</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekly History Modal */}
      {showWeeklyHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-cream-dark bg-white shadow-navy max-h-[90vh] overflow-hidden flex flex-col">
            <div className="gradient-navy px-5 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-semibold text-white">สรุปการเข้างานสัปดาห์นี้</h3>
              <button
                onClick={() => { setShowWeeklyHistory(false); setWeeklyStats(null); }}
                className="rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/30 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {loadingWeekly ? (
                <div className="text-center py-8 text-navy/40">กำลังโหลด...</div>
              ) : weeklyStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                      <div className="text-xl font-bold text-green-600">{weeklyStats.onTimeDays}</div>
                      <div className="text-[10px] text-green-500">ตรงเวลา</div>
                    </div>
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
                      <div className="text-xl font-bold text-red-600">{weeklyStats.lateDays}</div>
                      <div className="text-[10px] text-red-500">สาย</div>
                    </div>
                    <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-center">
                      <div className="text-xl font-bold text-orange-600">{weeklyStats.absentDays}</div>
                      <div className="text-[10px] text-orange-500">ขาด</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
                      <div className="text-xl font-bold text-blue-600">{weeklyStats.workHours}</div>
                      <div className="text-[10px] text-blue-500">ชม.รวม</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-cream-dark">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-navy/60">วัน</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-navy/60">เข้า</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-navy/60">ออก</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-navy/60">ชม.</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-navy/60">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyStats.days.map((day) => (
                          <tr key={day.date} className="border-b border-cream-dark/50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-navy">{day.dayName}</div>
                              <div className="text-[10px] text-navy/40">{day.date}</div>
                            </td>
                            <td className="px-3 py-2 text-center text-navy/70">{day.checkIn || "-"}</td>
                            <td className="px-3 py-2 text-center text-navy/70">{day.checkOut || "-"}</td>
                            <td className="px-3 py-2 text-center text-navy/70">{day.workHours || "-"}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                day.status === "ตรงเวลา" ? "bg-green-100 text-green-800" :
                                day.status === "สาย" ? "bg-red-100 text-red-800" :
                                day.status === "WFH" ? "bg-blue-100 text-blue-800" :
                                day.status === "ลา" ? "bg-purple-100 text-purple-800" :
                                day.status === "ขาด" ? "bg-orange-100 text-orange-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {day.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-navy/40">ไม่มีข้อมูล</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
