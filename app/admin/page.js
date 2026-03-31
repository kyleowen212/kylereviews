'use client';
// app/admin/page.js — Admin Dashboard v4
// Adds Full Post mode with inline image insertion and markdown preview
import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

const MANUAL_ONLY_SLUGS = ['experience', 'recipe', 'podcast', 'product', 'live-event', 'link', 'game', 'application', 'video'];

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

// ─── Image Upload Helper ───
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  const { url } = await res.json();
  return url;
}

// ─── Cover Image Field ───
function CoverImageField({ value, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { onChange(await uploadFile(file)); }
    catch (err) { console.error('Cover upload failed:', err); }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Cover Image</label>
      <div className="flex gap-2">
        <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)}
          placeholder="Auto-filled URL or paste one"
          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
        <label className="inline-flex items-center gap-1 px-3 py-2 border border-border rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors flex-shrink-0">
          {uploading ? '...' : '📁 Upload'}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>
      {value && (
        <div className="mt-2 relative inline-block group">
          <img src={value} alt="Cover preview" className="h-24 rounded-lg shadow-sm"
            onError={(e) => { e.target.style.display = 'none'; }} />
          <button onClick={() => onChange('')}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">×</button>
        </div>
      )}
    </div>
  );
}

// ─── Photo Upload Button (for Quick Post gallery) ───
function PhotoUploader({ photos, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const newPhotos = [...photos];
    for (const file of files) {
      try { newPhotos.push(await uploadFile(file)); }
      catch (err) { console.error('Photo upload failed:', err); }
    }
    onChange(newPhotos);
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Photos</label>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {photos.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border border-border" />
              <button onClick={() => onChange(photos.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">×</button>
            </div>
          ))}
        </div>
      )}
      <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors">
        {uploading ? 'Uploading...' : '📷 Add photos'}
        <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
      </label>
    </div>
  );
}

// ─── Markdown Editor with Image Insert (for Full Post) ───
function MarkdownEditor({ value, onChange }) {
  const textareaRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const insertAtCursor = (text) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const newValue = before + text + after;
    onChange(newValue);
    // Set cursor after inserted text
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + text.length;
    }, 0);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const url = await uploadFile(file);
        insertAtCursor(`\n\n![${file.name.replace(/\.[^.]+$/, '')}](${url})\n\n`);
      } catch (err) {
        console.error('Image upload failed:', err);
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const url = await uploadFile(file);
        insertAtCursor(`\n\n![${file.name.replace(/\.[^.]+$/, '')}](${url})\n\n`);
      } catch (err) {
        console.error('Image upload failed:', err);
      }
    }
    setUploading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-muted uppercase tracking-wide">Article Body</label>
        <div className="flex items-center gap-2">
          {uploading && <span className="text-xs text-accent">Uploading...</span>}
          <label className="inline-flex items-center gap-1 px-2 py-1 border border-border rounded text-xs cursor-pointer hover:bg-gray-50 transition-colors">
            🖼 Insert Image
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
          </label>
          <button onClick={() => insertAtCursor('**bold**')}
            className="px-2 py-1 border border-border rounded text-xs hover:bg-gray-50 transition-colors font-bold">B</button>
          <button onClick={() => insertAtCursor('*italic*')}
            className="px-2 py-1 border border-border rounded text-xs hover:bg-gray-50 transition-colors italic">I</button>
          <button onClick={() => insertAtCursor('[link text](url)')}
            className="px-2 py-1 border border-border rounded text-xs hover:bg-gray-50 transition-colors">🔗</button>
          <button onClick={() => insertAtCursor('\n\n---\n\n')}
            className="px-2 py-1 border border-border rounded text-xs hover:bg-gray-50 transition-colors">—</button>
          <button onClick={() => insertAtCursor('\n\n> ')}
            className="px-2 py-1 border border-border rounded text-xs hover:bg-gray-50 transition-colors">❝</button>
          <button onClick={() => setShowPreview(!showPreview)}
            className={`px-2 py-1 border rounded text-xs transition-colors ${showPreview ? 'bg-accent text-white border-accent' : 'border-border hover:bg-gray-50'}`}>
            {showPreview ? '✎ Edit' : '👁 Preview'}
          </button>
        </div>
      </div>

      {showPreview ? (
        <div className="border border-border rounded-lg p-6 min-h-[500px] bg-white prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              img: ({ src, alt }) => (
                <img src={src} alt={alt || ''} className="rounded-lg shadow-sm max-w-full my-4" style={{ maxHeight: '500px' }} />
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-accent pl-4 my-4 italic text-ink/70">{children}</blockquote>
              ),
            }}
          >
            {value || '*Nothing here yet...*'}
          </ReactMarkdown>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[500px] font-mono leading-relaxed"
          placeholder="Write your full review here...&#10;&#10;Supports Markdown: **bold**, *italic*, [links](url), ## headings&#10;&#10;Insert images with the toolbar above, or drag and drop images directly into the editor."
        />
      )}
    </div>
  );
}

