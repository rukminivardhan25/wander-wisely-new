import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";

const router = Router();

const createPostSchema = z.object({
  location: z.string().min(1),
  image_url: z.string().min(1), // slug e.g. dest-beach or full URL
  caption: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const createCommentSchema = z.object({
  body: z.string().min(1),
});

router.get("/", optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId ?? null;
    const mine = req.query.mine === "1" || req.query.mine === "true";
    const bookmarked = req.query.bookmarked === "1" || req.query.bookmarked === "true";
    const liked = req.query.liked === "1" || req.query.liked === "true";

    if ((mine || bookmarked || liked) && !userId) {
      res.status(401).json({ error: "Sign in to view this feed." });
      return;
    }

    let sql = `select p.id, p.user_id, p.location, p.image_url, p.caption, p.description, p.tags, p.created_at,
              u.full_name as author_name
       from posts p
       join users u on u.id = p.user_id`;
    const params: string[] = [];
    let paramIndex = 1;

    if (mine) {
      sql += ` where p.user_id = $${paramIndex}`;
      params.push(userId!);
      paramIndex++;
    }
    if (bookmarked) {
      sql += (mine ? " and" : " where") + ` exists (select 1 from post_bookmarks pb where pb.post_id = p.id and pb.user_id = $${paramIndex})`;
      params.push(userId!);
      paramIndex++;
    }
    if (liked) {
      sql += (mine || bookmarked ? " and" : " where") + ` exists (select 1 from post_likes pl where pl.post_id = p.id and pl.user_id = $${paramIndex})`;
      params.push(userId!);
      paramIndex++;
    }

    sql += " order by p.created_at desc limit 100";
    const result = await query(sql, params);
    const posts = result.rows;

    const withCounts = await Promise.all(
      posts.map(async (p: { id: string }) => {
        const [likesRes, commentsRes, likedByMeRes, bookmarkedByMeRes] = await Promise.all([
          query<{ count: string }>("select count(*) as count from post_likes where post_id = $1", [p.id]),
          query<{ count: string }>("select count(*) as count from comments where post_id = $1", [p.id]),
          userId ? query<{ count: string }>("select count(*) as count from post_likes where post_id = $1 and user_id = $2", [p.id, userId]) : Promise.resolve({ rows: [{ count: "0" }] }),
          userId ? query<{ count: string }>("select count(*) as count from post_bookmarks where post_id = $1 and user_id = $2", [p.id, userId]) : Promise.resolve({ rows: [{ count: "0" }] }),
        ]);
        return {
          ...p,
          likes_count: parseInt(likesRes.rows[0]?.count ?? "0", 10),
          comments_count: parseInt(commentsRes.rows[0]?.count ?? "0", 10),
          liked_by_me: parseInt(likedByMeRes.rows[0]?.count ?? "0", 10) > 0,
          bookmarked_by_me: parseInt(bookmarkedByMeRes.rows[0]?.count ?? "0", 10) > 0,
        };
      })
    );

    res.json({ posts: withCounts });
  } catch (err) {
    console.error("List posts error:", err);
    res.status(500).json({ error: "Failed to list posts" });
  }
});

router.post("/", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const userId = req.userId!;
    const { location, image_url, caption, description, tags } = parsed.data;

    const result = await query<{ id: string }>(
      "insert into posts (user_id, location, image_url, caption, description, tags) values ($1, $2, $3, $4, $5, $6) returning id",
      [userId, location, image_url, caption ?? null, description ?? null, tags]
    );
    res.status(201).json({ id: result.rows[0].id, message: "Post created" });
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.get("/:id/comments", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: postId } = req.params;
    const result = await query(
      `select c.id, c.post_id, c.user_id, c.body, c.created_at, u.full_name as author_name
       from comments c
       join users u on u.id = c.user_id
       where c.post_id = $1 order by c.created_at asc`,
      [postId]
    );
    res.json({ comments: result.rows });
  } catch (err) {
    console.error("List comments error:", err);
    res.status(500).json({ error: "Failed to list comments" });
  }
});

router.post("/:id/comments", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const userId = req.userId!;
    const { id: postId } = req.params;
    const { body } = parsed.data;

    await query(
      "insert into comments (post_id, user_id, body) values ($1, $2, $3)",
      [postId, userId, body]
    );
    res.status(201).json({ message: "Comment added" });
  } catch (err) {
    console.error("Create comment error:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

router.post("/:id/like", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: postId } = req.params;

    await query(
      "insert into post_likes (user_id, post_id) values ($1, $2) on conflict (user_id, post_id) do nothing",
      [userId, postId]
    );
    res.json({ message: "Liked" });
  } catch (err) {
    console.error("Like post error:", err);
    res.status(500).json({ error: "Failed to like post" });
  }
});

router.delete("/:id/like", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: postId } = req.params;

    await query("delete from post_likes where user_id = $1 and post_id = $2", [userId, postId]);
    res.json({ message: "Unliked" });
  } catch (err) {
    console.error("Unlike post error:", err);
    res.status(500).json({ error: "Failed to unlike post" });
  }
});

router.post("/:id/bookmark", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: postId } = req.params;
    await query(
      "insert into post_bookmarks (user_id, post_id) values ($1, $2) on conflict (user_id, post_id) do nothing",
      [userId, postId]
    );
    res.json({ message: "Bookmarked" });
  } catch (err) {
    console.error("Bookmark post error:", err);
    res.status(500).json({ error: "Failed to bookmark post" });
  }
});

router.delete("/:id/bookmark", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: postId } = req.params;
    await query("delete from post_bookmarks where user_id = $1 and post_id = $2", [userId, postId]);
    res.json({ message: "Bookmark removed" });
  } catch (err) {
    console.error("Remove bookmark error:", err);
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
});

/** GET /api/posts/:id — Single post with counts and liked/bookmarked by current user. */
router.get("/:id", optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId ?? null;
    const { id: postId } = req.params;
    const result = await query(
      `select p.id, p.user_id, p.location, p.image_url, p.caption, p.description, p.tags, p.created_at,
              u.full_name as author_name
       from posts p
       join users u on u.id = p.user_id
       where p.id = $1`,
      [postId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    const p = result.rows[0] as { id: string };
    const [likesRes, commentsRes, likedByMeRes, bookmarkedByMeRes] = await Promise.all([
      query<{ count: string }>("select count(*) as count from post_likes where post_id = $1", [p.id]),
      query<{ count: string }>("select count(*) as count from comments where post_id = $1", [p.id]),
      userId ? query<{ count: string }>("select count(*) as count from post_likes where post_id = $1 and user_id = $2", [p.id, userId]) : Promise.resolve({ rows: [{ count: "0" }] }),
      userId ? query<{ count: string }>("select count(*) as count from post_bookmarks where post_id = $1 and user_id = $2", [p.id, userId]) : Promise.resolve({ rows: [{ count: "0" }] }),
    ]);
    const post = {
      ...result.rows[0],
      likes_count: parseInt(likesRes.rows[0]?.count ?? "0", 10),
      comments_count: parseInt(commentsRes.rows[0]?.count ?? "0", 10),
      liked_by_me: parseInt(likedByMeRes.rows[0]?.count ?? "0", 10) > 0,
      bookmarked_by_me: parseInt(bookmarkedByMeRes.rows[0]?.count ?? "0", 10) > 0,
    };
    res.json({ post });
  } catch (err) {
    console.error("Get post error:", err);
    res.status(500).json({ error: "Failed to get post" });
  }
});

export default router;
