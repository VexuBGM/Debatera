/**
 * Safely extracts JSON from LLM output that may contain markdown code blocks
 * or other surrounding text. Handles truncated JSON by closing open brackets.
 */
export function extractJson<T>(raw: string): T {
  let cleaned = raw.trim();

  // Remove markdown code fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1]!.trim();
  }

  // Try to find JSON object or array boundaries
  const jsonStart = cleaned.search(/[{[]/);
  const jsonEndObj = cleaned.lastIndexOf("}");
  const jsonEndArr = cleaned.lastIndexOf("]");
  const jsonEnd = Math.max(jsonEndObj, jsonEndArr);

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt to repair truncated JSON by closing open brackets/braces
    if (jsonStart !== -1) {
      const repaired = repairTruncatedJson(cleaned);
      if (repaired) {
        try {
          return JSON.parse(repaired) as T;
        } catch {
          // fall through to error
        }
      }
    }

    throw new Error(
      `Failed to parse JSON from LLM output. Raw (first 500 chars): ${raw.slice(0, 500)}`,
    );
  }
}

/**
 * Attempts to repair truncated JSON by:
 * 1. Removing trailing incomplete key-value pairs
 * 2. Closing any unclosed brackets/braces
 */
function repairTruncatedJson(json: string): string | null {
  let trimmed = json.trim();

  // Remove trailing comma or incomplete value
  trimmed = trimmed.replace(/,\s*$/, "");
  // Remove trailing incomplete string (unclosed quote)
  trimmed = trimmed.replace(/,?\s*"[^"]*$/, "");
  // Remove trailing key without value: "key":
  trimmed = trimmed.replace(/,?\s*"[^"]*"\s*:\s*$/, "");
  // Remove trailing comma again after cleanup
  trimmed = trimmed.replace(/,\s*$/, "");

  // Count unclosed brackets and braces
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const char of trimmed) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") stack.push("}");
    else if (char === "[") stack.push("]");
    else if (char === "}" || char === "]") stack.pop();
  }

  // If we're still inside a string, close it
  if (inString) {
    trimmed += '"';
  }

  // Close remaining open brackets/braces
  while (stack.length > 0) {
    trimmed += stack.pop();
  }

  return trimmed;
}
