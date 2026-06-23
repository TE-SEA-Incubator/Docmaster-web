import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import AdminLayout from "./layout/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import LazyPage from "./components/LazyPage";

const Home = lazy(() => import("./pages/public/Home"));
const Login = lazy(() => import("./pages/auth/Login"));
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
const Dashboard = lazy(() => import("./pages/auth/Dashboard"));
const MesDocuments = lazy(() => import("./pages/auth/MesDocuments"));
const MesAppareils = lazy(() => import("./pages/auth/MesAppareils"));
const MesDeclarations = lazy(() => import("./pages/auth/MesDeclarations"));
const Abonnement = lazy(() => import("./pages/auth/Abonnement"));
const Parrainage = lazy(() => import("./pages/auth/Parrainage"));
const MesGains = lazy(() => import("./pages/auth/MesGains"));
const InfosProfil = lazy(() => import("./pages/auth/InfosProfil"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminReferrals = lazy(() => import("./pages/admin/AdminReferrals"));
const AdminSms = lazy(() => import("./pages/admin/AdminSms"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminDeclarations = lazy(() => import("./pages/admin/AdminDeclarations"));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals"));
const AdminDocumentTypes = lazy(() => import("./pages/admin/AdminDocumentTypes"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const AdminMatchingMonitor = lazy(() => import("./pages/admin/AdminMatchingMonitor"));
const AdminBroadcast = lazy(() => import("./pages/admin/AdminBroadcast"));

export default function App() {
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

          <Route path="/dashboard" element={<ProtectedRoute><LazyPage Component={Dashboard} /></ProtectedRoute>} />
          <Route path="/mes-documents" element={<ProtectedRoute><LazyPage Component={MesDocuments} /></ProtectedRoute>} />
          <Route path="/mes-appareils" element={<ProtectedRoute><LazyPage Component={MesAppareils} /></ProtectedRoute>} />
          <Route path="/mes-declarations" element={<ProtectedRoute><LazyPage Component={MesDeclarations} /></ProtectedRoute>} />

          <Route path="/abonnement" element={<ProtectedRoute><LazyPage Component={Abonnement} /></ProtectedRoute>} />
          <Route path="/parrainage" element={<ProtectedRoute><LazyPage Component={Parrainage} /></ProtectedRoute>} />
          <Route path="/mes-gains" element={<ProtectedRoute><LazyPage Component={MesGains} /></ProtectedRoute>} />
          <Route path="/infos-profil" element={<ProtectedRoute><LazyPage Component={InfosProfil} /></ProtectedRoute>} />
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
          <Route path="/admin/withdrawals" element={<LazyPage Component={AdminWithdrawals} />} />
          <Route path="/admin/document-types" element={<LazyPage Component={AdminDocumentTypes} />} />
          <Route path="/admin/activity-log" element={<LazyPage Component={AdminActivityLog} />} />
          <Route path="/admin/matching" element={<LazyPage Component={AdminMatchingMonitor} />} />
          <Route path="/admin/broadcast" element={<LazyPage Component={AdminBroadcast} />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
