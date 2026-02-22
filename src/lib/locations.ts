/**
 * Popular travel locations for Plan Trip From/To suggestions (India + international).
 */
export const POPULAR_LOCATIONS = [
  "Hyderabad",
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Manali",
  "Shimla",
  "Goa",
  "Kerala",
  "Kochi",
  "Munnar",
  "Ooty",
  "Darjeeling",
  "Rishikesh",
  "Leh",
  "Ladakh",
  "Srinagar",
  "Udaipur",
  "Jodhpur",
  "Agra",
  "Varanasi",
  "Rajasthan",
  "Andaman",
  "Pondicherry",
  "Mysore",
  "Coorg",
  "Wayanad",
  "Spiti",
  "Kasol",
  "McLeod Ganj",
  "Dharamshala",
  "Nainital",
  "Mussoorie",
  "Gangtok",
  "Sikkim",
  "Guwahati",
  "Shillong",
  "Dubai",
  "Singapore",
  "Bangkok",
  "Bali",
  "London",
  "Paris",
  "New York",
  "Tokyo",
  "Sydney",
  "Maldives",
  "Sri Lanka",
  "Nepal",
  "Bhutan",
];

export function getLocationSuggestions(query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return POPULAR_LOCATIONS.slice(0, limit);
  return POPULAR_LOCATIONS.filter(
    (loc) => loc.toLowerCase().includes(q) || loc.toLowerCase().startsWith(q)
  ).slice(0, limit);
}

/** Letters that have at least one place in POPULAR_LOCATIONS (for alphabet picker). */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Get places starting with the given letter (or all if letter is "All"). */
export function getLocationsByLetter(letter: string): string[] {
  if (!letter || letter === "All") return [...POPULAR_LOCATIONS].sort((a, b) => a.localeCompare(b));
  const upper = letter.toUpperCase();
  return POPULAR_LOCATIONS.filter((loc) => loc.toUpperCase().startsWith(upper)).sort((a, b) => a.localeCompare(b));
}

export function getAvailableLetters(): string[] {
  const firstLetters = new Set(POPULAR_LOCATIONS.map((loc) => loc.charAt(0).toUpperCase()));
  return LETTERS.filter((l) => firstLetters.has(l));
}
