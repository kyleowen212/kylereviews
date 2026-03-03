// prisma/seed.js
// Seeds the database with default categories and an admin user.
// Run: node prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const categories = [
  {
    slug: 'movie',
    name: 'Movie',
    icon: '🎬',
    sortOrder: 1,
    apiSource: 'tmdb',
    metaFields: JSON.stringify({
      director: { label: 'Director', type: 'text' },
      runtime: { label: 'Runtime', type: 'text' },
      genre: { label: 'Genre', type: 'text' },
      cast: { label: 'Cast', type: 'text' },
      year: { label: 'Year', type: 'text' },
    }),
  },
  {
    slug: 'tv-show',
    name: 'TV Show',
    icon: '📺',
    sortOrder: 2,
    apiSource: 'tmdb',
    metaFields: JSON.stringify({
      creator: { label: 'Creator', type: 'text' },
      seasons: { label: 'Seasons', type: 'text' },
      genre: { label: 'Genre', type: 'text' },
      cast: { label: 'Cast', type: 'text' },
      network: { label: 'Network', type: 'text' },
    }),
  },
  {
    slug: 'book',
    name: 'Book',
    icon: '📚',
    sortOrder: 3,
    apiSource: 'openlibrary',
    metaFields: JSON.stringify({
      author: { label: 'Author', type: 'text' },
      pages: { label: 'Pages', type: 'text' },
      publisher: { label: 'Publisher', type: 'text' },
      genre: { label: 'Genre', type: 'text' },
      year: { label: 'Year', type: 'text' },
    }),
  },
  {
    slug: 'album',
    name: 'Album',
    icon: '💿',
    sortOrder: 4,
    apiSource: 'musicbrainz',
    metaFields: JSON.stringify({
      artist: { label: 'Artist', type: 'text' },
      runtime: { label: 'Runtime', type: 'text' },
      genre: { label: 'Genre', type: 'text' },
      year: { label: 'Year', type: 'text' },
      label: { label: 'Label', type: 'text' },
    }),
  },
  {
    slug: 'song',
    name: 'Song',
    icon: '🎵',
    sortOrder: 5,
    apiSource: 'musicbrainz',
    metaFields: JSON.stringify({
      artist: { label: 'Artist', type: 'text' },
      album: { label: 'Album', type: 'text' },
      year: { label: 'Year', type: 'text' },
    }),
  },
  {
    slug: 'podcast',
    name: 'Podcast',
    icon: '🎙️',
    sortOrder: 6,
    apiSource: 'podcastindex',
    metaFields: JSON.stringify({
      host: { label: 'Host', type: 'text' },
      episode: { label: 'Episode', type: 'text' },
      network: { label: 'Network', type: 'text' },
    }),
  },
  {
    slug: 'recipe',
    name: 'Recipe',
    icon: '🍳',
    sortOrder: 7,
    apiSource: 'none',
    metaFields: JSON.stringify({
      source: { label: 'Source', type: 'text' },
      cuisine: { label: 'Cuisine', type: 'text' },
      prepTime: { label: 'Prep Time', type: 'text' },
      sourceUrl: { label: 'Source URL', type: 'url' },
    }),
  },
  {
    slug: 'experience',
    name: 'Experience',
    icon: '✨',
    sortOrder: 8,
    apiSource: 'none',
    metaFields: JSON.stringify({
      location: { label: 'Location', type: 'text' },
      date: { label: 'Date', type: 'text' },
      cost: { label: 'Cost', type: 'text' },
    }),
  },
  {
    slug: 'product',
    name: 'Product',
    icon: '🛒',
    sortOrder: 9,
    apiSource: 'none',
    metaFields: JSON.stringify({
      brand: { label: 'Brand', type: 'text' },
      price: { label: 'Price', type: 'text' },
      category: { label: 'Category', type: 'text' },
      purchaseUrl: { label: 'Purchase URL', type: 'url' },
    }),
  },
];

async function main() {
  console.log('Seeding database...');

  // Create categories
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    console.log(`  ✓ Category: ${cat.name}`);
  }

  // Create default admin user
  // CHANGE THIS PASSWORD before deploying!
  const hashedPassword = await bcrypt.hash('changeme123', 12);
  await prisma.admin.upsert({
    where: { username: 'kyle' },
    update: {},
    create: {
      username: 'kyle',
      password: hashedPassword,
    },
  });
  console.log('  ✓ Admin user: kyle (password: changeme123)');

  console.log('\nDone! Remember to change the admin password.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
