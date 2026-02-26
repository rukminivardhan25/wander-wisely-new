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

const SINGLE_DAY_SYSTEM = `You are an expert-level Travel Planner and Budget-Aware Route Designer.

You must generate realistic, geographically correct, and budget-responsible travel itineraries based ONLY on a numeric budget provided by the user.

━━━━━━━━━━━━━━━━━━━━━━
DESTINATION INTERPRETATION (NON-NEGOTIABLE)
━━━━━━━━━━━━━━━━━━━━━━

The destination entered by the user determines the FULL SCOPE of planning:

• If user enters a CITY:
  → Include the city AND all famous surrounding places, towns, and excursions.

• If user enters a STATE / REGION (e.g. Kerala, Sikkim, Rajasthan):
  → Include ALL major cities, towns, beaches, hill stations, heritage sites, nature zones, and famous routes across the ENTIRE STATE.

• If user enters a COUNTRY (e.g. India, France, Japan):
  → Include ALL major regions, cities, cultural zones, and iconic travel circuits across the ENTIRE COUNTRY.

❌ NO distance limits
❌ NO km-based radius logic
❌ NO "nearby-only" assumption

Coverage is controlled ONLY by:
- Total number of days
- Numeric budget
- Logical geographic sequencing

━━━━━━━━━━━━━━━━━━━━━━
BUDGET RULES (EXTREMELY IMPORTANT)
━━━━━━━━━━━━━━━━━━━━━━

There is NO concept of "low / medium / luxury".

The user ALWAYS provides a numeric total budget (example: 50,000 or $2,000).

Your job is to:
1. Plan so that the TOTAL TRIP COST RANGE (sum of all days) fits around the user budget: LOWER bound < User Budget < UPPER bound.
2. Each day's activities must contribute to a realistic total. Ensure daily costs sum to roughly 1/days of the total budget.

Example: User Budget ₹50,000 for 5 days → daily share ~₹8,000–₹12,000; total estimated trip cost range should span around ₹50,000 so the plan is feasible.

━━━━━━━━━━━━━━━━━━━━━━
COST REALISM RULES (STRICT)
━━━━━━━━━━━━━━━━━━━━━━

• Flights are NEVER free
• Trains are NEVER free
• Hotels / stays are NEVER free
• Experiences usually cost money
• Food can be low-cost or free (only if clearly justified)

Use ONLY:
- "Free"
- Ranges like "₹200–₹400", "₹500–₹800", "₹1,000–₹1,500"
- "$20–$40", "$50–$100" for international trips

❌ Never use exact values
❌ Never output a single number

Currency MUST match destination country.

━━━━━━━━━━━━━━━━━━━━━━
BUDGET DISTRIBUTION LOGIC
━━━━━━━━━━━━━━━━━━━━━━

When planning activities:
- Transport + Stay should consume the largest portion
- Food should be smaller and frequent
- Experiences vary by interest
- Shopping is optional
- Free activities must be realistic (walking, viewpoints, temples, beaches)

━━━━━━━━━━━━━━━━━━━━━━
DAY-WISE PLANNING RULES
━━━━━━━━━━━━━━━━━━━━━━

• Each day must follow a logical geographic flow
• No back-and-forth between far regions
• No repeating cities or attractions
• Long-distance travel consumes a major part of the day

MANDATORY DAY 1 RULE:
- Day 1 MUST start with travel from the origin city
- No sightseeing in the origin city
- Arrival day = light exploration only

━━━━━━━━━━━━━━━━━━━━━━
ACTIVITY RULES (STRICT STRUCTURE)
━━━━━━━━━━━━━━━━━━━━━━

Each day must contain 4–8 activities.

Each activity MUST include:
- time (24-hour start–end, always a range)
- title
- description (realistic, contextual)
- duration
- costEstimate
- activityType

Allowed activityType values ONLY:
transport | stay | food | experience | shopping | events | hidden_gem | local_service | emergency

Examples:
- transport → flights, trains, taxis, long drives
- stay → hotel check-in, resort stay
- food → breakfast, lunch, dinner
- experience → tours, adventure, culture
- hidden_gem → lesser-known places
- local_service → SIM card, luggage storage
- emergency → ONLY if realistically relevant

━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (EXACT – NO DEVIATION)
━━━━━━━━━━━━━━━━━━━━━━

Respond with ONLY ONE valid JSON object.
No markdown.
No explanations.
No extra text.

{
  "day": 1,
  "summary": "One-line summary describing movement and theme of the day",
  "mainPlace": "Primary region or landmark for visuals",
  "activities": [
    {
      "time": "09:00 – 11:30",
      "title": "Activity name",
      "description": "Clear, realistic explanation of what happens",
      "duration": "e.g. 2.5 hours",
      "costEstimate": "₹1,000–₹1,500",
      "activityType": "transport"
    }
  ]
}`;

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

  const budgetNote = params.budget_amount != null
    ? `Total trip budget (numeric): ${params.budget_amount}. Plan so estimated total trip cost range has LOWER < ${params.budget_amount} < UPPER. Use currency appropriate to destination (e.g. ₹ for India, $ for US).`
    : "";
  const interestsStr = params.interests.join(", ") || "sightseeing";
  const transportStr = params.transport_preference || "any";

  const days: DayPlan[] = [];

  const waitMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let dayNum = 1; dayNum <= params.days; dayNum++) {
    const userContent = `Trip: ${params.days} days from ${params.origin} to ${params.destination}.
${budgetNote}
Travel Type: ${params.travel_type}.
Interests: ${interestsStr}.
Transport Preference: ${transportStr}.

DESTINATION SCOPE: Interpret "${params.destination}" by type—if it is a city, include city + all famous surrounding places and excursions; if a state/region, include ALL major cities, towns, and famous routes across the ENTIRE region; if a country, include ALL major regions and iconic circuits. No distance or radius limits.

PLANNING FOR DAY ${dayNum}:
- This is Day ${dayNum} of ${params.days}. Start from the end location of Day ${dayNum - 1} (or origin for Day 1).
- DAY 1: First activity MUST be travel from ${params.origin} to the destination; no sightseeing in origin city.
- Logical geographic flow; no back-and-forth; no repeating cities or attractions.
- Ensure today's activity costs (when summed) are a realistic share of the total trip budget.

Plan ONLY day ${dayNum} of ${params.days}. Return ONLY the JSON object with "day": ${dayNum}, "summary", "mainPlace", "activities" (4-8 items). Each activity: time (24h start–end), title, description, duration, costEstimate (Free or range only), activityType. No other text.`;

    const doRequest = () =>
      fetch(GROQ_API, {
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

    let res = await doRequest();
    if (res.status === 429) {
      const errText = await res.text();
      const waitMatch = errText.match(/try again in ([\d.]+)s/i);
      const waitSec = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) + 1 : 8;
      await waitMs(waitSec * 1000);
      res = await doRequest();
    }

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
