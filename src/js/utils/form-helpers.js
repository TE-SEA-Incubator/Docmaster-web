/**
 * ═════════════════════════════════════════════════════════════════
 * FORM HELPERS - Multi-step form navigation and submission
 * ═════════════════════════════════════════════════════════════════
 */

import { startButtonLoader, stopButtonLoader } from './button-loaders.js';
import { apiSendVerificationPin, apiVerifyEmailPin } from '../services/api.js';

/**
 * Navigate to next step in multi-step register form
 */
export async function nextStep(prefix, currentStep) {
  // Validation for Step 1
  if (currentStep === 1) {
    const nom = document.getElementById(`${prefix}-nom`);
    const prenom = document.getElementById(`${prefix}-prenom`);
    const phone = document.getElementById(`${prefix}-phone`);
    const email = document.getElementById(`${prefix}-email`);
    const pw1 = document.getElementById(`${prefix}-pw1`);

    if (!nom?.value.trim() || !prenom?.value.trim() || !phone?.value.trim() || !email?.value.trim() || !pw1?.value.trim()) {
      shake(prefix + '-step-1');
      return;
    }
    if (pw1.value.length < 8) {
      shake(prefix + '-step-1');
      alert('Le mot de passe doit avoir au moins 8 caractères.');
      return;
    }
    
    // Populate step 2 mirror field
    const mirror = document.getElementById(`${prefix}-pw1-show`);
    if (mirror) mirror.value = pw1.value;

    // Show email in step 3 (updated from phone)
    const emailDisplay = document.getElementById(`${prefix}-email-display`);
    if (emailDisplay) emailDisplay.textContent = email.value;
  }

  // Validation for Step 2 -> Transition to Step 3 (PIN)
  if (currentStep === 2) {
    const pw1 = document.getElementById(`${prefix}-pw1`);
    const pw2 = document.getElementById(`${prefix}-pw2`);
    if (!pw2?.value || pw1?.value !== pw2.value) {
      const err = document.getElementById(`${prefix}-pw-error`);
      if (err) err.classList.remove('hidden');
      shake(prefix + '-step-2');
      return;
    }

    // SEND VERIFICATION PIN
    const email = document.getElementById(`${prefix}-email`)?.value.trim();
    const telephone = document.getElementById(`${prefix}-phone`)?.value.trim();
    
    if (email) {
      const btn = document.getElementById(`${prefix}-step2-btn`);
      if (btn) startButtonLoader(btn);
      
      const result = await apiSendVerificationPin(email, telephone);
      
      if (btn) stopButtonLoader(btn);
      
      if (!result.success) {
        alert(result.message);
        return;
      }
    }

    // Initialize PIN inputs for next step
    setupPinInputs(prefix);
  }

  // Validation for Step 3 (PIN) -> Transition to Step 4 (Pseudo)
  if (currentStep === 3) {
    const pinInputs = document.getElementById(`${prefix}-step-3`).querySelectorAll('.pin-input');
    const pin = Array.from(pinInputs).map(i => i.value).join('');
    
    if (pin.length < 6) {
      shake(prefix + '-step-3');
      alert('Veuillez entrer le code à 6 chiffres.');
      return;
    }

    const email = document.getElementById(`${prefix}-email`)?.value.trim();
    const btn = document.querySelector(`button[onclick*="nextStep('${prefix}',3)"]`);
    
    if (btn) startButtonLoader(btn);
    const result = await apiVerifyEmailPin(email, pin);
    if (btn) stopButtonLoader(btn);

    if (!result.success) {
      shake(prefix + '-step-3');
      alert(result.message);
      return;
    }

    // Success! Store verified status or proceed
    console.log("✓ Email vérifié avec succès");
  }

  // UI Transition
  const currentStepDiv = document.getElementById(`${prefix}-step-${currentStep}`);
  const nextStepDiv = document.getElementById(`${prefix}-step-${currentStep + 1}`);
  const currentDot = document.getElementById(`${prefix}-dot-${currentStep}`);
  const nextDot = document.getElementById(`${prefix}-dot-${currentStep + 1}`);
  const currentLine = document.getElementById(`${prefix}-line-${currentStep}`);

  if (currentStepDiv && nextStepDiv) {
    currentStepDiv.classList.remove('active');
    nextStepDiv.classList.add('active');
    
    if (currentDot) {
      currentDot.classList.remove('active');
      currentDot.classList.add('done');
    }
    if (nextDot) nextDot.classList.add('active');
    if (currentLine) currentLine.classList.add('done');

    const titles = {
      1: { title: 'Créer un compte', subtitle: 'Vos informations personnelles' },
      2: { title: 'Sécurisez votre compte', subtitle: 'Confirmez votre mot de passe' },
      3: { title: 'Vérification', subtitle: 'Entrez le code reçu par email' },
      4: { title: 'Votre pseudo', subtitle: 'Comment la communauté vous appellera' }
    };
    
    const nextTitle = titles[currentStep + 1];
    if (nextTitle) {
      const titleEl = document.getElementById(`${prefix}-step-title`);
      const subtitleEl = document.getElementById(`${prefix}-step-subtitle`);
      if (titleEl) titleEl.innerText = nextTitle.title;
      if (subtitleEl) subtitleEl.innerText = nextTitle.subtitle;
    }
  }
}

