import { NextResponse } from "next/server";

// Streaming horoscope endpoint owned by another agent. Stubbed to 501
// while their feature lands so the typechecker passes on this branch.
export async function POST() {
  return NextResponse.json({ error: "not implemented" }, { status: 501 });
}
