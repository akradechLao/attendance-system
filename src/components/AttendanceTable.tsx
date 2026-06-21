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

interface AttendanceTableProps {
  records: AttendanceRecord[];
  title: string;
}

function calcWorkHours(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "-";
  const [inH, inM, inS] = checkIn.split(":").map(Number);
  const [outH, outM, outS] = checkOut.split(":").map(Number);
  const totalSec = (outH * 3600 + outM * 60 + outS) - (inH * 3600 + inM * 60 + inS);
  if (totalSec < 0) return "-";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  return `${hours} ชม. ${minutes} น.`;
}

export default function AttendanceTable({
  records,
  title,
}: AttendanceTableProps) {
  return (
    <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
      <div className="gradient-navy px-6 py-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-dark bg-cream">
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-navy/70">
                ชื่อ
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-navy/70">
                กลุ่ม
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-navy/70">
                เข้างาน
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-navy/70">
                ภาพเข้า
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-navy/70">
                ออกงาน
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-navy/70">
                ภาพออก
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-navy/70">
                ชั่วโมงทำงาน
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-navy/70">
                สถานะ
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-navy/70">
                GPS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-dark">
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-navy/40">
                  ยังไม่มีข้อมูล
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-cream/50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="font-medium text-navy">{record.employee.name}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        record.employee.groupType === "A"
                          ? "bg-navy/10 text-navy"
                          : "bg-gold/20 text-gold-dark"
                      }`}
                    >
                      {record.employee.groupType}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-navy/80">
                    {record.checkIn || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {record.checkInPhoto ? (
                      <img
                        src={record.checkInPhoto}
                        alt="Check-in"
                        className="h-10 w-10 rounded-lg object-cover border border-cream-dark"
                      />
                    ) : (
                      <span className="text-navy/30">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-navy/80">
                    {record.checkOut || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {record.checkOutPhoto ? (
                      <img
                        src={record.checkOutPhoto}
                        alt="Check-out"
                        className="h-10 w-10 rounded-lg object-cover border border-cream-dark"
                      />
                    ) : (
                      <span className="text-navy/30">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gold-dark">
                    {calcWorkHours(record.checkIn, record.checkOut)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        record.status === "late"
                          ? "bg-red-100 text-red-800"
                          : record.status === "on_time"
                          ? "bg-green-100 text-green-800"
                          : "bg-cream-dark text-navy/40"
                      }`}
                    >
                      {record.status === "late" ? "สาย" : record.status === "on_time" ? "ตรงเวลา" : "-"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-navy/50">
                    {record.latLong ? (
                      <span className="max-w-[120px] truncate block" title={record.latLong}>
                        {record.latLong}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
