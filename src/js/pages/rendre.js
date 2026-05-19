/**
 * ═════════════════════════════════════════════════════════════════
 * RENDRE.JS - Finder Recovery Process Controller
 * Handles the logic for the finder to validate the return of a document
 * ═════════════════════════════════════════════════════════════════
 */

import { getDeclarationById, validateRecoveryCode, BASE_URL } from '../services/api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Setup UI interactions
    setupCodeInputs();

    // 2. Load declaration data
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('id');
    
    if (!docId) {
        console.error('❌ [Rendre] No document ID provided in URL');
        return;
    }

    if (window.toggleLoader) window.toggleLoader(true);
    try {
        console.log('🔄 [Rendre] Loading declaration details for:', docId);
        const result = await getDeclarationById(docId);

        if (result.success) {
            updateUI(result.data);
        } else {
            console.error('❌ [Rendre] Error fetching declaration:', result.message);
        }
    } catch (error) {
        console.error('❌ [Rendre] Technical error:', error);
    } finally {
        if (window.toggleLoader) setTimeout(() => window.toggleLoader(false), 500);
    }
});

/**
 * Setup the 6-digit code inputs with auto-focus behavior
 */
function setupCodeInputs() {
    const inputs = document.querySelectorAll('.code-input');
    if (inputs.length === 0) return;

    inputs.forEach((input, index) => {
        // Auto-focus next input
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        // Handle backspace to go to previous input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });
}

/**
 * Update the UI with declaration and claim data
 */
function updateUI(data) {
    console.log('✨ [Rendre] Updating UI with data:', data);

    // 1. Update Header Title
    const headerTitle = document.querySelector('header span.font-bricolage');
    if (headerTitle) headerTitle.textContent = `Remise : ${data.doc_type || 'Document'}`;

    // 2. Update Global ID/Reference
    const refTitle = document.querySelector('h3.font-bricolage');
    if (refTitle && data.identifiant_doc_dm) {
        refTitle.textContent = `Historique du signalement #${data.identifiant_doc_dm}`;
    }

    // 3. Update Document Type in Timeline
    document.querySelectorAll('.text-textMain').forEach(el => {
        if (el.textContent.includes('CNI Camerounaise')) {
            el.textContent = data.doc_type || 'Document';
        }
    });

    // 4. Update Date in Step 1
    const step1Date = document.querySelector('.timeline-item:nth-child(1) .text-\\[11px\\]');
    if (step1Date && data.created_at) {
        step1Date.textContent = `Le ${new Date(data.created_at).toLocaleDateString('fr-FR')} à ${new Date(data.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}`;
    }

    // 5. Update Owner Info (Step 2)
    if (data.counterPart) {
        const ownerNameEl = document.getElementById('ownerNameDisplay');
        if (ownerNameEl) {
            ownerNameEl.textContent = `Client : ${data.counterPart.prenom} ${data.counterPart.nom}`;
        }
        
        const step2Sub = document.querySelector('.timeline-item:nth-child(2) .text-green-700\\/80');
        if (step2Sub) {
            step2Sub.textContent = `Le propriétaire (${data.counterPart.prenom}) a été identifié et a validé la procédure.`;
        }
    }

    // 6. Update Object Summary (Right Side)
    const summaryCard = document.querySelector('.lg\\:col-span-5 .bg-surface2');
    if (summaryCard) {
        const titleEl = summaryCard.querySelector('.text-\\[13px\\]');
        if (titleEl) titleEl.textContent = `${data.doc_type} : ${data.owner_name || '---'}`;
        
        const subTitleEl = summaryCard.querySelector('.text-\\[10px\\]');
        if (subTitleEl && data.document_number) {
            subTitleEl.innerHTML = `<i class="fa-solid fa-hashtag mr-1"></i>No ${data.document_number}`;
        }
    }

    // 7. Update Gains
    const gainsDisplay = document.getElementById('gainsDisplay');
    if (gainsDisplay && data.reward_amount) {
        gainsDisplay.innerHTML = `${data.reward_amount.toLocaleString()} <span class="text-xs text-textMuted font-bold">FCFA</span>`;
    }

    const pointsDisplay = document.getElementById('pointsDisplay');
    if (pointsDisplay && data.reward_points) {
        pointsDisplay.textContent = `+${data.reward_points}`;
    }

    // Update detailed breakdown if docTypeInfo exists
    if (data.docTypeInfo) {
        const civicRewardEl = document.getElementById('civicRewardDisplay');
        const conservationFeeEl = document.getElementById('conservationFeeDisplay');
        
        if (civicRewardEl) {
            // Assuming reward_amount is the total, and maybe we want to show a breakdown
            // For now, let's just show the reward_amount as civic reward
            civicRewardEl.textContent = `+${data.reward_amount.toLocaleString()} FCFA`;
        }
        
        if (conservationFeeEl) {
            // Set to 0 or some other logic if available, for now hide or set to fixed
            conservationFeeEl.textContent = `+0 FCFA`; 
        }
    }

    // 8. Handle Photo (If we add one to the HTML)
    const docImage = document.getElementById('docImage');
    const imagePlaceholder = document.getElementById('imagePlaceholder');
    if (docImage && data.photo_recto) {
        const imageUrl = data.photo_recto.startsWith('http') ? data.photo_recto : `${BASE_URL}/${data.photo_recto.replace(/^\//, '')}`;
        docImage.src = imageUrl;
        docImage.classList.remove('hidden');
        if (imagePlaceholder) imagePlaceholder.classList.add('hidden');
        console.log('📸 [Rendre] Document photo set to:', imageUrl);
    }

    // 9. Check Claim Status (Step 3 & 4)
    if (data.claim) {
        const step3Dot = document.querySelector('.timeline-item:nth-child(3) .timeline-dot');
        const step3Title = document.querySelector('.timeline-item:nth-child(3) .text-primary');
        const step3Line = document.querySelector('.timeline-item:nth-child(3) .timeline-line');
        const step3Desc = document.querySelector('.timeline-item:nth-child(3) .text-textMuted');
        
        if (step3Dot) {
            step3Dot.classList.remove('step-active');
            step3Dot.classList.add('step-done');
            step3Dot.innerHTML = '<i class="fa-solid fa-check"></i>';
        }
        if (step3Title) {
            step3Title.classList.remove('text-primary');
            step3Title.classList.add('text-green-600');
            step3Title.textContent = 'Paiement confirmé';
        }
        if (step3Desc) {
            step3Desc.textContent = 'Le propriétaire a réglé les frais. Vous pouvez maintenant valider la remise.';
        }
        if (step3Line) {
            step3Line.classList.add('done');
        }
        
        // Enable Step 4
        const step4Dot = document.querySelector('.timeline-item:nth-child(4) .timeline-dot');
        if (step4Dot) {
            step4Dot.classList.remove('step-pending');
            step4Dot.classList.add('step-active');
            step4Dot.innerHTML = '<i class="fa-solid fa-hourglass-start text-[10px]"></i>';
        }
    }
}

/**
 * Validate the recovery code provided by the owner
 */
async function finderValidateCode() {
    const inputs = document.querySelectorAll('.code-input');
    const btn = document.querySelector('button[onclick="finderValidateCode()"]');
    const originalContent = btn ? btn.innerHTML : '';
    
    const code = Array.from(inputs).map(i => i.value).join('');
    if (code.length < 6) {
        alert('Veuillez entrer le code complet à 6 chiffres.');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const docId = params.get('id');

    if (!docId) {
        alert('ID du document manquant.');
        return;
    }

    if (window.toggleLoader) window.toggleLoader(true);
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Validation...';
        }

        console.log('🔍 [Rendre] Validating code:', code, 'for doc:', docId);
        const result = await validateRecoveryCode({ docId, code });

        if (result.success) {
            if (btn) {
                btn.classList.remove('bg-green-dark');
                btn.classList.add('bg-blue-600');
                btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Succès ! Redirection...';
            }
            
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
        } else {
            alert(result.message || 'Code invalide');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalContent;
            }
            inputs.forEach(i => i.value = '');
            inputs[0].focus();
        }
    } catch (error) {
        console.error('❌ [Rendre] Error validating code:', error);
        alert('Erreur de connexion au serveur.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    } finally {
        if (window.toggleLoader) window.toggleLoader(false);
    }
}

// Attach to window for the onclick handler in HTML
window.finderValidateCode = finderValidateCode;