// ─── Safely parse JSON fields ───
function parsePhotos(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}
function parseMeta(val) {
  if (typeof val === 'object' && val !== null && !Array.isArray(val)) return val;
  if (typeof val === 'string') { try { const p = JSON.parse(val); return (typeof p === 'object' && p !== null) ? p : {}; } catch { return {}; } }
  return {};
}

// ─── Quick Post Form ───
function QuickPostForm({ categories, initialData, editMode, onSave, onCancel }) {
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
    embedUrl: '', embedType: '', published: true, publishedAt: '', rating: '',
  };

  const [form, setForm] = useState(() => {
    if (editMode && initialData) {
      return {
        title: initialData.title || '',
        body: initialData.body || '',
        metadata: parseMeta(initialData.metadata),
        coverImage: initialData.coverImage || '',
        personalPhotos: parsePhotos(initialData.personalPhotos),
        embedUrl: initialData.embedUrl || '',
        embedType: initialData.embedType || '',
        published: initialData.published ?? true,
        publishedAt: initialData.publishedAt ? new Date(initialData.publishedAt).toISOString().slice(0, 16) : '',
        rating: initialData.rating != null ? String(initialData.rating) : '',
      };
    }
    return { ...defaultForm };
  });

  const isManualOnly = selectedCategory && MANUAL_ONLY_SLUGS.includes(selectedCategory.slug);
  const metaFields = selectedCategory ? JSON.parse(selectedCategory.metaFields || '{}') : {};

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

  const handleSelect = async (item) => {
    setFetchingDetails(true);
    try {
      const res = await fetch(`/api/search?id=${encodeURIComponent(item.externalId)}&category=${selectedCategory.slug}`);
      const details = await res.json();
      if (details && !details.error) {
        setForm((f) => ({ ...f, title: details.title || item.title, metadata: details.metadata || {}, coverImage: details.coverImage || item.coverImage || '', embedUrl: details.embedUrl || '', embedType: details.embedType || '' }));
      } else {
        setForm((f) => ({ ...f, title: item.title, coverImage: item.coverImage || '' }));
      }
    } catch {
      setForm((f) => ({ ...f, title: item.title, coverImage: item.coverImage || '' }));
    }
    setFetchingDetails(false);
    setStep('review');
  };

  const handleCategoryPick = (cat) => {
    setSelectedCategory(cat);
    setForm({ ...defaultForm });
    setSearchQuery('');
    setSearchResults([]);
    if (MANUAL_ONLY_SLUGS.includes(cat.slug)) { setStep('review'); } else { setStep('search'); }
  };

  const handleSave = async (publish) => {
    setSaving(true);
    try {
      await onSave({
        title: form.title, body: form.body, metadata: form.metadata,
        coverImage: form.coverImage || null, personalPhotos: form.personalPhotos,
        embedUrl: form.embedUrl || null, embedType: form.embedType || null,
        rating: form.rating ? parseInt(form.rating, 10) : null,
        categoryId: selectedCategory?.id || form.categoryId,
        published: publish, publishedAt: form.publishedAt || undefined,
      });
    } catch (err) { alert('Failed: ' + err.message); }
    setSaving(false);
  };

  return (
    <div>
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

      {step === 'search' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => { setStep('category'); setSelectedCategory(null); setSearchResults([]); }}
              className="text-muted hover:text-ink text-sm">← Back</button>
            <span className="text-lg">{selectedCategory?.icon}</span>
            <span className="font-medium">{selectedCategory?.name}</span>
          </div>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder={`Search for a ${selectedCategory?.name?.toLowerCase()}...`}
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30" autoFocus />
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
                  {item.coverImage && <img src={item.coverImage} alt="" className="w-10 h-14 object-cover rounded" onError={(e) => { e.target.style.display = 'none'; }} />}
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted">{item.year}{item.artist ? ` · ${item.artist}` : ''}{item.author ? ` · ${item.author}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => { setForm((f) => ({ ...f, title: searchQuery || '' })); setStep('review'); }}
            className="text-sm text-muted hover:text-accent">Or enter details manually →</button>
        </div>
      )}

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
            <div className="space-y-3">
              <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
              {Object.entries(metaFields).map(([key, field]) => (
                <Field key={key} label={field.label} value={form.metadata[key] || ''}
                  onChange={(v) => setForm({ ...form, metadata: { ...form.metadata, [key]: v } })} />
              ))}
              <CoverImageField value={form.coverImage} onChange={(v) => setForm({ ...form, coverImage: v })} />
              <Field label="Embed URL" value={form.embedUrl} onChange={(v) => setForm({ ...form, embedUrl: v })} placeholder="YouTube, Qobuz, or Spotify" />
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
                <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Publish Date</label>
                <input type="datetime-local" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Rating (0–100)</label>
                <input type="number" min="0" max="100" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  placeholder="e.g. 85"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Your recommendation (Markdown)</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[200px] font-mono"
                  placeholder="What makes this great? Supports **bold**, *italic*, [links](url), etc." autoFocus />
              </div>
              <PhotoUploader photos={form.personalPhotos} onChange={(photos) => setForm({ ...form, personalPhotos: photos })} />
            </div>
          </div>
          <SaveControls editMode={editMode} saving={saving} disabled={!form.title}
            onPublish={() => handleSave(true)} onDraft={() => handleSave(false)} onCancel={onCancel} />
        </div>
      )}
    </div>
  );
}

