import { ENV } from "./env";
import type { Message } from "./llm";

export function isGeminiConfigured(): boolean {
  return Boolean(ENV.geminiApiKey && ENV.geminiApiKey.trim().length > 0);
}

function convertMessagesToGemini(messages: Message[]) {
  const systemMessage = messages.find(m => m.role === "system");
  const systemInstruction = systemMessage
    ? {
        parts: [
          {
            text:
              typeof systemMessage.content === "string"
                ? systemMessage.content
                : Array.isArray(systemMessage.content)
                  ? (systemMessage.content as any).map((p: any) => p.text || "").join(" ")
                  : String(systemMessage.content),
          },
        ],
      }
    : undefined;

  const nonSystemMessages = messages.filter(m => m.role !== "system");
  const contents = nonSystemMessages.map(m => {
    const text =
      typeof m.content === "string"
        ? m.content
        : Array.isArray(m.content)
          ? (m.content as any).map((p: any) => p.text || "").join(" ")
          : String(m.content);

    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    };
  });

  return { systemInstruction, contents };
}

export async function invokeGemini({
  messages,
  maxTokens,
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
}: {
  messages: Message[];
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const { systemInstruction, contents } = convertMessagesToGemini(messages);
  const payload: Record<string, unknown> = {
    contents,
    ...(systemInstruction ? { systemInstruction } : {}),
    generationConfig: {
      ...(typeof maxTokens === "number" ? { maxOutputTokens: maxTokens } : {}),
      temperature: 0.7,
    },
  };

  const uri = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(uri, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini API error: ${response.status} ${errorText.slice(0, 500)}`);
  }

  const data = (await response.json()) as any;
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("Gemini returned an empty response");
  }

  return reply.trim();
}

export async function streamGemini({
  messages,
  maxTokens,
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  signal,
  onToken,
}: {
  messages: Message[];
  maxTokens?: number;
  model?: string;
  signal: AbortSignal;
  onToken: (chunk: string) => void;
}): Promise<string> {
  const fullText = await invokeGemini({ messages, maxTokens, model });
  if (signal.aborted) return "";

  const words = fullText.split(" ");
  for (let i = 0; i < words.length; i++) {
    if (signal.aborted) return fullText;
    onToken((i === 0 ? "" : " ") + words[i]);
    await new Promise(r => setTimeout(r, 16));
  }
  return fullText;
}
