'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Visibility, Profile } from '@/types/recipe';

type ShareModalProps = {
  recipeId: string;
  currentVisibility: Visibility;
  onClose: () => void;
  onSaved: (visibility: Visibility) => void;
};

export default function ShareModal({ recipeId, currentVisibility, onClose, onSaved }: ShareModalProps) {
  const [visibility, setVisibility] = useState<Visibility>(currentVisibility || 'private');
  const [sharedUsers, setSharedUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load current shares
  useEffect(() => {
    fetch(`/api/recipes/${recipeId}/shares`)
      .then(r => r.json())
      .then(data => {
        if (data.users) setSharedUsers(data.users);
      })
      .catch(() => {});
  }, [recipeId]);

  // Debounced user search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addUser = async (user: Profile) => {
    setError('');
    const res = await fetch(`/api/recipes/${recipeId}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    });
    if (res.ok) {
      setSharedUsers(prev => [...prev, user]);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to share');
    }
  };

  const removeUser = async (userId: string) => {
    setError('');
    const res = await fetch(`/api/recipes/${recipeId}/shares/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      setSharedUsers(prev => prev.filter(u => u.id !== userId));
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to remove');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      if (res.ok) {
        onSaved(visibility);
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-espresso/10">
          <h2 className="text-xl font-bold text-espresso">Share Recipe</h2>
          <button onClick={onClose} className="text-espresso/50 hover:text-espresso text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Visibility options */}
          <div>
            <label className="block text-sm font-semibold text-espresso mb-3">Who can view this recipe?</label>
            <div className="space-y-2">
              {[
                { value: 'private', emoji: '🔒', title: 'Private', desc: 'Only you can see this recipe' },
                { value: 'public', emoji: '🌍', title: 'Public', desc: 'Anyone on the app can see this recipe' },
                { value: 'shared', emoji: '👥', title: 'Specific people', desc: 'Only people you pick can see this recipe' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${visibility === opt.value ? 'border-caramel bg-caramel/5' : 'border-espresso/10 hover:border-espresso/30'}`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value as Visibility)}
                    className="sr-only"
                  />
                  <span className="text-xl">{opt.emoji}</span>
                  <div>
                    <p className="font-medium text-espresso">{opt.title}</p>
                    <p className="text-xs text-espresso/60">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Specific people selector */}
          {visibility === 'shared' && (
            <div>
              <label className="block text-sm font-semibold text-espresso mb-2">Share with specific people</label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by email or username…"
                className="input-field mb-2"
              />
              {searching && <p className="text-xs text-espresso/50 mb-2">Searching…</p>}
              {searchResults.length > 0 && (
                <div className="border border-espresso/10 rounded-lg divide-y divide-espresso/5 mb-3">
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => addUser(u)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-cream transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center text-sm font-bold text-sage">
                        {u.display_name?.[0]?.toUpperCase() || u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-espresso">{u.display_name || u.username}</p>
                        <p className="text-xs text-espresso/50">@{u.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {sharedUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-espresso/50 uppercase tracking-wide">Shared with:</p>
                  {sharedUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-cream rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center text-sm font-bold text-sage">
                          {u.display_name?.[0]?.toUpperCase() || u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-espresso">{u.display_name || u.username}</p>
                          <p className="text-xs text-espresso/50">@{u.username}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeUser(u.id)}
                        className="text-espresso/40 hover:text-red-500 text-lg"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-espresso/10 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-espresso/70 hover:text-espresso transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-caramel disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
