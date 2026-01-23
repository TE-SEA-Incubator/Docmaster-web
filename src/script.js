document.addEventListener("DOMContentLoaded", () => {
    /**
     * ==================================
     * Compteurs animés (IntersectionObserver pour performance)
     * ==================================
     */
    const counters = document.querySelectorAll(".number");
    
    const animateCounter = (counter) => {
        const target = +counter.getAttribute("data-target");
        let count = 0;
        const increment = target / 100;

        const update = () => {
            if (count < target) {
                count += increment;
                counter.innerText = Math.min(Math.ceil(count), target);
                requestAnimationFrame(update);
            } else {
                counter.innerText = target;
            }
        };
        update();
    };

    // Lance l'animation quand l'élément devient visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));

    /**
     * ==================================
     * Données des abonnements
     * ==================================
     */
    const abonnements = [
        {
            nom: "Standard",
            prix: 500,
            isFeatured: false,
            features: [
                { valeur: "1 mois", label: "de validité" },
                { valeur: "1", label: "Document par type" },
                { valeur: "8", label: "Types de documents" },
            ],
        },
        {
            nom: "Pro",
            prix: 1500,
            isFeatured: true,
            features: [
                { valeur: "12 mois", label: "de validité" },
                { valeur: "3", label: "Documents par type" },
                { valeur: "8", label: "Types de documents" },
            ],
        },
        {
            nom: "VIP",
            prix: 3000,
            isFeatured: false,
            features: [
                { valeur: "12 mois", label: "de validité" },
                { valeur: "5", label: "Documents par type" },
                { valeur: "8", label: "Types de documents" },
            ],
        },
    ];

    /**
     * ==================================
     * Génération des cartes HTML
     * ==================================
     */
    const genererCartes = () => {
        const container = document.getElementById("pricing-container");
        if (!container) return;

        container.innerHTML = abonnements.map((plan, index) => {
            const isFeatured = plan.isFeatured;
            return `
               <div class="relative flex flex-col items-center text-center transition-all duration-300 
    ${isFeatured ? "featured-card rounded-[2.5rem] shadow-2xl" : "bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8 md:scale-95"}">
    
    ${isFeatured ? `
        <div class="w-full bg-[#F5A64B] pt-12 pb-16 px-8 text-white relative z-10 rounded-t-[2.4rem] overflow-hidden">
                            <span class="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.3em] bg-white/20 px-3 py-1 rounded-full">Most Popular</span>
                            <h3 class="text-3xl font-black tracking-widest uppercase mb-4">${plan.nom}</h3>
                            <div class="flex justify-center items-start">
                                <span class="text-6xl font-black">${plan.prix}</span>
                                <span class="text-sm font-bold mt-2 ml-1">FCFA</span>
                            </div>
                            <div class="wave-container">
                                <svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="w-full h-10"><path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C58.47,105.41,123,106,182.6,90.5,242.3,75,282,63,321.39,56.44Z" fill="#ffffff"></path></svg>
                            </div>
                        </div>
                    ` : `
                        <div class="w-full mb-6">
                            <h3 class="text-2xl font-black tracking-widest text-slate-800 mb-4 uppercase">${plan.nom}</h3>
                            <div class="flex justify-center items-start text-slate-800 mb-6">
                                <span class="text-5xl font-black text-[#F5A64B]">${plan.prix}</span>
                                <span class="text-sm font-bold mt-2 ml-1">FCFA</span>
                            </div>
                            <div class="w-full h-px bg-slate-100 mb-8"></div>
                        </div>
                    `}

                    <div class="w-full z-10 ${isFeatured ? "p-8 pt-4" : ""}">
                        <ul class="w-full mb-8">
                            ${plan.features.map((f, i) => `
                                <li class="py-3 text-sm text-slate-600 border-b border-slate-50 last:border-0 ${i % 2 !== 0 ? "bg-slate-50/50" : ""}">
                                    <span class="font-bold text-slate-800">${f.valeur}</span> ${f.label}
                                </li>
                            `).join("")}
                        </ul>
                        <button onclick="souscrire(${index})" class="w-full py-4 px-6 rounded-full font-black uppercase bg-[#2ecc71] text-white hover:bg-green-600 tracking-widest transition-all active:scale-95 hover:scale-105 shadow-lg shadow-green-200">
                            Select
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    };

    // Initialisation
    genererCartes();

    /**
     * ==================================
     * Gestion du Modal (Global window)
     * ==================================
     */
    let currentPlanData = null;

    window.souscrire = function(index) {
        const plan = abonnements[index];
        currentPlanData = plan;

        // Injection des données
        document.getElementById('modalTitle').innerText = `Paiement ${plan.nom}`;
        document.getElementById('displayPlan').innerText = plan.nom;
        document.getElementById('displayPrix').innerText = `${plan.prix} FCFA`;
        document.getElementById('displayDocs').innerText = plan.features[1].valeur + " Docs par type";
        document.getElementById('displaytime').innerText = plan.features[0].valeur;

        // Reset Steps
        document.getElementById('viewStep1').classList.remove('hidden');
        document.getElementById('viewStep2').classList.add('hidden');
        document.getElementById('submitBtn').innerText = "Suivant";

        // Show Modal
        const wrapper = document.getElementById('modalWrapper');
        const box = document.getElementById('modalBox');
        wrapper.classList.remove('hidden');
        setTimeout(() => box.classList.remove('translate-y-full'), 10);
    };

    window.closeSubscriptionModal = function() {
        const box = document.getElementById('modalBox');
        const wrapper = document.getElementById('modalWrapper');
        box.classList.add('translate-y-full');
        setTimeout(() => wrapper.classList.add('hidden'), 300);
    };

    window.goToStep2 = function() {
        document.getElementById('viewStep1').classList.add('hidden');
        document.getElementById('viewStep2').classList.remove('hidden');
        document.getElementById('submitBtn').innerText = "Confirmer le paiement";
    };

    window.processPayment = function() {
        const step2Visible = !document.getElementById('viewStep2').classList.contains('hidden');
        
        if (!step2Visible) {
            goToStep2();
        } else {
            const phone = document.getElementById('payPhone').value;
            const pseudo = document.getElementById('payPseudo').value;

            if(!phone || !pseudo) {
                alert("Veuillez remplir votre numéro et votre pseudo.");
                return;
            }

            // Simuler appel API
            const btn = document.getElementById('submitBtn');
            btn.innerText = "Traitement...";
            btn.disabled = true;

            setTimeout(() => {
                alert(`Transaction réussie !\nPlan: ${currentPlanData.nom}\nClient: ${pseudo}`);
                btn.disabled = false;
                closeSubscriptionModal();
            }, 1500);
        }
    };
    // Sélection de l'élément
const input = document.querySelector("#payPhone");

// Initialisation de la bibliothèque
const iti = window.intlTelInput(input, {
    // Pays par défaut (Cameroun)
    initialCountry: "cm",
    // Affiche le code (+237) à côté du drapeau
    separateDialCode: true,
    // Permet de n'afficher que certains pays si besoin (optionnel)
    // onlyCountries: ["cm", "ga", "ci", "sn", "fr"],
    // Charge les scripts de formatage automatique
    utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@24.5.0/build/js/utils.js",
});

// Pour récupérer le numéro complet (ex: +237690000000) lors du paiement :
function getFullNumber() {
    if (iti.isValidNumber()) {
        return iti.getNumber();
    } else {
        alert("Numéro invalide pour le pays sélectionné");
        return null;
    }
}
});

