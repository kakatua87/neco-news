import { NextResponse } from "next/server";
import { hayySesionValida } from "@/lib/auth";

export async function GET() {
  if (!(await hayySesionValida())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const SCRAPER_URL = process.env.SCRAPER_URL || "https://neco-news-scraper.onrender.com";
    const res = await fetch(`${SCRAPER_URL}/ai-providers`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}` },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error("Error proxying to scraper:", error);
    return NextResponse.json({ providers: [] }, { status: 500 });
  }
}