// ─── Full Post Form ───
function FullPostForm({ categories, initialData, editMode, onSave, onCancel }) {
  const [selectedCategory, setSelectedCategory] = useState(
    editMode ? categories.find((c) => c.id === initialData?.categoryId) : null
  );
  const [saving, setSaving] = useState(false);

  const defaultForm = {
    title: '', body: '', metadata: {}, coverImage: '', personalPhotos: [],
    embedUrl: '', embedType: '', published: true, publishedAt: '', rating: '',
  };

  const [form, setForm] = useState(() => {
    if (editMode && initialData) {
      return {
        title: initialData.title || '',
        body: initialData.body || '',
        metadata: parseMeta(initialData.metadata),
        coverImage: initialData.coverImage || '',
        personalPhotos: parsePhotos(initialData.personalPhotos),
        embedUrl: initialData.embedUrl || '',
        embedType: initialData.embedType || '',
        published: initialData.published ?? true,
        publishedAt: initialData.publishedAt ? new Date(initialData.publishedAt).toISOString().slice(0, 16) : '',
        rating: initialData.rating != null ? String(initialData.rating) : '',
      };
    }
    return { ...defaultForm };
  });

  const metaFields = selectedCategory ? JSON.parse(selectedCategory.metaFields || '{}') : {};

  const handleSave = async (publish) => {
    setSaving(true);
    try {
      // Store postMode in metadata so rendering knows this is a full post
      const meta = { ...form.metadata, _postMode: 'full' };
      await onSave({
        title: form.title, body: form.body, metadata: meta,
        coverImage: form.coverImage || null, personalPhotos: form.personalPhotos,
        embedUrl: form.embedUrl || null, embedType: form.embedType || null,
        rating: form.rating ? parseInt(form.rating, 10) : null,
        categoryId: selectedCategory?.id || form.categoryId,
        published: publish, publishedAt: form.publishedAt || undefined,
      });
    } catch (err) { alert('Failed: ' + err.message); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Top bar: category + title + settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Category</label>
          <select value={selectedCategory?.id || ''}
            onChange={(e) => setSelectedCategory(categories.find((c) => c.id === e.target.value) || null)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Your article title" />
        </div>
      </div>

      {/* Metadata fields for selected category */}
      {selectedCategory && Object.keys(metaFields).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(metaFields).map(([key, field]) => (
            <Field key={key} label={field.label} value={form.metadata[key] || ''}
              onChange={(v) => setForm({ ...form, metadata: { ...form.metadata, [key]: v } })} />
          ))}
        </div>
      )}

      {/* Cover image + date + rating row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CoverImageField value={form.coverImage} onChange={(v) => setForm({ ...form, coverImage: v })} />
        <div>
          <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Publish Date</label>
          <input type="datetime-local" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Rating (0–100)</label>
          <input type="number" min="0" max="100" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}
            placeholder="e.g. 85"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
        </div>
      </div>

      {/* Full markdown editor */}
      <MarkdownEditor value={form.body} onChange={(v) => setForm({ ...form, body: v })} />

      {/* Embed (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Embed URL" value={form.embedUrl} onChange={(v) => setForm({ ...form, embedUrl: v })} placeholder="YouTube, Qobuz, or Spotify (optional)" />
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
      </div>

      <SaveControls editMode={editMode} saving={saving} disabled={!form.title || !selectedCategory}
        onPublish={() => handleSave(true)} onDraft={() => handleSave(false)} onCancel={onCancel} />
    </div>
  );
}

// ─── Shared Save Controls ───
function SaveControls({ editMode, saving, disabled, onPublish, onDraft, onCancel }) {
  return (
    <div className="flex items-center gap-3 pt-4 border-t border-border">
      <button onClick={onPublish} disabled={disabled || saving}
        className="bg-accent text-white px-5 py-2.5 rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
        {saving ? 'Saving...' : editMode ? 'Update & Publish' : 'Publish Now'}
      </button>
      <button onClick={onDraft} disabled={disabled || saving}
        className="border border-border px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
        {editMode ? 'Save Draft' : 'Save as Draft'}
      </button>
      {editMode && onCancel && (
        <button onClick={onCancel} className="text-sm text-muted hover:text-ink ml-auto">Cancel</button>
      )}
    </div>
  );
}

// ─── Simple Field ───
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
      <h2 className="font-display text-xl mb-4">Suggestion Inbox <span className="text-accent text-base">({newSuggestions.length})</span></h2>
      <div className="space-y-3">
        {newSuggestions.map((s) => (
          <div key={s.id} className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{s.itemTitle}</p>
                <p className="text-sm text-muted">Suggested by {s.name}{s.category ? ` · ${s.category.icon} ${s.category.name}` : ''}</p>
                {s.message && <p className="text-sm mt-1 text-ink/70">"{s.message}"</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => onPromote(s)} className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors">Review this</button>
                <button onClick={() => onUpdateStatus(s.id, 'declined')} className="text-xs text-muted px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">Dismiss</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recent Posts ───
function RecentPosts({ reviews, onEdit, onDelete }) {
  if (reviews.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="font-display text-xl mb-4">All Posts</h2>
      <div className="space-y-1">
        {reviews.map((r) => {
          const meta = parseMeta(r.metadata);
          const isFullPost = meta._postMode === 'full';
          return (
            <div key={r.id} className="flex items-center justify-between py-2.5 px-2 border-b border-border last:border-0 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span>{r.category?.icon}</span>
                <span className="font-medium text-sm truncate">{r.title}</span>
                {isFullPost && <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded flex-shrink-0">Full</span>}
                {!r.published && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex-shrink-0">Draft</span>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <span className="text-xs text-muted">{r.publishedAt ? new Date(r.publishedAt).toLocaleDateString() : 'No date'}</span>
                <button onClick={() => onEdit(r)} className="text-xs text-accent hover:text-accent/80">Edit</button>
                <button onClick={() => { if (confirm(`Delete "${r.title}"?`)) onDelete(r.id); }}
                  className="text-xs text-red-400 hover:text-red-600">Delete</button>
              </div>
            </div>
          );
        })}
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
  const [editingReview, setEditingReview] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [postMode, setPostMode] = useState('quick'); // 'quick' | 'full'

  const loadData = useCallback(async () => {
    const [catRes, revRes, sugRes] = await Promise.all([
      fetch('/api/categories'), fetch('/api/reviews?all=true'), fetch('/api/suggestions'),
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
    const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to create');
    setFormKey((k) => k + 1);
    await loadData();
  };

  const handleUpdate = async (data) => {
    const res = await fetch('/api/reviews', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingReview.id, ...data }) });
    if (!res.ok) throw new Error('Failed to update');
    setEditingReview(null);
    setFormKey((k) => k + 1);
    await loadData();
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    await loadData();
  };

  const handlePromote = (s) => {
    fetch('/api/suggestions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, status: 'reviewing' }) }).then(() => loadData());
  };
  const handleUpdateStatus = (id, status) => {
    fetch('/api/suggestions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }).then(() => loadData());
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setAuthenticated(false);
  };

  // Detect if editing a full post
  const editIsFullPost = editingReview ? (parseMeta(editingReview.metadata)._postMode === 'full') : false;

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
            <a href="/api/backup" className="text-muted hover:text-accent transition-colors">📦 Backup</a>
            <a href="/" target="_blank" className="text-muted hover:text-accent transition-colors">View Site →</a>
            <button onClick={handleLogout} className="text-muted hover:text-ink transition-colors">Log out</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Post form */}
        <div className="bg-white rounded-xl border border-border p-6">
          {editingReview ? (
            <>
              <h2 className="font-display text-xl mb-4">
                Edit: {editingReview.title}
                <button onClick={() => { setEditingReview(null); setFormKey((k) => k + 1); }}
                  className="text-sm text-muted hover:text-ink ml-3 font-body">← Cancel</button>
              </h2>
              {editIsFullPost ? (
                <FullPostForm key={`edit-full-${editingReview.id}`} categories={categories}
                  initialData={editingReview} editMode onSave={handleUpdate}
                  onCancel={() => { setEditingReview(null); setFormKey((k) => k + 1); }} />
              ) : (
                <QuickPostForm key={`edit-quick-${editingReview.id}`} categories={categories}
                  initialData={editingReview} editMode onSave={handleUpdate}
                  onCancel={() => { setEditingReview(null); setFormKey((k) => k + 1); }} />
              )}
            </>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-display text-xl">New Post</h2>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  <button onClick={() => { setPostMode('quick'); setFormKey((k) => k + 1); }}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${postMode === 'quick' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>
                    Quick Post
                  </button>
                  <button onClick={() => { setPostMode('full'); setFormKey((k) => k + 1); }}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${postMode === 'full' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>
                    Full Post
                  </button>
                </div>
              </div>
              {postMode === 'quick' ? (
                <QuickPostForm key={`new-quick-${formKey}`} categories={categories} onSave={handleCreate} />
              ) : (
                <FullPostForm key={`new-full-${formKey}`} categories={categories} onSave={handleCreate} />
              )}
            </>
          )}
        </div>

        <SuggestionInbox suggestions={suggestions} onPromote={handlePromote} onUpdateStatus={handleUpdateStatus} />
        <RecentPosts reviews={reviews} onEdit={setEditingReview} onDelete={handleDelete} />
      </main>
    </div>
  );
}
