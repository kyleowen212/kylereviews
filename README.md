# Kyle.Reviews

A personal recommendation blog — a curated feed of movies, books, albums, TV shows, podcasts, recipes, experiences, products, and more.

## Quick Start (Local Development)

```bash
npm install
cp .env.example .env          # Add your TMDB API key
npx prisma db push             # Create the database
node prisma/seed.js            # Seed categories + admin user
npm run dev                    # Start at http://localhost:3000
```

**Admin dashboard:** http://localhost:3000/admin
- Username: `kyle`
- Password: `changeme123` (change this!)

**Public suggestion form:** http://localhost:3000/suggest

**RSS feed:** http://localhost:3000/api/rss

## Posting a Recommendation

1. Go to /admin → pick a category
2. Search for the title → select from results (auto-fills metadata)
3. Write a sentence or paragraph about why you recommend it
4. Click Publish

That's it. Under 60 seconds.

---

## Deploying to Railway

Railway is a cloud hosting platform that makes deployment simple. Here's the complete step-by-step process.

### Prerequisites

1. **A GitHub account** — Railway deploys from GitHub repos
2. **A free TMDB API key** — sign up at https://www.themoviedb.org/settings/api (takes 2 minutes)
3. **A Railway account** — sign up at https://railway.app (connect with your GitHub account)

### Step 1: Push the code to GitHub

Create a new repository on GitHub, then push this project to it:

```bash
cd kyle-reviews
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kyle-reviews.git
git push -u origin main
```

### Step 2: Create a new project on Railway

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub Repo"**
3. Select your `kyle-reviews` repository
4. Railway will detect the Dockerfile and start building

### Step 3: Add a persistent volume

SQLite needs a persistent disk so your data survives redeployments:

1. In your Railway project, click on your service
2. Go to the **Settings** tab
3. Scroll down to **Mounts** (or click "+ Mount" in the sidebar)
4. Add a mount:
   - **Mount Path:** `/app/prisma`
   - **Name:** `sqlite-data`
5. This ensures your database file persists between deploys

### Step 4: Set environment variables

In your Railway service, go to the **Variables** tab and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `file:./kyle-reviews.db` |
| `JWT_SECRET` | *(generate a random string — run `openssl rand -hex 32` in your terminal)* |
| `TMDB_API_KEY` | *(your TMDB API key)* |
| `SITE_URL` | *(leave blank for now, fill in after you get your URL)* |
| `PODCAST_INDEX_KEY` | *(optional — only needed for podcast search)* |
| `PODCAST_INDEX_SECRET` | *(optional — only needed for podcast search)* |

### Step 5: Deploy

Railway auto-deploys when you push to GitHub. After setting up the volume and variables:

1. Click **"Deploy"** or trigger a redeploy from the **Deployments** tab
2. Wait for the build to complete (takes 2-3 minutes the first time)
3. Railway will show a URL like `kyle-reviews-production-xxxx.up.railway.app`
4. Go back to **Variables** and set `SITE_URL` to that full URL (with `https://`)

### Step 6: Verify it's working

1. Visit your Railway URL — you should see the empty "Kyle.Reviews" home page
2. Visit `/admin` — log in with username `kyle`, password `changeme123`
3. **Change your password immediately** (see below)
4. Try posting your first recommendation!

### Step 7: Change the admin password

After your first login, change the default password. In Railway's **Shell** tab, run:

```bash
node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('YOUR_NEW_PASSWORD_HERE', 12);
  await prisma.admin.update({ where: { username: 'kyle' }, data: { password: hash } });
  console.log('Password updated!');
}
main();
"
```

Replace `YOUR_NEW_PASSWORD_HERE` with your actual new password.

### Step 8: Add a custom domain (optional)

1. In Railway, go to **Settings → Networking → Custom Domain**
2. Click **"+ Custom Domain"** and enter your domain (e.g., `kyle.reviews`)
3. Railway will give you a CNAME record value
4. In your domain registrar's DNS settings, add a CNAME record:
   - **Name:** `@` (or leave blank for root domain)
   - **Value:** the Railway CNAME target
5. Wait for DNS propagation (can take up to 48 hours, usually much faster)
6. Update the `SITE_URL` variable in Railway to your custom domain

### Ongoing Maintenance

**Backups:** Download your database periodically through Railway's shell:
```bash
# In Railway shell
cat prisma/kyle-reviews.db | base64
# Copy the output and decode locally:
echo "PASTE_BASE64_HERE" | base64 -d > backup.db
```

**Updates:** Just push to GitHub — Railway auto-deploys on every push to main.

**Adding new categories:** Use Railway's shell to run `npx prisma studio`, or add categories via the Prisma API. See SPEC.md for details.

**Costs:** Railway's Hobby plan is $5/month and includes more than enough resources for this site.

---

## Full Documentation

See [SPEC.md](./SPEC.md) for the complete technical spec, data model, and customization instructions.
