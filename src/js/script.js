document.addEventListener("DOMContentLoaded", () => {
  /**
   * ==================================
   * Données des abonnements
   * ==================================
   */
  const abonnements = [
    {
      nom: "Gratuit",
      prix: 0,
      isFeatured: false,
      features: [
        { valeur: "Indéfinie", label: "de validité", active: true },
        { valeur: "1", label: "Document par type", active: true },
        { valeur: "2", label: "objets", active: true },
        { valeur: "Email", label: "Alertes", active: true },
        { valeur: "Limitée", label: "Géolocalisation", active: false },
        { valeur: "x", label: "Notification Push", active: false },
        { valeur: "x", label: "Support prioritaire", active: false }
      ],
    },
    {
      nom: "Standard",
      prix: 500,
      isFeatured: false,
      features: [
        { valeur: "1 mois", label: "de validité", active: true },
        { valeur: "1", label: "Document par type", active: true },
        { valeur: "2", label: "objets", active: true },
        { valeur: "SMS + Email", label: "Alertes", active: true },
        { valeur: "Basique", label: "Géolocalisation", active: true },
        { valeur: "x", label: "Notification Push", active: false },
        { valeur: "x", label: "Support prioritaire", active: false }
      ],
    },
    {
      nom: "Pro",
      prix: 1500,
      isFeatured: true,
      features: [
        { valeur: "12 mois", label: "de validité", active: true },
        { valeur: "3", label: "Documents par type", active: true },
        { valeur: "5", label: "objets", active: true },
        { valeur: "SMS + Email + Push", label: "Alertes", active: true },
        { valeur: "Avancée", label: "Géolocalisation", active: true },
        { valeur: "✓", label: "Notification Push", active: true },
        { valeur: "x", label: "Support prioritaire", active: false }
      ],
    },
    {
      nom: "VIP",
      prix: 3000,
      isFeatured: false,
      features: [
        { valeur: "12 mois", label: "de validité", active: true },
        { valeur: "5", label: "Documents par type", active: true },
        { valeur: "7", label: "objets", active: true },
        { valeur: "Toutes", label: "Alertes", active: true },
        { valeur: "Avancée", label: "Géolocalisation", active: true },
        { valeur: "✓", label: "Notification Push", active: true },
        { valeur: "✓", label: "Support prioritaire", active: true }
      ],
    },
  ];

  const factures = [
    { plan: "Standard", date: "10 avr. 2024", mode: "Automatique", montant: 500, status: "Payé" },
    { plan: "Standard", date: "10 mars 2024", mode: "Automatique", montant: 500, status: "Payé" },
    { plan: "Standard", date: "10 fév. 2024", mode: "Automatique", montant: 500, status: "Payé" }
  ];

  /**
   * ==================================
   * Global Variables for Modal
   * ==================================
   */
  let currentPlanData = null;
  let iti = null;

  /**
   * ==================================
   * Modal Logic (Exposed to window)
   * ==================================
   */
  window.souscrire = function (index) {
    const plan = abonnements[index];
    if(!plan) return;
    currentPlanData = plan;

    // Injection des données
    const modalTitle = document.getElementById("modalTitle");
    const displayPlan = document.getElementById("displayPlan");
    const displayPrix = document.getElementById("displayPrix");
    const displayDocs = document.getElementById("displayDocs");
    const displayTime = document.getElementById("displaytime");

    if (modalTitle) modalTitle.innerText = `Paiement ${plan.nom}`;
    if (displayPlan) displayPlan.innerText = plan.nom;
    if (displayPrix) displayPrix.innerText = `${plan.prix} FCFA`;
    
    // Find specific features for the modal display
    const docFeat = plan.features.find(f => f.label.includes("Document"));
    const timeFeat = plan.features.find(f => f.label.includes("validité"));

    if (displayDocs) displayDocs.innerText = docFeat ? docFeat.valeur + " par type" : "-";
    if (displayTime) displayTime.innerText = timeFeat ? timeFeat.valeur : "-";

    // Reset Steps
    const vStep1 = document.getElementById("viewStep1");
    const vStep2 = document.getElementById("viewStep2");
    if(vStep1) vStep1.classList.remove("hidden", "opacity-0");
    if(vStep2) vStep2.classList.add("hidden");
    
    const sBtn = document.getElementById("submitBtn");
    if(sBtn) sBtn.innerText = "Suivant";

    // Show Modal
    const wrapper = document.getElementById("modalWrapper");
    const box = document.getElementById("modalBox");
    if(wrapper && box){
      wrapper.classList.remove("hidden");
      wrapper.classList.add("flex");
      setTimeout(() => box.classList.remove("translate-y-full"), 10);
    }
  };

  window.closeSubscriptionModal = function () {
    const box = document.getElementById("modalBox");
    const wrapper = document.getElementById("modalWrapper");
    if(box && wrapper){
       box.classList.add("translate-y-full");
       setTimeout(() => {
         wrapper.classList.add("hidden");
         wrapper.classList.remove("flex");
       }, 300);
    }
  };

  window.goToStep2 = function () {
    const view1 = document.getElementById("viewStep1");
    const view2 = document.getElementById("viewStep2");
    const sBtn = document.getElementById("submitBtn");
    
    if(view1 && view2){
      view1.classList.add("opacity-0");
      setTimeout(() => {
          view1.classList.add("hidden");
          view1.classList.remove("opacity-0");
          view2.classList.remove("hidden");
          view2.classList.add("animate-fade-in");
          if(sBtn) sBtn.innerText = "Confirmer le paiement";
      }, 200);
    }
  };

  window.processPayment = function () {
    const vStep2 = document.getElementById("viewStep2");
    const step2Visible = vStep2 && !vStep2.classList.contains("hidden");

    if (!step2Visible) {
      window.goToStep2();
    } else {
      const phoneInput = document.getElementById("payPhone");
      const pseudoInput = document.getElementById("payPseudo");
      const phone = phoneInput ? phoneInput.value : "";
      const pseudo = pseudoInput ? pseudoInput.value : "";

      if (!phone || !pseudo) {
        alert("Veuillez remplir votre numéro et votre pseudo.");
        return;
      }
      
      const fullNumber = getFullNumber();
      if (!fullNumber) return; // Error handled in getFullNumber

      const btn = document.getElementById("submitBtn");
      if(btn){
        const originalText = btn.innerText;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Traitement...';
        btn.disabled = true;

        setTimeout(() => {
          alert(`Félicitations !\nVotre abonnement "${currentPlanData.nom}" est maintenant actif.\nNuméro de transaction: #${Math.floor(Math.random() * 1000000)}`);
          btn.innerHTML = originalText;
          btn.disabled = false;
          window.closeSubscriptionModal();
        }, 2000);
      }
    }
  };

  function getFullNumber() {
    if (!iti) {
      const p = document.getElementById("payPhone");
      return p ? p.value : null;
    }
    
    if (iti.isValidNumber()) {
      return iti.getNumber();
    } else {
      alert("Numéro de téléphone invalide pour le pays sélectionné");
      return null;
    }
  }

  /**
   * ==================================
   * Generators
   * ==================================
   */
  const genererCartes = () => {
    const container = document.getElementById("pricing-container");
    if (!container) return;

    container.innerHTML = abonnements.map((plan, index) => {
      const isFeatured = plan.isFeatured;
      const cardClasses = isFeatured
        ? "plan-card featured bg-green-dark rounded-[20px] p-5 flex flex-col relative overflow-hidden"
        : "plan-card bg-white border border-borderMain rounded-[20px] p-5 flex flex-col";

      const textClass = isFeatured ? "text-white" : "text-textMain";
      const mutedTextClass = isFeatured ? "text-white/50" : "text-textMuted";
      const btnClass = isFeatured 
        ? "w-full py-2.5 rounded-[12px] bg-primary text-white text-[13.5px] font-bold hover:bg-primary-dark transition-all active:scale-[.98] relative z-10 shadow-lg shadow-primary/20"
        : "w-full py-2.5 rounded-[12px] bg-white border border-borderMain text-textMain text-[13.5px] font-bold hover:border-primary hover:text-primary transition-all active:scale-[.98]";

      return `
          <div class="${cardClasses}">
              ${isFeatured ? '<div class="absolute w-40 h-40 rounded-full bg-primary/8 -bottom-10 -right-10 pointer-events-none"></div>' : ''}
              <div class="mb-4 relative z-10">
                  <div class="w-10 h-10 rounded-[12px] ${isFeatured ? 'bg-primary/15' : 'bg-primary/10'} flex items-center justify-center mb-3">
                      <i class="fa-solid ${isFeatured ? 'fa-rocket text-primary' : 'fa-star text-primary'} text-base"></i>
                  </div>
                  <div class="font-bricolage text-lg font-bold ${textClass}">${plan.nom}</div>
                  <div class="${mutedTextClass} text-[12.5px] font-medium">${isFeatured ? 'Recommandé' : 'Populaire'}</div>
              </div>
              <div class="mb-5 relative z-10">
                  <div class="font-bricolage text-3xl font-extrabold ${textClass} leading-none">
                      ${plan.prix} <span class="text-base font-bold ${mutedTextClass}">XAF</span>
                  </div>
                  <div class="text-[12px] ${mutedTextClass} mt-0.5">par mois</div>
              </div>
              <div class="flex flex-col gap-2.5 flex-1 mb-5 relative z-10">
                  ${plan.features.map(f => `
                      <div class="flex items-center gap-2.5 text-[13px]">
                          <i class="fa-solid ${f.active === false ? 'fa-xmark text-gray-400' : 'fa-check ' + (isFeatured ? 'text-primary' : 'text-green-500')} w-4 flex-shrink-0"></i>
                          <span class="${textClass} font-medium ${f.active === false ? 'opacity-40 line-through' : ''}">${f.valeur} ${f.label}</span>
                      </div>
                  `).join('')}
              </div>
              <button onclick="souscrire(${index})" class="${btnClass}">
                  ${plan.prix === 0 ? 'Plan actuel' : 'Passer au ' + plan.nom}
              </button>
          </div>
      `;
    }).join("");
  };

  const genererComparatif = () => {
    const tableBody = document.querySelector("table tbody");
    if (!tableBody) return;

    // Use features from index 2 (Pro) as a label template
    const labels = abonnements[2].features.map(f => f.label);
    
    tableBody.innerHTML = labels.map((label, featIdx) => {
      return `
        <tr class="hover:bg-surface2 transition-colors">
          <td class="px-5 py-3 text-[13px] font-medium text-textMain">${label}</td>
          ${abonnements.map((plan) => {
            const feat = plan.features[featIdx];
            const isFeatured = plan.isFeatured;
            const cellClass = isFeatured ? 'bg-primary/5' : '';
            const tClass = plan.nom === 'Standard' ? 'text-primary' : (plan.nom === 'VIP' ? 'text-amber-600' : (plan.nom === 'Pro' ? 'text-green-mid' : 'text-textMuted'));
            
            let content = feat.valeur;
            if (feat.valeur === '✓') content = '<i class="fa-solid fa-check text-green-500"></i>';
            if (feat.valeur === 'x' || feat.active === false) content = '<i class="fa-solid fa-xmark text-gray-300"></i>';
            if (feat.valeur === '✓' && plan.nom === 'Standard') content = '<i class="fa-solid fa-check text-primary"></i>';

            return `<td class="px-3 py-3 text-center text-[13px] font-semibold ${tClass} ${cellClass}">${content}</td>`;
          }).join('')}
        </tr>
      `;
    }).join('');
  };

  const genererFactures = () => {
    const container = document.getElementById("invoice-container");
    if (!container) return;

    container.innerHTML = factures.map(f => `
        <div class="flex items-center gap-3 px-5 py-3.5 hover:bg-surface2 transition-colors">
          <div class="w-9 h-9 rounded-[10px] bg-green-light flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-file-invoice text-green-mid text-sm"></i></div>
          <div class="flex-1 min-w-0">
            <div class="text-[13.5px] font-semibold text-textMain">Plan ${f.plan} — ${f.date.split(' ').slice(1).join(' ')}</div>
            <div class="text-[11.5px] text-textMuted italic">${f.date} · Paiement ${f.mode}</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-[13.5px] font-bold text-textMain">${f.montant} XAF</div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">${f.status}</span>
          </div>
          <button class="ml-2 w-8 h-8 rounded-[8px] bg-bgMain border border-borderMain flex items-center justify-center hover:border-primary hover:text-primary transition-colors text-textMuted flex-shrink-0">
            <i class="fa-solid fa-download text-[11px]"></i>
          </button>
        </div>
    `).join('');
  };

  /**
   * ==================================
   * Animated Counters
   * ==================================
   */
  const animateCounters = () => {
    const counters = document.querySelectorAll(".number");
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const counter = entry.target;
          const target = +counter.getAttribute("data-target");
          let count = 0;
          const step = target / 100;
          const speed = 20;

          const update = () => {
            if (count < target) {
              count += step;
              counter.innerText = Math.min(Math.ceil(count), target);
              setTimeout(update, speed);
            } else {
              counter.innerText = target;
            }
          };
          update();
          obs.unobserve(counter);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => obs.observe(c));
  };

  // Initializations
  genererCartes();
  genererComparatif();
  genererFactures();
  animateCounters();

  // intl-tel-input
  const phoneInput = document.querySelector("#payPhone");
  if (phoneInput && window.intlTelInput) {
    iti = window.intlTelInput(phoneInput, {
        initialCountry: "cm",
        separateDialCode: true,
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@24.5.0/build/js/utils.js",
    });
  }
});
