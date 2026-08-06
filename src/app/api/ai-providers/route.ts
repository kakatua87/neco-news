import { NextResponse } from "next/server";

export async function GET() {
  try {
    const SCRAPER_URL = process.env.SCRAPER_URL || "https://neco-news-scraper.onrender.com";
    const res = await fetch(`${SCRAPER_URL}/ai-providers`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error("Error proxying to scraper:", error);
    return NextResponse.json({ providers: [] }, { status: 500 });
  }
}
