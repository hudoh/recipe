'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { RecipeFormData, Ingredient, Instruction } from '@/types/recipe';

type Tab = 'manual' | 'upload' | 'url';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const emptyIngredient = (): Ingredient => ({ item: '', amount: '', unit: '', notes: '' });

/** Resize an image file to max 1200px on longest side, compress to JPEG 0.8 quality */
async function resizeImage(file: File, maxDim = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(blob => {
            if (!blob) { resolve(file); return; }
            // Wrap blob in a proper File object
            try {
              const renamed = file.name.replace(/\.[^.]+$/, '.jpg');
              const resizedFile = new File([blob], renamed, { type: 'image/jpeg' });
              resolve(resizedFile);
            } catch {
              // Fallback: return original file if File constructor fails
              resolve(file);
            }
          }, 'image/jpeg', quality);
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    } catch {
      resolve(file);
    }
  });
}
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Source tracking
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [servings, setServings] = useState<number | null>(null);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([emptyIngredient()]);
  const [instructions, setInstructions] = useState<Instruction[]>([emptyInstruction()]);

  const applyExtractedData = useCallback((data: RecipeFormData) => {
    setName(data.name ?? '');
    setServings(typeof data.servings === 'number' ? data.servings : null);
    setPrepTime(data.prep_time ?? '');
    setCookTime(data.cook_time ?? '');
    setNotes(data.notes ?? '');
    setTagsInput((data.tags ?? []).join(', '));
    setIngredients(data.ingredients?.length ? data.ingredients : [emptyIngredient()]);
    setInstructions(data.instructions?.length ? data.instructions : [emptyInstruction()]);
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setExtractionError('');
    setFormData(null);
    // Resize images before storing (compresses HEIC/large photos for upload)
    const processed = await Promise.all(files.map(async (f) => {
      if (f.type.startsWith('image/')) {
        const resized = await resizeImage(f);
        return { file: resized, preview: URL.createObjectURL(resized) };
      }
      return { file: f, preview: null };
    }));
    processed.forEach(({ file, preview }) => {
      setSelectedFiles(prev => prev.length < 4 ? [...prev, file] : prev);
      if (preview) {
        setPreviewUrls(prev => prev.length < 4 ? [...prev, preview] : prev);
      } else if (file.type.startsWith('image/')) {
        // Fallback for non-image files that somehow got here
        const reader = new FileReader();
        reader.onload = (ev) => setPreviewUrls(prev => prev.length < 4 ? [...prev, ev.target?.result as string] : prev);
        reader.readAsDataURL(file);
      }
    });
    // Reset input so same file can be selected again
    e.target.value = '';
  }, []);

  const handleCameraChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setExtractionError('');
    setFormData(null);
    const processed = await Promise.all(files.map(async (f) => {
      if (f.type.startsWith('image/')) {
        const resized = await resizeImage(f);
        return { file: resized, preview: URL.createObjectURL(resized) };
      }
      return { file: f, preview: null };
    }));
    processed.forEach(({ file, preview }) => {
      setSelectedFiles(prev => prev.length < 4 ? [...prev, file] : prev);
      if (preview) {
        setPreviewUrls(prev => prev.length < 4 ? [...prev, preview] : prev);
      }
    });
    e.target.value = '';
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
    const event = { target: fileInputRef.current } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileChange(event);
  }, [handleFileChange]);

  const handleExtractFile = async () => {
    if (selectedFiles.length === 0) return;
    const oversized = selectedFiles.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setExtractionError('File too large. Maximum size is 10MB.');
      return;
    }

    setExtracting(true);
    setExtractionError('');

    const fd = new FormData();
    selectedFiles.forEach(f => fd.append('files', f));
    console.log('[extract] sending', selectedFiles.length, 'files, total size:', selectedFiles.reduce((a, f) => a + f.size, 0), 'bytes');

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45_000); // 45s timeout
      const res = await fetch('/api/extract-from-file', { method: 'POST', body: fd, signal: controller.signal as RequestInit['signal'] });
      clearTimeout(timer);
      const json = await res.json();

      if (!res.ok) {
        setExtractionError(json.error ?? 'Extraction failed. Please try again or enter manually.');
      } else {
        const normalized = normalizeExtractedData(json.data);
        applyExtractedData(normalized);
        setFormData(normalized);
        setSourceFileUrl(Array.isArray(json.fileUrls) ? json.fileUrls[0] ?? null : (json.fileUrl ?? null));
        setSourceUrl(null);
        setActiveTab('manual');
      }
    } catch (err) {
      console.error('[extract] fetch error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setExtractionError('This is taking longer than expected. The image may be too large — try a smaller file or fewer photos.');
      } else if (err instanceof Error) {
        setExtractionError('Error: ' + err.message);
      } else {
        setExtractionError('Network error. Please check your connection and try again.');
      }
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
            {/* File drop zone — opens photo library picker (no capture=environment) */}
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-espresso/20 rounded-xl p-6 text-center cursor-pointer hover:border-caramel hover:bg-caramel/5 transition-colors"
            >
              {/* Photo library picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {/* Camera input — triggered by the Take Photo button */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraChange}
                className="hidden"
              />
              {/* Camera shortcut button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                className="mb-3 inline-flex items-center gap-2 px-4 py-2 bg-sage/10 text-sage rounded-lg text-sm hover:bg-sage/20 transition-colors"
              >
                📷 Take Photo
              </button>
              {/* Image previews */}
              {previewUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-center mb-3">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Preview ${i + 1}`} className="h-20 w-20 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewUrls(prev => prev.filter((_, j) => j !== i));
                          setSelectedFiles(prev => prev.filter((_, j) => j !== i));
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {selectedFiles.length > 0 ? (
                <div className="space-y-1">
                  <p className="font-medium text-espresso">{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected</p>
                  {selectedFiles.some(f => f.type === 'application/pdf') && <p className="text-xs text-espresso/60">📕 PDF — will extract text with AI</p>}
                  {selectedFiles.some(f => f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') && <p className="text-xs text-espresso/60">📘 Word — will extract text with AI</p>}
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-3xl">📁</span>
                  <p className="font-medium text-espresso">Click to choose files or drag & drop</p>
                  <p className="text-xs text-espresso/50">JPG, PNG, WebP, GIF, PDF, Word — up to 4 images</p>
                </div>
              )}
            </div>
            {extractionError && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">{extractionError}</div>
            )}
            <button
              type="button"
              onClick={handleExtractFile}
              disabled={selectedFiles.length === 0 || extracting}
              className="btn-caramel disabled:opacity-50 w-full"
            >
              {extracting ? '🔍 Extracting recipe (may take up to 30s)…' : 'Extract Recipe'}
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
                    <input type="number" min="1" placeholder="e.g. 4" value={servings ?? ''} onChange={e => setServings(e.target.value ? parseInt(e.target.value) : null)} className="input-field" />
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
    servings: typeof d.servings === 'number' ? d.servings : null,
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
