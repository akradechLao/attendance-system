"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  getOnboardingRecord,
  completeOnboardingStep,
  updateOnboardingStatus,
  addOnboardingDocument,
  verifyOnboardingDocument,
  addOnboardingEquipment,
  returnOnboardingEquipment,
  addOnboardingTraining,
  completeOnboardingTraining,
} from "@/lib/actions";
import {
  ONBOARDING_STEPS,
  ONBOARDING_DOC_TYPES,
  ONBOARDING_EQUIPMENT_TYPES,
  ONBOARDING_STATUS,
  ONBOARDING_DOC_STATUS,
} from "@/lib/onboarding-constants";

interface OnboardingRecord {
  id: number;
  empId: number;
  status: string;
  startDate: string;
  endDate: string | null;
  employee: { id: number; name: string; groupType: string };
  steps: { id: number; stepOrder: number; stepKey: string; stepLabel: string; isCompleted: boolean; completedAt: Date | null; completedBy: string | null }[];
  documents: { id: number; docType: string; docLabel: string; status: string; fileUrl: string | null; fileName: string | null; verifiedAt: Date | null; verifiedBy: string | null }[];
  equipment: { id: number; equipType: string; equipName: string; serialNumber: string | null; notes: string | null; assignedAt: Date | null; returnedAt: Date | null }[];
  training: { id: number; trainingName: string; trainer: string | null; scheduledDate: string | null; completedDate: string | null; status: string }[];
}

