import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const locations = await prisma.officeLocation.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: locations });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, latitude, longitude, radiusMeters } = body;

    if (!name || latitude == null || longitude == null) {
      return NextResponse.json(
        { success: false, message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" },
        { status: 400 }
      );
    }

    const location = await prisma.officeLocation.create({
      data: {
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: radiusMeters ? parseInt(radiusMeters) : 200,
      },
    });

    return NextResponse.json({ success: true, data: location });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
