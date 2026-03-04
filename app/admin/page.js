'use client';
// app/admin/page.js — Admin Dashboard v2
// Features: markdown body, photo uploads, edit/delete, backdate, manual-entry categories, draft editing
import { useState, useEffect, useCallback } from 'react';

// Categories that skip the search step and go straight to manual entry
const MANUAL_ONLY_SLUGS = ['experience', 'recipe', 'podcast', 'product', 'live-event', 'link', 'game', 'application'];

// ─── Login ───
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
    if (res.ok) onLogin();
    else setError('Invalid credentials');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="bg-white p-8 rounded-xl border border-border w-full max-w-sm">
        <h1 className="font-display text-2xl mb-6 text-center">kyle.reviews</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Username" value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30" />
          <input type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30" />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-accent text-white py-2.5 rounded-lg font-medium hover:bg-accent/90 transition-colors">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Photo Upload Button ───
function PhotoUploader({ photos, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const newPhotos = [...photos];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const { url } = await res.json();
          newPhotos.push(url);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    onChange(newPhotos);
    setUploading(false);
  };

  const removePhoto = (idx) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Photos</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {photos.map((url, i) => (
          <div key={i} className="relative group">
            <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border border-border" />
            <button onClick={() => removePhoto(i)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity">
              ×
            </button>
          </div>
        ))}
      </div>
      <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors">
        {uploading ? 'Uploading...' : '📷 Add photos'}
        <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
      </label>
    </div>
  );
}

