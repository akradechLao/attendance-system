"use client";

import { LeaveRecord } from "@/lib/leave-actions";
import { LEAVE_TYPES } from "@/lib/leave-constants";

interface LeaveCardProps {
  leaves: LeaveRecord[];
  title: string;
}

function formatDateRange(start: string, end: string): string {
  if (start === end) return formatSingleDate(start);
  return `${formatSingleDate(start)} - ${formatSingleDate(end)}`;
}

function formatSingleDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function daysLeft(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function LeaveCard({ leaves, title }: LeaveCardProps) {
  if (leaves.length === 0) {
    return (
      <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
        <h3 className="text-lg font-semibold text-navy">{title}</h3>
        <p className="mt-4 text-center text-navy/40">ไม่มีลางานในช่วงนี้</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
      <h3 className="text-lg font-semibold text-navy">{title}</h3>
      <div className="mt-4 space-y-3">
        {leaves.map((leave) => {
          const typeInfo = LEAVE_TYPES[leave.leaveType] || { label: leave.leaveType, color: "bg-gray-100 text-gray-800" };
          const days = daysLeft(leave.endDate);
          return (
            <div key={leave.id} className="flex items-start gap-3 rounded-lg border border-cream-dark p-3 hover:bg-cream/50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy">{leave.employee.name}</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-navy/60">
                  {formatDateRange(leave.startDate, leave.endDate)}
                  {days >= 0 && (
                    <span className="ml-2 text-gold-dark font-medium">
                      {days === 0 ? "(วันนี้)" : `(อีก ${days} วัน)`}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-navy/50">เหตุผล: {leave.reason}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
