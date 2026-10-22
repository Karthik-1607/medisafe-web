export type ChatStreamResult = {
  safety?: "medical-emergency" | "self-harm";
};

type StreamEvent =
  | { type: "token"; text: string }
  | { type: "done"; safety?: ChatStreamResult["safety"] }
  | { type: "error"; message: string };

function decodeEvent(frame: string): StreamEvent | undefined {
  const data = frame
    .split(/\r?\n/)
    .filter(line => line.startsWith("data:"))
    .map(line => line.slice(5).trimStart())
    .join("\n");
  if (!data || data === "[DONE]") return undefined;
  try {
    const value = JSON.parse(data) as StreamEvent;
    if (value && typeof value === "object" && "type" in value) return value;
  } catch {
    throw new Error("The companion returned an unreadable response. Please retry.");
  }
  return undefined;
}

export async function readChatStream(
  response: Response,
  onToken: (text: string) => void,
): Promise<ChatStreamResult> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || "The companion is unavailable right now. Please retry.");
  }
  if (!response.body) throw new Error("This browser could not open the response stream. Please retry.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  let result: ChatStreamResult = {};

  const handleFrame = (frame: string) => {
    const event = decodeEvent(frame);
    if (!event) return;
    if (event.type === "token" && typeof event.text === "string") onToken(event.text);
    if (event.type === "error") throw new Error(event.message || "The companion is unavailable right now. Please retry.");
    if (event.type === "done") {
      result = { safety: event.safety };
      completed = true;
    }
  };

  try {
    while (!completed) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1 && !completed) {
        handleFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
      if (done) {
        if (buffer.trim() && !completed) handleFrame(buffer);
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!completed) throw new Error("The response ended before the companion finished. Please retry.");
  return result;
}