// ─── Review Form (used for both new posts and editing) ───
function ReviewForm({ categories, initialData, editMode, onSave, onCancel }) {
  const [step, setStep] = useState(editMode ? 'review' : 'category');
  const [selectedCategory, setSelectedCategory] = useState(
    editMode ? categories.find((c) => c.id === initialData?.categoryId) : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const defaultForm = {
    title: '', body: '', metadata: {}, coverImage: '', personalPhotos: [],
    embedUrl: '', embedType: '', published: true, publishedAt: '',
  };

  const [form, setForm] = useState(editMode ? {
    ...defaultForm,
    ...initialData,
    metadata: typeof initialData?.metadata === 'string' ? JSON.parse(initialData.metadata) : (initialData?.metadata || {}),
    personalPhotos: typeof initialData?.personalPhotos === 'string' ? JSON.parse(initialData.personalPhotos) : (initialData?.personalPhotos || []),
    publishedAt: initialData?.publishedAt ? new Date(initialData.publishedAt).toISOString().slice(0, 16) : '',
  } : defaultForm);

  const isManualOnly = selectedCategory && MANUAL_ONLY_SLUGS.includes(selectedCategory.slug);
  const metaFields = selectedCategory ? JSON.parse(selectedCategory.metaFields || '{}') : {};

  // Search external API
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !selectedCategory) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&category=${selectedCategory.slug}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  }, [searchQuery, selectedCategory]);

  // Select search result
  const handleSelect = async (item) => {
    setFetchingDetails(true);
    try {
      const res = await fetch(`/api/search?id=${encodeURIComponent(item.externalId)}&category=${selectedCategory.slug}`);
      const details = await res.json();
      if (details && !details.error) {
        setForm((f) => ({
          ...f,
          title: details.title || item.title,
          metadata: details.metadata || {},
          coverImage: details.coverImage || item.coverImage || '',
          embedUrl: details.embedUrl || '',
          embedType: details.embedType || '',
        }));
      } else {
        setForm((f) => ({ ...f, title: item.title, coverImage: item.coverImage || '' }));
      }
    } catch {
      setForm((f) => ({ ...f, title: item.title, coverImage: item.coverImage || '' }));
    }
    setFetchingDetails(false);
    setStep('review');
  };

  // Category selected
  const handleCategoryPick = (cat) => {
    setSelectedCategory(cat);
    if (MANUAL_ONLY_SLUGS.includes(cat.slug)) {
      setStep('review'); // Skip search for manual-only categories
    } else {
      setStep('search');
    }
  };

  // Save (create or update)
  const handleSave = async (publish) => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        categoryId: selectedCategory?.id || form.categoryId,
        published: publish,
        publishedAt: form.publishedAt || undefined,
      });
    } catch (err) {
      alert('Failed: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="font-display text-xl mb-4">
        {editMode ? `Edit: ${form.title}` : 'Quick Post'}
        {editMode && (
          <button onClick={onCancel} className="text-sm text-muted hover:text-ink ml-3 font-body">← Cancel</button>
        )}
      </h2>

      {/* Step 1: Category */}
      {step === 'category' && (
        <div>
          <p className="text-sm text-muted mb-3">What are you recommending?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => handleCategoryPick(cat)}
                className="p-3 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center">
                <span className="text-2xl block mb-1">{cat.icon}</span>
                <span className="text-sm">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Search (only for API-backed categories) */}
      {step === 'search' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => { setStep('category'); setSelectedCategory(null); setSearchResults([]); }}
              className="text-muted hover:text-ink text-sm">← Back</button>
            <span className="text-lg">{selectedCategory?.icon}</span>
            <span className="font-medium">{selectedCategory?.name}</span>
          </div>

          <div className="flex gap-2 mb-4">
            <input type="text"
              placeholder={`Search for a ${selectedCategory?.name?.toLowerCase()}...`}
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoFocus />
            <button onClick={handleSearch} disabled={searching}
              className="bg-accent text-white px-4 py-2.5 rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50">
              {searching ? '...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 mb-4">
              {searchResults.map((item, i) => (
                <button key={i} onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 p-3 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-left">
                  {item.coverImage && (
                    <img src={item.coverImage} alt="" className="w-10 h-14 object-cover rounded"
                      onError={(e) => { e.target.style.display = 'none'; }} />
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

          <button onClick={() => { setForm((f) => ({ ...f, title: searchQuery || '' })); setStep('review'); }}
            className="text-sm text-muted hover:text-accent">
            Or enter details manually →
          </button>
        </div>
      )}

      {/* Step 3: Review form */}
      {step === 'review' && (
        <div>
          {!editMode && (
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep(isManualOnly ? 'category' : 'search')}
                className="text-muted hover:text-ink text-sm">← Back</button>
              <span className="text-lg">{selectedCategory?.icon}</span>
              <span className="font-medium">{selectedCategory?.name}</span>
            </div>
          )}

          {fetchingDetails && <p className="text-muted text-sm mb-4">Fetching details...</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Left: fields */}
            <div className="space-y-3">
              <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />

              {Object.entries(metaFields).map(([key, field]) => (
                <Field key={key} label={field.label} value={form.metadata[key] || ''}
                  onChange={(v) => setForm({ ...form, metadata: { ...form.metadata, [key]: v } })} />
              ))}

              <Field label="Cover Image URL" value={form.coverImage}
                onChange={(v) => setForm({ ...form, coverImage: v })} placeholder="Auto-filled or paste URL" />

              <Field label="Embed URL" value={form.embedUrl}
                onChange={(v) => setForm({ ...form, embedUrl: v })} placeholder="YouTube, Qobuz, or Spotify" />

              <div>
                <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Embed Type</label>
                <select value={form.embedType || ''} onChange={(e) => setForm({ ...form, embedType: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
                  <option value="">None</option>
                  <option value="youtube">YouTube</option>
                  <option value="qobuz">Qobuz</option>
                  <option value="spotify">Spotify</option>
                  <option value="apple-music">Apple Music</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">
                  Publish Date (leave blank for now)
                </label>
                <input type="datetime-local" value={form.publishedAt}
                  onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
            </div>

            {/* Right: body + photos + preview */}
            <div className="space-y-3">
              {form.coverImage && (
                <img src={form.coverImage} alt="Cover preview" className="w-32 rounded-lg shadow-sm"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              )}

              <div>
                <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">
                  Your recommendation (Markdown supported)
                </label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[200px] font-mono"
                  placeholder="What makes this great? Supports **bold**, *italic*, [links](url), etc."
                  autoFocus />
              </div>

              <PhotoUploader photos={form.personalPhotos}
                onChange={(photos) => setForm({ ...form, personalPhotos: photos })} />
            </div>
          </div>

          {/* Save controls */}
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <button onClick={() => handleSave(true)} disabled={!form.title || saving}
              className="bg-accent text-white px-5 py-2.5 rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : editMode ? 'Update & Publish' : 'Publish Now'}
            </button>
            <button onClick={() => handleSave(false)} disabled={!form.title || saving}
              className="border border-border px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              {editMode ? 'Save Draft' : 'Save as Draft'}
            </button>
            {editMode && onCancel && (
              <button onClick={onCancel} className="text-sm text-muted hover:text-ink ml-auto">Cancel</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple field component
function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">{label}</label>
      <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
    </div>
  );
}

// ─── Suggestion Inbox ───
function SuggestionInbox({ suggestions, onPromote, onUpdateStatus }) {
  const newSuggestions = suggestions.filter((s) => s.status === 'new');

  if (newSuggestions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-display text-xl mb-2">Suggestion Inbox</h2>
        <p className="text-muted text-sm">No new suggestions.</p>
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
                {s.message && <p className="text-sm mt-1 text-ink/70">"{s.message}"</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => onPromote(s)}
                  className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors">
                  Review this
                </button>
                <button onClick={() => onUpdateStatus(s.id, 'declined')}
                  className="text-xs text-muted px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
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

// ─── Recent Posts with Edit/Delete ───
function RecentPosts({ reviews, onEdit, onDelete }) {
  if (reviews.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="font-display text-xl mb-4">All Posts</h2>
      <div className="space-y-1">
        {reviews.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-2.5 px-2 border-b border-border last:border-0 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span>{r.category?.icon}</span>
              <span className="font-medium text-sm truncate">{r.title}</span>
              {!r.published && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex-shrink-0">Draft</span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
              <span className="text-xs text-muted">
                {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString() : 'No date'}
              </span>
              <button onClick={() => onEdit(r)} className="text-xs text-accent hover:text-accent/80">Edit</button>
              <button onClick={() => { if (confirm(`Delete "${r.title}"?`)) onDelete(r.id); }}
                className="text-xs text-red-400 hover:text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───
export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(null);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [editingReview, setEditingReview] = useState(null); // null = new post mode, object = editing

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
      .then((r) => { setAuthenticated(r.ok); if (r.ok) loadData(); })
      .catch(() => setAuthenticated(false));
  }, [loadData]);

  const handleCreate = async (data) => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create');
    await loadData();
  };

  const handleUpdate = async (data) => {
    const res = await fetch('/api/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingReview.id, ...data }),
    });
    if (!res.ok) throw new Error('Failed to update');
    setEditingReview(null);
    await loadData();
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    await loadData();
  };

  const handlePromote = (suggestion) => {
    fetch('/api/suggestions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: suggestion.id, status: 'reviewing' }),
    }).then(() => loadData());
  };

  const handleUpdateStatus = (id, status) => {
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

  if (authenticated === null) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted">Loading...</p></div>;
  if (!authenticated) return <LoginForm onLogin={() => { setAuthenticated(true); loadData(); }} />;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-xl">kyle.reviews</h1>
            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" target="_blank" className="text-muted hover:text-accent transition-colors">View Site →</a>
            <button onClick={handleLogout} className="text-muted hover:text-ink transition-colors">Log out</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {editingReview ? (
          <ReviewForm categories={categories} initialData={editingReview} editMode
            onSave={handleUpdate} onCancel={() => setEditingReview(null)} />
        ) : (
          <ReviewForm categories={categories} onSave={handleCreate} />
        )}
        <SuggestionInbox suggestions={suggestions} onPromote={handlePromote} onUpdateStatus={handleUpdateStatus} />
        <RecentPosts reviews={reviews} onEdit={setEditingReview} onDelete={handleDelete} />
      </main>
    </div>
  );
}
