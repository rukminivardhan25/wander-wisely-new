import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const createPostSchema = z.object({
  location: z.string().min(1),
  image_url: z.string().min(1), // URL or path to uploaded image
  caption: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const createCommentSchema = z.object({
  body: z.string().min(1),
});

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `select p.id, p.user_id, p.location, p.image_url, p.caption, p.tags, p.created_at,
              u.full_name as author_name
       from posts p
       join users u on u.id = p.user_id
       order by p.created_at desc
       limit 100`
    );
    const posts = result.rows;

    const withCounts = await Promise.all(
      posts.map(async (p: { id: string }) => {
        const [likesRes, commentsRes] = await Promise.all([
          query<{ count: string }>("select count(*) as count from post_likes where post_id = $1", [p.id]),
          query<{ count: string }>("select count(*) as count from comments where post_id = $1", [p.id]),
        ]);
        return {
          ...p,
          likes_count: parseInt(likesRes.rows[0]?.count ?? "0", 10),
          comments_count: parseInt(commentsRes.rows[0]?.count ?? "0", 10),
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
    const { location, image_url, caption, tags } = parsed.data;

    const result = await query<{ id: string }>(
      "insert into posts (user_id, location, image_url, caption, tags) values ($1, $2, $3, $4, $5) returning id",
      [userId, location, image_url, caption ?? null, tags]
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

export default router;
