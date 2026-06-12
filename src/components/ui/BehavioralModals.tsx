import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

const BehavioralModals: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'statistique' | 'action' | null>(null);

  // Check if we can show a modal
  const canShowModal = useCallback(() => {
    const modalDismissedAt = localStorage.getItem('docmaster_modal_dismissed_at');
    const userHasDoneAction = localStorage.getItem('docmaster_user_engaged');
    
    if (userHasDoneAction === 'true') return false;
    if (!modalDismissedAt) return true;
    
    // Cooldown of 7 days
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return (Date.now() - parseInt(modalDismissedAt)) > sevenDays;
  }, []);

  const closeModal = () => {
    setActiveModal(null);
    localStorage.setItem('docmaster_modal_dismissed_at', Date.now().toString());
  };

  const handleAction = () => {
    localStorage.setItem('docmaster_user_engaged', 'true');
    setActiveModal(null);
  };

  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeModal]);

  useEffect(() => {
    if (!canShowModal()) return;

    // 1. Timer for Statistical Modal (25 seconds)
    const timer = setTimeout(() => {
      setActiveModal(prev => {
        if (!prev) return 'statistique';
        return prev;
      });
    }, 25000);

    // 2. Scroll listener for Action Modal (50% scroll)
    const handleScroll = () => {
      if (activeModal) return;

      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercentage > 50) {
        setActiveModal('action');
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [canShowModal, activeModal]);

  if (!activeModal) return null;

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 210 }}>
      {activeModal === 'statistique' && (
        <div 
          className="relative bg-white w-full max-w-2xl rounded-t-[28px] md:rounded-[32px] overflow-hidden shadow-2xl animate-slide-up flex flex-col md:flex-row min-h-[400px] modal-box"
          style={{ padding: 0 }}
        >
          {/* Grab handle for mobile */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-3 md:hidden flex-shrink-0" />
          
          {/* Image Side */}
          <div className="w-full md:w-1/2 bg-green-dark p-8 flex flex-col justify-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl" />
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 blur-2xl" />
             
             <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-inner backdrop-blur-md border border-white/10">
                   <i className="fa-solid fa-handshake-angle text-primary text-4xl" />
                </div>
                <h3 className="text-white font-bricolage text-2xl font-black mb-2 leading-tight">Chaque minute compte...</h3>
                <div className="w-12 h-1.5 bg-primary rounded-full mb-6" />
                <p className="text-white/60 text-sm italic font-medium">"Un simple geste peut changer le cours d'une vie."</p>
             </div>
          </div>

          {/* Content Side */}
          <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center relative">
            <button onClick={closeModal} className="absolute top-6 right-6 text-textMuted hover:text-textMain transition-colors">
              <i className="fa-solid fa-xmark text-xl" />
            </button>

            <div className="space-y-6">
               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-magnifying-glass text-primary" />
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-textMuted">
                    Saviez-vous que plus de <strong className="text-textMain">1 200 documents</strong> sont perdus chaque jour dans le pays ?
                  </p>
               </div>

               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-check-circle text-green-600" />
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-textMuted">
                    Grâce à la communauté <strong className="text-textMain">74%</strong> retrouvent leur propriétaire en moins de <strong className="text-primary">48 heures</strong>.
                  </p>
               </div>
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <Link to="/trouver" onClick={handleAction} className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/25 text-center hover:scale-[1.02] active:scale-95 transition-all">
                J'AI TROUVÉ UN DOCUMENT
              </Link>
              <Link to="/login" onClick={handleAction} className="w-full py-4 bg-white border border-borderMain text-textMain rounded-2xl font-bold text-sm text-center hover:bg-surface2 transition-all">
                J'AI PERDU MON DOCUMENT
              </Link>
              <button onClick={closeModal} className="text-[11px] font-bold text-textMuted uppercase tracking-widest mt-2 hover:text-textMain transition-colors">
                Fermer, je regarde juste
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'action' && (
        <div className="relative bg-white w-full max-w-3xl rounded-t-[28px] md:rounded-[40px] overflow-hidden shadow-2xl animate-scale-up p-8 md:p-12 modal-box">
          {/* Grab handle for mobile */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 md:hidden" />

          <button onClick={closeModal} className="absolute top-8 right-8 text-textMuted hover:text-textMain transition-colors">
            <i className="fa-solid fa-xmark text-2xl" />
          </button>

          <div className="text-center mb-10">
            <h2 className="font-bricolage text-3xl md:text-4xl font-black text-textMain mb-4">Que souhaitez-vous faire ?</h2>
            <p className="text-textMuted text-[14px] md:text-[16px] max-w-xl mx-auto">
              Notre algorithme de matching croise instantanément les caractéristiques des documents perdus et trouvés.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-orange-50/50 border border-orange-100 p-8 rounded-[32px] flex flex-col text-center hover:bg-orange-50 transition-colors group">
               <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-search text-orange-500 text-2xl" />
               </div>
               <h3 className="font-bricolage text-xl font-bold text-textMain mb-3">Je cherche un document</h3>
               <p className="text-[13px] text-textMuted leading-relaxed mb-8 flex-1">
                 Renseignez le nom et la ville. Si quelqu'un l'a trouvé, vous recevrez une alerte immédiate.
               </p>
               <Link to="/login" onClick={handleAction} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-500/20">
                 CRÉER UNE ALERTE
               </Link>
            </div>

            <div className="bg-green-50/50 border border-green-100 p-8 rounded-[32px] flex flex-col text-center hover:bg-green-50 transition-colors group">
               <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-hand-holding-heart text-green-600 text-2xl" />
               </div>
               <h3 className="font-bricolage text-xl font-bold text-textMain mb-3">J'ai trouvé un document</h3>
               <p className="text-[13px] text-textMuted leading-relaxed mb-8 flex-1">
                 Ne le laissez pas traîner. Enregistrez-le de manière anonyme pour aider son propriétaire.
               </p>
               <Link to="/trouver" onClick={handleAction} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-green-600/20">
                 DÉCLARER UNE TROUVAILLE
               </Link>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <button onClick={closeModal} className="text-[12px] font-bold text-textMuted uppercase tracking-widest hover:text-textMain transition-colors">
              Plus tard, je parcours le site
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scale-up { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .animate-scale-up { animation: scale-up 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
      `}</style>
    </div>,
    document.body
  );
};

export default BehavioralModals;
