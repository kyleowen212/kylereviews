// lib/external-apis.js
// Fetches metadata from free external databases.

// ─── TMDB (Movies & TV) ───
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

  const trailer = (item.videos?.results || []).find(
    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );

  if (type === 'tv') {
    return {
      title: item.name,
      coverImage: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      metadata: {
        creator: (item.created_by || []).map((c) => c.name).join(', '),
        seasons: `${item.number_of_seasons} season${item.number_of_seasons !== 1 ? 's' : ''}`,
        genre: (item.genres || []).map((g) => g.name).join(', '),
        cast: (item.credits?.cast || []).slice(0, 5).map((a) => a.name).join(', '),
        network: (item.networks || []).map((n) => n.name).join(', '),
        _backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
      },
      embedUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : null,
      embedType: trailer ? 'youtube' : null,
    };
  }

  return {
    title: item.title,
    coverImage: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    metadata: {
      director: (item.credits?.crew || []).find((c) => c.job === 'Director')?.name || '',
      runtime: item.runtime ? `${item.runtime} min` : '',
      genre: (item.genres || []).map((g) => g.name).join(', '),
      cast: (item.credits?.cast || []).slice(0, 5).map((a) => a.name).join(', '),
      year: (item.release_date || '').slice(0, 4),
      _backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
    },
    embedUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : null,
    embedType: trailer ? 'youtube' : null,
  };
}

// ─── Open Library (Books) ───
// The search endpoint returns page counts directly, so we use it for details too
async function searchOpenLibrary(query) {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`
  );
  const data = await res.json();

  return {
    results: (data.docs || []).map((item) => ({
      externalId: item.key,
      title: item.title,
      year: item.first_publish_year ? String(item.first_publish_year) : '',
      coverImage: item.cover_i
        ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg`
        : null,
      overview: '',
      author: (item.author_name || []).join(', '),
      // Store extra data for detail lookup
      _pages: item.number_of_pages_median || null,
      _publisher: (item.publisher || []).slice(0, 2).join(', '),
      _subjects: (item.subject || []).slice(0, 3).join(', '),
    })),
  };
}

async function getOpenLibraryDetails(workKey, searchHint) {
  // First get the work for its title
  const res = await fetch(`https://openlibrary.org${workKey}.json`);
  const work = await res.json();

  // Search again to get edition data (page count, publisher)
  const edRes = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(work.title || workKey)}&limit=1`
  );
  const edData = await edRes.json();
  const ed = edData.docs?.[0] || {};

  // Page count: try number_of_pages_median first, then try other fields
  let pages = ed.number_of_pages_median;
  if (!pages && ed.edition_count === 1 && ed.number_of_pages) {
    pages = ed.number_of_pages;
  }

  return {
    title: work.title || ed.title,
    coverImage: ed.cover_i
      ? `https://covers.openlibrary.org/b/id/${ed.cover_i}-L.jpg`
      : null,
    metadata: {
      author: (ed.author_name || []).join(', '),
      pages: pages ? `${pages} pages` : '',
      publisher: (ed.publisher || []).slice(0, 2).join(', '),
      genre: (ed.subject || []).slice(0, 3).join(', '),
      year: ed.first_publish_year ? String(ed.first_publish_year) : '',
    },
    embedUrl: null,
    embedType: null,
  };
}

// ─── MusicBrainz (Albums & Songs) ───
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
      runtime: '',
      genre: '',
      year: (data['first-release-date'] || '').slice(0, 4),
      label: '',
    },
    embedUrl: null,
    embedType: null,
  };
}

// ─── Unified dispatch ───
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
