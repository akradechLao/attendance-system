import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { PDFDocument, rgb } = await import("pdf-lib");

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const empIdParam = searchParams.get("empId");
    const empId = empIdParam ? parseInt(empIdParam) : undefined;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const whereClause = empId ? { id: empId } : {};
    const employees = await prisma.employee.findMany({ where: whereClause, orderBy: { id: "asc" } });

    const records = await prisma.attendanceLog.findMany({
      where: {
        ...(empId ? { empId } : {}),
        date: { gte: startDate, lte: endDate },
      },
    });

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        ...(empId ? { empId } : {}),
        status: { not: "rejected" },
        OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
      },
    });

    let wfhRecords: { empId: number; date: string }[] = [];
    try {
      wfhRecords = await prisma.wfhRecord.findMany({
        where: {
          ...(empId ? { empId } : {}),
          date: { gte: startDate, lte: endDate },
          status: { not: "rejected" },
        },
      });
    } catch {
      wfhRecords = [];
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont("Helvetica");
    const fontBold = await pdfDoc.embedFont("Helvetica-Bold");

    const PAGE_WIDTH = 842;
    const PAGE_HEIGHT = 595;
    const MARGIN_TOP = 50;
    const MARGIN_BOTTOM = 50;
    const ROW_HEIGHT = 20;
    const HEADER_HEIGHT = 18;

    const allDates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0) {
        allDates.push(
          `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`
        );
      }
      current.setDate(current.getDate() + 1);
    }

    function addPage(): { page: ReturnType<typeof pdfDoc.addPage>; y: number } {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let y = PAGE_HEIGHT - MARGIN_TOP;

      page.drawText("Attendance Summary Report", {
        x: 50, y, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.3),
      });
      y -= 20;
      page.drawText(`${startDate} to ${endDate}${empId ? " (Individual)" : ""}`, {
        x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4),
      });
      y -= 25;

      const headers = ["No.", "Name", "Group", "Late", "Absent", "Leave", "WFH", "Work Days"];
      const colX = [50, 80, 230, 310, 360, 410, 460, 520];

      page.drawRectangle({
        x: 50, y: y - 5, width: PAGE_WIDTH - 100, height: HEADER_HEIGHT,
        color: rgb(0.15, 0.2, 0.35),
      });
      headers.forEach((h, i) => {
        page.drawText(h, {
          x: colX[i] + 4, y, size: 8, font: fontBold, color: rgb(1, 1, 1),
        });
      });
      y -= 25;

      return { page, y };
    }

    let { page, y } = addPage();
    const colX = [50, 80, 230, 310, 360, 410, 460, 520];

    employees.forEach((emp, idx) => {
      if (y < MARGIN_BOTTOM + ROW_HEIGHT) {
        ({ page, y } = addPage());
      }

      const empRecords = records.filter((r) => r.empId === emp.id);
      const empLeaves = leaves.filter((l) => l.empId === emp.id);
      const empWfh = wfhRecords.filter((w) => w.empId === emp.id);

      const lateDays = empRecords.filter((r) => r.status === "late").length;
      const attendedDates = new Set(empRecords.map((r) => r.date));
      const wfhDates = new Set(empWfh.map((w) => w.date));

      let absentDays = 0;
      for (const d of allDates) {
        if (!attendedDates.has(d) && !wfhDates.has(d)) {
          const isLeave = empLeaves.some((l) => l.startDate <= d && l.endDate >= d);
          if (!isLeave) absentDays++;
        }
      }

      const leaveDays = empLeaves.reduce((sum, l) => {
        const lStart = new Date(Math.max(new Date(l.startDate).getTime(), new Date(startDate).getTime()));
        const lEnd = new Date(Math.min(new Date(l.endDate).getTime(), new Date(endDate).getTime()));
        const diff = Math.ceil((lEnd.getTime() - lStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + Math.max(0, diff);
      }, 0);

      const wfhDays = empWfh.length;
      const workDays = allDates.length - absentDays - leaveDays;

      if (idx % 2 === 0) {
        page.drawRectangle({
          x: 50, y: y - 5, width: PAGE_WIDTH - 100, height: ROW_HEIGHT,
          color: rgb(0.95, 0.95, 0.97),
        });
      }

      const rowData = [
        String(idx + 1), emp.name, emp.groupType,
        String(lateDays), String(absentDays), String(leaveDays),
        String(wfhDays), String(workDays),
      ];
      rowData.forEach((text, i) => {
        page.drawText(text, {
          x: colX[i] + 4, y, size: 8, font, color: rgb(0.1, 0.1, 0.1),
        });
      });

      y -= ROW_HEIGHT;
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="attendance-report-${startDate}-to-${endDate}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
