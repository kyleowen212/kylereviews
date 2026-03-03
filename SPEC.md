# Kyle.Reviews — Technical Spec & Deployment Guide

## Project Overview

**Kyle.Reviews** is a single-user CMS and personal recommendation blog. It presents a chronological, categorized feed of reviews for movies, books, TV shows, albums, podcasts, recipes, experiences, and more. The system is designed around one core principle: **posting a new recommendation should take under 60 seconds.**

---

## Architecture

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js 14** (App Router) | Full-stack in one project. Huge ecosystem, excellent docs. |
| Database | **SQLite** via Prisma ORM | Zero config, single file, perfect for single-user. |
| Styling | **Tailwind CSS** | Utility-first, fast to customize. |
| Auth | **JWT cookies** + bcrypt | Simple, stateless, no third-party dependency. |
| RSS | **feed** npm package | Generates RSS 2.0 and Atom feeds. |
| Hosting | **Railway** or **Fly.io** | $5-7/mo, beginner-friendly, supports SQLite. |

### External APIs (all free)

| Service | Used For | Key Required? |
|---------|----------|---------------|
| **TMDB** (themoviedb.org) | Movies & TV: poster, director, cast, trailer | Yes (free signup) |
| **Open Library** | Books: cover, author, pages, publisher | No |
| **MusicBrainz** | Albums & songs: artist, year, cover art | No |
| **Podcast Index** | Podcasts: artwork, host, description | Yes (free signup) |

### Project Structure

```
kyle-reviews/
├── app/                          # Next.js App Router
│   ├── layout.js                 # Root layout (fonts, RSS link)
│   ├── globals.css               # Tailwind + custom styles
│   ├── page.js                   # Public home (server component)
│   ├── HomeClient.js             # Home feed + filters + timeline (client)
│   ├── r/[slug]/page.js          # Individual review page
│   ├── suggest/page.js           # Public suggestion form
│   ├── admin/page.js             # Admin dashboard (login + quick post)
│   └── api/
│       ├── auth/route.js         # Login/logout/check
│       ├── categories/route.js   # List categories
│       ├── reviews/route.js      # CRUD reviews
│       ├── suggestions/route.js  # Public submit + admin manage
│       ├── search/route.js       # Proxy to external APIs
│       └── rss/route.js          # RSS 2.0 and Atom feeds
├── lib/
│   ├── prisma.js                 # Prisma client singleton
│   ├── auth.js                   # JWT helpers
│   ├── external-apis.js          # TMDB, Open Library, MusicBrainz, Podcast Index
│   ├── rss.js                    # Feed generator
│   └── utils.js                  # Slug helpers
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.js                   # Seeds categories + admin user
├── public/                       # Static assets
├── .env.example                  # Environment variables template
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

---

## Data Model

### Category

Extensible review types. Adding a new type (e.g., "Video Game") means adding one row to this table — no code changes needed for basic support.

| Field | Type | Description |
|-------|------|-------------|
| slug | String | URL-friendly identifier: "movie", "book", etc. |
| name | String | Display name: "Movie", "Book" |
| icon | String | Emoji for UI badges |
| metaFields | JSON | Schema of category-specific fields (see below) |
| apiSource | String | Which external API to use: "tmdb", "openlibrary", etc. |
| sortOrder | Int | Display order in filters |

**metaFields example (Movie):**
```json
{
  "director": { "label": "Director", "type": "text" },
  "runtime": { "label": "Runtime", "type": "text" },
  "genre": { "label": "Genre", "type": "text" },
  "cast": { "label": "Cast", "type": "text" },
  "year": { "label": "Year", "type": "text" }
}
```

### Review

| Field | Type | Description |
|-------|------|-------------|
| title | String | Title of the item |
| slug | String | URL slug (auto-generated) |
| categoryId | FK → Category | Which type of item |
| body | Text | Your review (markdown-ready) |
| metadata | JSON | Category-specific data (filled from API) |
| coverImage | String? | Poster/cover URL (auto-fetched or uploaded) |
| personalPhotos | JSON | Array of uploaded photo paths |
| embedUrl | String? | YouTube trailer, Qobuz/Spotify embed URL |
| embedType | String? | "youtube", "qobuz", "spotify", "apple-music" |
| published | Boolean | Draft vs. live |
| publishedAt | DateTime? | When it went live |
| suggestionId | FK? → Suggestion | If promoted from a suggestion |

### Suggestion

| Field | Type | Description |
|-------|------|-------------|
| name | String | Who suggested it |
| itemTitle | String | What they're suggesting |
| categoryId | FK? → Category | Optional category |
| message | Text | Why they recommend it |
| status | String | "new", "reviewing", "accepted", "declined" |

---

## Key Workflows

### Posting a Recommendation (Admin)

This is the most important workflow and has been optimized for speed:

1. **Navigate to /admin** and log in (session persists 7 days)
2. **Pick a category** — click one of the emoji tiles (Movie, Book, Album, etc.)
3. **Search** — type the title, hit Enter. The app queries the appropriate external API.
4. **Select a result** — click the matching item. The app fetches full details (director, cast, cover image, trailer, etc.) and auto-fills everything.
5. **Write your blurb** — the only thing you must type manually. Can be a single sentence.
6. **Optionally** paste a Qobuz/Spotify embed URL for music, or adjust any auto-filled field.
7. **Click "Publish Now"** — done. The review is live on the home page immediately.

For categories without API support (Recipe, Experience), step 3 becomes "type the title" and step 4 is skipped — you fill in fields manually.

### Receiving and Promoting Suggestions

1. A visitor goes to **/suggest** and fills out the simple form (name + what they're suggesting + optional message)
2. The suggestion appears in your **admin dashboard inbox**
3. You can **dismiss** it or click **"Review this"** to start creating a post
4. When you create the post, the suggestion is automatically linked and marked as accepted

### RSS Feed

Available at **/api/rss** (RSS 2.0) and **/api/rss?format=atom** (Atom). Full-text feed including cover images, metadata, and review body. Auto-discovered via `<link>` tag in the HTML head.

---

## Frontend Design

### Public Home Page

- **Header:** "Kyle.Reviews" in a serif display font, with "Suggest something" and "RSS" links
- **Filter bar:** Horizontal row of pill-shaped category buttons. Click to filter, click again to clear.
- **Feed:** Scrolling list of review cards, each showing cover image, title, category badge, metadata, and review text
- **Timeline sidebar** (desktop only): Sticky right-side panel showing months/years with dots. Click to jump to that section of the feed.
- **Design language:** Warm, editorial feel. Cream background (#faf9f6), terracotta accent (#c45d3e), serif headings (DM Serif Display), clean sans-serif body (DM Sans).

### Individual Review Page (/r/[slug])

Full detail view with large cover image, all metadata displayed vertically, the review body, embedded media (trailer, music player), and personal photos in a grid.

### Suggestion Page (/suggest)

Minimal form: name, item title, optional category dropdown, optional message. Friendly confirmation on submit.

### Admin Dashboard (/admin)

Three sections stacked vertically:
1. **Quick Post** — the stepped wizard (category → search → review → publish)
2. **Suggestion Inbox** — new suggestions with dismiss/promote buttons
3. **Recent Posts** — list of recent reviews with draft indicators

---

## Deployment Guide

### Prerequisites

- **Node.js 18+** installed on your machine
- A free **TMDB API key** (sign up at themoviedb.org/settings/api)
- Optionally, Podcast Index API keys

### Local Development

```bash
# 1. Clone or download the project
cd kyle-reviews

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your TMDB_API_KEY

