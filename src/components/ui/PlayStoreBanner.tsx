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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 text-white p-3 md:p-4 md:bottom-4 md:left-auto md:right-4 md:max-w-md md:rounded-xl shadow-xl">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <i className="ph ph-device-mobile text-lg md:text-xl shrink-0" />
          <p className="text-xs md:text-sm font-medium truncate">Téléchargez l'application DocMaster</p>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <a href="https://play.google.com/store/apps/details?id=com.tesea.docmaster" target="_blank" rel="noopener noreferrer" className="bg-white text-black px-1.5 md:px-2 py-1 rounded-md text-[10px] md:text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
            <img src="/src/assets/images/Playstore.png" alt="Google Play" className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden xs:inline">Google Play</span>
          </a>
          <a href="#" className="bg-white text-black px-1.5 md:px-2 py-1 rounded-md text-[10px] md:text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
            <i className="ph ph-apple-logo text-sm" />
            <span className="hidden xs:inline">App Store</span>
          </a>
          <button onClick={dismiss} className="text-gray-400 hover:text-white ml-0.5 md:ml-2 text-base md:text-lg">✕</button>
        </div>
      </div>
    </div>
  );
};

export default PlayStoreBanner;
