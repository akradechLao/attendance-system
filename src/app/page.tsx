export const dynamic = "force-dynamic";

import { getAllEmployees, getTodayAttendance, getSundayMissingAfternoon, getSaturdayShiftCount } from "@/lib/actions";
import { getUpcomingLeaves } from "@/lib/leave-actions";
import { getSaturdayDate, isTodaySunday } from "@/lib/business-rules";
import StatCard from "@/components/StatCard";
import AttendanceTable from "@/components/AttendanceTable";
import LeaveCard from "@/components/LeaveCard";

export default async function HRDashboard() {
  const [employees, todayAttendance, sundayMissing, satCount, upcomingLeaves] = await Promise.all([
    getAllEmployees(),
    getTodayAttendance(),
    getSundayMissingAfternoon(),
    getSaturdayShiftCount(getSaturdayDate()),
    getUpcomingLeaves(),
  ]);

  const lateCount = todayAttendance.filter((r) => r.status === "late").length;
  const checkedInCount = todayAttendance.length;
  const notCheckedIn = employees.length - checkedInCount;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 gradient-gold rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-navy">แดชบอร์ด HR</h1>
          <p className="mt-0.5 text-sm text-navy/50">ภาพรวมการเข้างานของพนักงาน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="พนักงานทั้งหมด"
          value={employees.length}
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          color="navy"
        />
        <StatCard
          title="เข้างานแล้ววันนี้"
          value={checkedInCount}
          subtitle={notCheckedIn > 0 ? `ยังไม่เช็คอิน ${notCheckedIn} คน` : "ครบทุกคน"}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="green"
        />
        <StatCard
          title="สายวันนี้"
          value={lateCount}
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          color="red"
        />
        <StatCard
          title="เวรวันเสาร์"
          value={satCount}
          subtitle={satCount < 3 ? `ต้องการอย่างน้อย 3 คน` : "ครบแล้ว"}
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          color={satCount < 3 ? "red" : "gold"}
        />
      </div>

      <AttendanceTable records={todayAttendance} title="สรุปการเข้างานวันนี้" />

      <LeaveCard leaves={upcomingLeaves} title="ลางานล่วงหน้า 7 วัน" />

      {satCount < 3 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-red-800">แจ้งเตือนเวรวันเสาร์</h3>
          <p className="mt-2 text-red-700">
            มีพนักงานเข้าเวรวันเสาร์เพียง <span className="font-bold">{satCount}</span> คน
            ต้องการอย่างน้อย 3 คน!
          </p>
        </div>
      )}

      {isTodaySunday() && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-red-800">
            แจ้งเตือน - ขาดการเช็คอินช่วงบ่ายวันอาทิตย์
          </h3>
          {sundayMissing.length === 0 ? (
            <p className="mt-2 text-red-700">ไม่มีข้อมูลการเช็คอินช่วงบ่ายวันอาทิตย์</p>
          ) : (
            <div className="mt-3 space-y-2">
              {sundayMissing.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-2 text-red-700"
                >
                  <span className="font-bold text-red-600">
                    {record.employee.name}
                  </span>
                  <span>(กลุ่ม {record.employee.groupType})</span>
                  <span>-</span>
                  <span>เช็คอินเวลา {record.checkIn}</span>
                  <span className="font-medium">แต่ยังไม่เช็คอินช่วงบ่ายหลัง 13:00</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lateCount > 0 && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gold-dark">พนักงานสายวันนี้</h3>
          <div className="mt-3 space-y-2">
            {todayAttendance
              .filter((r) => r.status === "late")
              .map((record) => (
                <div key={record.id} className="flex items-center gap-2 text-navy/70">
                  <span className="font-bold text-navy">{record.employee.name}</span>
                  <span className="text-navy/50">(กลุ่ม {record.employee.groupType})</span>
                  <span className="text-navy/30">-</span>
                  <span>เช็คอินเวลา {record.checkIn}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