# 4. Initialize the database
npx prisma db push
node prisma/seed.js

# 5. Start the dev server
npm run dev
# Visit http://localhost:3000
# Admin at http://localhost:3000/admin (username: kyle, password: changeme123)
```

### Deploying to Railway (Recommended)

The project includes a `Dockerfile` and `railway.toml` for one-click deployment. Full step-by-step instructions are in [README.md](./README.md#deploying-to-railway), but the summary is:

1. Push the repo to GitHub
2. Create a new Railway project from that repo
3. Add a persistent volume mounted at `/app/prisma` for the SQLite database
4. Set environment variables: `DATABASE_URL`, `JWT_SECRET`, `TMDB_API_KEY`, `SITE_URL`
5. Deploy — Railway builds from the Dockerfile automatically
6. Change the default admin password via Railway's shell

**Cost:** Railway's Hobby plan is $5/month and includes enough for this site.

**Custom domain:** In Railway's dashboard, go to Settings → Networking → Custom Domain. Add your domain and point a DNS CNAME record to the provided Railway hostname.

### Deploying to Fly.io (Alternative)

```bash
# 1. Install flyctl
curl -L https://fly.io/install.sh | sh

# 2. Create the app
fly launch

# 3. Create a persistent volume for SQLite
fly volumes create data --size 1

# 4. Set secrets
fly secrets set JWT_SECRET="your-random-secret"
fly secrets set TMDB_API_KEY="your-tmdb-key"
fly secrets set SITE_URL="https://your-app.fly.dev"

# 5. Deploy
fly deploy
```

### Backups

Since SQLite is a single file, backups are simple:

```bash
# Local backup
cp prisma/dev.db backups/backup-$(date +%Y%m%d).db

# On Railway, you can download the DB via:
railway run cat prisma/prod.db > backup.db
```

---

## Adding New Categories

To add a new review type (e.g., "Video Game"):

1. **Run Prisma Studio** to add a row to the Category table:
   ```bash
   npx prisma studio
   ```
2. **Fill in the fields:**
   - slug: `video-game`
   - name: `Video Game`
   - icon: `🎮`
   - sortOrder: `9`
   - apiSource: `none` (or add a new API integration)
   - metaFields: `{"platform": {"label": "Platform", "type": "text"}, "developer": {"label": "Developer", "type": "text"}}`

3. That's it. The category will immediately appear in the filter bar, suggestion form, and admin dashboard. No code changes needed.

To add API auto-import for the new category, add a search function in `lib/external-apis.js` and wire it into the `searchExternal` and `getExternalDetails` switch statements.

---

## Future Enhancements

These are natural next steps once the core is running:

- **Image uploads:** Add file upload to the admin form (currently uses URL references). Would use the `multer` + `sharp` packages already in package.json.
- **Markdown rendering:** The body field supports plain text now. Adding a markdown renderer (e.g., `react-markdown`) would allow richer formatting.
- **Search on the public site:** Add a search bar to the home page that filters by title/body text.
- **Pagination:** Currently loads all reviews. For 100+ reviews, add cursor-based pagination.
- **Qobuz search integration:** Qobuz doesn't have a public search API, but if they add one, it could be integrated for auto-filling embed URLs.
- **IGDB integration:** For video games, the IGDB API (Twitch-owned) provides metadata similar to TMDB for movies.
- **Social sharing previews:** Add OpenGraph meta tags to individual review pages for nice link previews on social media.
- **Analytics:** A simple hit counter per review, or integrate Plausible/Umami for privacy-respecting analytics.
