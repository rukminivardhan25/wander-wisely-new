/**
 * Clear all row data and seed demo data: 20 users, 10 vendors, listings, fleet, bookings, community posts.
 * No tables or columns are dropped—only data is cleared then re-seeded.
 * Run from main backend with DATABASE_URL (same DB as partner portal if single-DB setup).
 * Explore page uses static src/lib/destinations.ts — no DB data; not modified.
 * Community posts use the same destination image URLs as Explore (Wikimedia) so no images are lost.
 *
 * Usage: from project root, backend dir: npx tsx scripts/seed-demo.ts
 * Or: npm run db:seed-demo (add script to package.json)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

const SALT_ROUNDS = 10;
const DEMO_PASSWORD = "demo1234";
const VENDOR_PASSWORD = "vendor1234";

// Seed window: all schedules and bookings span the next 10–20 days (from tomorrow).
const SEED_DAYS_START = 1;
const SEED_DAYS_END = 20;

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// —— Clear order: children first (no CASCADE drop, only DELETE) ——
const CLEAR_ORDER = [
  "post_bookmarks",
  "post_likes",
  "comments",
  "posts",
  "flight_booking_documents",
  "flight_booking_passengers",
  "event_booking_ticket_codes",
  "event_booking_tickets",
  "event_bookings",
  "experience_bookings",
  "flight_bookings",
  "car_bookings",
  "hotel_bookings",
  "transport_bookings",
  "support_tickets",
  "bus_schedules",
  "flight_schedules",
  "flight_routes",
  "event_media",
  "event_ticket_types",
  "experience_media",
  "experience_slots",
  "car_operating_areas",
  "buses",
  "routes",
  "cars",
  "flights",
  "hotel_branches",
  "experiences",
  "events",
  "listings",
  "vendors",
  "users",
];

// Explore destination image URLs (first image of each) — same as Explore page
const EXPLORE_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Buddhist_monks_in_front_of_the_Angkor_Wat.jpg/800px-Buddhist_monks_in_front_of_the_Angkor_Wat.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/The_Acropolis_of_Athens_on_June_1%2C_2021.jpg/800px-The_Acropolis_of_Athens_on_June_1%2C_2021.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/800px-The_Golden_Temple_of_Amrithsar_7.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/800px-Taj_Mahal_%28Edited%29.jpeg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/BeachFun.jpg/800px-BeachFun.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg/800px-East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg/800px-La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Ajanta_%2863%29.jpg/800px-Ajanta_%2863%29.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Ubud_%2849818456887%29.jpg/800px-Ubud_%2849818456887%29.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Oia_Santorini_Blue_Domes.jpg/800px-Oia_Santorini_Blue_Domes.jpg",
];

async function clearData(client: pg.PoolClient) {
  console.log("Clearing existing data...");
  for (const table of CLEAR_ORDER) {
    try {
      await client.query(`DELETE FROM public.${table}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("does not exist")) console.warn(`Clear ${table}:`, msg);
    }
  }
}

async function run() {
  const client = await pool.connect();
  try {
    await clearData(client);

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
    const vendorPasswordHash = await bcrypt.hash(VENDOR_PASSWORD, SALT_ROUNDS);

    // —— 20 users (main app) ——
    const USER_EMAILS = [
      "alice@demo.local", "bob@demo.local", "carol@demo.local", "dave@demo.local", "eve@demo.local",
      "frank@demo.local", "grace@demo.local", "henry@demo.local", "iris@demo.local", "jack@demo.local",
      "kate@demo.local", "leo@demo.local", "mia@demo.local", "noah@demo.local", "olivia@demo.local",
      "paul@demo.local", "quinn@demo.local", "ryan@demo.local", "sara@demo.local", "tom@demo.local",
    ];
    const USER_NAMES = [
      "Alice M.", "Bob K.", "Carol R.", "Dave S.", "Eve T.", "Frank L.", "Grace P.", "Henry W.", "Iris N.", "Jack D.",
      "Kate B.", "Leo F.", "Mia J.", "Noah C.", "Olivia G.", "Paul H.", "Quinn Y.", "Ryan V.", "Sara A.", "Tom E.",
    ];
    const userIds: string[] = [];
    for (let i = 0; i < USER_EMAILS.length; i++) {
      const r = await client.query<{ id: string }>(
        "INSERT INTO public.users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id",
        [USER_EMAILS[i], passwordHash, USER_NAMES[i]]
      );
      userIds.push(r.rows[0].id);
    }
    console.log("Created 20 users.");

    // —— 10 vendors (partner portal) ——
    const VENDORS = [
      { name: "Fairytales Travels", email: "fairytales@vendor.demo" },
      { name: "Orange Bus Co", email: "orange@vendor.demo" },
      { name: "Volvo Express", email: "volvo@vendor.demo" },
      { name: "Grand Hotels Pvt Ltd", email: "grandhotels@vendor.demo" },
      { name: "Sunrise Stays", email: "sunrise@vendor.demo" },
      { name: "River Rafting Co", email: "riverraft@vendor.demo" },
      { name: "Heritage Walks", email: "heritage@vendor.demo" },
      { name: "City Events Ltd", email: "cityevents@vendor.demo" },
      { name: "Swift Cabs", email: "swiftcabs@vendor.demo" },
      { name: "SkyWings Airlines", email: "skywings@vendor.demo" },
    ];
    const vendorIds: string[] = [];
    for (const v of VENDORS) {
      const r = await client.query<{ id: string }>(
        "INSERT INTO public.vendors (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        [v.name, v.email, vendorPasswordHash]
      );
      vendorIds.push(r.rows[0].id);
    }
    console.log("Created 10 vendors.");

    // —— Listings: transport (4), hotel (2), experience (2), event (1) ——
    const listings: { id: string; type: string; vendorIndex: number; name: string; city: string }[] = [];
    const listingInserts = [
      { type: "transport", vendorIndex: 0, name: "Fairytales", city: "Bangalore" },
      { type: "transport", vendorIndex: 1, name: "Orange Travels", city: "Hyderabad" },
      { type: "transport", vendorIndex: 2, name: "Volvo Express", city: "Chennai" },
      { type: "transport", vendorIndex: 8, name: "Swift Cabs", city: "Mumbai" },
      { type: "hotel", vendorIndex: 3, name: "Grand Hotels Pvt Ltd", city: "Goa" },
      { type: "hotel", vendorIndex: 4, name: "Sunrise Stays", city: "Kerala" },
      { type: "experience", vendorIndex: 5, name: "River Rafting", city: "Rishikesh" },
      { type: "experience", vendorIndex: 6, name: "Heritage Walks", city: "Jaipur" },
      { type: "event", vendorIndex: 7, name: "City Events", city: "Delhi" },
    ];
    for (const row of listingInserts) {
      const r = await client.query<{ id: string }>(
        `INSERT INTO public.listings (vendor_id, type, name, status, city) VALUES ($1, $2, $3, 'live', $4) RETURNING id`,
        [vendorIds[row.vendorIndex], row.type, row.name, row.city]
      );
      listings.push({ id: r.rows[0].id, type: row.type, vendorIndex: row.vendorIndex, name: row.name, city: row.city });
    }
    const transportListingIds = listings.filter((l) => l.type === "transport").map((l) => l.id);
    const hotelListingIds = listings.filter((l) => l.type === "hotel").map((l) => l.id);
    const experienceListingIds = listings.filter((l) => l.type === "experience").map((l) => l.id);
    const eventListingIds = listings.filter((l) => l.type === "event").map((l) => l.id);
    console.log("Created 9 listings.");

    // —— Routes and buses (transport): multiple routes per listing, schedules for next 10–20 days ——
    const routeInfo: { listingId: string; routeId: string; from: string; to: string }[] = [];
    const allRoutePairs: [string, string][] = [
      ["Bangalore", "Mysore"],
      ["Bangalore", "Chennai"],
      ["Hyderabad", "Vizag"],
      ["Hyderabad", "Bangalore"],
      ["Chennai", "Bangalore"],
      ["Chennai", "Coimbatore"],
      ["Mumbai", "Pune"],
      ["Mumbai", "Goa"],
    ];
    const busIds: string[] = [];
    for (let i = 0; i < transportListingIds.length; i++) {
      const lid = transportListingIds[i];
      const pairs = allRoutePairs.slice(i * 2, i * 2 + 2);
      for (const [from, to] of pairs) {
        await client.query(
          "INSERT INTO public.routes (listing_id, from_place, to_place, price_per_seat_cents) VALUES ($1, $2, $3, 50000)",
          [lid, from, to]
        );
        const routeRes = await client.query<{ id: string }>(
          "SELECT id FROM public.routes WHERE listing_id = $1 AND from_place = $2 AND to_place = $3 LIMIT 1",
          [lid, from, to]
        );
        const routeId = routeRes.rows[0]?.id;
        if (routeId) routeInfo.push({ listingId: lid, routeId, from, to });
      }
      for (const busName of ["Volvo", "Orange", "Sleeper-1", "Cab-Sedan"]) {
        const busRes = await client.query<{ id: string }>(
          `INSERT INTO public.buses (listing_id, name, bus_type, layout_type, rows, left_cols, right_cols, has_aisle, total_seats, base_price_per_seat_cents, status)
           VALUES ($1, $2, 'seater', '2+2', 10, 2, 2, true, 28, 40000, 'active') RETURNING id`,
          [lid, busName + (busIds.length + 1)]
        );
        busIds.push(busRes.rows[0].id);
        const busId = busRes.rows[0].id;
        const startDate = dateOffset(0);
        const endDate = dateOffset(SEED_DAYS_END);
        await client.query(
          `INSERT INTO public.bus_schedules (bus_id, start_date, end_date, departure_time, arrival_time, mon, tue, wed, thu, fri, sat, sun, seat_availability, status)
           VALUES ($1, $2, $3, '08:00', '12:00', true, true, true, true, true, true, true, 28, 'active')`,
          [busId, startDate, endDate]
        );
      }
    }
    console.log("Created routes (multiple per listing), buses, bus_schedules (next 10–20 days).");

    // —— Cars and car_operating_areas ——
    const carIds: string[] = [];
    const areaIds: string[] = [];
    for (const lid of transportListingIds) {
      for (const name of ["Sedan-A", "SUV-B"]) {
        const carRes = await client.query<{ id: string }>(
          `INSERT INTO public.cars (listing_id, name, category, car_type, seats, status) VALUES ($1, $2, 'local', 'sedan', 4, 'active') RETURNING id`,
          [lid, name]
        );
        const cid = carRes.rows[0].id;
        carIds.push(cid);
        const areaRes = await client.query<{ id: string }>(
          `INSERT INTO public.car_operating_areas (car_id, area_type, city_name, base_fare_cents) VALUES ($1, 'local', 'City', 30000) RETURNING id`,
          [cid]
        );
        areaIds.push(areaRes.rows[0].id);
      }
    }
    console.log("Created cars and car_operating_areas.");

    // —— Flights: multiple routes, schedules for each day in next 10–20 days ——
    let flightId: string | null = null;
    const flightRouteIds: string[] = [];
    if (transportListingIds[0]) {
      const fRes = await client.query<{ id: string }>(
        `INSERT INTO public.flights (listing_id, flight_number, airline_name, aircraft_type, flight_type, total_seats, status, base_fare_cents)
         VALUES ($1, '6E-201', 'IndiGo', 'A320', 'domestic', 180, 'active', 500000) RETURNING id`,
        [transportListingIds[0]]
      );
      flightId = fRes.rows[0].id;
      const flightRoutes: [string, string, number][] = [
        ["Hyderabad", "Goa", 450000],
        ["Bangalore", "Delhi", 600000],
        ["Mumbai", "Chennai", 550000],
      ];
      for (const [from, to, fare] of flightRoutes) {
        await client.query(
          "INSERT INTO public.flight_routes (flight_id, from_place, to_place, fare_cents) VALUES ($1, $2, $3, $4)",
          [flightId, from, to, fare]
        );
        const frRes = await client.query<{ id: string }>(
          "SELECT id FROM public.flight_routes WHERE flight_id = $1 AND from_place = $2 AND to_place = $3 LIMIT 1",
          [flightId, from, to]
        );
        if (frRes.rows[0]?.id) flightRouteIds.push(frRes.rows[0].id);
      }
      for (const routeId of flightRouteIds) {
        for (let d = SEED_DAYS_START; d <= SEED_DAYS_END; d++) {
          await client.query(
            `INSERT INTO public.flight_schedules (flight_id, route_id, schedule_date, departure_time, arrival_time, status)
             VALUES ($1, $2, $3, '10:00', '12:00', 'active')`,
            [flightId, routeId, dateOffset(d)]
          );
        }
      }
      console.log("Created flight, flight_routes (3), flight_schedules (next 10–20 days per route).");
    }

    // —— Hotel branches ——
    const hotelBranchIds: string[] = [];
    for (const lid of hotelListingIds) {
      for (const branchName of ["Main Branch", "Beach Branch"]) {
        const r = await client.query<{ id: string }>(
          `INSERT INTO public.hotel_branches (listing_id, name, city) VALUES ($1, $2, 'Goa') RETURNING id`,
          [lid, branchName]
        );
        hotelBranchIds.push(r.rows[0].id);
      }
    }
    console.log("Created hotel_branches.");

    // —— Experiences and slots: multiple slots over next 10–20 days ——
    const experienceIds: string[] = [];
    const experienceSlotIds: string[] = [];
    for (const lid of experienceListingIds) {
      const exRes = await client.query<{ id: string }>(
        `INSERT INTO public.experiences (listing_id, name, category, city, duration_text, max_participants_per_slot, price_per_person_cents, status)
         VALUES ($1, 'Adventure Experience', 'adventure', 'Rishikesh', '2 hours', 10, 150000, 'live') RETURNING id`,
        [lid]
      );
      experienceIds.push(exRes.rows[0].id);
      for (let d = SEED_DAYS_START; d <= SEED_DAYS_END; d += 2) {
        const slotRes = await client.query<{ id: string }>(
          `INSERT INTO public.experience_slots (experience_id, slot_date, slot_time, capacity) VALUES ($1, $2::date, '09:00', 10) RETURNING id`,
          [exRes.rows[0].id, dateOffset(d)]
        );
        experienceSlotIds.push(slotRes.rows[0].id);
      }
    }
    console.log("Created experiences and experience_slots (next 10–20 days).");

    // —— Events and ticket types: dates in next 10–20 days ——
    const eventIds: string[] = [];
    const eventTicketTypeIds: string[] = [];
    const eventStartDay = Math.min(10, SEED_DAYS_END - 1);
    for (const lid of eventListingIds) {
      const evRes = await client.query<{ id: string }>(
        `INSERT INTO public.events (listing_id, name, category, city, venue_name, start_date, end_date, start_time, end_time, organizer_name, status)
         VALUES ($1, 'Demo Concert', 'music', 'Delhi', 'Arena', $2::date, $2::date, '19:00', '22:00', 'City Events', 'live') RETURNING id`,
        [lid, dateOffset(eventStartDay)]
      );
      eventIds.push(evRes.rows[0].id);
      const ttRes = await client.query<{ id: string }>(
        `INSERT INTO public.event_ticket_types (event_id, name, price_cents, quantity_total, max_per_user) VALUES ($1, 'General', 100000, 100, 5) RETURNING id`,
        [evRes.rows[0].id]
      );
      eventTicketTypeIds.push(ttRes.rows[0].id);
    }
    console.log("Created events and event_ticket_types (dates in next 10–20 days).");

    // —— Bookings: transport, car, hotel, flight, experience, event — all spread over next 10–20 days ——
    const bookingRef = () => "T-" + Math.random().toString(36).slice(2, 10).toUpperCase();
    for (let i = 0; i < 8; i++) {
      const uid = userIds[i % userIds.length];
      const route = routeInfo[i % routeInfo.length];
      const busId = busIds[i % busIds.length];
      const travelDay = SEED_DAYS_START + (i % (SEED_DAYS_END - SEED_DAYS_START + 1));
      await client.query(
        `INSERT INTO public.transport_bookings (user_id, booking_id, listing_name, bus_name, travel_date, route_from, route_to, total_cents, selected_seats, passenger_name, email, listing_id, bus_id)
         VALUES ($1, $2, 'Fairytales', 'Volvo', $3, $4, $5, 200000, ARRAY[1,2], 'Guest', $6, $7, $8)`,
        [uid, bookingRef(), dateOffset(travelDay), route.from, route.to, USER_EMAILS[i % USER_EMAILS.length], route.listingId, busId]
      );
    }
    for (let i = 0; i < 5; i++) {
      const uid = userIds[i];
      const ref = "CAR-" + Math.random().toString(36).slice(2, 10).toUpperCase();
      const travelDay = SEED_DAYS_START + 2 + (i % 5);
      await client.query(
        `INSERT INTO public.car_bookings (booking_ref, user_id, listing_id, car_id, area_id, booking_type, city, travel_date, passengers, total_cents, status)
         VALUES ($1, $2, $3, $4, $5, 'local', 'Bangalore', $6::date, 2, 80000, 'confirmed')`,
        [ref, uid, transportListingIds[0], carIds[0], areaIds[0], dateOffset(travelDay)]
      );
    }
    for (let i = 0; i < 4; i++) {
      const ref = "HTL-" + Math.random().toString(36).slice(2, 8).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      const checkInDay = SEED_DAYS_START + 3 + (i % 6);
      const checkOutDay = checkInDay + 2;
      await client.query(
        `INSERT INTO public.hotel_bookings (user_id, hotel_branch_id, listing_id, booking_ref, check_in, check_out, nights, guest_name, status, total_cents)
         VALUES ($1, $2, $3, $4, $5::date, $6::date, 2, $7, 'approved', 150000)`,
        [userIds[i], hotelBranchIds[0], hotelListingIds[0], ref, dateOffset(checkInDay), dateOffset(checkOutDay), USER_NAMES[i]]
      );
    }
    if (flightId && transportListingIds[0]) {
      const flightRoutes = await client.query<{ id: string; from_place: string; to_place: string }>(
        "SELECT id, from_place, to_place FROM public.flight_routes WHERE flight_id = $1",
        [flightId]
      );
      for (let i = 0; i < 3; i++) {
        const ref = "FLT-" + Math.random().toString(36).slice(2, 10).toUpperCase();
        const r = flightRoutes.rows[i % flightRoutes.rows.length];
        const travelDay = SEED_DAYS_START + 5 + (i * 3);
        await client.query(
          `INSERT INTO public.flight_bookings (booking_ref, user_id, listing_id, flight_id, route_from, route_to, travel_date, passengers, total_cents, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7::date, 1, 450000, 'confirmed')`,
          [ref, userIds[i], transportListingIds[0], flightId, r.from_place, r.to_place, dateOffset(travelDay)]
        );
      }
    }
    for (let i = 0; i < 3; i++) {
      const ref = "EXP-" + Math.random().toString(36).slice(2, 10).toUpperCase();
      const slotId = experienceSlotIds[i % experienceSlotIds.length];
      await client.query(
        `INSERT INTO public.experience_bookings (booking_ref, experience_id, experience_slot_id, user_id, participants_count, total_cents, status)
         VALUES ($1, $2, $3, $4, 2, 300000, 'confirmed')`,
        [ref, experienceIds[0], slotId, userIds[i]]
      );
    }
    for (let i = 0; i < 2; i++) {
      const ref = "EVT-" + Math.random().toString(36).slice(2, 10).toUpperCase();
      const ebRes = await client.query<{ id: string }>(
        `INSERT INTO public.event_bookings (booking_ref, event_id, user_id, total_cents, status) VALUES ($1, $2, $3, 200000, 'confirmed') RETURNING id`,
        [ref, eventIds[0], userIds[i]]
      );
      await client.query(
        `INSERT INTO public.event_booking_tickets (event_booking_id, event_ticket_type_id, quantity, unit_price_cents) VALUES ($1, $2, 2, 100000)`,
        [ebRes.rows[0].id, eventTicketTypeIds[0]]
      );
    }
    console.log("Created transport, car, hotel, flight, experience, event bookings (next 10–20 days).");

    // —— Community posts: same images as Explore (full URLs), by new users ——
    const POSTS = [
      { location: "Angkor Wat, Cambodia", img: EXPLORE_IMAGES[0], caption: "Sunrise at Angkor Wat. Unforgettable.", tags: ["#cambodia", "#temples"] },
      { location: "Acropolis, Athens", img: EXPLORE_IMAGES[1], caption: "History comes alive here.", tags: ["#greece", "#history"] },
      { location: "Golden Temple, Amritsar", img: EXPLORE_IMAGES[2], caption: "Peace and spirituality.", tags: ["#amritsar", "#spiritual"] },
      { location: "Taj Mahal, Agra", img: EXPLORE_IMAGES[3], caption: "Icon of love.", tags: ["#india", "#tajmahal"] },
      { location: "Goa Beaches", img: EXPLORE_IMAGES[4], caption: "Beach vibes and sunsets.", tags: ["#goa", "#beach"] },
      { location: "Jaipur, Rajasthan", img: EXPLORE_IMAGES[5], caption: "Pink city never disappoints.", tags: ["#jaipur", "#rajasthan"] },
      { location: "Paris, France", img: EXPLORE_IMAGES[6], caption: "City of lights.", tags: ["#paris", "#europe"] },
      { location: "Ajanta Caves", img: EXPLORE_IMAGES[7], caption: "Ancient rock-cut caves.", tags: ["#india", "#heritage"] },
      { location: "Bali, Indonesia", img: EXPLORE_IMAGES[8], caption: "Tropical paradise.", tags: ["#bali", "#travel"] },
      { location: "Santorini, Greece", img: EXPLORE_IMAGES[9], caption: "Blue domes and sunsets.", tags: ["#santorini", "#greece"] },
    ];
    const postIds: string[] = [];
    for (let i = 0; i < POSTS.length; i++) {
      const p = POSTS[i];
      const uid = userIds[i % userIds.length];
      const r = await client.query<{ id: string }>(
        `INSERT INTO public.posts (user_id, location, image_url, caption, tags) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [uid, p.location, p.img, p.caption, p.tags]
      );
      postIds.push(r.rows[0].id);
    }
    for (let i = 0; i < postIds.length; i++) {
      const postId = postIds[i];
      const authorId = userIds[i % userIds.length];
      const likers = userIds.filter((_, j) => j % 3 !== i % 3).slice(0, 4);
      for (const uid of likers) {
        await client.query("INSERT INTO public.post_likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT (user_id, post_id) DO NOTHING", [uid, postId]);
      }
      if (i < 5) {
        await client.query("INSERT INTO public.comments (post_id, user_id, body) VALUES ($1, $2, $3)", [postId, userIds[(i + 1) % userIds.length], "Amazing shot! 🙌"]);
      }
    }
    await client.query("INSERT INTO public.post_bookmarks (user_id, post_id) VALUES ($1, $2) ON CONFLICT (user_id, post_id) DO NOTHING", [userIds[0], postIds[0]]);
    console.log("Created community posts (same images as Explore), likes, comments, bookmarks.");

    // —— Optional: support tickets ——
    try {
      await client.query(
        `INSERT INTO public.support_tickets (vendor_id, subject, message, admin_reply, admin_replied_at) VALUES ($1, $2, $3, $4, NOW())`,
        [vendorIds[0], "Welcome", "Thanks for the platform.", "You are welcome! We are here to help."]
      );
      console.log("Created support ticket with admin reply.");
    } catch {
      // table may not exist
    }

    console.log("\nSeed complete.");
    console.log("User logins (20): e.g. alice@demo.local /", DEMO_PASSWORD);
    console.log("Vendor logins (10): e.g. fairytales@vendor.demo /", VENDOR_PASSWORD);
    console.log("Explore page: unchanged (static destinations). Community: posts use same destination images.");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
