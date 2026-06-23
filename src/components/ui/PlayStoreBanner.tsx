import React, { useState, useEffect } from 'react';

const PlayStoreBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('hidePlayStoreBanner');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem('hidePlayStoreBanner', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 bg-gray-900 text-white p-4 rounded-xl flex items-center justify-between gap-4 shadow-xl">
      <div className="flex items-center gap-3">
        <i className="fa-solid fa-mobile-screen text-xl" />
        <p className="text-sm font-medium">Téléchargez l'application DocMaster gratuitement</p>
      </div>
      <div className="flex items-center gap-2">
        <a href="https://play.google.com/store/apps/details?id=com.tesea.docmaster" target="_blank" rel="noopener noreferrer" className="bg-white text-black px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
          <img src="/src/assets/images/Playstore.png" alt="Google Play" className="w-4 h-4" />
          Google Play
        </a>
        <a href="#" className="bg-white text-black px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
          <i className="fa-brands fa-apple" />
          App Store
        </a>
        <button onClick={dismiss} className="text-gray-400 hover:text-white ml-2 text-lg">✕</button>
      </div>
    </div>
  );
};

export default PlayStoreBanner;
