import { useState } from 'react';
import { photoUrl } from '../api/client';

export default function PhotoGallery({ photos }) {
  const [light, setLight] = useState(null);
  if (!photos?.length) return null;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Фотографии объекта</h3>
        <div className="flex gap-3 overflow-x-auto p-1 scrollbar-thin">
          {photos.map((ph, i) => (
            <div
              key={ph.id}
              onClick={() => setLight(i)}
              className="flex-shrink-0 w-36 h-24 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ring-2 ring-transparent hover:ring-accent"
            >
              <img src={photoUrl(ph.filename)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </div>

      {light !== null && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setLight(null)}>
          <button className="absolute top-5 right-6 text-white text-3xl hover:text-gray-300 transition-colors" onClick={() => setLight(null)}>✕</button>
          <button
            className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white text-xl flex items-center justify-center transition-colors"
            onClick={e => { e.stopPropagation(); setLight(i => (i - 1 + photos.length) % photos.length); }}
          >‹</button>
          <img src={photoUrl(photos[light].filename)} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          <button
            className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white text-xl flex items-center justify-center transition-colors"
            onClick={e => { e.stopPropagation(); setLight(i => (i + 1) % photos.length); }}
          >›</button>
        </div>
      )}
    </>
  );
}