/**
 * Setup PIN inputs behavior
 */
export function setupPinInputs(prefix) {
  const container = document.getElementById(`${prefix}-step-3`);
  if (!container) return;
  const inputs = container.querySelectorAll('.pin-input');
  inputs.forEach((inp, idx) => {
    inp.value = '';
    inp.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '').slice(-1);
      if (this.value && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    });
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !this.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });
  });
  setTimeout(() => inputs[0]?.focus(), 100);
}

/**
 * Select a pseudo suggestion
 */
export function selectPseudo(prefix, value, btn) {
  const input = document.getElementById(`${prefix}-pseudo`);
  if (input) input.value = value;
  
  const chips = btn.parentElement.querySelectorAll('.pseudo-chip');
  chips.forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
}

function shake(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('shake-anim');
  setTimeout(() => el.classList.remove('shake-anim'), 400);
}

/**
 * Navigate to previous step
 */
export function prevStep(prefix, currentStep) {
  const currentStepDiv = document.getElementById(`${prefix}-step-${currentStep}`);
  const prevStepDiv = document.getElementById(`${prefix}-step-${currentStep - 1}`);
  const currentDot = document.getElementById(`${prefix}-dot-${currentStep}`);
  const prevDot = document.getElementById(`${prefix}-dot-${currentStep - 1}`);
  const prevLine = document.getElementById(`${prefix}-line-${currentStep - 1}`);

  if (currentStepDiv && prevStepDiv) {
    currentStepDiv.classList.remove('active');
    prevStepDiv.classList.add('active');
    
    if (currentDot) currentDot.classList.remove('active');
    if (prevDot) {
      prevDot.classList.remove('done');
      prevDot.classList.add('active');
    }
    if (prevLine) prevLine.classList.remove('done');

    const titles = {
      1: { title: 'Créer un compte', subtitle: 'Vos informations personnelles' },
      2: { title: 'Sécurisez votre compte', subtitle: 'Confirmez votre mot de passe' },
      3: { title: 'Vérification', subtitle: 'Entrez le code reçu par email' },
      4: { title: 'Votre pseudo', subtitle: 'Comment la communauté vous appellera' }
    };
    
    const prevTitle = titles[currentStep - 1];
    if (prevTitle) {
      const titleEl = document.getElementById(`${prefix}-step-title`);
      const subtitleEl = document.getElementById(`${prefix}-step-subtitle`);
      if (titleEl) titleEl.innerText = prevTitle.title;
      if (subtitleEl) subtitleEl.innerText = prevTitle.subtitle;
    }
  }
}

/**
 * Submit the multi-step register form
 */
export async function submitRegister(prefix) {
  try {
    // Get form inputs
    const nomInput = document.getElementById(`${prefix}-nom`);
    const prenomInput = document.getElementById(`${prefix}-prenom`);
    const emailInput = document.getElementById(`${prefix}-email`);
    const passwordInput = document.getElementById(`${prefix}-pw1`);
    const phoneInput = document.getElementById(`${prefix}-phone`);

    // Validate inputs exist
    if (!nomInput || !emailInput || !passwordInput) {
      alert("Erreur: Formulaire incomplet");
      return;
    }

    // Get values
    const nom = nomInput.value.trim();
    const prenom = prenomInput?.value.trim() || "";
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const phone = phoneInput?.value.trim() || null;

    // Validate data
    if (!nom || !email || !password) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (password.length < 8) {
      alert("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    // Validate pseudo
    const pseudoVal = document.getElementById(`${prefix}-pseudo`)?.value.trim() || '';
    if (pseudoVal.length < 3 || !/^[a-zA-Z0-9_]+$/.test(pseudoVal)) {
      alert("Veuillez choisir un pseudo valide (min. 3 caractères).");
      return;
    }

    // Get referral code if any
    const referralInput = document.getElementById(`${prefix}-referral`);
    const codeParrainage = referralInput ? referralInput.value.trim() : null;

    console.log("📝 Inscription en cours...");
    if (codeParrainage) console.log("🎁 Avec code de parrainage:", codeParrainage);
    
    // Show loader if possible
    const submitBtn = document.querySelector(`button[onclick*="submitRegister('${prefix}')"]`);
    if (submitBtn && typeof startButtonLoader === 'function') startButtonLoader(submitBtn);

    // Call register from window global scope (set in auth.js)
    // We add is_verified: true since the user verified their email in Step 3
    const result = await window.register(nom, prenom, email, password, phone, 'Cameroun', 'Yaoundé', codeParrainage, true);

    if (submitBtn && typeof stopButtonLoader === 'function') stopButtonLoader(submitBtn);

    if (result.success) {
      console.log("✓ Inscription réussie! Redirection vers le dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 2500);
    } else {
      alert("❌ " + result.message);
    }
  } catch (error) {
    console.error("❌ Erreur:", error);
    alert("Une erreur est survenue lors de l'inscription.");
  }
}
