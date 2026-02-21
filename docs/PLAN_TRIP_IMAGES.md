# Plan Trip: AI & Images

## Itinerary text: **Groq**

- **Groq** is used to generate the day-by-day plan (activities, places, tips) from your trip form.
- Get a free API key: [console.groq.com](https://console.groq.com). Set `GROQ_API_KEY` in `backend/.env`.

## Images: options (realistic vs AI)

### Recommended: **Real photos (most realistic)**

| Service       | Notes |
|---------------|--------|
| **Unsplash**  | Free API, real high-quality photos. Used by default: search by place name (e.g. "Manali India"). Set `UNSPLASH_ACCESS_KEY` in backend `.env`. [unsplash.com/developers](https://unsplash.com/developers). |
| **Pexels**    | Free API, real photos and videos. Alternative to Unsplash. [pexels.com/api](https://www.pexels.com/api/). |
| **Pixabay**   | Free API, large library of real photos. [pixabay.com/api/docs](https://pixabay.com/api/docs/). |

For a travel app, **Unsplash (or Pexels)** is the best fit: real photos of destinations, no extra cost, and no “AI look”.

### Optional: **AI-generated images**

If you want AI-generated “realistic” images instead of real photos:

| Service           | Notes |
|-------------------|--------|
| **OpenAI DALL·E 3** | High quality, good at “realistic photo of X”. Paid; use from backend with `OPENAI_API_KEY`. |
| **Stability AI**  | Stable Diffusion; can be tuned for realistic style. Use via [Stability API](https://platform.stability.ai/) or Replicate. |
| **Ideogram**      | Good at realistic and text-in-image. [ideogram.ai](https://ideogram.ai) (API when available). |
| **Flux**          | High-quality generations; access via [Replicate](https://replicate.com) or similar. |

This app is set up to use **Groq for the plan** and **Unsplash for images**. You can swap the image layer to Pexels or an AI provider later by changing the backend image service.
