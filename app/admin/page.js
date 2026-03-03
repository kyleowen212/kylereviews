'use client';
// app/admin/page.js
// Admin dashboard: fast posting, suggestion inbox, review management
import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────
// Login Screen
// ─────────────────────────────────────────────
function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      onLogin();
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="bg-white p-8 rounded-xl border border-border w-full max-w-sm">
        <h1 className="font-display text-2xl mb-6 text-center">Kyle.Reviews</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-accent text-white py-2.5 rounded-lg font-medium hover:bg-accent/90 transition-colors">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Quick Post Form (optimized for speed)
// ─────────────────────────────────────────────
function QuickPostForm({ categories, onPost }) {
  const [step, setStep] = useState('category'); // category → search → review → done
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    metadata: {},
    coverImage: '',
    embedUrl: '',
    embedType: '',
    published: true,
  });
  const [posting, setPosting] = useState(false);

  // Search external API
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !selectedCategory) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&category=${selectedCategory.slug}`
      );
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, [searchQuery, selectedCategory]);

  // Select a search result and fetch full details
  const handleSelect = async (item) => {
    setSelectedItem(item);
    setFetchingDetails(true);

    try {
      const res = await fetch(
        `/api/search?id=${encodeURIComponent(item.externalId)}&category=${selectedCategory.slug}`
      );
      const details = await res.json();

      if (details && !details.error) {
        setForm({
          title: details.title || item.title,
          body: '',
          metadata: details.metadata || {},
          coverImage: details.coverImage || item.coverImage || '',
          embedUrl: details.embedUrl || '',
          embedType: details.embedType || '',
          published: true,
        });
      } else {
        setForm({
          title: item.title,
          body: '',
          metadata: {},
          coverImage: item.coverImage || '',
          embedUrl: '',
          embedType: '',
          published: true,
        });
      }
    } catch {
      setForm({
        title: item.title,
        body: '',
        metadata: {},
        coverImage: item.coverImage || '',
        embedUrl: '',
        embedType: '',
        published: true,
      });
    }

    setFetchingDetails(false);
    setStep('review');
  };

  // Skip search for categories without APIs (recipe, experience)
  const handleManualEntry = () => {
    setForm({
      title: searchQuery || '',
      body: '',
      metadata: {},
      coverImage: '',
      embedUrl: '',
      embedType: '',
      published: true,
    });
    setStep('review');
  };

  // Publish the review
  const handlePublish = async () => {
    setPosting(true);
    try {
      await onPost({
        ...form,
        categoryId: selectedCategory.id,
      });
      // Reset
      setStep('category');
      setSelectedCategory(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedItem(null);
      setForm({ title: '', body: '', metadata: {}, coverImage: '', embedUrl: '', embedType: '', published: true });
    } catch (err) {
      alert('Failed to post: ' + err.message);
    }
    setPosting(false);
  };

  // Parse category meta fields
  const metaFields = selectedCategory
    ? JSON.parse(selectedCategory.metaFields || '{}')
    : {};

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="font-display text-xl mb-4">Quick Post</h2>

      {/* Step 1: Pick category */}
      {step === 'category' && (
        <div>
          <p className="text-sm text-muted mb-3">What are you recommending?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat);
                  setStep('search');
                }}
                className="p-3 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
              >
                <span className="text-2xl block mb-1">{cat.icon}</span>
                <span className="text-sm">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Search / Select */}
      {step === 'search' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => { setStep('category'); setSelectedCategory(null); setSearchResults([]); }}
              className="text-muted hover:text-ink text-sm"
            >
              ← Back
            </button>
            <span className="text-lg">{selectedCategory?.icon}</span>
            <span className="font-medium">{selectedCategory?.name}</span>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder={`Search for a ${selectedCategory?.name?.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="bg-accent text-white px-4 py-2.5 rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50"
            >
              {searching ? '...' : 'Search'}
            </button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 mb-4">
              {searchResults.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 p-3 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-left"
                >
                  {item.coverImage && (
                    <img
                      src={item.coverImage}
                      alt=""
                      className="w-10 h-14 object-cover rounded"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted">
                      {item.year}{item.artist ? ` · ${item.artist}` : ''}{item.author ? ` · ${item.author}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleManualEntry}
            className="text-sm text-muted hover:text-accent"
          >
            Or enter details manually →
          </button>
        </div>
      )}

      {/* Step 3: Review & publish */}
      {step === 'review' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setStep('search')}
              className="text-muted hover:text-ink text-sm"
            >
              ← Back
            </button>
            <span className="text-lg">{selectedCategory?.icon}</span>
            <span className="font-medium">Finalize your recommendation</span>
          </div>

          {fetchingDetails && (
            <p className="text-muted text-sm mb-4">Fetching details...</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Left: form fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              {/* Dynamic metadata fields */}
              {Object.entries(metaFields).map(([key, field]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-muted mb-1">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={form.metadata[key] || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        metadata: { ...form.metadata, [key]: e.target.value },
                      })
                    }
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={form.coverImage}
                  onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="Auto-filled from search"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Embed URL (YouTube, Qobuz, Spotify)
                </label>
                <input
                  type="text"
                  value={form.embedUrl}
                  onChange={(e) => setForm({ ...form, embedUrl: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="Paste embed URL"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Embed Type</label>
                <select
                  value={form.embedType || ''}
                  onChange={(e) => setForm({ ...form, embedType: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="">None</option>
                  <option value="youtube">YouTube</option>
                  <option value="qobuz">Qobuz</option>
                  <option value="spotify">Spotify</option>
                  <option value="apple-music">Apple Music</option>
                </select>
              </div>
            </div>

            {/* Right: preview + body */}
            <div className="space-y-3">
              {form.coverImage && (
                <img
                  src={form.coverImage}
                  alt="Cover preview"
                  className="w-32 rounded-lg shadow-sm"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Your recommendation (a few words to a few paragraphs)
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[200px]"
                  placeholder="What makes this great?"
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Publish controls */}
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <button
              onClick={handlePublish}
              disabled={!form.title || posting}
              className="bg-accent text-white px-5 py-2.5 rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {posting ? 'Publishing...' : 'Publish Now'}
            </button>
            <button
              onClick={() => {
                setForm({ ...form, published: false });
                handlePublish();
              }}
              disabled={!form.title || posting}
              className="border border-border px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Save as Draft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Suggestion Inbox
// ─────────────────────────────────────────────
function SuggestionInbox({ suggestions, categories, onPromote, onUpdateStatus }) {
  const newSuggestions = suggestions.filter((s) => s.status === 'new');

  if (newSuggestions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-display text-xl mb-2">Suggestion Inbox</h2>
        <p className="text-muted text-sm">No new suggestions. Share your /suggest page to get recommendations!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="font-display text-xl mb-4">
        Suggestion Inbox <span className="text-accent text-base">({newSuggestions.length})</span>
      </h2>
      <div className="space-y-3">
        {newSuggestions.map((s) => (
          <div key={s.id} className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{s.itemTitle}</p>
                <p className="text-sm text-muted">
                  Suggested by {s.name}
                  {s.category ? ` · ${s.category.icon} ${s.category.name}` : ''}
                </p>
                {s.message && (
                  <p className="text-sm mt-1 text-ink/70">"{s.message}"</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onPromote(s)}
                  className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors"
                >
                  Review this
                </button>
                <button
                  onClick={() => onUpdateStatus(s.id, 'declined')}
                  className="text-xs text-muted px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Recent Posts List
// ─────────────────────────────────────────────
function RecentPosts({ reviews }) {
  if (reviews.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="font-display text-xl mb-4">Recent Posts</h2>
      <div className="space-y-2">
        {reviews.slice(0, 15).map((r) => {
          const meta = JSON.parse(r.metadata || '{}');
          return (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <span>{r.category?.icon}</span>
                <span className="font-medium text-sm">{r.title}</span>
                {!r.published && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Draft</span>
                )}
              </div>
              <span className="text-xs text-muted">
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────
export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(null);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const loadData = useCallback(async () => {
    const [catRes, revRes, sugRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/reviews?all=true'),
      fetch('/api/suggestions'),
    ]);
    setCategories(await catRes.json());
    setReviews(await revRes.json());
    if (sugRes.ok) setSuggestions(await sugRes.json());
  }, []);

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => {
        setAuthenticated(r.ok);
        if (r.ok) loadData();
      })
      .catch(() => setAuthenticated(false));
  }, [loadData]);

  const handlePost = async (data) => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create review');
    await loadData();
  };

  const handlePromoteSuggestion = (suggestion) => {
    // Pre-fill the quick post form with suggestion data
    // For now, just mark it as reviewing and the user can create a post
    fetch('/api/suggestions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: suggestion.id, status: 'reviewing' }),
    }).then(() => loadData());
  };

  const handleUpdateSuggestionStatus = (id, status) => {
    fetch('/api/suggestions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).then(() => loadData());
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setAuthenticated(false);
  };

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginForm onLogin={() => { setAuthenticated(true); loadData(); }} />;
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-xl">Kyle.Reviews</h1>
            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" target="_blank" className="text-muted hover:text-accent transition-colors">
              View Site →
            </a>
            <button
              onClick={handleLogout}
              className="text-muted hover:text-ink transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <QuickPostForm categories={categories} onPost={handlePost} />
        <SuggestionInbox
          suggestions={suggestions}
          categories={categories}
          onPromote={handlePromoteSuggestion}
          onUpdateStatus={handleUpdateSuggestionStatus}
        />
        <RecentPosts reviews={reviews} />
      </main>
    </div>
  );
}
