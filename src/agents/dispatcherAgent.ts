import { GoogleGenAI, Type } from "@google/genai";

const DISPATCHER_SYSTEM_PROMPT = `You are the Dispatcher Agent for Civic Succedent.

Your job is to generate a FORMAL GOVERNMENT COMPLAINT LETTER based on a verified civic damage report.

The letter must:
1. Begin with a clear "TO" address block (e.g., TO: The Municipal Commissioner, Municipal Corporation Office).
2. Address the issue gently, professionally, and in simple, highly clear, and accessible language. Avoid overly dense legal jargon; write so that any busy municipal supervisor can understand the situation instantly.
3. Include the exact location (address, coordinates, nearest landmark).
4. Describe the damage clearly, highlighting the safety risks to local community members without being aggressive or overly demanding.
5. State the severity and potential danger to citizens.
6. Request a timeline for resolution.
7. Include a reference number (use the case ID provided).

Also generate:
- A one-line subject for the complaint.
- The recommended escalation path if not resolved in 30 days.
- An RTI (Right to Information) query that can be filed if no response is received.

Keep the tone gentle, professional, helpful, simple, and clear.`;

const DISPATCHER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subject: {
      type: Type.STRING,
      description: "One-line subject for the complaint"
    },
    complaintLetter: {
      type: Type.STRING,
      description: "Full formal complaint letter text"
    },
    escalationPath: {
      type: Type.STRING,
      description: "Who to escalate to if unresolved in 30 days"
    },
    rtiQuery: {
      type: Type.STRING,
      description: "RTI application text if no government response"
    }
  },
  required: ["subject", "complaintLetter", "escalationPath", "rtiQuery"]
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

async function runWithModelFallback(
  ai: any,
  preferredModel: string,
  generateParams: any
): Promise<any> {
  const fallbackModels = [
    preferredModel,
    "gemini-3.1-flash-lite",
    "gemma-4-31b-it",
    "gemma-4-26b-a4b-it"
  ];
  
  const modelsToTry = Array.from(new Set(fallbackModels.filter(Boolean)));
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[AI Agent] Attempting execution with model: ${model}`);
      const result = await retryWithBackoff(() => ai.models.generateContent({
        ...generateParams,
        model: model
      }));
      return result;
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || "";
      console.warn(`[AI Agent] Model ${model} failed: ${errMsg}. Trying next available fallback...`);
    }
  }

  throw lastError;
}

function getDispatcherFallback(caseData: any, apiErrorMsg: string = "No valid GEMINI_API_KEY configured") {
  const resolvedType = (caseData.damageType || "pothole").replace("_", " ").toUpperCase();
  const lat = caseData.lat || caseData.latitude || "N/A";
  const lng = caseData.lng || caseData.longitude || "N/A";
  return {
    subject: `Immediate repair of ${resolvedType.toLowerCase()} at ${caseData.address || "local neighborhood road"}`,
    complaintLetter: `TO:
The Municipal Commissioner,
Municipal Corporation Office,
${caseData.city || "Secunderabad"} Division.

Subject: Request for gentle attention to repair ${resolvedType.toLowerCase()} on ${caseData.address || "the public road"}

Dear Commissioner,

I am writing to you on behalf of the residents in our area regarding a minor public safety concern. We noticed a ${resolvedType.toLowerCase()} located at ${caseData.address || "our street"} (Coordinates: ${lat}, ${lng}). 

The issue is detailed as follows:
- Issue Type: ${resolvedType.toLowerCase()}
- Neighborhood Area: ${caseData.area || "Local Sector"}
- Severity score: ${caseData.severity || 6}/10
- Citizen description: ${caseData.description || "Active defect causing a public hazard and slow transit."}

We kindly and professionally request your team to look into this matter at your earliest convenience to prevent any road accidents and keep our streets safe. If you could share a simple target timeline for a maintenance visit, we would be extremely grateful.

Thank you very much for your hard work and dedication to our community.

Sincerely,
Civic Succedent Neighborhood Patrol
(Reference Code: ${caseData.id})`,
    escalationPath: "Escalation to the Ward Assistant Commissioner if unresolved within 30 days.",
    rtiQuery: "Under Section 6(1) of the Right to Information Act, please provide a status report on actions taken regarding this road maintenance request.",
    isFallback: true,
    fallbackReason: apiErrorMsg
  };
}

export async function runDispatcherAgent(caseData: any, selectedModel?: string, previousLettersContext?: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY || "";

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      }
    }
  });

  const activeModel = selectedModel || process.env.GEMINI_DISPATCHER_MODEL || "gemma-4-26b-a4b-it";

  let prompt = `Generate a gentle, simple-language formal government complaint with a 'TO' address block for this civic issue:
    
Case ID: ${caseData.id}
Type: ${caseData.damageType}
Severity: ${caseData.severity}/10
Description: ${caseData.description}
Location: ${caseData.address} (City: ${caseData.city || "N/A"}, Area: ${caseData.area || "N/A"}, Lat: ${caseData.lat || "N/A"}, Lng: ${caseData.lng || "N/A"})
Reported On: ${caseData.createdAt}
Number of citizen verifications: ${caseData.verifications}`;

  if (previousLettersContext) {
    prompt += `\n\nTo keep our formal correspondence consistent across this municipality, please review these previously dispatched letters as memory and context:\n\n${previousLettersContext}`;
  }

  try {
    const response = await runWithModelFallback(ai, activeModel, {
      contents: prompt,
      config: {
        systemInstruction: DISPATCHER_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: DISPATCHER_SCHEMA
      }
    });

    if (!response.text) {
      throw new Error("Gemini API returned an empty response.");
    }

    return JSON.parse(response.text.trim());
  } catch (apiError: any) {
    console.warn("[Dispatcher Agent] Gemini API is currently unavailable or high demand. Safely executing robust local simulation fallback:", apiError.message || apiError);
    return getDispatcherFallback(caseData, apiError.message || String(apiError));
  }
}