export default function OnboardingDetailPage({ params }: { params: Promise<{ empId: string }> }) {
  const { empId } = use(params);
  const router = useRouter();
  const [record, setRecord] = useState<OnboardingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("steps");
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [showAddEquip, setShowAddEquip] = useState(false);
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [newDoc, setNewDoc] = useState({ docType: "", docLabel: "" });
  const [newEquip, setNewEquip] = useState({ equipType: "", equipName: "", serialNumber: "", notes: "" });
  const [newTraining, setNewTraining] = useState({ trainingName: "", trainer: "", scheduledDate: "" });

  useEffect(() => {
    loadData();
  }, [empId]);

  async function loadData() {
    setLoading(true);
    const data = await getOnboardingRecord(Number(empId));
    setRecord(data as OnboardingRecord | null);
    setLoading(false);
  }

  async function handleCompleteStep(stepKey: string) {
    const result = await completeOnboardingStep(Number(empId), stepKey, "Admin");
    if (result.success) loadData();
  }

  async function handleAddDocument() {
    if (!newDoc.docType || !newDoc.docLabel) return;
    const result = await addOnboardingDocument(Number(empId), newDoc.docType, newDoc.docLabel);
    if (result.success) {
      setShowAddDoc(false);
      setNewDoc({ docType: "", docLabel: "" });
      loadData();
    }
  }

  async function handleVerifyDocument(docId: number, status: "verified" | "rejected") {
    const result = await verifyOnboardingDocument(docId, status, "Admin");
    if (result.success) loadData();
  }

  async function handleAddEquipment() {
    if (!newEquip.equipType || !newEquip.equipName) return;
    const result = await addOnboardingEquipment(
      Number(empId),
      newEquip.equipType,
      newEquip.equipName,
      newEquip.serialNumber || undefined,
      newEquip.notes || undefined
    );
    if (result.success) {
      setShowAddEquip(false);
      setNewEquip({ equipType: "", equipName: "", serialNumber: "", notes: "" });
      loadData();
    }
  }

  async function handleReturnEquipment(equipId: number) {
    const result = await returnOnboardingEquipment(equipId);
    if (result.success) loadData();
  }

  async function handleAddTraining() {
    if (!newTraining.trainingName) return;
    const result = await addOnboardingTraining(
      Number(empId),
      newTraining.trainingName,
      newTraining.trainer || undefined,
      newTraining.scheduledDate || undefined
    );
    if (result.success) {
      setShowAddTraining(false);
      setNewTraining({ trainingName: "", trainer: "", scheduledDate: "" });
      loadData();
    }
  }

  async function handleCompleteTraining(trainingId: number) {
    const result = await completeOnboardingTraining(trainingId);
    if (result.success) loadData();
  }

  async function handleStatusChange(status: "in_progress" | "completed" | "on_hold") {
    const result = await updateOnboardingStatus(Number(empId), status);
    if (result.success) loadData();
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>;
  }

  if (!record) {
    return <div className="text-center py-12 text-gray-400">ไม่พบข้อมูล Onboarding</div>;
  }

  const completedSteps = record.steps.filter((s) => s.isCompleted).length;
  const totalSteps = record.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const statusInfo = ONBOARDING_STATUS[record.status] || ONBOARDING_STATUS.in_progress;

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => router.push("/onboarding")}
        className="mb-6 text-gray-500 hover:text-navy flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        กลับ
      </button>

      <div className="rounded-2xl bg-white shadow-card overflow-hidden mb-6">
        <div className="gradient-navy p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{record.employee.name}</h1>
              <p className="text-white/70 mt-1">กลุ่ม {record.employee.groupType} | เริ่ม {record.startDate}</p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <select
                value={record.status}
                onChange={(e) => handleStatusChange(e.target.value as "in_progress" | "completed" | "on_hold")}
                className="rounded-lg bg-white/10 border border-white/20 px-3 py-1 text-white text-sm"
              >
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="completed">เสร็จสมบูรณ์</option>
                <option value="on_hold">ระงับชั่วคราว</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>ความคืบหน้า</span>
              <span>{completedSteps}/{totalSteps} ขั้นตอน ({progress}%)</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progress === 100 ? "bg-green-400" : "bg-gold"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: "steps", label: "ขั้นตอน" },
          { key: "documents", label: "เอกสาร" },
          { key: "equipment", label: "อุปกรณ์" },
          { key: "training", label: "ฝึกอบรม" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "gradient-navy text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "steps" && (
        <div className="space-y-3">
          {ONBOARDING_STEPS.map((step, idx) => {
            const stepData = record.steps.find((s) => s.stepKey === step.key);
            const isCompleted = stepData?.isCompleted || false;
            return (
              <div
                key={step.key}
                className={`rounded-xl p-4 flex items-center gap-4 transition-all ${
                  isCompleted ? "bg-green-50 border border-green-200" : "bg-white shadow-card"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="font-bold">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-navy">{step.label}</div>
                  {stepData?.completedAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      เสร็จเมื่อ {new Date(stepData.completedAt).toLocaleDateString("th-TH")}
                      {stepData.completedBy && ` โดย ${stepData.completedBy}`}
                    </div>
                  )}
                </div>
                {!isCompleted && (
                  <button
                    onClick={() => handleCompleteStep(step.key)}
                    className="px-4 py-2 rounded-lg gradient-gold text-navy text-sm font-medium hover:opacity-90"
                  >
                    เสร็จ
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "documents" && (
        <div className="bg-white rounded-xl shadow-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-bold text-navy">เอกสาร</h3>
            <button
              onClick={() => setShowAddDoc(true)}
              className="px-3 py-1.5 rounded-lg gradient-gold text-navy text-sm font-medium hover:opacity-90"
            >
              + เพิ่มเอกสาร
            </button>
          </div>
          <div className="p-4">
            {record.documents.length === 0 ? (
              <div className="text-center py-8 text-gray-400">ยังไม่มีเอกสาร</div>
            ) : (
              <div className="space-y-3">
                {record.documents.map((doc) => {
                  const docStatus = ONBOARDING_DOC_STATUS[doc.status] || ONBOARDING_DOC_STATUS.pending;
                  return (
                    <div key={doc.id} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="font-medium">{doc.docLabel}</div>
                        {doc.fileName && (
                          <div className="text-xs text-gray-500 mt-1">{doc.fileName}</div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${docStatus.color}`}>
                        {docStatus.label}
                      </span>
                      {doc.status === "submitted" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyDocument(doc.id, "verified")}
                            className="px-3 py-1 rounded bg-green-500 text-white text-xs hover:bg-green-600"
                          >
                            ผ่าน
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(doc.id, "rejected")}
                            className="px-3 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600"
                          >
                            ไม่ผ่าน
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "equipment" && (
        <div className="bg-white rounded-xl shadow-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-bold text-navy">อุปกรณ์</h3>
            <button
              onClick={() => setShowAddEquip(true)}
              className="px-3 py-1.5 rounded-lg gradient-gold text-navy text-sm font-medium hover:opacity-90"
            >
              + เพิ่มอุปกรณ์
            </button>
          </div>
          <div className="p-4">
            {record.equipment.length === 0 ? (
              <div className="text-center py-8 text-gray-400">ยังไม่มีอุปกรณ์</div>
            ) : (
              <div className="space-y-3">
                {record.equipment.map((equip) => {
                  const equipType = ONBOARDING_EQUIPMENT_TYPES.find((t) => t.key === equip.equipType);
                  return (
                    <div key={equip.id} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{equip.equipName}</div>
                        <div className="text-xs text-gray-500">
                          {equipType?.label}
                          {equip.serialNumber && ` | SN: ${equip.serialNumber}`}
                        </div>
                      </div>
                      {equip.returnedAt ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">คืนแล้ว</span>
                      ) : (
                        <button
                          onClick={() => handleReturnEquipment(equip.id)}
                          className="px-3 py-1 rounded bg-orange-500 text-white text-xs hover:bg-orange-600"
                        >
                          คืน
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "training" && (
        <div className="bg-white rounded-xl shadow-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-bold text-navy">ฝึกอบรม</h3>
            <button
              onClick={() => setShowAddTraining(true)}
              className="px-3 py-1.5 rounded-lg gradient-gold text-navy text-sm font-medium hover:opacity-90"
            >
              + เพิ่มหลักสูตร
            </button>
          </div>
          <div className="p-4">
            {record.training.length === 0 ? (
              <div className="text-center py-8 text-gray-400">ยังไม่มีหลักสูตรฝึกอบรม</div>
            ) : (
              <div className="space-y-3">
                {record.training.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{t.trainingName}</div>
                      <div className="text-xs text-gray-500">
                        {t.trainer && `ผู้สอน: ${t.trainer}`}
                        {t.scheduledDate && ` | วันที่: ${t.scheduledDate}`}
                      </div>
                    </div>
                    {t.status === "completed" ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">เสร็จแล้ว</span>
                    ) : (
                      <button
                        onClick={() => handleCompleteTraining(t.id)}
                        className="px-3 py-1 rounded bg-green-500 text-white text-xs hover:bg-green-600"
                      >
                        เสร็จ
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-navy mb-4">เพิ่มเอกสาร</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทเอกสาร</label>
                <select
                  value={newDoc.docType}
                  onChange={(e) => {
                    const type = ONBOARDING_DOC_TYPES.find((t) => t.key === e.target.value);
                    setNewDoc({ docType: e.target.value, docLabel: type?.label || "" });
                  }}
                  className="w-full rounded-lg border px-4 py-2"
                >
                  <option value="">-- เลือก --</option>
                  {ONBOARDING_DOC_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddDoc(false)} className="flex-1 px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50">ยกเลิก</button>
                <button onClick={handleAddDocument} disabled={!newDoc.docType} className="flex-1 px-4 py-2 rounded-lg gradient-gold text-navy font-medium hover:opacity-90 disabled:opacity-50">เพิ่ม</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddEquip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-navy mb-4">เพิ่มอุปกรณ์</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทอุปกรณ์</label>
                <select
                  value={newEquip.equipType}
                  onChange={(e) => {
                    const type = ONBOARDING_EQUIPMENT_TYPES.find((t) => t.key === e.target.value);
                    setNewEquip({ ...newEquip, equipType: e.target.value, equipName: type?.label || "" });
                  }}
                  className="w-full rounded-lg border px-4 py-2"
                >
                  <option value="">-- เลือก --</option>
                  {ONBOARDING_EQUIPMENT_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={newEquip.serialNumber}
                  onChange={(e) => setNewEquip({ ...newEquip, serialNumber: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2"
                  placeholder="ถ้ามี"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddEquip(false)} className="flex-1 px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50">ยกเลิก</button>
                <button onClick={handleAddEquipment} disabled={!newEquip.equipType} className="flex-1 px-4 py-2 rounded-lg gradient-gold text-navy font-medium hover:opacity-90 disabled:opacity-50">เพิ่ม</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddTraining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-navy mb-4">เพิ่มหลักสูตรฝึกอบรม</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหลักสูตร</label>
                <input
                  type="text"
                  value={newTraining.trainingName}
                  onChange={(e) => setNewTraining({ ...newTraining, trainingName: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้สอน</label>
                <input
                  type="text"
                  value={newTraining.trainer}
                  onChange={(e) => setNewTraining({ ...newTraining, trainer: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่กำหนด</label>
                <input
                  type="date"
                  value={newTraining.scheduledDate}
                  onChange={(e) => setNewTraining({ ...newTraining, scheduledDate: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddTraining(false)} className="flex-1 px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50">ยกเลิก</button>
                <button onClick={handleAddTraining} disabled={!newTraining.trainingName} className="flex-1 px-4 py-2 rounded-lg gradient-gold text-navy font-medium hover:opacity-90 disabled:opacity-50">เพิ่ม</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
