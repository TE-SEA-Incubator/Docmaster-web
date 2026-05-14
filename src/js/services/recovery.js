import { 
    getDeclarationById,
    payRecoveryFee,
    validateRecoveryCode,
    getActiveClaim
} from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('id');

    if (!docId) {
        console.error('No ID provided');
        return;
    }

    const result = await getDeclarationById(docId);
    if (result.success) {
        renderRecoveryData(result.data);
    } else {
        alert(result.message);
    }
});

function renderRecoveryData(doc) {
    const isOwnerPage = window.location.pathname.includes('recuperer.html');
    
    // Fill basic info
    const title = document.querySelector('header span');
    if (title && doc.doc_type) {
        title.textContent = isOwnerPage ? `Récupérer : ${doc.doc_type}` : `Rendre : ${doc.doc_type}`;
    }

    if (isOwnerPage) {
        renderOwnerData(doc);
    } else {
        renderFinderData(doc);
    }
}

function renderOwnerData(doc) {
    // 1. Image & Date
    const docImage = document.getElementById('docImage');
    if (docImage && doc.counterPartPhotoRecto) {
        docImage.src = doc.counterPartPhotoRecto.startsWith('http') ? doc.counterPartPhotoRecto : '/' + doc.counterPartPhotoRecto.replace(/^\//, '');
    }

    const docMatchDate = document.getElementById('docMatchDate');
    if (docMatchDate) {
        docMatchDate.textContent = `Signalé le ${new Date(doc.created_at).toLocaleDateString('fr-FR')}`;
    }

    // 2. Finder Information (Dynamic from DB)
    if (doc.counterPart) {
        const cp = doc.counterPart;
        window.FINDER_NAME = `${cp.prenom || ''} ${cp.nom || ''}`.trim();
        window.FINDER_PHONE = cp.telephone || '+237...';
        
        // Update UI Text (Blur placeholders)
        const nameEl = document.getElementById('finderName');
        if (nameEl) {
            nameEl.setAttribute('data-real', window.FINDER_NAME);
            if (nameEl.classList.contains('revealed')) nameEl.textContent = window.FINDER_NAME;
        }

        const contactEl = document.getElementById('finderContactBlur');
        if (contactEl) {
            contactEl.setAttribute('data-real', window.FINDER_PHONE);
            const span = contactEl.querySelector('span');
            if (span && contactEl.classList.contains('revealed')) span.textContent = window.FINDER_PHONE;
        }

        const avatarEl = document.getElementById('finderAvatar');
        if (avatarEl && cp.prenom) {
            avatarEl.textContent = (cp.prenom[0] + (cp.nom ? cp.nom[0] : '')).toUpperCase();
        }
    }

    // 3. Location & Map initialization
    if (doc.counterPartDeclaration && doc.counterPartDeclaration.found_location) {
        const loc = doc.counterPartDeclaration.found_location;
        window.FINDER_LAT = loc.lat || 3.8615;
        window.FINDER_LNG = loc.long || 11.5174;
        window.FINDER_CITY = loc.city || doc.ville || 'Yaoundé';

        const docLocation = document.getElementById('docLocation');
        if (docLocation) docLocation.textContent = window.FINDER_CITY;

        const locEl = document.getElementById('finderLocBlur');
        if (locEl) {
            locEl.setAttribute('data-real', window.FINDER_CITY);
            const span = locEl.querySelector('span');
            if (span && locEl.classList.contains('revealed')) span.textContent = window.FINDER_CITY;
        }

        // Initialize Map with real coordinates
        if (typeof window.initFinderMap === 'function') {
            setTimeout(() => window.initFinderMap(window.FINDER_LAT, window.FINDER_LNG, window.FINDER_PHONE), 500);
        }
    }

    // 4. Progress & Actions
    const progText = document.getElementById('ownerProgressionText');
    const actions = document.getElementById('ownerActions');

    if (progText) {
        if (doc.status === 'MATCHED') {
            progText.textContent = 'Étape 3 sur 4 — Confirmation & Paiement';
            if (actions) actions.classList.remove('hidden');
        } else if (doc.status === 'RETURNED') {
            progText.textContent = 'Processus Terminé';
            if (actions) actions.classList.add('hidden');
        }
    }
}

function renderFinderData(doc) {
    // History summary
    const finderRef = document.querySelector('.timeline-item p.text-textMuted');
    if (finderRef) finderRef.textContent = `Réf: ${doc.identifiant_doc_dm || 'DM-MATCH'}`;

    // Status banner
    const progText = document.querySelector('#viewFinder .font-bold.text-white');
    const codeSection = document.getElementById('finderCodeSection');

    if (progText) {
        if (doc.status === 'MATCHED') {
            progText.textContent = 'Propriétaire identifié — En attente du code';
            if (codeSection) codeSection.classList.remove('hidden');
        } else if (doc.status === 'RETURNED') {
            progText.textContent = 'Remise effectuée — Gains versés';
            if (codeSection) codeSection.classList.add('hidden');
        }
    }
}

// Export functions for global use in HTML
window.recoveryService = {
    /**
     * Process payment for document recovery
     */
    async processPayment(docId, amount = 5000, paymentMethod = 'MOBILE_MONEY') {
        try {
            console.log('💳 [Recovery] Processing payment for document:', docId);
            
            const result = await payRecoveryFee({
                docId,
                amount,
                paymentMethod
            });

            if (result.success) {
                console.log('✅ [Recovery] Payment successful, verification code:', result.data.verificationCode);
                return {
                    success: true,
                    verificationCode: result.data.verificationCode,
                    transaction: result.data.transaction
                };
            } else {
                console.error('❌ [Recovery] Payment failed:', result.message);
                return { success: false, message: result.message };
            }
        } catch (error) {
            console.error('❌ [Recovery] Payment error:', error);
            return { success: false, message: 'Erreur technique lors du paiement' };
        }
    },

    /**
     * Validate recovery code
     */
    async validateCode(docId, code) {
        try {
            console.log('🔍 [Recovery] Validating code for document:', docId);
            
            const result = await validateRecoveryCode({
                docId,
                code
            });

            if (result.success) {
                console.log('✅ [Recovery] Code validated successfully');
                return {
                    success: true,
                    claimId: result.data.claimId,
                    message: 'Document récupéré avec succès'
                };
            } else {
                console.error('❌ [Recovery] Code validation failed:', result.message);
                return { success: false, message: result.message };
            }
        } catch (error) {
            console.error('❌ [Recovery] Validation error:', error);
            return { success: false, message: 'Erreur technique lors de la validation' };
        }
    },

    /**
     * Check claim status
     */
    async checkClaimStatus(docId) {
        try {
            console.log('📊 [Recovery] Checking claim status for document:', docId);
            
            const result = await getActiveClaim(docId);
            
            if (result.success) {
                return {
                    success: true,
                    claim: result.data.claim,
                    status: result.data.claim.status
                };
            } else {
                return { 
                    success: false, 
                    status: 'NO_CLAIM',
                    message: 'Aucun processus de récupération en cours'
                };
            }
        } catch (error) {
            console.error('❌ [Recovery] Status check error:', error);
            return { success: false, message: 'Erreur technique' };
        }
    },

    /**
     * Complete owner workflow (payment + validation)
     */
    async completeOwnerWorkflow(docId) {
        try {
            console.log('🔄 [Recovery] Starting complete owner workflow for:', docId);

            // 1. Check if claim exists
            const claimCheck = await this.checkClaimStatus(docId);
            if (!claimCheck.success && claimCheck.status !== 'NO_CLAIM') {
                return claimCheck;
            }

            // 2. Process payment
            const paymentResult = await this.processPayment(docId);
            if (!paymentResult.success) {
                return paymentResult;
            }

            // 3. Auto-validate the code (since owner just paid)
            const validationResult = await this.validateCode(docId, paymentResult.verificationCode);
            if (!validationResult.success) {
                return validationResult;
            }

            console.log('🎉 [Recovery] Owner workflow completed successfully');
            return {
                success: true,
                verificationCode: paymentResult.verificationCode,
                claimId: validationResult.claimId,
                message: 'Document récupéré avec succès!'
            };

        } catch (error) {
            console.error('❌ [Recovery] Workflow error:', error);
            return { success: false, message: 'Erreur technique dans le workflow' };
        }
    },

    /**
     * Update UI elements based on status
     */
    updateUIForSuccess(verificationCode) {
        // Update progress
        const progText = document.getElementById('ownerProgressionText');
        const progBar = document.getElementById('ownerProgressBar');
        const progPercent = document.getElementById('ownerProgressionPercent');
        
        if (progText) progText.textContent = 'Paiement Validé — Récupération prête';
        if (progBar) progBar.style.width = '100%';
        if (progPercent) progPercent.textContent = '100%';

        // Update steps
        const step3Dot = document.getElementById('ownerStep3Dot');
        const step4Dot = document.getElementById('ownerStep4Dot');
        const step4Title = document.getElementById('ownerStep4Title');
        
        if (step3Dot) {
            step3Dot.className = "w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-green-100";
            step3Dot.innerHTML = '<i class="fa-solid fa-check"></i>';
        }
        
        if (step4Dot) {
            step4Dot.className = "w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-base shadow-xl shadow-primary/30 pulse-ring border-4 border-white";
            step4Dot.innerHTML = '<i class="fa-solid fa-key text-sm"></i>';
        }
        
        if (step4Title) {
            step4Title.className = "text-[12px] font-black text-primary uppercase tracking-tighter";
            step4Title.textContent = 'Code reçu';
        }

        // Show verification code
        const codeDisplay = document.getElementById('pickupCode');
        if (codeDisplay) {
            codeDisplay.textContent = verificationCode;
        }

        // Switch panels
        const actionPanel = document.getElementById('ownerActionPanel');
        const successPanel = document.getElementById('ownerSuccessPanel');
        
        if (actionPanel) actionPanel.classList.add('hidden');
        if (successPanel) successPanel.classList.remove('hidden');
    }
};

