/**
 * Seed 5 demo users, community posts (using static image slugs), and likes.
 * Run after: npm run db:init (so 017_posts_community.sql is applied).
 * Usage: npm run db:seed-community
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

const DEMO_USERS = [
  { email: "sarah@wander-demo.local", full_name: "Sarah M." },
  { email: "alex@wander-demo.local", full_name: "Alex K." },
  { email: "rahul@wander-demo.local", full_name: "Rahul V." },
  { email: "priya@wander-demo.local", full_name: "Priya R." },
  { email: "daniel@wander-demo.local", full_name: "Daniel T." },
];

const DEMO_POSTS = [
  { location: "Bali, Indonesia", image_url: "dest-beach", caption: "Found this hidden beach away from the crowds. The water is crystal clear! 🌊", tags: ["#bali", "#beach", "#budgettravel"] },
  { location: "Prague, Czech Republic", image_url: "dest-city", caption: "The architecture here is straight out of a fairytale. Every corner is photo-worthy! 📸", tags: ["#prague", "#culture", "#europe"] },
  { location: "Coorg, India", image_url: "dest-jungle", caption: "Trekking through the Western Ghats. The waterfalls here are unreal! 🏞️", tags: ["#india", "#nature", "#adventure"] },
  { location: "Angkor Wat, Cambodia", image_url: "dest-temple", caption: "Sunrise at Angkor Wat is a spiritual experience unlike anything else. 🌅", tags: ["#angkorwat", "#spiritual", "#asia"] },
  { location: "Goa, India", image_url: "dest-beach", caption: "Beach vibes and sunset chai. Perfect end to the day.", tags: ["#goa", "#beach", "#india"] },
  { location: "Jaipur, India", image_url: "dest-temple", caption: "Palace of Winds – the pink city never disappoints.", tags: ["#jaipur", "#heritage", "#rajasthan"] },
  { location: "Kerala Backwaters", image_url: "dest-jungle", caption: "Houseboat through the backwaters. So peaceful!", tags: ["#kerala", "#backwaters", "#nature"] },
  { location: "Paris, France", image_url: "dest-city", caption: "City of lights and endless walks. ❤️", tags: ["#paris", "#europe", "#culture"] },
];

async function run() {
  const client = await pool.connect();
  try {
    const password_hash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
    const userIds: string[] = [];

    for (const u of DEMO_USERS) {
      const existing = await client.query("select id from users where email = $1", [u.email]);
      if (existing.rows.length > 0) {
        userIds.push(existing.rows[0].id);
        console.log("User exists:", u.email);
        continue;
      }
      const ins = await client.query<{ id: string }>(
        "insert into users (email, password_hash, full_name) values ($1, $2, $3) returning id",
        [u.email, password_hash, u.full_name]
      );
      userIds.push(ins.rows[0].id);
      console.log("Created user:", u.email);
    }

    if (userIds.length < 5) {
      console.log("Need 5 users; found", userIds.length, "- run seed again or check DB.");
    }

    const postIds: string[] = [];
    for (let i = 0; i < DEMO_POSTS.length; i++) {
      const p = DEMO_POSTS[i];
      const authorId = userIds[i % userIds.length];
      const ins = await client.query<{ id: string }>(
        `insert into posts (user_id, location, image_url, caption, tags)
         values ($1, $2, $3, $4, $5)
         returning id`,
        [authorId, p.location, p.image_url, p.caption, p.tags]
      );
      postIds.push(ins.rows[0].id);
    }
    console.log("Created", postIds.length, "posts.");

    let likeCount = 0;
    for (let i = 0; i < postIds.length; i++) {
      const postId = postIds[i];
      const authorIdx = i % userIds.length;
      const likers = userIds.filter((_, idx) => idx !== authorIdx);
      const n = 2 + (i % 3);
      const toLike = likers.slice(0, Math.min(n, likers.length));
      for (const uid of toLike) {
        await client.query(
          "insert into post_likes (user_id, post_id) values ($1, $2) on conflict (user_id, post_id) do nothing",
          [uid, postId]
        );
        likeCount++;
      }
    }
    console.log("Created", likeCount, "likes.");

    console.log("Seed done. Demo logins: e.g. sarah@wander-demo.local /", DEMO_PASSWORD);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
