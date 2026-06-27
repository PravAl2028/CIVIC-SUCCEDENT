import { GoogleGenAI, Type } from "@google/genai";

const MODERATOR_SYSTEM_PROMPT = `You are the Civic Succedent AI Chat Moderator (CS-AI).
Analyze the message sent by a user in our community group chat.
Determine if this message is ethical, respectful, and civic-focused.
Unethical behavior includes: hate speech, cyberbullying, severe profanity, illegal activities, spam/marketing, or code injection.

Return EXACTLY a JSON object matching this schema.`;

const MODERATOR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isEthical: {
      type: Type.BOOLEAN,
      description: "Whether the message is ethical, respectful, and civic-focused"
    },
    reason: {
      type: Type.STRING,
      description: "Short explanation if flagged, otherwise empty"
    }
  },
  required: ["isEthical", "reason"]
};

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) {
      throw error;
    }
    const errMsg = error.message || "";
    const isTransient = errMsg.includes("503") || 
                        errMsg.includes("UNAVAILABLE") || 
                        errMsg.includes("demand") ||
                        error.status === 503 ||
                        error.status === 429;
    
    if (isTransient) {
      console.warn(`[Gemini API] Transient error (503/429/Demand). Retrying in ${delayMs}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return retryWithBackoff(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export async function runModeratorAgent(
  messageText: string, 
  selectedModel?: string,
  chatHistory?: { senderName: string; text: string; type: string }[],
  userWarnings?: number
): Promise<{ isEthical: boolean, reason: string }> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    console.warn("No GEMINI_API_KEY, falling back to assuming message is ethical.");
    return { isEthical: true, reason: "" };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      }
    }
  });

  const activeModel = selectedModel || process.env.GEMINI_MODERATOR_MODEL || "gemini-3.1-flash-lite";

  const historyText = chatHistory && chatHistory.length > 0
    ? chatHistory.slice(-6).map(m => `[${m.senderName || 'User'} (${m.type || 'user'})]: ${m.text}`).join("\n")
    : "No previous messages in active memory.";

  const userWarningsCount = typeof userWarnings === "number" ? userWarnings : 0;

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: activeModel,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Sender Active Warning Count: ${userWarningsCount}/3.
Recent Conversation History (Memory):
${historyText}

Analyze this new message in the context of the history above:
"${messageText}"`
            }
          ]
        }
      ],
      config: {
        systemInstruction: MODERATOR_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: MODERATOR_SCHEMA
      }
    }));

    if (!response.text) {
      throw new Error("Gemini API returned an empty response.");
    }

    return JSON.parse(response.text.trim());
  } catch (apiError: any) {
    console.warn("[Moderator Agent] Gemini API is currently unavailable or failed. Safely falling back to allowing message:", apiError.message || apiError);
    return { isEthical: true, reason: "" };
  }
}
