// app/suggest/page.js
// Public page where visitors can suggest items for Kyle to review
'use client';
import { useState, useEffect } from 'react';

export default function SuggestPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', itemTitle: '', categoryId: '', message: '' });
  const [status, setStatus] = useState(null); // 'sending' | 'sent' | 'error'

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('sent');
        setForm({ name: '', itemTitle: '', categoryId: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <a href="/" className="font-display text-xl text-ink hover:text-accent transition-colors">
            Kyle.Reviews
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl mb-2">Suggest Something</h1>
        <p className="text-muted mb-8">
          Got a movie, book, album, or anything else I should check out? Let me know!
        </p>

        {status === 'sent' ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-green-800 font-medium text-lg">Thanks for the suggestion!</p>
            <p className="text-green-600 text-sm mt-1">I'll check it out.</p>
            <button
              onClick={() => setStatus(null)}
              className="mt-4 text-sm text-accent hover:underline"
            >
              Suggest another
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Your name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="First name is fine"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">What are you suggesting?</label>
              <input
                type="text"
                value={form.itemTitle}
                onChange={(e) => setForm({ ...form, itemTitle: e.target.value })}
                className="w-full border border-border rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder='e.g. "Dune Part Two" or "Klara and the Sun"'
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category (optional)</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full border border-border rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Not sure</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Why do you recommend it?</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full border border-border rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[100px]"
                placeholder="A few words about why I'd like it..."
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!form.name || !form.itemTitle || status === 'sending'}
              className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending...' : 'Send Suggestion'}
            </button>

            {status === 'error' && (
              <p className="text-red-600 text-sm">Something went wrong. Please try again.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
