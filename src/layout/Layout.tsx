import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Footer from "./Footer";
import NotificationModal from "../components/ui/NotificationModal";
import PlayStoreBanner from "../components/ui/PlayStoreBanner";
import PromoBar from "../components/ui/PromoBar";
import TopProgressBar from "../components/ui/TopProgressBar";
import ChatWidget from "../components/ui/ChatWidget";
import Topbar from "./Topbar";
import { TopbarProvider, useTopbarContext } from "../context/TopbarContext";

const authPages = ["/dashboard", "/mes-documents", "/mes-appareils", "/mes-declarations", "/mes-signalements", "/abonnement", "/parrainage", "/mes-gains", "/acheter-points", "/infos-profil", "/messagerie", "/declarer", "/trouver", "/rechercher", "/recuperer", "/rendre", "/correspondances"];

function LayoutInner() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [promoBarVisible, setPromoBarVisible] = useState(false);
  const keyBuffer = useRef("");
  const { title, breadcrumbs } = useTopbarContext();

  useEffect(() => {
    (window as any).__openNotifModal = () => setNotifModalOpen(true);
    return () => { delete (window as any).__openNotifModal; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Enter") {
        if (keyBuffer.current.toLowerCase() === "admin") {
          keyBuffer.current = "";
          navigate("/admin/login");
        }
        return;
      }
      if (e.key.length === 1) {
        keyBuffer.current += e.key;
        setTimeout(() => { keyBuffer.current = ""; }, 2000);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const isAuthPage = authPages.some((p) => path.startsWith(p));
  const isFullscreenRoute = path.startsWith("/messagerie");
  const hasBottomOverlay = ["/messagerie", "/rendre", "/recuperer", "/remise"].some((p) => path.startsWith(p));
  const isPublicHome = path === "/";
  const showFooter = isPublicHome || path === "/rechercher" || path === "/conditions" || path === "/confidentialite";

  return (
    <div
      className="min-h-screen bg-bgMain"
      style={{ "--promo-offset": promoBarVisible ? "44px" : "0px" } as any}
    >
      <TopProgressBar />

      {isAuthPage && user ? (
        <Sidebar />
      ) : (path !== "/login" && path !== "/inscription" && path !== "/forgot-password" && path !== "/reset-password" && !path.startsWith("/partage")) ? (
        <>
          <PromoBar onVisibilityChange={setPromoBarVisible} />
          <Navbar promoBarVisible={promoBarVisible} />
        </>
      ) : null}

      <main className={isAuthPage && user ? `ml-[var(--sidebar)] max-md:ml-0 ${isFullscreenRoute ? "" : "pb-[70px]"} md:pb-0 transition-all duration-300 flex flex-col h-dvh` : ""}>
        {/* Topbar global — visible sur toutes les pages auth */}
        {isAuthPage && user && (
          <Topbar title={title} breadcrumbs={breadcrumbs} />
        )}

        {/* Filigrane logo Docmaster */}
        {isAuthPage && user && (
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: "var(--sidebar)",
            }}
          >
            <img
              src="/src/assets/images/docmaster.png"
              alt=""
              style={{
                width: "420px",
                maxWidth: "90vw",
                opacity: 0.06,
                userSelect: "none",
                draggable: "false",
              } as React.CSSProperties}
            />
          </div>
        )}

        <motion.div
          key={location.pathname}
          className={isFullscreenRoute && isAuthPage && user
            ? "flex-1 min-h-0 overflow-hidden flex flex-col relative z-10 pb-[70px] md:pb-0"
            : "flex-1 overflow-auto relative z-10"}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </main>

      {isAuthPage && <MobileNav />}
      {showFooter && !isAuthPage && <Footer />}
      {notifModalOpen && <NotificationModal onClose={() => setNotifModalOpen(false)} />}
      {!isAuthPage && !hasBottomOverlay && <PlayStoreBanner />}
      {!hasBottomOverlay && <ChatWidget />}
    </div>
  );
}

export default function Layout() {
  return (
    <TopbarProvider>
      <LayoutInner />
    </TopbarProvider>
  );
}
