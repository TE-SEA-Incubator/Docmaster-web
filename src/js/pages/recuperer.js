/**
 * ═════════════════════════════════════════════════════════════════
 * RECUPERER.JS - Owner Recovery Process Controller
 * Handles the logic for the document owner to pay and recover their document
 * ═════════════════════════════════════════════════════════════════
 */

import { getDeclarationById, payRecoveryFee, BASE_URL } from '../services/api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial State
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('id');
    
    if (!docId) {
        console.error('❌ [Recuperer] No document ID provided in URL');
        return;
    }

    // 2. Setup UI listeners
    setupEventListeners();

    // 3. Load Data
    if (window.toggleLoader) window.toggleLoader(true);
    try {
        console.log('🔄 [Recuperer] Loading data for doc:', docId);
        const result = await getDeclarationById(docId);

        if (result.success) {
            updateUI(result.data);
        } else {
            alert(result.message || 'Erreur lors du chargement des données');
        }
    } catch (error) {
        console.error('❌ [Recuperer] Error:', error);
    } finally {
        if (window.toggleLoader) setTimeout(() => window.toggleLoader(false), 500);
    }
});

/**
 * Setup static event listeners
 */
function setupEventListeners() {
    // 1. Define UI handlers first to avoid ReferenceErrors
    const closeRecoveryModal = () => {
        const box = document.getElementById("recoveryModalBox");
        const wrapper = document.getElementById("recoveryModalWrapper");
        if (box) box.classList.add("translate-y-full");
        setTimeout(() => { 
            if (wrapper) {
                wrapper.classList.add("hidden"); 
                wrapper.classList.remove("flex");
            }
        }, 300);
    };

    const goToRecoveryStep2 = (method = 'MTN_MOMO') => {
        window.selectedRecoveryMethod = method;
        document.getElementById("recoveryStep1").classList.add("hidden");
        document.getElementById("recoveryStep2").classList.remove("hidden");
        document.getElementById("recoverySubmitBtn").innerText = "Confirmer le paiement";
    };

    const ownerConfirm = () => {
        const wrapper = document.getElementById("recoveryModalWrapper");
        const box = document.getElementById("recoveryModalBox");
        const submitBtn = document.getElementById("recoverySubmitBtn");
        
        document.getElementById("recoveryStep1").classList.remove("hidden");
        document.getElementById("recoveryStep2").classList.add("hidden");
        submitBtn.innerText = "Suivant";
        submitBtn.disabled = false;
        
        wrapper.classList.remove("hidden");
        wrapper.classList.add("flex");
        setTimeout(() => box.classList.remove("translate-y-full"), 10);
    };

    // 2. Attach to DOM
    const modalWrapper = document.getElementById('recoveryModalWrapper');
    if (modalWrapper) {
        const backdrop = modalWrapper.querySelector('.absolute.inset-0');
        if (backdrop) backdrop.addEventListener('click', closeRecoveryModal);
    }

    // 3. Expose to window for legacy onclick handlers
    window.closeRecoveryModal = closeRecoveryModal;
    window.goToRecoveryStep2 = goToRecoveryStep2;
    window.ownerConfirm = ownerConfirm;
    window.processRecoveryPayment = processRecoveryPayment;
    
    // Copy Code
    window.copyCode = () => {
        const code = document.getElementById('pickupCode').innerText;
        navigator.clipboard.writeText(code).then(() => { 
            alert("Code copié dans le presse-papier !"); 
        });
    };
}

/**
 * Update UI with document data
 */
