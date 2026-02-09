
import React, { useState } from 'react';
import { Scene } from '../types';

interface StoryboardCardProps {
  scene: Scene;
  onRegenerate: (id: number, refinementInstruction?: string) => void;
  onDownload: (imageUrl: string, title: string) => void;
  onUpdatePrompt: (id: number, newPrompt: string) => void;
  onZoom: (imageUrl: string) => void;
  showSuggestBtn?: boolean;
  onSuggestPrompt?: (id: number) => void;
}

const StoryboardCard: React.FC<StoryboardCardProps> = ({ 
  scene, 
  onRegenerate, 
  onDownload, 
  onUpdatePrompt, 
  onZoom,
  showSuggestBtn,
  onSuggestPrompt
}) => {
  const [showFixMenu, setShowFixMenu] = useState(false);
  const [fixInstruction, setFixInstruction] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!scene.isGenerating) {
        onRegenerate(scene.id);
      }
    }
  };

  const handleFixSubmit = () => {
    if (!fixInstruction.trim()) return;
    onRegenerate(scene.id, fixInstruction);
    setFixInstruction('');
    setShowFixMenu(false);
  };

  const handleQuickFix = (type: 'UPSCALE' | 'VARIATION') => {
    if (type === 'UPSCALE') {
      onRegenerate(scene.id, "High quality upscale, sharpen details, improve lighting and textures, remove artifacts, keep exact composition.");
    } else {
      onRegenerate(scene.id, "Create a creative variation of this image, keeping the main subject but improving the aesthetic and details.");
    }
    setShowFixMenu(false);
  };

  return (
    <div className={`group glass rounded-3xl overflow-hidden flex flex-col transition-all duration-500 animate-fade-in border border-white/5
      ${scene.isGenerating ? 'ring-2 ring-indigo-500/50 shadow-[0_0_40px_rgba(79,70,229,0.15)] scale-[1.01]' : 
        scene.error ? 'border-rose-500/20' : 'hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-900/10'}`}>
      
      {/* Visual Container */}
      <div className="aspect-[16/10] bg-slate-950 relative overflow-hidden">
        {scene.imageUrl && !scene.isGenerating && !scene.error ? (
          <img 
            src={scene.imageUrl} 
            alt={scene.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer" 
            onClick={() => onZoom(scene.imageUrl!)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center flex-col bg-slate-900/50">
            {scene.isGenerating ? (
              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="w-12 h-12 border-2 border-indigo-500/10 rounded-full"></div>
                  <div className="absolute inset-0 w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">
                  {scene.imageUrl ? 'Đang chỉnh sửa ảnh...' : 'Đang phác họa hình ảnh...'}
                </p>
              </div>
            ) : scene.error ? (
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-4 mx-auto border border-rose-500/20">
                  <span className="text-rose-500 font-bold">!</span>
                </div>
                <p className="text-[10px] text-rose-400 font-bold uppercase mb-4">{scene.error}</p>
                <button 
                  onClick={() => onRegenerate(scene.id)}
                  className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-100 rounded-lg text-[9px] font-black uppercase transition-all"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <div className="text-center opacity-20">
                <svg className="w-10 h-10 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-[9px] font-black uppercase tracking-widest">Sẵn sàng để tạo ảnh</p>
              </div>
            )}
          </div>
        )}
        
        {/* Quick Actions Overlay */}
        {scene.imageUrl && !scene.isGenerating && !scene.error && (
          <>
            {/* Fix Menu Overlay */}
            {showFixMenu && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-20 flex flex-col p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400">Công cụ sửa ảnh</h4>
                  <button onClick={() => setShowFixMenu(false)} className="text-slate-500 hover:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="flex-1 flex flex-col gap-3">
                  {/* Option 1: Custom Text */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="VD: Xóa ngón tay thừa, làm hộp đỏ hơn..."
                      value={fixInstruction}
                      onChange={(e) => setFixInstruction(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                      onClick={handleFixSubmit}
                      disabled={!fixInstruction}
                      className="absolute right-1 top-1 bottom-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-md text-[9px] font-bold uppercase disabled:opacity-50"
                    >
                      Sửa
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {/* Option 2: Upscale */}
                    <button 
                      onClick={() => handleQuickFix('UPSCALE')}
                      className="p-3 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-lg flex flex-col items-center gap-2 transition-all"
                    >
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      <span className="text-[9px] font-bold uppercase text-slate-300">Làm nét & Đẹp</span>
                    </button>
                    {/* Option 3: Variation */}
                    <button 
                      onClick={() => handleQuickFix('VARIATION')}
                      className="p-3 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-lg flex flex-col items-center gap-2 transition-all"
                    >
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      <span className="text-[9px] font-bold uppercase text-slate-300">Biến thể khác</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className={`absolute bottom-4 right-4 flex gap-2 transition-opacity duration-300 ${showFixMenu ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
              <button
                onClick={() => setShowFixMenu(true)}
                className="w-10 h-10 bg-indigo-600/90 backdrop-blur-xl rounded-xl text-white border border-indigo-500/50 flex items-center justify-center hover:bg-indigo-500 transition-colors shadow-lg animate-pulse"
                title="Sửa lỗi / Fix ảnh"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={() => onZoom(scene.imageUrl!)}
                className="w-10 h-10 bg-slate-900/90 backdrop-blur-xl rounded-xl text-white border border-white/10 flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg"
                title="Phóng to"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
              <button
                onClick={() => onDownload(scene.imageUrl!, scene.title)}
                className="w-10 h-10 bg-slate-900/90 backdrop-blur-xl rounded-xl text-white border border-white/10 flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg"
                title="Tải ảnh về"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </>
        )}

        <div className="absolute top-4 left-4">
           <span className="text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-[0.2em] bg-indigo-600 text-white shadow-lg">
            Cảnh 0{scene.id}
          </span>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-5 flex flex-col flex-1 bg-slate-900/40">
        <div className="mb-4">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1 block">Tên phân cảnh</span>
          <h3 className="font-black text-sm text-white leading-tight uppercase tracking-tight">
            {scene.title}
          </h3>
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 block">Kịch bản chi tiết (Enter để Sửa ảnh)</span>
            
            <div className="flex gap-2">
              {/* Nút Suggest (Chỉ hiện khi showSuggestBtn = true) */}
              {showSuggestBtn && onSuggestPrompt && (
                <button
                  onClick={() => onSuggestPrompt(scene.id)}
                  disabled={scene.isSuggesting}
                  className="text-[8px] font-black uppercase text-amber-400 hover:text-amber-300 disabled:opacity-30 transition-colors px-2 py-1 bg-amber-500/10 rounded-md border border-amber-500/20 flex items-center gap-1"
                >
                  {scene.isSuggesting ? (
                    <span className="animate-pulse">Đang viết...</span>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      AI Gợi ý
                    </>
                  )}
                </button>
              )}

              <button 
                onClick={() => onRegenerate(scene.id)}
                disabled={scene.isGenerating}
                className="text-[8px] font-black uppercase text-indigo-500 hover:text-indigo-400 disabled:opacity-30 transition-colors px-2 py-1 bg-indigo-500/5 rounded-md border border-indigo-500/10"
              >
                {scene.imageUrl ? 'Tạo Lại' : 'Tạo ảnh'}
              </button>
            </div>
          </div>
          <div className="group/edit relative">
            <textarea
              value={scene.prompt}
              onChange={(e) => onUpdatePrompt(scene.id, e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-32 bg-slate-950/70 border border-white/5 rounded-2xl p-4 text-[12px] text-slate-200 leading-relaxed font-medium focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none scrollbar-hide transition-all group-hover/edit:border-white/10"
              placeholder="Nhập nội dung bạn muốn chỉnh sửa cho cảnh này... Nhấn Enter để thực hiện."
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover/edit:opacity-100 transition-opacity">
              <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryboardCard;
