/**
 * Prompt Builder — constructs the LLM prompt from user context.
 *
 * Maps to the "Prompt Builder" box in the genai.md architecture diagram.
 * Follows the prompt design from "Deep Dive: Prompt Engineering for Autocomplete".
 *
 * Key decisions:
 * - Left-to-right (no FIM) — this is prose completion, not code
 * - Temperature 0.4 — some creativity for natural text, not deterministic like code
 * - Stop at paragraph boundary (\n\n) to keep completions concise
 */

export interface PromptResult {
  system: string;
  userMessage: string;
}

export function buildPrompt(textBefore: string, textAfter: string): PromptResult {
  const system = [
    'You are a writing assistant that completes text naturally.',
    'Continue the text from where it left off.',
    'Output ONLY the completion — do not repeat any existing text.',
    'Keep completions concise: complete the current sentence, and at most add one more.',
    'If the text ends mid-sentence, complete that sentence.',
    'If the text ends at a sentence boundary, suggest the next sentence.',
    'Do not add quotation marks, markdown formatting, or explanations.',
  ].join(' ');

  // For prose, we use simple left-to-right context.
  // If textAfter is provided, mention it so the model knows what comes next.
  let userMessage = textBefore;
  if (textAfter.trim()) {
    userMessage += `\n\n[The text continues with: ${textAfter.trim().slice(0, 200)}]`;
  }

  return { system, userMessage };
}

/** Default options for prose completion. */
export const DEFAULT_OPTIONS = {
  maxTokens: 100,
  temperature: 0.4,
  stopSequences: ['\n\n'],
} as const;
