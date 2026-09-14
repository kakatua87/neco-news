import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const key = process.env.AI_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "Falta AI_API_KEY" }, { status: 500 });
  }
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  return NextResponse.json({ status: res.status, data });
}
