import { lazy, Suspense } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import Layout from "./layout/Layout";
import AdminLayout from "./layout/AdminLayout";
import AutoriteLayout from "./layout/autorites/AutoriteLayout";
import PartenaireLayout from "./layout/partenaires/PartenaireLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AutoriteProtectedRoute from "./components/autorites/AutoriteProtectedRoute";
import PartenaireProtectedRoute from "./components/partenaires/PartenaireProtectedRoute";
import { AutoriteProvider } from "./context/AutoriteContext";
import { PartenaireProvider } from "./context/PartenaireContext";
import LazyPage from "./components/LazyPage";

const Home = lazy(() => import("./pages/public/Home"));
const Login = lazy(() => import("./pages/auth/Login"));
const Inscription = lazy(() => import("./pages/auth/Inscription"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const RechercherPublic = lazy(() => import("./pages/public/Rechercher"));
const RechercherAuth = lazy(() => import("./pages/auth/Rechercher"));
const Declarer = lazy(() => import("./pages/auth/Declarer"));
const Recuperer = lazy(() => import("./pages/auth/Recuperer"));
const Rendre = lazy(() => import("./pages/auth/Rendre"));
const Trouver = lazy(() => import("./pages/auth/Trouver"));
const ValidationRemise = lazy(() => import("./pages/auth/ValidationRemise"));
const Conditions = lazy(() => import("./pages/public/Conditions"));
const Confidentialite = lazy(() => import("./pages/public/Confidentialite"));
const SharedDocument = lazy(() => import("./pages/public/SharedDocument"));
const TransfertAppareil = lazy(() => import("./pages/public/TransfertAppareil"));
const Dashboard = lazy(() => import("./pages/auth/Dashboard"));
const MesDocuments = lazy(() => import("./pages/auth/MesDocuments"));
const MesAppareils = lazy(() => import("./pages/auth/MesAppareils"));
const MesDeclarations = lazy(() => import("./pages/auth/MesDeclarations"));
const Abonnement = lazy(() => import("./pages/auth/Abonnement"));
const Parrainage = lazy(() => import("./pages/auth/Parrainage"));
const MesGains = lazy(() => import("./pages/auth/MesGains"));
const AcheterPoints = lazy(() => import("./pages/auth/AcheterPoints"));
const InfosProfil = lazy(() => import("./pages/auth/InfosProfil"));
const Messagerie = lazy(() => import("./pages/auth/Messagerie"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminReferrals = lazy(() => import("./pages/admin/AdminReferrals"));
const AdminSms = lazy(() => import("./pages/admin/AdminSms"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminDeclarations = lazy(() => import("./pages/admin/AdminDeclarations"));
const AdminAutorites = lazy(() => import("./pages/admin/AdminAutorites"));
const AdminPartenaires = lazy(() => import("./pages/admin/AdminPartenaires"));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals"));
const AdminDocumentTypes = lazy(() => import("./pages/admin/AdminDocumentTypes"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const AdminMatchingMonitor = lazy(() => import("./pages/admin/AdminMatchingMonitor"));
import { useAutoriteShortcut } from "./hooks/useAutoriteShortcut";
import { usePartenaireShortcut } from "./hooks/usePartenaireShortcut";

const AdminBroadcast = lazy(() => import("./pages/admin/AdminBroadcast"));
const AutoriteConnexion = lazy(() => import("./pages/autorites/Connexion"));
const AutoriteMotDePasseOublie = lazy(() => import("./pages/autorites/MotDePasseOublie"));
const AutoriteReinitialisationMotDePasse = lazy(() => import("./pages/autorites/ReinitialisationMotDePasse"));
const AutoriteChangementMotDePasse = lazy(() => import("./pages/autorites/ChangementMotDePasse"));
const AutoriteDashboard = lazy(() => import("./pages/autorites/Dashboard"));
const AutoriteDeclarations = lazy(() => import("./pages/autorites/Declarations"));
const AutoriteGestionAutorites = lazy(() => import("./pages/autorites/GestionAutorites"));
const AutoriteJournalActivite = lazy(() => import("./pages/autorites/JournalActivite"));

const PartenaireConnexion = lazy(() => import("./pages/partenaires/Connexion"));
const PartenaireMotDePasseOublie = lazy(() => import("./pages/partenaires/MotDePasseOublie"));
const PartenaireReinitialisationMotDePasse = lazy(() => import("./pages/partenaires/ReinitialisationMotDePasse"));
const PartenaireChangementMotDePasse = lazy(() => import("./pages/partenaires/ChangementMotDePasse"));
const PartenaireDashboard = lazy(() => import("./pages/partenaires/Dashboard"));
const PartenaireDeclarations = lazy(() => import("./pages/partenaires/Declarations"));
const PartenaireDeclarerTrouvaille = lazy(() => import("./pages/partenaires/DeclarerTrouvaille"));
const PartenairePortefeuille = lazy(() => import("./pages/partenaires/Portefeuille"));
const PartenaireRetraits = lazy(() => import("./pages/partenaires/Retraits"));
const PartenaireProfil = lazy(() => import("./pages/partenaires/Profil"));
const PartenaireMessagerie = lazy(() => import("./pages/partenaires/Messagerie"));
const PartenaireRendre = lazy(() => import("./pages/partenaires/Rendre"));

export default function App() {
  useAutoriteShortcut();
  usePartenaireShortcut();
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bgMain">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-textMuted text-sm font-medium">Chargement...</p>
        </div>
      </div>
    }>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LazyPage Component={Home} />} />
          <Route path="/login" element={<LazyPage Component={Login} />} />
          <Route path="/inscription" element={<LazyPage Component={Inscription} />} />
          <Route path="/forgot-password" element={<LazyPage Component={ForgotPassword} />} />
          <Route path="/reset-password" element={<LazyPage Component={ResetPassword} />} />
          <Route path="/rechercher" element={<ProtectedRoute><LazyPage Component={RechercherAuth} /></ProtectedRoute>} />
          <Route path="/recherche-publique" element={<LazyPage Component={RechercherPublic} />} />
          <Route path="/declarer" element={<ProtectedRoute><LazyPage Component={Declarer} /></ProtectedRoute>} />
          <Route path="/recuperer" element={<ProtectedRoute><LazyPage Component={Recuperer} /></ProtectedRoute>} />
          <Route path="/trouver" element={<LazyPage Component={Trouver} />} />
          <Route path="/rendre" element={<ProtectedRoute><LazyPage Component={Rendre} /></ProtectedRoute>} />
          <Route path="/remise" element={<LazyPage Component={ValidationRemise} />} />
          <Route path="/conditions" element={<LazyPage Component={Conditions} />} />
          <Route path="/confidentialite" element={<LazyPage Component={Confidentialite} />} />
          <Route path="/partage" element={<LazyPage Component={SharedDocument} />} />
          <Route path="/transfert-appareil" element={<LazyPage Component={TransfertAppareil} />} />

          <Route path="/dashboard" element={<ProtectedRoute><LazyPage Component={Dashboard} /></ProtectedRoute>} />
          <Route path="/mes-documents" element={<ProtectedRoute><LazyPage Component={MesDocuments} /></ProtectedRoute>} />
          <Route path="/mes-appareils" element={<ProtectedRoute><LazyPage Component={MesAppareils} /></ProtectedRoute>} />
          <Route path="/mes-declarations" element={<ProtectedRoute><LazyPage Component={MesDeclarations} /></ProtectedRoute>} />

          <Route path="/abonnement" element={<ProtectedRoute><LazyPage Component={Abonnement} /></ProtectedRoute>} />
          <Route path="/parrainage" element={<ProtectedRoute><LazyPage Component={Parrainage} /></ProtectedRoute>} />
          <Route path="/mes-gains" element={<ProtectedRoute><LazyPage Component={MesGains} /></ProtectedRoute>} />
          <Route path="/acheter-points" element={<ProtectedRoute><LazyPage Component={AcheterPoints} /></ProtectedRoute>} />
          <Route path="/infos-profil" element={<ProtectedRoute><LazyPage Component={InfosProfil} /></ProtectedRoute>} />
          <Route path="/messagerie" element={<ProtectedRoute><LazyPage Component={Messagerie} /></ProtectedRoute>} />
        </Route>

        <Route path="/admin/login" element={<LazyPage Component={AdminLogin} />} />
        <Route element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
          <Route path="/admin" element={<LazyPage Component={AdminDashboard} />} />
          <Route path="/admin/users" element={<LazyPage Component={AdminUsers} />} />
          <Route path="/admin/subscriptions" element={<LazyPage Component={AdminSubscriptions} />} />
          <Route path="/admin/transactions" element={<LazyPage Component={AdminTransactions} />} />
          <Route path="/admin/referrals" element={<LazyPage Component={AdminReferrals} />} />
          <Route path="/admin/sms" element={<LazyPage Component={AdminSms} />} />
          <Route path="/admin/settings" element={<LazyPage Component={AdminSettings} />} />
          <Route path="/admin/declarations" element={<LazyPage Component={AdminDeclarations} />} />
          <Route path="/admin/autorites" element={<LazyPage Component={AdminAutorites} />} />
          <Route path="/admin/partenaires" element={<LazyPage Component={AdminPartenaires} />} />
          <Route path="/admin/withdrawals" element={<LazyPage Component={AdminWithdrawals} />} />
          <Route path="/admin/document-types" element={<LazyPage Component={AdminDocumentTypes} />} />
          <Route path="/admin/activity-log" element={<LazyPage Component={AdminActivityLog} />} />
          <Route path="/admin/matching" element={<LazyPage Component={AdminMatchingMonitor} />} />
          <Route path="/admin/broadcast" element={<LazyPage Component={AdminBroadcast} />} />
        </Route>

        <Route path="/autorite" element={<AutoriteProvider><Outlet /></AutoriteProvider>}>
          <Route path="connexion" element={<LazyPage Component={AutoriteConnexion} />} />
          <Route path="mot-de-passe-oublie" element={<LazyPage Component={AutoriteMotDePasseOublie} />} />
          <Route path="reinitialisation" element={<LazyPage Component={AutoriteReinitialisationMotDePasse} />} />
          <Route
            path="changement-mot-de-passe"
            element={
              <AutoriteProtectedRoute>
                <LazyPage Component={AutoriteChangementMotDePasse} />
              </AutoriteProtectedRoute>
            }
          />
          <Route
            element={
              <AutoriteProtectedRoute>
                <AutoriteLayout />
              </AutoriteProtectedRoute>
            }
          >
            <Route index element={<LazyPage Component={AutoriteDashboard} />} />
            <Route path="dashboard" element={<LazyPage Component={AutoriteDashboard} />} />
            <Route path="declarations" element={<LazyPage Component={AutoriteDeclarations} />} />
            <Route path="autorites" element={<LazyPage Component={AutoriteGestionAutorites} />} />
            <Route path="journal" element={<LazyPage Component={AutoriteJournalActivite} />} />
          </Route>
        </Route>

        <Route path="/partenaire" element={<PartenaireProvider><Outlet /></PartenaireProvider>}>
          <Route path="connexion" element={<LazyPage Component={PartenaireConnexion} />} />
          <Route path="mot-de-passe-oublie" element={<LazyPage Component={PartenaireMotDePasseOublie} />} />
          <Route path="reinitialisation" element={<LazyPage Component={PartenaireReinitialisationMotDePasse} />} />
          <Route
            path="changement-mot-de-passe"
            element={
              <PartenaireProtectedRoute>
                <LazyPage Component={PartenaireChangementMotDePasse} />
              </PartenaireProtectedRoute>
            }
          />
          <Route
            element={
              <PartenaireProtectedRoute>
                <PartenaireLayout />
              </PartenaireProtectedRoute>
            }
          >
            <Route index element={<LazyPage Component={PartenaireDashboard} />} />
            <Route path="dashboard" element={<LazyPage Component={PartenaireDashboard} />} />
            <Route path="declarations" element={<LazyPage Component={PartenaireDeclarations} />} />
            <Route path="declarer" element={<LazyPage Component={PartenaireDeclarerTrouvaille} />} />
            <Route path="rendre" element={<LazyPage Component={PartenaireRendre} />} />
            <Route path="portefeuille" element={<LazyPage Component={PartenairePortefeuille} />} />
            <Route path="retraits" element={<LazyPage Component={PartenaireRetraits} />} />
            <Route path="messagerie" element={<LazyPage Component={PartenaireMessagerie} />} />
            <Route path="profil" element={<LazyPage Component={PartenaireProfil} />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
