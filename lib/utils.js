// lib/utils.js

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

// Category slug to URL prefix mapping
const CATEGORY_URL_PREFIX = {
  'movie': 'movie',
  'tv-show': 'tv',
  'book': 'book',
  'album': 'album',
  'song': 'song',
  'podcast': 'podcast',
  'recipe': 'recipe',
  'experience': 'experience',
  'product': 'product',
  'live-event': 'event',
  'link': 'link',
  'game': 'game',
  'application': 'app',
};

function getCategoryPrefix(categorySlug) {
  return CATEGORY_URL_PREFIX[categorySlug] || categorySlug;
}

// Build a slug like: movie/2025/dune-part-two
function buildSlug(title, categorySlug, publishDate) {
  const prefix = getCategoryPrefix(categorySlug);
  const date = publishDate ? new Date(publishDate) : new Date();
  const year = date.getFullYear();
  const titleSlug = slugify(title);
  return `${prefix}/${year}/${titleSlug}`;
}

// Unique slug: checks DB for duplicates and appends -2, -3, etc. if needed
async function uniqueSlug(title, categorySlug, publishDate, prisma) {
  const baseSlug = buildSlug(title, categorySlug, publishDate);

  // Check if this slug already exists
  const existing = await prisma.review.findFirst({ where: { slug: baseSlug } });
  if (!existing) return baseSlug;

  // Find all slugs that start with this base
  let counter = 2;
  while (true) {
    const candidate = `${baseSlug}-${counter}`;
    const found = await prisma.review.findFirst({ where: { slug: candidate } });
    if (!found) return candidate;
    counter++;
  }
}

module.exports = { slugify, uniqueSlug, buildSlug, getCategoryPrefix, CATEGORY_URL_PREFIX };
