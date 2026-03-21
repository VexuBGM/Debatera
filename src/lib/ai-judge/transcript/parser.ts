import type { ParsedTranscript, Speech, SideLabel } from "../types";
import { WSDC } from "../constants";

/**
 * Parses a markdown debate transcript into structured data.
 * Flexible: handles variations in formatting (English, Bulgarian, numbered, etc.)
 */
export function parseTranscript(text: string): ParsedTranscript {
  const lines = text.split("\n");

  let motion = "";
  let infoSlide: string | null = null;
  const speeches: Speech[] = [];

  let currentSection: "none" | "motion" | "info" | "speech" = "none";
  let currentSpeechLines: string[] = [];
  let currentSpeechHeader = "";

  function flushSpeech() {
    if (currentSection === "speech" && currentSpeechHeader) {
      const parsed = parseSpeechHeader(currentSpeechHeader, speeches.length);
      const speechText = currentSpeechLines.join("\n").trim();
      if (speechText) {
        speeches.push({
          index: speeches.length,
          role: parsed.role,
          label: parsed.label,
          side: parsed.side,
          isReply: parsed.isReply,
          speakerName: parsed.speakerName,
          text: speechText,
        });
      }
    }
    currentSpeechLines = [];
    currentSpeechHeader = "";
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect motion header
    const motionMatch = trimmed.match(
      /^#+\s*(?:Motion|Topic|Тема|Мoция)\s*[:\-]?\s*(.+)/i,
    );
    if (motionMatch) {
      flushSpeech();
      // Motion might be in quotes
      motion = motionMatch[1]!.replace(/^["'"]+|["'"]+$/g, "").trim();
      currentSection = "motion";
      continue;
    }

    // Detect info slide header
    const infoMatch = trimmed.match(
      /^#+\s*(?:Info\s*Slide|Information|Информация|Context)\s*[:\-]?\s*(.*)/i,
    );
    if (infoMatch) {
      flushSpeech();
      currentSection = "info";
      infoSlide = infoMatch[1]?.trim() || "";
      continue;
    }

    // Detect speech header
    const speechMatch = trimmed.match(
      /^#+\s*(?:Speech|Реч|Говорител)?\s*(\d+)\s*[:\-.]?\s*(.*)/i,
    );
    const altSpeechMatch =
      !speechMatch &&
      trimmed.match(
        /^#+\s*(?:(?:1st|2nd|3rd|First|Second|Third)\s+)?(?:Proposition|Opposition|Prop|Opp|Reply)\b/i,
      );

    if (speechMatch || altSpeechMatch) {
      flushSpeech();
      currentSection = "speech";
      currentSpeechHeader = trimmed.replace(/^#+\s*/, "");
      continue;
    }

    // Accumulate content for current section
    if (currentSection === "info") {
      if (trimmed.startsWith("#")) {
        // New section starting
        currentSection = "none";
      } else {
        infoSlide = (infoSlide ? infoSlide + "\n" : "") + line;
      }
    } else if (currentSection === "speech") {
      currentSpeechLines.push(line);
    } else if (currentSection === "motion" && trimmed && !trimmed.startsWith("#")) {
      // Multi-line motion text
      if (!motion) {
        motion = trimmed.replace(/^["'"]+|["'"]+$/g, "");
      }
    }
  }

  flushSpeech();

  if (infoSlide) {
    infoSlide = infoSlide.trim() || null;
  }

  return { motion, infoSlide, speeches };
}

interface SpeechHeaderInfo {
  role: string;
  label: string;
  side: SideLabel;
  isReply: boolean;
  speakerName: string | null;
}

function parseSpeechHeader(header: string, speechIndex: number): SpeechHeaderInfo {
  // Try to extract speaker name from parentheses
  const nameMatch = header.match(/\(([^)]+)\)/);
  const speakerName = nameMatch ? nameMatch[1]!.trim() : null;

  // Clean header for analysis
  const cleanHeader = header.replace(/\([^)]*\)/g, "").trim().toLowerCase();

  // Detect reply speeches
  const isReply =
    /reply|отговор|rebuttal\s*speech/i.test(cleanHeader) ||
    (speechIndex >= 6 && /opp|prop/i.test(cleanHeader));

  // Detect side
  let side: SideLabel = "PROP";
  if (/opp|opposition|отбор\s*2|team\s*2/i.test(cleanHeader)) {
    side = "OPP";
  } else if (/prop|proposition|отбор\s*1|team\s*1/i.test(cleanHeader)) {
    side = "PROP";
  } else {
    // Fallback: use WSDC speech order
    const wsdcSpeech = WSDC.SPEECHES[speechIndex];
    if (wsdcSpeech) {
      side = wsdcSpeech.side as SideLabel;
    }
  }

  // Get WSDC speech info by index
  const wsdcSpeech = WSDC.SPEECHES[speechIndex];
  if (wsdcSpeech) {
    return {
      role: wsdcSpeech.role,
      label: wsdcSpeech.label,
      side: wsdcSpeech.side as SideLabel,
      isReply: wsdcSpeech.isReply,
      speakerName,
    };
  }

  // Fallback for extra speeches beyond 8
  return {
    role: `${side}_EXTRA_${speechIndex}`,
    label: `Extra Speech ${speechIndex + 1} (${side === "PROP" ? "Proposition" : "Opposition"})`,
    side,
    isReply,
    speakerName,
  };
}
