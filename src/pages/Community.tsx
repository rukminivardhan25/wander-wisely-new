import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Bookmark, MapPin, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import destBeach from "@/assets/dest-beach.jpg";
import destCity from "@/assets/dest-city.jpg";
import destJungle from "@/assets/dest-jungle.jpg";
import destTemple from "@/assets/dest-temple.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, getApiUrl } from "@/lib/api";

const IMAGE_MAP: Record<string, string> = {
  "dest-beach": destBeach,
  "dest-city": destCity,
  "dest-jungle": destJungle,
  "dest-temple": destTemple,
};

function getPostImage(imageUrl: string): string {
  if (imageUrl.startsWith("/uploads/")) return getApiUrl(imageUrl);
  return IMAGE_MAP[imageUrl] ?? imageUrl;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 2592000) return `${Math.floor(sec / 86400)}d ago`;
  return d.toLocaleDateString();
}

type ApiPost = {
  id: string;
  user_id: string;
  location: string;
  image_url: string;
  caption: string | null;
  description: string | null;
  tags: string[];
  created_at: string;
  author_name: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  bookmarked_by_me: boolean;
};

type ApiComment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string;
};

type MyCommentRow = {
  id: string;
  post_id: string;
  body: string;
  created_at: string;
  post_location: string;
  post_image_url: string;
  post_caption: string | null;
};

