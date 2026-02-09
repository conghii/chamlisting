
import React, { useState } from 'react';
import { AssetData } from '../types';

interface AssetUploaderProps {
  label: string;
  id: string;
  onUpload: (asset: AssetData) => void;
  preview?: string;
  optional?: boolean;
  onZoom?: (imageUrl: string) => void;
}

const AssetUploader: React.FC<AssetUploaderProps> = ({ label, id, onUpload, preview, optional, onZoom }) => {
  const [error, setError] = useState<string | null>(null);

  const processFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Unsupported image format');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onUpload({
        data: base64,
        mimeType: file.type
      });
    };
    reader.onerror = () => {
      setError('Reference image could not be processed');
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let foundImage = false;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          foundImage = true;
          break;
        }
      }
    }
    
    if (foundImage) {
      e.preventDefault();
    }
  };

  const handleZoom = (e: React.MouseEvent) => {
    if (preview && onZoom) {
      e.preventDefault();
      e.stopPropagation();
      onZoom(preview);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor={id}>
          {label} {optional && <span className="lowercase font-normal opacity-60">(optional)</span>}
        </label>
        {error && <span className="text-[10px] text-rose-400 font-medium animate-pulse">{error}</span>}
      </div>
      <div className="relative group">
        <input
          type="file"
          id={id}
          accept="image/png, image/jpeg, image/jpg, image/webp"
          onChange={handleChange}
          className="hidden"
        />
        <label
          htmlFor={id}
          tabIndex={0}
          onPaste={handlePaste}
          className={`flex items-center justify-center h-24 w-full border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 overflow-hidden outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 relative
            ${preview ? 'border-indigo-500 bg-slate-800' : 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800'}
            ${error ? 'border-rose-900 bg-rose-950/20' : ''}
          `}
          title="Click to upload or Paste (Ctrl+V) image here"
        >
          {preview ? (
            <>
              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              {onZoom && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    type="button"
                    onClick={handleZoom}
                    className="p-1.5 bg-black/60 hover:bg-indigo-600 text-white rounded-md backdrop-blur-sm transition-colors shadow-sm"
                    title="Phóng to ảnh (Zoom)"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <span className={`text-2xl ${error ? 'text-rose-700' : 'text-slate-500 group-hover:text-slate-400'}`}>
                {error ? '!' : '+'}
              </span>
              <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Upload or Paste</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
};

export default AssetUploader;
