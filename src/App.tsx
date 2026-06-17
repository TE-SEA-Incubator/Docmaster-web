import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import AdminLayout from "./layout/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

const Home = lazy(() => import("./pages/public/Home"));
const Login = lazy(() => import("./pages/auth/Login"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const RechercherPublic = lazy(() => import("./pages/public/Rechercher"));
const RechercherAuth = lazy(() => import("./pages/auth/Rechercher"));
const Declarer = lazy(() => import("./pages/auth/Declarer"));
const Recuperer = lazy(() => import("./pages/auth/Recuperer"));
const Rendre = lazy(() => import("./pages/auth/Trouver"));
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
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/rechercher" element={<ProtectedRoute><RechercherAuth /></ProtectedRoute>} />
          <Route path="/recherche-publique" element={<RechercherPublic />} />
          <Route path="/declarer" element={<ProtectedRoute><Declarer /></ProtectedRoute>} />
          <Route path="/recuperer" element={<ProtectedRoute><Recuperer /></ProtectedRoute>} />
          <Route path="/trouver" element={<Rendre />} />
          <Route path="/remise" element={<ValidationRemise />} />
          <Route path="/conditions" element={<Conditions />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/partage" element={<SharedDocument />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/mes-documents" element={<ProtectedRoute><MesDocuments /></ProtectedRoute>} />
          <Route path="/mes-appareils" element={<ProtectedRoute><MesAppareils /></ProtectedRoute>} />
          <Route path="/mes-declarations" element={<ProtectedRoute><MesDeclarations /></ProtectedRoute>} />

          <Route path="/abonnement" element={<ProtectedRoute><Abonnement /></ProtectedRoute>} />
          <Route path="/parrainage" element={<ProtectedRoute><Parrainage /></ProtectedRoute>} />
          <Route path="/mes-gains" element={<ProtectedRoute><MesGains /></ProtectedRoute>} />
          <Route path="/infos-profil" element={<ProtectedRoute><InfosProfil /></ProtectedRoute>} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/referrals" element={<AdminReferrals />} />
          <Route path="/admin/sms" element={<AdminSms />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/declarations" element={<AdminDeclarations />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
          <Route path="/admin/document-types" element={<AdminDocumentTypes />} />
          <Route path="/admin/activity-log" element={<AdminActivityLog />} />
          <Route path="/admin/matching" element={<AdminMatchingMonitor />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
