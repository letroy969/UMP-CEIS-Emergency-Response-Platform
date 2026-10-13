export async function sendChatMessages(messages) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "The assistant could not respond. Please try again.");
  }
  if (typeof result.answer !== "string" || !Array.isArray(result.sections)) {
    throw new Error("The assistant returned an invalid response. Please try again.");
  }
  return result;
}
