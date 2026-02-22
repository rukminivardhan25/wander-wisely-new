/**
 * Groq API: generate day-by-day itinerary with time, duration, cost per activity.
 * Get API key at https://console.groq.com
 */

/** Activity type for Smart Blocks (expandable by type). */
export type ActivityType =
  | "transport"
  | "stay"
  | "food"
  | "experience"
  | "shopping"
  | "events"
  | "hidden_gem"
  | "local_service"
  | "emergency";

export type Activity = {
  time: string;
  title: string;
  description: string;
  place?: string;
  duration?: string;
  costEstimate?: string;
  activityType?: ActivityType;
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

const SINGLE_DAY_SYSTEM = `You are a travel planner. Respond with ONLY one valid JSON object. No markdown, no code fences.
Format (exactly this structure, one day only):
{
  "day": 1,
  "summary": "One sentence summary of this day",
  "mainPlace": "Main location name for photo search (e.g. Manali, Rohtang Pass)",
  "activities": [
    {
      "time": "09:00",
      "title": "Activity name",
      "description": "Short description",
      "duration": "e.g. 2 hours",
      "costEstimate": "e.g. ₹500 or Free",
      "activityType": "transport"
    }
  ]
}
Rules:
- 4-8 activities per day. Every activity needs "time", "title", "description", "duration", "costEstimate".
- Add "activityType" to each activity. Use exactly one of: transport, stay, food, experience, shopping, events, hidden_gem, local_service, emergency.
- Use: transport (flights, trains, bus, taxi, rental); stay (hotels, check-in); food (meals, cafes, restaurants); experience (tours, adventure, culture); shopping (markets, malls); events (festivals, shows); hidden_gem (local secrets); local_service (SIM, storage, guides); emergency (only if relevant).
- Order by time. Use ₹ for India, $ for US.`;

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
    ? ` Total trip budget: ${params.budget_amount}.`
    : "";
  const tripContext = `Trip: ${params.days} days from ${params.origin} to ${params.destination}. Budget: ${params.budget}.${budgetNote} Travel: ${params.travel_type}. Interests: ${params.interests.join(", ") || "sightseeing"}. Transport: ${params.transport_preference || "any"}.`;

  const days: DayPlan[] = [];

  for (let dayNum = 1; dayNum <= params.days; dayNum++) {
    const userContent = `${tripContext}

Plan ONLY day ${dayNum} of ${params.days}. This is day number ${dayNum} of the trip. Return a single JSON object with: "day": ${dayNum}, "summary", "mainPlace", "activities" (4-8 activities). Each activity must have: time, title, description, duration, costEstimate, and activityType (one of: transport, stay, food, experience, shopping, events, hidden_gem, local_service, emergency). No other text.`;

    const res = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SINGLE_DAY_SYSTEM },
          { role: "user", content: userContent },
        ],
        temperature: 0.5,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API error: ${res.status} ${err}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error(`Empty response from Groq for day ${dayNum}`);

    const jsonStr = extractJson(text);
    let dayPlan: DayPlan;
    try {
      const parsed = JSON.parse(jsonStr) as DayPlan & { days?: DayPlan[] };
      if (parsed.days && Array.isArray(parsed.days) && parsed.days[0]) {
        dayPlan = { ...parsed.days[0], day: dayNum };
      } else {
        dayPlan = { ...parsed, day: dayNum };
      }
    } catch {
      console.error(`Groq day ${dayNum} parse failed (preview):`, text.slice(0, 300));
      throw new Error(`Invalid response for day ${dayNum}. Please try again.`);
    }

    if (!dayPlan.activities || !Array.isArray(dayPlan.activities)) {
      dayPlan.activities = [];
    }
    const validTypes: ActivityType[] = ["transport", "stay", "food", "experience", "shopping", "events", "hidden_gem", "local_service", "emergency"];
    for (const a of dayPlan.activities) {
      if (!a.activityType || !validTypes.includes(a.activityType as ActivityType)) {
        (a as Activity).activityType = "experience";
      }
    }
    if (!dayPlan.summary) dayPlan.summary = `Day ${dayNum} of your trip.`;
    if (!dayPlan.mainPlace) dayPlan.mainPlace = params.destination;
    days.push(dayPlan);
  }

  return { days };
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
