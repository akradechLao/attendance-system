"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getOnboardingRecords,
  getOnboardingStats,
  createOnboarding,
  deleteOnboarding,
  getAllEmployees,
} from "@/lib/actions";
import { ONBOARDING_STATUS } from "@/lib/onboarding-constants";

interface OnboardingRecord {
  id: number;
  empId: number;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: Date;
  employee: { id: number; name: string; groupType: string };
  steps: { isCompleted: boolean }[];
  documents: { status: string }[];
  equipment: { returnedAt: Date | null }[];
  training: { status: string }[];
}

interface OnboardingStats {
  total: number;
  inProgress: number;
  completed: number;
  onHold: number;
}

interface Employee {
  id: number;
  name: string;
  groupType: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [stats, setStats] = useState<OnboardingStats>({ total: 0, inProgress: 0, completed: 0, onHold: 0 });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [recordsData, statsData, employeesData] = await Promise.all([
      getOnboardingRecords(),
      getOnboardingStats(),
      getAllEmployees(),
    ]);
    setRecords(recordsData as OnboardingRecord[]);
    setStats(statsData);
    setEmployees(employeesData);
    setLoading(false);
  }

  async function handleAdd() {
    if (!selectedEmpId || !startDate) return;
    setSaving(true);
    const result = await createOnboarding(selectedEmpId, startDate);
    setSaving(false);
    if (result.success) {
      setShowAddModal(false);
      setSelectedEmpId(0);
      setStartDate("");
      loadData();
    } else {
      alert(result.message);
    }
  }

  async function handleDelete(empId: number) {
    if (!confirm("ต้องการลบข้อมูล Onboarding นี้?")) return;
    const result = await deleteOnboarding(empId);
    if (result.success) loadData();
  }

  function getStepProgress(steps: { isCompleted: boolean }[]) {
    if (steps.length === 0) return 0;
    const completed = steps.filter((s) => s.isCompleted).length;
    return Math.round((completed / steps.length) * 100);
  }

  const filteredRecords = records.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const availableEmployees = employees.filter(
    (emp) => !records.some((r) => r.empId === emp.id)
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Onboarding</h1>
        <p className="mt-2 text-gray-600">จัดการข้อมูลพนักงานใหม่</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-white p-6 shadow-card">
          <div className="text-3xl font-bold text-navy">{stats.total}</div>
          <div className="text-sm text-gray-500">ทั้งหมด</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-card">
          <div className="text-3xl font-bold text-yellow-600">{stats.inProgress}</div>
          <div className="text-sm text-gray-500">กำลังดำเนินการ</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-card">
          <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-500">เสร็จสมบูรณ์</div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-card">
          <div className="text-3xl font-bold text-gray-600">{stats.onHold}</div>
          <div className="text-sm text-gray-500">ระงับชั่วคราว</div>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b">
          <div className="flex gap-2 mb-4 sm:mb-0">
            {["all", "in_progress", "completed", "on_hold"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? "gradient-navy text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "ทั้งหมด" : ONBOARDING_STATUS[f]?.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg gradient-gold text-navy font-medium hover:opacity-90 transition-opacity"
          >
            + เพิ่มพนักงานใหม่
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400">ไม่มีข้อมูล</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">พนักงาน</th>
                    <th className="pb-3 font-medium">กลุ่ม</th>
                    <th className="pb-3 font-medium">สถานะ</th>
                    <th className="pb-3 font-medium">ความคืบหน้า</th>
                    <th className="pb-3 font-medium">วันที่เริ่ม</th>
                    <th className="pb-3 font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => {
                    const progress = getStepProgress(record.steps);
                    const statusInfo = ONBOARDING_STATUS[record.status] || ONBOARDING_STATUS.in_progress;
                    return (
                      <tr
                        key={record.id}
                        className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/onboarding/${record.empId}`)}
                      >
                        <td className="py-4">
                          <div className="font-medium text-navy">{record.employee.name}</div>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            record.employee.groupType === "A" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                          }`}>
                            กลุ่ม {record.employee.groupType}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  progress === 100 ? "bg-green-500" : "bg-gold"
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-600">{progress}%</span>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-gray-600">{record.startDate}</td>
                        <td className="py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(record.empId);
                            }}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-navy mb-4">เพิ่มพนักงานใหม่เข้า Onboarding</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลือกพนักงาน</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                  className="w-full rounded-lg border px-4 py-2"
                >
                  <option value={0}>-- เลือกพนักงาน --</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} (กลุ่ม {emp.groupType})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่ม</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!selectedEmpId || !startDate || saving}
                  className="flex-1 px-4 py-2 rounded-lg gradient-gold text-navy font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "กำลังบันทึก..." : "เพิ่ม"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
