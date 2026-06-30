import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/app/api/auth";

export async function GET(request: NextRequest) {
  const authError = verifyApiKey(request);
  if (authError) return authError;

  try {
    const employees = await prisma.employee.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        groupType: true,
        wfhQuota: true,
        preferredOffDay: true,
      },
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
