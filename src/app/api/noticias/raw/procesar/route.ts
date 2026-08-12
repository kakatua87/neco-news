import { NextResponse } from "next/server";
import { hayySesionValida } from "@/lib/auth";

export async function POST(request: Request) {
  if (!(await hayySesionValida())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const SCRAPER_URL = process.env.SCRAPER_URL || "https://neco-news-scraper.onrender.com";

    const res = await fetch(`${SCRAPER_URL}/procesar-grupo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error("Error proxying to scraper:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
