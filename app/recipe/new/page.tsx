'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { RecipeFormData, Ingredient, Instruction } from '@/types/recipe';

type Tab = 'manual' | 'upload' | 'url';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const emptyIngredient = (): Ingredient => ({ item: '', amount: '', unit: '', notes: '' });
const emptyInstruction = (): Instruction => ({ step: '' });

export default function NewRecipePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Extracted data state
  const [formData, setFormData] = useState<RecipeFormData | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Source tracking
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [servings, setServings] = useState(1);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([emptyIngredient()]);
  const [instructions, setInstructions] = useState<Instruction[]>([emptyInstruction()]);

  const applyExtractedData = useCallback((data: RecipeFormData) => {
    setName(data.name ?? '');
    setServings(data.servings ?? 1);
    setPrepTime(data.prep_time ?? '');
    setCookTime(data.cook_time ?? '');
    setNotes(data.notes ?? '');
    setTagsInput((data.tags ?? []).join(', '));
    setIngredients(data.ingredients?.length ? data.ingredients : [emptyIngredient()]);
    setInstructions(data.instructions?.length ? data.instructions : [emptyInstruction()]);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setExtractionError('');
    setFormData(null);
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) fileInputRef.current.files = dt.files;
      const event = { target: fileInputRef.current } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(event);
    }
  }, [handleFileChange]);

  const handleExtractFile = async () => {
    if (!selectedFile) return;
    if (selectedFile.size > MAX_FILE_SIZE) {
      setExtractionError('File too large. Maximum size is 10MB.');
      return;
    }

    setExtracting(true);
    setExtractionError('');

    const fd = new FormData();
    fd.append('file', selectedFile);

    try {
      const res = await fetch('/api/extract-from-file', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok) {
        setExtractionError(json.error ?? 'Extraction failed. Please try again or enter manually.');
      } else {
        const normalized = normalizeExtractedData(json.data);
        applyExtractedData(normalized);
        setFormData(normalized);
        setSourceFileUrl(json.fileUrl ?? null);
        setSourceUrl(null);
        setActiveTab('manual');
      }
    } catch {
      setExtractionError('Network error. Please check your connection and try again.');
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractUrl = async () => {
    if (!urlInput.trim()) return;

    setExtracting(true);
    setExtractionError('');

    try {
      const res = await fetch('/api/extract-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const json = await res.json();

      if (!res.ok) {
        setExtractionError(json.error ?? 'Couldn\'t extract a recipe from this URL. Please try entering manually.');
      } else {
        const normalized = normalizeExtractedData(json.data);
        applyExtractedData(normalized);
        setFormData(normalized);
        setSourceUrl(json.sourceUrl ?? null);
        setSourceFileUrl(null);
        setActiveTab('manual');
      }
    } catch {
      setExtractionError('Network error. Please check your connection and try again.');
    } finally {
      setExtracting(false);
    }
  };

  const updateIngredient = (i: number, field: keyof Ingredient, value: string) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  };

  const addIngredient = () => setIngredients(prev => [...prev, emptyIngredient()]);
  const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i));

  const updateInstruction = (i: number, value: string) => {
    setInstructions(prev => prev.map((ins, idx) => idx === i ? { step: value } : ins));
  };

  const addInstruction = () => setInstructions(prev => [...prev, emptyInstruction()]);
  const removeInstruction = (i: number) => setInstructions(prev => prev.filter((_, idx) => idx !== i));

  const clearExtractedData = () => {
    setName('');
    setServings(1);
    setPrepTime('');
    setCookTime('');
    setNotes('');
    setTagsInput('');
    setIngredients([emptyIngredient()]);
    setInstructions([emptyInstruction()]);
    setFormData(null);
    setSourceUrl(null);
    setSourceFileUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const filteredIngredients = ingredients.filter(i => i.item.trim());
    const filteredInstructions = instructions.filter(i => i.step.trim());

    const body: RecipeFormData = {
      name, servings, prep_time: prepTime, cook_time: cookTime,
      ingredients: filteredIngredients, instructions: filteredInstructions,
      tags, notes,
    };

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-espresso text-cream py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">Add New Recipe</h1>
          <p className="text-cream/60 mt-1">Fill in the details below to add a recipe to your cookbook</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Tab Selector */}
        <div className="flex gap-1 bg-espresso/5 rounded-xl p-1">
          {(['manual', 'upload', 'url'] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-caramel text-espresso shadow-sm'
                  : 'text-espresso/60 hover:text-espresso hover:bg-espresso/5'
              }`}
            >
              {tab === 'manual' && '✏️  Manual Entry'}
              {tab === 'upload' && '📄  Upload File'}
              {tab === 'url' && '🔗  From URL'}
            </button>
          ))}
        </div>

        {/* Upload File Panel */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-xl border border-espresso/10 p-6 space-y-4">
            <h2 className="text-lg font-bold text-espresso border-b border-espresso/10 pb-2">Upload a Recipe File</h2>
            <p className="text-sm text-espresso/60">
              Upload an image (JPG, PNG, WebP, GIF), PDF, or Word document containing a recipe.
              We'll extract the recipe data using AI.
            </p>
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-espresso/20 rounded-xl p-8 text-center cursor-pointer hover:border-caramel hover:bg-caramel/5 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
              ) : selectedFile ? (
                <div className="space-y-2">
                  <span className="text-2xl">📄</span>
                  <p className="font-medium text-espresso">{selectedFile.name}</p>
                  <p className="text-xs text-espresso/50">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-4xl">📁</span>
                  <p className="font-medium text-espresso">Click or drag & drop to upload</p>
                  <p className="text-xs text-espresso/50">JPG, PNG, WebP, GIF, PDF, or Word (.docx) — max 10MB</p>
                </div>
              )}
            </div>
            {selectedFile && !previewUrl && (
              <p className="text-xs text-espresso/50 text-center">
                {selectedFile.type === 'application/pdf' && '📕 PDF detected — will extract text with AI'}
                {selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && '📘 Word document detected — will extract text with AI'}
              </p>
            )}
            {extractionError && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">{extractionError}</div>
            )}
            <button
              type="button"
              onClick={handleExtractFile}
              disabled={!selectedFile || extracting}
              className="btn-caramel disabled:opacity-50 w-full"
            >
              {extracting ? '🔍 Analyzing recipe...' : 'Extract Recipe'}
            </button>
          </div>
        )}

        {/* From URL Panel */}
        {activeTab === 'url' && (
          <div className="bg-white rounded-xl border border-espresso/10 p-6 space-y-4">
            <h2 className="text-lg font-bold text-espresso border-b border-espresso/10 pb-2">Extract from URL</h2>
            <p className="text-sm text-espresso/60">
              Paste a URL to a recipe page and we'll extract the recipe data using AI.
              Works best with dedicated recipe sites.
            </p>
            <div className="flex gap-3">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExtractUrl()}
                placeholder="https://example.com/recipe/chocolate-chip-cookies"
                className="input-field flex-grow"
              />
              <button
                type="button"
                onClick={handleExtractUrl}
                disabled={!urlInput.trim() || extracting}
                className="btn-caramel disabled:opacity-50 whitespace-nowrap"
              >
                {extracting ? '🔍 Extracting...' : 'Extract'}
              </button>
            </div>
            {extractionError && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">{extractionError}</div>
            )}
          </div>
        )}

        {/* Manual Entry Form */}
        {activeTab === 'manual' && (
          <>
            {formData && (
              <div className="flex items-center gap-3 bg-sage/10 border border-sage/30 rounded-lg px-4 py-3 flex-wrap">
                <span className="text-sage font-medium text-sm">
                  ✅ Recipe extracted — review and edit below before saving
                </span>
                {sourceUrl && (
                  <span className="text-xs text-espresso/60">
                    Extracted from: <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-caramel hover:underline">{sourceUrl}</a>
                  </span>
                )}
                {sourceFileUrl && (
                  <span className="text-xs text-espresso/60">
                    Source file: <a href={sourceFileUrl} target="_blank" rel="noopener noreferrer" className="text-caramel hover:underline">{sourceFileUrl}</a>
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearExtractedData}
                  className="ml-auto text-xs text-espresso/50 hover:text-espresso underline"
                >
                  Clear & start over
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg">{error}</div>
              )}

              {/* Basic Info */}
              <section className="bg-white rounded-xl p-6 border border-espresso/10 space-y-4">
                <h2 className="text-lg font-bold text-espresso border-b border-espresso/10 pb-2">Basic Info</h2>
                <div>
                  <label className="block text-sm font-medium text-espresso mb-1">Recipe Name *</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="e.g. Grandma's Apple Pie" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-espresso mb-1">Servings *</label>
                    <input type="number" required min="1" value={servings} onChange={e => setServings(parseInt(e.target.value) || 1)} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-espresso mb-1">Prep Time</label>
                    <input type="text" value={prepTime} onChange={e => setPrepTime(e.target.value)} className="input-field" placeholder="e.g. 15 min" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-espresso mb-1">Cook Time</label>
                    <input type="text" value={cookTime} onChange={e => setCookTime(e.target.value)} className="input-field" placeholder="e.g. 45 min" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-espresso mb-1">Tags</label>
                    <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="input-field" placeholder="dessert, easy, vegan" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-espresso mb-1">Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field resize-none" rows={2} placeholder="Tips, variations, source..." />
                </div>
              </section>

              {/* Ingredients */}
              <section className="bg-white rounded-xl p-6 border border-espresso/10">
                <h2 className="text-lg font-bold text-espresso border-b border-espresso/10 pb-2 mb-4">Ingredients</h2>
                <div className="space-y-3">
                  {ingredients.map((ing, i) => (
                    <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-start">
                      <input type="text" value={ing.amount} onChange={e => updateIngredient(i, 'amount', e.target.value)} className="input-field" placeholder="Amt" />
                      <input type="text" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} className="input-field" placeholder="Unit" />
                      <input type="text" value={ing.item} onChange={e => updateIngredient(i, 'item', e.target.value)} className="input-field col-span-1 sm:col-span-2" placeholder="Ingredient" />
                      <div className="flex gap-1">
                        <input type="text" value={ing.notes} onChange={e => updateIngredient(i, 'notes', e.target.value)} className="input-field flex-grow" placeholder="Notes" />
                        <button type="button" onClick={() => removeIngredient(i)} className="text-espresso/40 hover:text-red-500 flex-shrink-0 px-1">×</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addIngredient} className="mt-3 text-sm text-caramel hover:text-caramel/80 font-medium">+ Add Ingredient</button>
              </section>

              {/* Instructions */}
              <section className="bg-white rounded-xl p-6 border border-espresso/10">
                <h2 className="text-lg font-bold text-espresso border-b border-espresso/10 pb-2 mb-4">Instructions</h2>
                <div className="space-y-3">
                  {instructions.map((ins, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-caramel text-espresso flex items-center justify-center font-bold text-sm mt-2">{i + 1}</span>
                      <textarea value={ins.step} onChange={e => updateInstruction(i, e.target.value)} className="input-field flex-grow resize-none" rows={2} placeholder={`Step ${i + 1}...`} />
                      <button type="button" onClick={() => removeInstruction(i)} className="text-espresso/40 hover:text-red-500 flex-shrink-0 px-1 mt-2 text-xl">×</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addInstruction} className="mt-3 text-sm text-caramel hover:text-caramel/80 font-medium">+ Add Step</button>
              </section>

              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-caramel disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Recipe'}
                </button>
                <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-espresso/20 text-espresso rounded-lg hover:bg-espresso/5 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

function normalizeExtractedData(data: unknown): RecipeFormData {
  const d = data as Record<string, unknown>;
  return {
    name: String(d.name ?? ''),
    servings: typeof d.servings === 'number' ? d.servings : 1,
    prep_time: String(d.prep_time ?? ''),
    cook_time: String(d.cook_time ?? ''),
    ingredients: (Array.isArray(d.ingredients) ? d.ingredients : []).map((ing: unknown) => {
      const i = ing as Record<string, unknown>;
      return { item: String(i.item ?? ''), amount: String(i.amount ?? ''), unit: String(i.unit ?? ''), notes: String(i.notes ?? '') };
    }),
    instructions: (Array.isArray(d.instructions) ? d.instructions : []).map((ins: unknown) => {
      const s = ins as Record<string, unknown>;
      return { step: String(s.step ?? '') };
    }),
    tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
    notes: String(d.notes ?? ''),
  };
}
