import { subscribeToPlan, getUserSubscriptionUsage, getMyTransactions } from './services/api.js';
import { getSession } from './services/auth.js';
import { planService } from './services/plan.js';

document.addEventListener("DOMContentLoaded", () => {
  /**
   * ==================================
   * Données des abonnements
   * ==================================
   */
  let abonnements = [];

  const loadPlans = async () => {
    try {
      const data = await planService.getPlans();
      // Format backend data to match expected frontend structure
      abonnements = data.map(plan => ({
        id: plan.id,
        nom: plan.name,
        prix: plan.price,
        isFeatured: plan.is_featured,
        features: [
          { valeur: plan.features?.docs_per_type || 1, label: "Document par type", active: true },
          { valeur: plan.features?.objects || 2, label: "objets", active: true },
          { valeur: plan.features?.alerts ? "✓" : "x", label: "Alertes", active: !!plan.features?.alerts },
          { valeur: plan.features?.geo === 'advanced' ? "✓" : "Basique", label: "Géolocalisation", active: true },
          { valeur: plan.is_active ? "✓" : "x", label: "Support", active: plan.is_active }
        ],
      }));
      
      // Refresh UI
      genererCartes();
      genererComparatif();
    } catch (error) {
      console.error("Erreur chargement plans script.js:", error);
    }
  };

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
  let selectedMethod = 'MOMO';
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
    if(sBtn) sBtn.innerHTML = 'Continuer <i class="fa-solid fa-arrow-right text-sm"></i>';

    // Reset steps UI
    window.goToStep1();

    // Show Modal
    const wrapper = document.getElementById("modalWrapper");
    const box = document.getElementById("modalBox");
    if(wrapper && box){
      wrapper.classList.remove("hidden");
      wrapper.classList.add("flex");
      
      // Fermer au clic sur le wrapper (hors de la box)
      wrapper.onclick = (e) => {
        if (e.target === wrapper) window.closeSubscriptionModal();
      };
      
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

  window.goToStep1 = function () {
    const view1 = document.getElementById("viewStep1");
    const view2 = document.getElementById("viewStep2");
    const sBtn = document.getElementById("submitBtn");
    const dot2 = document.getElementById("stepDot2");
    const line = document.getElementById("stepLine");
    const label2 = document.getElementById("stepLabel2");

    if(view1 && view2){
      view2.classList.add("hidden");
      view1.classList.remove("hidden");
      if(sBtn) sBtn.innerHTML = 'Continuer <i class="fa-solid fa-arrow-right text-sm"></i>';
      
      if(dot2) {
        dot2.classList.replace("bg-primary", "bg-slate-100");
        dot2.classList.replace("text-white", "text-slate-400");
      }
      if(line) line.classList.replace("bg-primary", "bg-slate-100");
      if(label2) label2.classList.replace("text-primary", "text-slate-400");
    }
  };

  window.goToStep2 = function (method = 'MOMO') {
    selectedMethod = method;
    const view1 = document.getElementById("viewStep1");
    const view2 = document.getElementById("viewStep2");
    const sBtn = document.getElementById("submitBtn");
    const dot2 = document.getElementById("stepDot2");
    const line = document.getElementById("stepLine");
    const label2 = document.getElementById("stepLabel2");
    
    if(view1 && view2){
      view1.classList.add("opacity-0");
      setTimeout(() => {
          view1.classList.add("hidden");
          view1.classList.remove("opacity-0");
          view2.classList.remove("hidden");
          view2.classList.add("animate-fade-in");
          if(sBtn) sBtn.innerHTML = 'Confirmer le paiement <i class="fa-solid fa-check text-sm"></i>';
          
          if(dot2) {
            dot2.classList.replace("bg-slate-100", "bg-primary");
            dot2.classList.replace("text-slate-400", "text-white");
          }
          if(line) line.classList.replace("bg-slate-100", "bg-primary");
          if(label2) label2.classList.replace("text-slate-400", "text-primary");
      }, 200);
    }
  };

  window.processPayment = async function () {
    const vStep2 = document.getElementById("viewStep2");
    const step2Visible = vStep2 && !vStep2.classList.contains("hidden");

    if (!step2Visible) {
      window.goToStep2();
    } else {
      const phoneInput = document.getElementById("payPhone");
      const phone = phoneInput ? phoneInput.value : "";

      if (!phone) {
        alert("Veuillez remplir votre numéro de téléphone.");
        return;
      }
      
      const fullNumber = getFullNumber();
      if (!fullNumber) return; // Error handled in getFullNumber

      const btn = document.getElementById("submitBtn");
      if(btn){
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Traitement...';
        btn.disabled = true;

        const planId = currentPlanData.id;
        // Determine months based on features or defaults
        let months = 1;

        try {
          const result = await subscribeToPlan(planId, months, selectedMethod, fullNumber);
          if (result.success) {
            const data = result.data;
            if (data.status === 'PENDING_PAYMENT') {
              // Update modal to "Waiting" state
              const flow = document.getElementById("paymentFlow");
              if (flow) {
                flow.innerHTML = `
                  <div class="text-center py-10 space-y-6 animate-fade-in">
                    <div class="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div>
                      <p class="font-bricolage text-lg font-black text-slate-800">Validation en cours...</p>
                      <p class="text-sm text-slate-500 mt-2">Veuillez valider l'opération sur votre téléphone pour activer votre abonnement.</p>
                    </div>
                  </div>
                `;
              }
              if (btn) btn.classList.add('hidden');

              // Start Polling
              startSubscriptionPolling();
            } else {
              alert(`Félicitations !\nVotre abonnement "${currentPlanData.nom}" est maintenant actif.`);
              window.closeSubscriptionModal();
              window.location.reload();
            }
          } else {
            alert(result.message);
          }
        } catch (error) {
          alert("Une erreur est survenue lors de la souscription.");
        } finally {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }
      }
    }
  };

  function startSubscriptionPolling() {
    const pollInterval = setInterval(async () => {
      try {
        console.log('🔍 [Subscription] Polling for payment status...');
        const result = await getUserSubscriptionUsage();
        
        if (result.success && result.data) {
          const usage = result.data;
          if (usage.subscription_id) {
             console.log('🎉 [Subscription] Payment confirmed!');
             clearInterval(pollInterval);
             alert(`Félicitations !\nVotre abonnement "${usage.plan_name}" est maintenant actif.`);
             window.closeSubscriptionModal();
             window.location.reload();
          }
        }
      } catch (error) {
        console.warn('⚠️ [Subscription] Polling error:', error);
      }
    }, 5000);

    // Timeout after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
  }

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
      const featuredCardStyle = isFeatured ? 'style="background:#1E3A2F;"' : "";

      const textClass = isFeatured ? "text-white" : "text-textMain";
      const mutedTextClass = isFeatured ? "text-white/50" : "text-textMuted";
      const btnClass = isFeatured 
        ? "w-full py-2.5 rounded-[12px] bg-primary text-white text-[13.5px] font-bold hover:bg-primary-dark transition-all active:scale-[.98] relative z-10 shadow-lg shadow-primary/20"
        : "w-full py-2.5 rounded-[12px] bg-white border border-borderMain text-textMain text-[13.5px] font-bold hover:border-primary hover:text-primary transition-all active:scale-[.98]";
      const featuredButtonStyle = isFeatured ? 'style="background:#F5A64B;"' : "";

      return `
          <div class="${cardClasses}" ${featuredCardStyle}>
              ${isFeatured ? '<div class="absolute w-40 h-40 rounded-full bg-primary/8 -bottom-10 -right-10 pointer-events-none"></div>' : ''}
              <div class="mb-4 relative z-10">
                  <div class="w-10 h-10 rounded-[12px] ${isFeatured ? 'bg-primary/15' : 'bg-primary/10'} flex items-center justify-center mb-3" ${isFeatured ? 'style="background:rgba(245,166,75,.15);"' : ''}>
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
                <button onclick="souscrire(${index})" class="${btnClass}" ${featuredButtonStyle}>
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

  const genererFactures = async () => {
    const container = document.getElementById("invoice-container");
    if (!container) return;

    try {
      const result = await getMyTransactions();
      if (result.success && result.data) {
        const transactions = result.data;
        
        if (transactions.length === 0) {
          container.innerHTML = `
            <div class="px-5 py-8 text-center text-textMuted text-[13.5px]">
              Aucune transaction trouvée.
            </div>
          `;
          return;
        }

        container.innerHTML = transactions.map(t => {
          const date = new Date(t.created_at);
          const formattedDate = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
          const planInfo = t.metadata?.planId ? `Plan ${t.metadata.planId.charAt(0).toUpperCase() + t.metadata.planId.slice(1)}` : (t.type === 'subscription' ? 'Abonnement' : 'Récupération');
          
          const statusClass = t.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : (t.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700');
          const statusText = t.status === 'SUCCESS' ? 'Payé' : (t.status === 'PENDING' ? 'En cours' : 'Échoué');

          return `
            <div class="flex items-center gap-3 px-5 py-3.5 hover:bg-surface2 transition-colors">
              <div class="w-9 h-9 rounded-[10px] bg-green-light flex items-center justify-center flex-shrink-0">
                <i class="fa-solid ${t.type === 'subscription' ? 'fa-bolt' : 'fa-file-invoice'} text-green-mid text-sm"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[13.5px] font-semibold text-textMain">${planInfo}</div>
                <div class="text-[11.5px] text-textMuted italic">${formattedDate} · ${t.payment_method}</div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-[13.5px] font-bold text-textMain">${t.amount} XAF</div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass}">${statusText}</span>
              </div>
              <button class="ml-2 w-8 h-8 rounded-[8px] bg-bgMain border border-borderMain flex items-center justify-center hover:border-primary hover:text-primary transition-colors text-textMuted flex-shrink-0">
                <i class="fa-solid fa-download text-[11px]"></i>
              </button>
            </div>
          `;
        }).join('');
      }
    } catch (error) {
      console.error("Erreur chargement transactions:", error);
      container.innerHTML = `<div class="p-5 text-center text-red-500 text-xs">Erreur de chargement.</div>`;
    }
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

  const loadUserUsage = async () => {
    try {
      const result = await getUserSubscriptionUsage();
      if (result.success && result.data) {
        const usage = result.data;
        
        // Update current plan section
        const planNameEl = document.getElementById("currentPlanName");
        if (planNameEl) {
          const planName = usage.plan_name || 'Gratuit';
          planNameEl.innerText = `Plan ${planName}`;
          
          // If it's the free plan, we can add a specific style or badge
          if (planName.toLowerCase().includes('gratuit') || !usage.subscription_id) {
             planNameEl.innerHTML = `Plan Gratuit <span class="ml-2 text-[10px] px-2 py-0.5 bg-white/20 rounded-full border border-white/30 uppercase tracking-widest font-black">Basic</span>`;
          }
        }
        
        const docsLimitEl = document.getElementById("currentDocsLimit");
        if (docsLimitEl) docsLimitEl.innerText = `${usage.limits.docs_per_type} Document${usage.limits.docs_per_type > 1 ? 's' : ''}`;
        
        const objectsUsageEl = document.getElementById("currentObjectsUsage");
        if (objectsUsageEl) objectsUsageEl.innerText = `${usage.usage.objects} Objet${usage.usage.objects > 1 ? 's' : ''}`;
        
        const objectsLimitEl = document.getElementById("currentObjectsLimit");
        if (objectsLimitEl) objectsLimitEl.innerText = `Sur ${usage.limits.objects}`;
        
        // Update Quota Displays
        const percentage = usage.percentage;
        
        const percTextEl = document.getElementById("quotaPercentageText");
        if (percTextEl) percTextEl.innerText = `${percentage}%`;
        
        const progressEl = document.getElementById("quotaProgressBar");
        if (progressEl) progressEl.style.width = `${percentage}%`;
        
        const circleEl = document.getElementById("quotaCircle");
        if (circleEl) {
          const circumference = 213.6;
          const offset = circumference - (percentage / 100) * circumference;
          circleEl.style.strokeDashoffset = offset;
        }
      }
    } catch (error) {
      console.error("Erreur chargement usage subscription:", error);
    }
  };

  const updateUserInfo = () => {
    const user = getSession();
    if (user) {
      const topInitial = document.getElementById("topInitial");
      const topName = document.getElementById("topName");
      const helloName = document.getElementById("helloName");
      
      const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email;
      const initial = (user.prenom?.[0] || user.nom?.[0] || user.email?.[0] || 'U').toUpperCase();

      if (topInitial) topInitial.innerText = initial;
      if (topName) topName.innerText = user.prenom || user.nom || user.email.split('@')[0];
      if (helloName) helloName.innerText = user.prenom || user.nom || 'Utilisateur';
    }

    const currentDayEl = document.getElementById("currentDay");
    if (currentDayEl) {
      const now = new Date();
      currentDayEl.innerText = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  // Initializations
  const init = async () => {
    if (window.toggleLoader) window.toggleLoader(true);
    
    try {
      updateUserInfo();
      
      // Load all data concurrently
      await Promise.all([
        loadPlans(),
        loadUserUsage(),
        genererFactures()
      ]);
      
      animateCounters();
    } catch (error) {
      console.error("❌ Subscription initialization failed:", error);
    } finally {
      if (window.toggleLoader) setTimeout(() => window.toggleLoader(false), 800);
    }
  };

  init();

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
