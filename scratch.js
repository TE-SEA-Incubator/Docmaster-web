    const dialogElement = document.getElementById('alert_modal_element');
    if (!dialogElement) return;
    
    // Fermeture avec les boutons D'accord et Croix
    const btns = dialogElement.querySelectorAll('form[method="dialog"] button');
    btns.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dialogElement.close();
      });
    });

    // Également gérer le clic sur le backdrop explicitement
    dialogElement.addEventListener('click', function(e) {
      if (e.target === dialogElement) {
        dialogElement.close();
      }
    });
