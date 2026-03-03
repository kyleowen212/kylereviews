// lib/external-apis.js
// Fetches metadata from free external databases.
// Each function returns a normalized result object.

// ─────────────────────────────────────────────
// TMDB (The Movie Database) - Movies & TV
// Free API key: https://www.themoviedb.org/settings/api
// ─────────────────────────────────────────────
async function searchTMDB(query, type = 'movie') {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return { results: [], error: 'TMDB_API_KEY not set' };

  const endpoint = type === 'tv' ? 'search/tv' : 'search/movie';
  const res = await fetch(
    `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(query)}`
  );
  const data = await res.json();

  return {
    results: (data.results || []).slice(0, 8).map((item) => ({
      externalId: String(item.id),
      title: item.title || item.name,
      year: (item.release_date || item.first_air_date || '').slice(0, 4),
      coverImage: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null,
      overview: item.overview,
    })),
  };
}

async function getTMDBDetails(id, type = 'movie') {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  const endpoint = type === 'tv' ? `tv/${id}` : `movie/${id}`;
  const res = await fetch(
    `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&append_to_response=credits,videos`
  );
  const item = await res.json();

  // Find YouTube trailer
  const trailer = (item.videos?.results || []).find(
    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );

  if (type === 'tv') {
    return {
      title: item.name,
      coverImage: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null,
      metadata: {
        creator: (item.created_by || []).map((c) => c.name).join(', '),
        seasons: `${item.number_of_seasons} season${item.number_of_seasons !== 1 ? 's' : ''}`,
        genre: (item.genres || []).map((g) => g.name).join(', '),
        cast: (item.credits?.cast || []).slice(0, 5).map((a) => a.name).join(', '),
        network: (item.networks || []).map((n) => n.name).join(', '),
      },
      embedUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : null,
      embedType: trailer ? 'youtube' : null,
    };
  }

  return {
    title: item.title,
    coverImage: item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : null,
    metadata: {
      director: (item.credits?.crew || []).find((c) => c.job === 'Director')?.name || '',
      runtime: item.runtime ? `${item.runtime} min` : '',
      genre: (item.genres || []).map((g) => g.name).join(', '),
      cast: (item.credits?.cast || []).slice(0, 5).map((a) => a.name).join(', '),
      year: (item.release_date || '').slice(0, 4),
    },
    embedUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : null,
    embedType: trailer ? 'youtube' : null,
  };
}

// ─────────────────────────────────────────────
// Open Library - Books
// No API key needed
// ─────────────────────────────────────────────
async function searchOpenLibrary(query) {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`
  );
  const data = await res.json();

  return {
    results: (data.docs || []).map((item) => ({
      externalId: item.key, // e.g. "/works/OL12345W"
      title: item.title,
      year: item.first_publish_year ? String(item.first_publish_year) : '',
      coverImage: item.cover_i
        ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg`
        : null,
      overview: '', // Open Library search doesn't include descriptions
      author: (item.author_name || []).join(', '),
    })),
  };
}

async function getOpenLibraryDetails(workKey) {
  // workKey like "/works/OL12345W"
  const res = await fetch(`https://openlibrary.org${workKey}.json`);
  const work = await res.json();

  // Get edition for page count / publisher
  let edition = {};
  if (work.key) {
    const edRes = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(work.title)}&limit=1`
    );
    const edData = await edRes.json();
    if (edData.docs?.[0]) {
      edition = edData.docs[0];
    }
  }

  return {
    title: work.title,
    coverImage: edition.cover_i
      ? `https://covers.openlibrary.org/b/id/${edition.cover_i}-L.jpg`
      : null,
    metadata: {
      author: (edition.author_name || []).join(', '),
      pages: edition.number_of_pages_median
        ? `${edition.number_of_pages_median} pages`
        : '',
      publisher: (edition.publisher || []).slice(0, 2).join(', '),
      genre: (edition.subject || []).slice(0, 3).join(', '),
      year: edition.first_publish_year ? String(edition.first_publish_year) : '',
    },
    embedUrl: null,
    embedType: null,
  };
}