function updateUI(data) {
    console.log('✨ [Recuperer] Updating UI with:', data);

    // Update Title & Header
    const pageTitle = document.querySelector('header span.font-bricolage');
    if (pageTitle) pageTitle.textContent = `Récupérer : ${data.doc_type || 'Document'}`;

    // Update Document Card
    const docTitle = document.querySelector('h3.font-bricolage');
    if (docTitle) {
        docTitle.innerHTML = `<i class="fa-solid fa-id-card text-primary text-xl"></i> ${data.doc_type || 'Document'}`;
    }

    const docMatchDate = document.getElementById('docMatchDate');
    if (docMatchDate) {
        docMatchDate.textContent = `Signalé le ${new Date(data.created_at).toLocaleDateString('fr-FR')}`;
    }

    const docLocation = document.getElementById('docLocation');
    if (docLocation) {
        docLocation.textContent = data.ville || 'Position en agence';
    }

    // Photo Handling: Priority to the finder's photo (counterPartPhotoRecto) if owner didn't provide one
    const docImage = document.getElementById('docImage');
    const imagePlaceholder = document.getElementById('imagePlaceholder');
    if (docImage) {
        const photoPath = data.counterPartPhotoRecto || data.photo_recto;
        if (photoPath) {
            const imageUrl = photoPath.startsWith('http') ? photoPath : `${BASE_URL}/${photoPath.replace(/^\//, '')}`;
            docImage.src = imageUrl;
            docImage.classList.remove('hidden');
            if (imagePlaceholder) imagePlaceholder.classList.add('hidden');
            console.log('📸 [Recuperer] Document photo set to:', imageUrl);
        } else {
            console.warn('⚠️ [Recuperer] No photo found for this document');
        }
    }

    // Update Reference in Header if possible
    const refTag = document.querySelector('header span.hidden.sm\\:inline');
    if (refTag && data.identifiant_doc_dm) {
        refTag.textContent = `Ref. ${data.identifiant_doc_dm}`;
    }

    // 10. Update Finder specific info
    const docOwnerEl = document.getElementById('docOwnerName');
    if (docOwnerEl) docOwnerEl.textContent = data.owner_name || 'Non spécifié';

    if (data.counterPart) {
        const nameEl = document.getElementById('finderName');
        if (nameEl) nameEl.textContent = `${data.counterPart.prenom} ${data.counterPart.nom}`;
    }

    if (data.counterPartDeclaration) {
        const descEl = document.getElementById('finderDescription');
        if (descEl) descEl.textContent = `"${data.counterPartDeclaration.description || 'Pas de description fournie.'}"`;
        
        const locNoteEl = document.getElementById('finderLocationNote');
        if (locNoteEl) locNoteEl.textContent = data.counterPartDeclaration.location_note || 'Aucune précision sur le lieu.';
    }

    // 11. Update Pricing
    if (data.docTypeInfo) {
        const priceDisplay = document.getElementById('recoveryPriceDisplay');
        const modalPriceDisplay = document.getElementById('recoveryModalPriceDisplay');
        
        const price = data.docTypeInfo.prix_retrouvaille;
        if (priceDisplay) priceDisplay.textContent = price.toLocaleString();
        if (modalPriceDisplay) modalPriceDisplay.textContent = `${price.toLocaleString()} FCFA`;
        
        // Store price for payment
        window.currentRecoveryPrice = price;
    }

    // Check Status and Claim
    if (data.status === 'RETURNED' || (data.claim && data.claim.status === 'VALIDATED')) {
        showSuccessState(data.claim ? data.claim.verification_code : '---');
    } else if (data.claim && data.claim.status === 'PAID') {
        showSuccessState(data.claim.verification_code);
    }
}

/**
 * Process the recovery payment workflow
 */
