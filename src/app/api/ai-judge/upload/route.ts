export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { parseTranscript } from "@/lib/ai-judge/transcript/parser";

// POST: Upload and parse a transcript file
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith(".md") && !fileName.endsWith(".txt")) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload a .md or .txt file.",
        },
        { status: 400 },
      );
    }

    const text = await file.text();

    if (!text.trim()) {
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 },
      );
    }

    // Parse the transcript
    const parsed = parseTranscript(text);

    return NextResponse.json({
      motion: parsed.motion,
      infoSlide: parsed.infoSlide,
      speechCount: parsed.speeches.length,
      speeches: parsed.speeches.map((s) => ({
        index: s.index,
        role: s.role,
        label: s.label,
        side: s.side,
        speakerName: s.speakerName,
        textPreview: s.text.slice(0, 200) + (s.text.length > 200 ? "..." : ""),
      })),
      rawText: text,
    });
  } catch (error) {
    console.error("[ai-judge/upload] POST error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 },
    );
  }
}