// ─────────────────────────────────────────────
// MusicBrainz - Albums & Songs
// No API key needed (rate limited to 1 req/sec)
// ─────────────────────────────────────────────
async function searchMusicBrainz(query, type = 'release-group') {
  const res = await fetch(
    `https://musicbrainz.org/ws/2/${type}/?query=${encodeURIComponent(query)}&fmt=json&limit=8`,
    { headers: { 'User-Agent': 'KyleReviews/1.0 (personal blog)' } }
  );
  const data = await res.json();
  const items = data['release-groups'] || data.releases || [];

  return {
    results: items.map((item) => ({
      externalId: item.id,
      title: item.title,
      year: (item['first-release-date'] || '').slice(0, 4),
      coverImage: `https://coverartarchive.org/release-group/${item.id}/front-250`,
      overview: '',
      artist: (item['artist-credit'] || []).map((a) => a.name || a.artist?.name).join(', '),
    })),
  };
}

async function getMusicBrainzDetails(id) {
  const res = await fetch(
    `https://musicbrainz.org/ws/2/release-group/${id}?inc=artists+releases&fmt=json`,
    { headers: { 'User-Agent': 'KyleReviews/1.0 (personal blog)' } }
  );
  const data = await res.json();

  return {
    title: data.title,
    coverImage: `https://coverartarchive.org/release-group/${id}/front-500`,
    metadata: {
      artist: (data['artist-credit'] || []).map((a) => a.name || a.artist?.name).join(', '),
      runtime: '', // Would need a separate release lookup
      genre: '', // MusicBrainz genres require additional lookup
      year: (data['first-release-date'] || '').slice(0, 4),
      label: '',
    },
    embedUrl: null, // User will paste Qobuz/Spotify embed manually
    embedType: null,
  };
}

// ─────────────────────────────────────────────
// Podcast Index - Podcasts
// Free API: https://api.podcastindex.org/
// ─────────────────────────────────────────────
async function searchPodcastIndex(query) {
  const apiKey = process.env.PODCAST_INDEX_KEY;
  const apiSecret = process.env.PODCAST_INDEX_SECRET;
  if (!apiKey || !apiSecret) return { results: [], error: 'Podcast Index keys not set' };

  const now = Math.floor(Date.now() / 1000);
  const crypto = require('crypto');
  const authHash = crypto
    .createHash('sha1')
    .update(apiKey + apiSecret + now)
    .digest('hex');

  const res = await fetch(
    `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(query)}`,
    {
      headers: {
        'X-Auth-Key': apiKey,
        'X-Auth-Date': String(now),
        Authorization: authHash,
        'User-Agent': 'KyleReviews/1.0',
      },
    }
  );
  const data = await res.json();

  return {
    results: (data.feeds || []).slice(0, 8).map((item) => ({
      externalId: String(item.id),
      title: item.title,
      year: '',
      coverImage: item.artwork || item.image || null,
      overview: item.description || '',
      author: item.author || '',
    })),
  };
}

// ─────────────────────────────────────────────
// Unified search dispatcher
// ─────────────────────────────────────────────
async function searchExternal(query, categorySlug) {
  switch (categorySlug) {
    case 'movie':
      return searchTMDB(query, 'movie');
    case 'tv-show':
      return searchTMDB(query, 'tv');
    case 'book':
      return searchOpenLibrary(query);
    case 'album':
    case 'song':
      return searchMusicBrainz(query);
    case 'podcast':
      return searchPodcastIndex(query);
    default:
      return { results: [] };
  }
}

async function getExternalDetails(externalId, categorySlug) {
  switch (categorySlug) {
    case 'movie':
      return getTMDBDetails(externalId, 'movie');
    case 'tv-show':
      return getTMDBDetails(externalId, 'tv');
    case 'book':
      return getOpenLibraryDetails(externalId);
    case 'album':
    case 'song':
      return getMusicBrainzDetails(externalId);
    default:
      return null;
  }
}

module.exports = { searchExternal, getExternalDetails };
