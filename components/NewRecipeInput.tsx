'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { Recipe, RecipeFormData } from '@/types/recipe';

type Tab = 'manual' | 'upload' | 'url';

interface NewRecipeInputProps {
  children: (formData: RecipeFormData | null, setFormData: (data: RecipeFormData | null) => void) => React.ReactNode;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function NewRecipeInput({ children }: NewRecipeInputProps) {
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [formData, setFormData] = useState<RecipeFormData | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setFormData(null);

    const fd = new FormData();
    fd.append('file', selectedFile);

    try {
      const res = await fetch('/api/extract-from-file', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok) {
        setExtractionError(json.error ?? 'Extraction failed. Please try again or enter manually.');
      } else {
        setFormData(normalizeExtractedData(json.data));
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
    setFormData(null);

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
        setFormData(normalizeExtractedData(json.data));
        setActiveTab('manual');
      }
    } catch {
      setExtractionError('Network error. Please check your connection and try again.');
    } finally {
      setExtracting(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setExtractionError('');
  };

  const clearFormData = () => {
    setFormData(null);
  };

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex gap-1 bg-espresso/5 rounded-xl p-1">
        {(['manual', 'upload', 'url'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
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

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <div>
          {formData && (
            <div className="mb-4 flex items-center gap-3 bg-sage/10 border border-sage/30 rounded-lg px-4 py-3">
              <span className="text-sage font-medium text-sm">
                ✅ Recipe extracted successfully — review and edit below before saving
              </span>
              <button
                type="button"
                onClick={clearFormData}
                className="ml-auto text-xs text-espresso/50 hover:text-espresso underline"
              >
                Clear & start over
              </button>
            </div>
          )}
          {children(formData, setFormData)}
        </div>
      )}

      {/* Upload File Tab */}
      {activeTab === 'upload' && (
        <div className="bg-white rounded-xl border border-espresso/10 p-6 space-y-4">
          <h2 className="text-lg font-bold text-espresso border-b border-espresso/10 pb-2">Upload a Recipe File</h2>
          <p className="text-sm text-espresso/60">
            Upload an image (JPG, PNG, WebP, GIF), PDF, or Word document containing a recipe.
            We&apos;ll extract the recipe data using AI.
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
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
              {extractionError}
            </div>
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

      {/* From URL Tab */}
      {activeTab === 'url' && (
        <div className="bg-white rounded-xl border border-espresso/10 p-6 space-y-4">
          <h2 className="text-lg font-bold text-espresso border-b border-espresso/10 pb-2">Extract from URL</h2>
          <p className="text-sm text-espresso/60">
            Paste a URL to a recipe page and we&apos;ll extract the recipe data using AI.
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
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
              {extractionError}
            </div>
          )}
        </div>
      )}
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
      return {
        item: String(i.item ?? ''),
        amount: String(i.amount ?? ''),
        unit: String(i.unit ?? ''),
        notes: String(i.notes ?? ''),
      };
    }),
    instructions: (Array.isArray(d.instructions) ? d.instructions : []).map((ins: unknown) => {
      const s = ins as Record<string, unknown>;
      return { step: String(s.step ?? '') };
    }),
    tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
    notes: String(d.notes ?? ''),
  };
}