type FeedTab = "all" | "mine" | "bookmarked" | "liked" | "comments";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Community = () => {
  const { token } = useAuth();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [detailPost, setDetailPost] = useState<ApiPost | null>(null);
  const [detailComments, setDetailComments] = useState<ApiComment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createLocation, setCreateLocation] = useState("");
  const [createCaption, setCreateCaption] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createTags, setCreateTags] = useState("");
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
  const [createImageError, setCreateImageError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [feedTab, setFeedTab] = useState<FeedTab>("all");
  const [myComments, setMyComments] = useState<MyCommentRow[]>([]);
  const [myCommentsLoading, setMyCommentsLoading] = useState(false);

  const loadPosts = useCallback(
    (tab?: FeedTab) => {
      const t = tab ?? feedTab;
      if (t === "comments") return;
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      let path = "/api/posts";
      if (t === "mine") path += "?mine=1";
      else if (t === "bookmarked") path += "?bookmarked=1";
      else if (t === "liked") path += "?liked=1";
      apiFetch<{ posts: ApiPost[] }>(path, { headers })
        .then(({ data }) => {
          if (data?.posts) setPosts(data.posts);
          else setPosts([]);
        })
        .finally(() => setLoading(false));
    },
    [token, feedTab]
  );

  const loadMyComments = useCallback(() => {
    if (!token) return;
    setMyCommentsLoading(true);
    apiFetch<{ comments: MyCommentRow[] }>("/api/me/comments", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(({ data }) => {
        if (data?.comments) setMyComments(data.comments);
        else setMyComments([]);
      })
      .finally(() => setMyCommentsLoading(false));
  }, [token]);

  useEffect(() => {
    if (feedTab === "comments") loadMyComments();
    else loadPosts();
  }, [feedTab, loadPosts, loadMyComments]);

  const loadDetail = useCallback(
    async (postId: string) => {
      setDetailLoading(true);
      setDetailPost(null);
      setDetailComments([]);
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const [postRes, commentsRes] = await Promise.all([
        apiFetch<{ post: ApiPost }>(`/api/posts/${postId}`, { headers }),
        apiFetch<{ comments: ApiComment[] }>(`/api/posts/${postId}/comments`),
      ]);
      setDetailLoading(false);
      if (postRes.data?.post) setDetailPost(postRes.data.post);
      if (commentsRes.data?.comments) setDetailComments(commentsRes.data.comments);
    },
    [token]
  );

  useEffect(() => {
    if (detailPostId) loadDetail(detailPostId);
  }, [detailPostId, loadDetail]);

  const handleLike = async (post: ApiPost) => {
    if (!token) return;
    const url = `/api/posts/${post.id}/like`;
    const prev = post.liked_by_me;
    const prevCount = post.likes_count;
    setPosts((p) =>
      p.map((x) =>
        x.id === post.id
          ? {
              ...x,
              liked_by_me: !prev,
              likes_count: prev ? prevCount - 1 : prevCount + 1,
            }
          : x
      )
    );
    if (detailPost?.id === post.id) {
      setDetailPost((dp) =>
        dp
          ? {
              ...dp,
              liked_by_me: !prev,
              likes_count: prev ? prevCount - 1 : prevCount + 1,
            }
          : null
      );
    }
    if (prev) {
      await apiFetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } else {
      await apiFetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    }
  };

  const handleBookmark = async (post: ApiPost) => {
    if (!token) return;
    const url = `/api/posts/${post.id}/bookmark`;
    const prev = post.bookmarked_by_me;
    setPosts((p) =>
      p.map((x) => (x.id === post.id ? { ...x, bookmarked_by_me: !prev } : x))
    );
    if (detailPost?.id === post.id) {
      setDetailPost((dp) => (dp ? { ...dp, bookmarked_by_me: !prev } : null));
    }
    if (prev) {
      await apiFetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } else {
      await apiFetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !createLocation.trim()) return;
    if (!createImageFile) {
      setCreateImageError("Please choose an image to upload.");
      return;
    }
    setCreateImageError(null);
    setCreateSubmitting(true);
    let imageUrl: string;
    try {
      const formData = new FormData();
      formData.append("image", createImageFile);
      const res = await fetch(getApiUrl("/api/upload"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateImageError((data as { error?: string }).error ?? "Upload failed.");
        setCreateSubmitting(false);
        return;
      }
      imageUrl = (data as { url?: string }).url;
      if (!imageUrl) {
        setCreateImageError("Upload did not return an image URL.");
        setCreateSubmitting(false);
        return;
      }
    } catch {
      setCreateImageError("Failed to upload image.");
      setCreateSubmitting(false);
      return;
    }
    const tags = createTags
      .split(/[\s,#]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));
    const { status } = await apiFetch<{ id: string }>("/api/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        location: createLocation.trim(),
        image_url: imageUrl,
        caption: createCaption.trim() || undefined,
        description: createDescription.trim() || undefined,
        tags,
      },
    });
    setCreateSubmitting(false);
    if (status === 201) {
      setCreateOpen(false);
      setCreateLocation("");
      setCreateCaption("");
      setCreateDescription("");
      setCreateTags("");
      setCreateImageFile(null);
      setCreateImagePreview(null);
      setCreateImageError(null);
      loadPosts();
    }
  };

  const handleCreateImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCreateImageError(null);
    if (createImagePreview) URL.revokeObjectURL(createImagePreview);
    if (!file) {
      setCreateImageFile(null);
      setCreateImagePreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setCreateImageError("Please select an image file (e.g. JPEG, PNG).");
      setCreateImageFile(null);
      setCreateImagePreview(null);
      return;
    }
    setCreateImageFile(file);
    setCreateImagePreview(URL.createObjectURL(file));
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !detailPostId || !commentBody.trim()) return;
    setCommentSubmitting(true);
    const { status } = await apiFetch(`/api/posts/${detailPostId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { body: commentBody.trim() },
    });
    setCommentSubmitting(false);
    if (status === 201) {
      setCommentBody("");
      loadDetail(detailPostId);
      if (feedTab === "comments") loadMyComments();
    }
  };

  return (
    <Layout>
      <section className="pt-24 pb-8 bg-sand">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4"
          >
            Travel Community
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground max-w-lg mx-auto mb-8"
          >
            Share your travel stories, tips, and photos with fellow wanderers.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button variant="hero" onClick={() => setCreateOpen(true)}>
              + Create Post
            </Button>
          </motion.div>

          {token && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex flex-wrap justify-center gap-2 mt-6"
            >
              {(
                [
                  { id: "all" as const, label: "All" },
                  { id: "mine" as const, label: "My posts" },
                  { id: "bookmarked" as const, label: "Bookmarks" },
                  { id: "liked" as const, label: "Liked" },
                  { id: "comments" as const, label: "My comments" },
                ] as const
              ).map(({ id, label }) => (
                <Button
                  key={id}
                  variant={feedTab === id ? "hero" : "outline"}
                  size="sm"
                  onClick={() => setFeedTab(id)}
                >
                  {label}
                </Button>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">
          {feedTab === "comments" ? (
            <>
              {myCommentsLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading your comments…</p>
              ) : myComments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">You haven’t commented on any posts yet.</p>
              ) : (
                <div className="space-y-4">
                  {myComments.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial="hidden"
                      animate="visible"
                      variants={fadeUp}
                      custom={i}
                      className="bg-card rounded-2xl shadow-soft p-4 flex flex-col sm:flex-row gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">
                          On post: {c.post_location} · {formatTime(c.created_at)}
                        </p>
                        <p className="text-sm text-card-foreground">{c.body}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setDetailPostId(c.post_id)}
                      >
                        View post
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          ) : loading ? (
            <p className="text-muted-foreground text-center py-8">Loading…</p>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {feedTab === "all"
                ? "No posts yet. Be the first to share!"
                : feedTab === "mine"
                  ? "You haven’t posted yet."
                  : feedTab === "bookmarked"
                    ? "No bookmarked posts."
                    : "No liked posts yet."}
            </p>
          ) : (
            posts.map((post, i) => (
              <motion.article
                key={post.id}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={i}
                className="bg-card rounded-2xl shadow-soft overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-sunset flex items-center justify-center text-accent-foreground font-bold text-sm">
                    {(post.author_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-card-foreground truncate">{post.author_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" /> {post.location} · {formatTime(post.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-accent shrink-0"
                    onClick={() => setDetailPostId(post.id)}
                  >
                    View details
                  </Button>
                </div>

                <img
                  src={getPostImage(post.image_url)}
                  alt={post.caption || ""}
                  className="w-full aspect-[4/3] object-cover cursor-pointer"
                  loading="lazy"
                  onClick={() => setDetailPostId(post.id)}
                />

                <div className="p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <button
                      type="button"
                      className={`flex items-center gap-1 transition-colors ${
                        post.liked_by_me ? "text-red-500" : "text-muted-foreground hover:text-accent"
                      }`}
                      onClick={() => handleLike(post)}
                    >
                      <Heart className={`w-5 h-5 ${post.liked_by_me ? "fill-current" : ""}`} />
                      <span className="text-sm">{post.likes_count}</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors"
                      onClick={() => setDetailPostId(post.id)}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm">{post.comments_count}</span>
                    </button>
                    <button type="button" className="text-muted-foreground hover:text-accent transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className={`ml-auto transition-colors ${
                        post.bookmarked_by_me ? "text-accent" : "text-muted-foreground hover:text-accent"
                      }`}
                      onClick={() => handleBookmark(post)}
                    >
                      <Bookmark className={`w-5 h-5 ${post.bookmarked_by_me ? "fill-current" : ""}`} />
                    </button>
                  </div>
                  {post.caption && (
                    <p className="text-sm font-bold text-card-foreground mb-1">{post.caption}</p>
                  )}
                  {post.description && (
                    <p className="text-sm text-card-foreground mb-2">{post.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {(post.tags || []).map((tag) => (
                      <span key={tag} className="text-xs text-accent font-medium">
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.article>
            ))
          )}
        </div>
      </section>

      {/* Create Post modal */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && createImagePreview) URL.revokeObjectURL(createImagePreview);
          if (!open) {
            setCreateImageFile(null);
            setCreateImagePreview(null);
            setCreateImageError(null);
            setCreateLocation("");
            setCreateCaption("");
            setCreateDescription("");
            setCreateTags("");
          }
          setCreateOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div>
              <Label htmlFor="create-location">Location</Label>
              <Input
                id="create-location"
                value={createLocation}
                onChange={(e) => setCreateLocation(e.target.value)}
                placeholder="e.g. Bali, Indonesia"
                required
              />
            </div>
            <div>
              <Label htmlFor="create-image">Upload photo</Label>
              <input
                type="file"
                id="create-image"
                accept="image/*"
                onChange={handleCreateImageChange}
                className="w-full mt-1 text-sm file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-accent file:text-accent-foreground hover:file:bg-accent/90"
              />
              {createImagePreview && (
                <img
                  src={createImagePreview}
                  alt="Preview"
                  className="mt-2 w-full max-h-48 object-cover rounded-lg border border-input"
                />
              )}
              {createImageError && (
                <p className="mt-1 text-sm text-destructive">{createImageError}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-caption" className="font-bold">Caption</Label>
              <Input
                id="create-caption"
                value={createCaption}
                onChange={(e) => setCreateCaption(e.target.value)}
                placeholder="Short headline for your post"
              />
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <textarea
                id="create-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Describe what’s in the photo, where you were, or what you loved..."
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <Label htmlFor="create-tags">Tags (comma or # separated)</Label>
              <Input
                id="create-tags"
                value={createTags}
                onChange={(e) => setCreateTags(e.target.value)}
                placeholder="#travel #beach"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={createSubmitting}>
                {createSubmitting ? "Posting…" : "Post"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Post detail modal (view details + comments) */}
      <Dialog open={!!detailPostId} onOpenChange={(open) => !open && setDetailPostId(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Post details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-muted-foreground py-4">Loading…</p>
          ) : detailPost ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-sunset flex items-center justify-center text-accent-foreground font-bold text-sm">
                  {(detailPost.author_name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{detailPost.author_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {detailPost.location} · {formatTime(detailPost.created_at)}
                  </p>
                </div>
              </div>
              <img
                src={getPostImage(detailPost.image_url)}
                alt={detailPost.caption || ""}
                className="w-full aspect-[4/3] object-cover rounded-lg"
              />
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className={`flex items-center gap-1 ${detailPost.liked_by_me ? "text-red-500" : "text-muted-foreground"}`}
                  onClick={() => handleLike(detailPost)}
                >
                  <Heart className={`w-5 h-5 ${detailPost.liked_by_me ? "fill-current" : ""}`} />
                  <span className="text-sm">{detailPost.likes_count}</span>
                </button>
                <button
                  type="button"
                  className={`ml-auto ${detailPost.bookmarked_by_me ? "text-accent" : "text-muted-foreground"}`}
                  onClick={() => handleBookmark(detailPost)}
                >
                  <Bookmark className={`w-5 h-5 ${detailPost.bookmarked_by_me ? "fill-current" : ""}`} />
                </button>
              </div>
              {detailPost.caption && (
                <p className="text-sm font-bold text-card-foreground">{detailPost.caption}</p>
              )}
              {detailPost.description && (
                <p className="text-sm text-card-foreground mt-1">{detailPost.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {(detailPost.tags || []).map((tag) => (
                  <span key={tag} className="text-xs text-accent font-medium">
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </span>
                ))}
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-semibold mb-2">Comments ({detailComments.length})</p>
                <ul className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {detailComments.map((c) => (
                    <li key={c.id} className="text-sm">
                      <span className="font-medium">{c.author_name}</span>: {c.body}
                    </li>
                  ))}
                </ul>
                {token && (
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <Input
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={commentSubmitting || !commentBody.trim()}>
                      {commentSubmitting ? "…" : "Post"}
                    </Button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground py-4">Post not found.</p>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Community;
