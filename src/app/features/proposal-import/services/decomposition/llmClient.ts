const API_BASE = (import.meta.env.VITE_LLM_BASE_URL || "/api").replace(/\/$/, "");
const CHAT_ENDPOINT = `${API_BASE}/chat`;
const LLM_MODEL = "deepseek-r1:8b";
const LLM_TIMEOUT_MS = 600_000;

let cachedAuthKey: string | null = null;
let authKeyPromise: Promise<string | null> | null = null;

const fetchAuthKey = async () => {
  if (cachedAuthKey) return cachedAuthKey;
  if (authKeyPromise) return authKeyPromise;
  authKeyPromise = fetch(`${API_BASE}/authkey`)
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json();
      const key = typeof data.api_key === "string" ? data.api_key.trim() : null;
      if (key) cachedAuthKey = key;
      return key;
    })
    .catch(() => null)
    .finally(() => { authKeyPromise = null; });
  return authKeyPromise;
};

export async function callDecompositionLLM(prompt: string): Promise<string> {
  const runtimeToken = await fetchAuthKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(runtimeToken ? { Authorization: `Bearer ${runtimeToken}` } : {}),
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`LLM Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return (
    data.message?.content ||
    data.choices?.[0]?.message?.content ||
    data.response ||
    data.content ||
    ""
  ) as string;
}

// ─── decomposeSinglePart ─────────────────────────────────────────────
// Sends ONE part's content to the LLM — a much smaller ask than the
// whole document, matching what every debug log shows the model
// actually succeeding at. Falls back to the deterministic scorer only
// for THIS part if its own call fails, not the whole document.
