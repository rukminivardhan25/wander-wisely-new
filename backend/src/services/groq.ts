/**
 * Groq API: generate day-by-day itinerary with time, duration, cost per activity.
 * Get API key at https://console.groq.com
 */

export type Activity = {
  time: string;
  title: string;
  description: string;
  place?: string;
  duration?: string;
  costEstimate?: string;
};

export type DayPlan = {
  day: number;
  summary: string;
  mainPlace: string;
  activities: Activity[];
};

export type ItineraryPlan = { days: DayPlan[] };

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

function getSystemPrompt(): string {
  return `You are a travel planner. You must respond with ONLY a single valid JSON object. No markdown, no code fences, no explanation before or after.
Format:
{
  "days": [
    {
      "day": 1,
      "summary": "One sentence summary of the day",
      "mainPlace": "Main location name for photo search (e.g. Rohtang Pass, Manali)",
      "activities": [
        {
          "time": "09:00",
          "title": "Activity name",
          "description": "Short description",
          "place": "Place name if different",
          "duration": "e.g. 2 hours",
          "costEstimate": "e.g. ₹500 or Free or $20"
        }
      ]
    }
  ]
}
Rules:
- Include exactly one object per day. Each day should have 4-8 activities from morning to evening.
- Every activity MUST have "time" (e.g. 09:00, 14:30), "title", "description".
- Add "duration" (e.g. "1 hour", "2 hours") and "costEstimate" (e.g. "₹300", "Free", "$15") for each activity when relevant.
- Use destination currency/tone (e.g. ₹ for India, $ for US). Keep cost estimates realistic for the budget level.
- Order activities by time. Use the destination and interests to suggest realistic activities, meals, and sights.`;
}

export async function generateItinerary(params: {
  origin: string;
  destination: string;
  days: number;
  budget: string;
  travel_type: string;
  interests: string[];
  transport_preference?: string;
  budget_amount?: number;
}): Promise<ItineraryPlan> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const budgetNote = params.budget_amount
    ? `Total trip budget: ${params.budget_amount} (use this to suggest realistic cost estimates per activity).`
    : "";
  const userContent = `Plan a ${params.days}-day trip from ${params.origin} to ${params.destination}.
Budget level: ${params.budget}. ${budgetNote}
Travel type: ${params.travel_type}. Interests: ${params.interests.join(", ") || "general sightseeing"}. Transport: ${params.transport_preference || "any"}.
Return only the JSON object with "days" array. Each activity must have time, title, description, duration, and costEstimate.`;

  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: userContent },
      ],
      temperature: 0.5,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Empty response from Groq");

  const jsonStr = extractJson(text);
  let parsed: ItineraryPlan;
  try {
    parsed = JSON.parse(jsonStr) as ItineraryPlan;
  } catch (parseErr) {
    const preview = text.slice(0, 400).replace(/\n/g, " ");
    console.error("Groq raw response (preview):", preview + (text.length > 400 ? "..." : ""));
    throw new Error("Groq returned invalid JSON. Try again or use a shorter trip.");
  }
  if (!parsed.days || !Array.isArray(parsed.days)) throw new Error("Groq response missing days array");
  return parsed;
}

/** Extract JSON from Groq response (handles markdown code blocks and surrounding text). */
function extractJson(text: string): string {
  let s = text.trim();
  // Remove markdown code block if present (```json ... ``` or ``` ... ```)
  const codeBlock = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/im;
  const match = s.match(codeBlock);
  if (match) s = match[1].trim();
  else s = s.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  // If still not valid, try to find the outermost { ... } object
  const firstBrace = s.indexOf("{");
  if (firstBrace === -1) return s;
  let depth = 0;
  let end = -1;
  for (let i = firstBrace; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end !== -1) return s.slice(firstBrace, end + 1);
  return s;
}
