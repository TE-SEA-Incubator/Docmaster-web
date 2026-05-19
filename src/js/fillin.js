document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link, .nav-link-mobile");
  // On récupère le chemin actuel, par défaut "index.html" si vide
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const recherchePath =
    window.location.pathname.split("/rechercher.html").pop() ||
    "rechercher.html";
  const objectPath =
    window.location.pathname.split("/object.html").pop() || "object.html";

  const documentPath =
    window.location.pathname.split("/document.html").pop() || "document.html";

  navLinks.forEach((link) => {
    const anchor = link.querySelector("a");
    const href = anchor.getAttribute("href");

    if (
      href === currentPath ||
      href === recherchePath ||
      href === objectPath ||
      href === documentPath
    ) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});
const testimonials = [
  {
    quote:
      "Ma fille avait perdu son diplôme de Master. Grâce à DocMaster et à la générosité d'un trouveur, nous l'avons récupéré. Merci infiniment !",
    author: "Paul FOTSO",
    role: "Enseignant, Douala",
  },
  {
    quote:
      "J'ai retrouvé mon portefeuille en moins de 48h. Le système de notification est vraiment efficace. Bravo à l'équipe !",
    author: "Marie NGONO",
    role: "Étudiante, Yaoundé",
  },
  {
    quote:
      "Une plateforme sécurisée et facile d'utilisation. J'ai pu rendre ses clés à un inconnu en toute simplicité.",
    author: "Jean TCHAMENI",
    role: "Commerçant, Bafoussam",
  },
];

let currentIndex = 0;

function updateCarousel() {
  // Le carousel est géré directement dans index.html
  // Ce code n'est pas utilisé mais reste pour compatibilité
  return;
}

function nextBtn() {
  // Le carousel est géré directement dans index.html
  return;
}

function prevBtn() {
  // Le carousel est géré directement dans index.html
  return;
}

// Initialisation
// (Le carousel est géré directement dans index.html)
