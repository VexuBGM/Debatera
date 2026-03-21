/**
 * Safely extracts JSON from LLM output that may contain markdown code blocks
 * or other surrounding text.
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
    throw new Error(
      `Failed to parse JSON from LLM output. Raw (first 500 chars): ${raw.slice(0, 500)}`,
    );
  }
}