async function processRecoveryPayment() {
    const step2 = document.getElementById("recoveryStep2");
    if (step2.classList.contains("hidden")) {
        window.goToRecoveryStep2();
        return;
    }

    const btn = document.getElementById("recoverySubmitBtn");
    const originalText = btn.innerText;

    const params = new URLSearchParams(window.location.search);
    const docId = params.get('id');

    if (!docId) {
        alert("ID du document manquant.");
        return;
    }

    if (window.toggleLoader) window.toggleLoader(true);
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Traitement...';

        const phone = document.getElementById("recupPhone").value;
        if (!phone || phone.length < 9) {
            alert("Veuillez entrer un numéro de téléphone valide.");
            btn.disabled = false;
            btn.innerText = originalText;
            if (window.toggleLoader) window.toggleLoader(false);
            return;
        }

        console.log('💳 [Recuperer] Processing payment for:', docId);
        const result = await payRecoveryFee({
            docId,
            amount: window.currentRecoveryPrice || 5000,
            paymentMethod: window.selectedRecoveryMethod || 'MTN_MOMO',
            phone: phone
        });

        if (result.success) {
            console.log('✅ [Recuperer] Payment initiated:', result.data.nokashId);
            
            // Switch to "Waiting" state in the modal
            const step2 = document.getElementById("recoveryStep2");
            step2.innerHTML = `
                <div class="text-center py-6 space-y-4">
                    <div class="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p class="font-bold text-textMain">En attente de validation sur votre téléphone...</p>
                    <p class="text-[12px] text-textMuted">Veuillez valider la transaction sur votre mobile pour recevoir votre code de retrait.</p>
                </div>
            `;
            btn.classList.add('hidden'); // Hide button while waiting
            
            // Start polling for status
            startPaymentPolling(docId);
        } else {
            alert(result.message || "Erreur lors du processus de récupération.");
            btn.disabled = false;
            btn.innerText = originalText;
        }
    } catch (error) {
        console.error('❌ [Recuperer] Payment technical error:', error);
        alert("Erreur de connexion au serveur.");
        btn.disabled = false;
        btn.innerText = originalText;
    } finally {
        if (window.toggleLoader) window.toggleLoader(false);
    }
}

/**
 * Poll the backend to check if the payment has been confirmed
 */
function startPaymentPolling(docId) {
    const pollInterval = setInterval(async () => {
        try {
            console.log('🔍 [Recuperer] Polling for payment status...');
            const result = await getDeclarationById(docId);
            
            if (result.success) {
                const data = result.data;
                if (data.claim && data.claim.status === 'PAID') {
                    console.log('🎉 [Recuperer] Payment confirmed!');
                    clearInterval(pollInterval);
                    window.closeRecoveryModal();
                    showSuccessState(data.claim.verification_code);
                    
                    // Trigger a celebratory sound or notification if desired
                }
            }
        } catch (error) {
            console.warn('⚠️ [Recuperer] Polling error:', error);
        }
    }, 5000); // Check every 5 seconds

    // Stop polling after 5 minutes (timeout)
    setTimeout(() => {
        clearInterval(pollInterval);
        console.log('⏹️ [Recuperer] Polling stopped (timeout).');
    }, 300000);
}

/**
 * Switch UI to success state (code received)
 */
function showSuccessState(verificationCode) {
    const actionPanel = document.getElementById('ownerActionPanel');
    const successPanel = document.getElementById('ownerSuccessPanel');
    const progText = document.getElementById('ownerProgressionText');
    const progBar = document.getElementById('ownerProgressBar');
    const progPercent = document.getElementById('ownerProgressionPercent');
    const pickupCode = document.getElementById('pickupCode');
    
    // Panels
    if (actionPanel) actionPanel.classList.add('hidden');
    if (successPanel) {
        successPanel.classList.remove('hidden');
        successPanel.classList.add('block');
    }

    // Code
    if (pickupCode) pickupCode.textContent = verificationCode;

    // Progress
    if (progText) progText.textContent = 'Paiement Validé — Récupération prête';
    if (progBar) progBar.style.width = '100%';
    if (progPercent) progPercent.textContent = '100%';

    // Timeline Dots
    const step3Dot = document.getElementById('ownerStep3Dot');
    const step4Dot = document.getElementById('ownerStep4Dot');
    
    if (step3Dot) {
        step3Dot.className = "w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-green-100";
        step3Dot.innerHTML = '<i class="fa-solid fa-check"></i>';
    }
    
    if (step4Dot) {
        step4Dot.className = "w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-base shadow-xl shadow-primary/30 pulse-ring border-4 border-white";
        step4Dot.innerHTML = '<i class="fa-solid fa-key text-sm"></i>';
    }

    const step3Title = document.getElementById('ownerStep3Title');
    const step4Title = document.getElementById('ownerStep4Title');
    if (step3Title) step3Title.className = "text-[11px] font-bold text-green-500 uppercase tracking-tighter";
    if (step4Title) step4Title.className = "text-[12px] font-black text-primary uppercase tracking-tighter";
}
