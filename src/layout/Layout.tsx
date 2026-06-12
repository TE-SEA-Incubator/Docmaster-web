import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Footer from "./Footer";
import NotificationModal from "../components/ui/NotificationModal";
import PlayStoreBanner from "../components/ui/PlayStoreBanner";

const authPages = ["/dashboard", "/mes-documents", "/mes-appareils", "/mes-declarations", "/abonnement", "/parrainage", "/mes-gains", "/infos-profil", "/declarer", "/trouver", "/rechercher", "/recuperer"];
const publicPages = ["/", "/login", "/forgot-password", "/reset-password", "/recherche-publique", "/conditions", "/confidentialite", "/partage", "/partage.html"];

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const keyBuffer = useRef("");

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
  const isPublicHome = path === "/";
  const showFooter = isPublicHome || path === "/rechercher" || path === "/conditions" || path === "/confidentialite";

  return (
    <div className="min-h-screen bg-bgMain">
      {isAuthPage && user ? (
        <Sidebar />
      ) : (path !== "/login" && path !== "/forgot-password" && path !== "/reset-password" && !path.startsWith("/partage")) ? (
        <Navbar />
      ) : null}

      <main className={"overflow-x-hidden" + (isAuthPage && user ? " ml-[var(--sidebar)] max-md:ml-0 pb-[70px] md:pb-0 transition-all duration-300" : "")}>
        <div className="page-fade-in">
          <Outlet />
        </div>
      </main>

      {isAuthPage && <MobileNav />}

      {showFooter && !isAuthPage && <Footer />}

      {notifModalOpen && <NotificationModal onClose={() => setNotifModalOpen(false)} />}
      <PlayStoreBanner />
    </div>
  );
}
