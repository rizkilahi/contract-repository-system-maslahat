import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import SubmitContract from "@/pages/SubmitContract";
import UsersPage from "@/pages/UsersPage";
import Analytics from "@/pages/Analytics";
import DualReview from "@/pages/DualReview";
import RBACRoles from "@/pages/rbac/RBACRoles";
import RBACMatrix from "@/pages/rbac/RBACMatrix";
import RBACCatalog from "@/pages/rbac/RBACCatalog";
import { RBACProvider, useRBAC } from "@/context/RBACContext";

function Protected({ children, roles, rbacGate }) {
  const { user, loading } = useAuth();
  const { hasRBACMenuAccess } = useRBAC();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Memuat...</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (rbacGate && !hasRBACMenuAccess(user)) return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <RBACProvider>
            <Toaster position="top-right" richColors />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Protected><Dashboard /></Protected>} />
              <Route path="/contracts" element={<Protected><Dashboard /></Protected>} />
              <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
              <Route path="/review/:id" element={<Protected><DualReview /></Protected>} />
              <Route path="/submit" element={<Protected roles={["admin","business_unit"]}><SubmitContract /></Protected>} />
              <Route path="/users" element={<Protected roles={["admin"]}><UsersPage /></Protected>} />
              <Route path="/rbac" element={<Protected rbacGate><RBACRoles /></Protected>} />
              <Route path="/rbac/roles" element={<Protected rbacGate><RBACRoles /></Protected>} />
              <Route path="/rbac/matrix" element={<Protected rbacGate><RBACMatrix /></Protected>} />
              <Route path="/rbac/banding" element={<Protected rbacGate><RBACMatrix /></Protected>} />
              <Route path="/rbac/catalog" element={<Protected rbacGate><RBACCatalog /></Protected>} />
              <Route path="/rbac/katalog" element={<Protected rbacGate><RBACCatalog /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </RBACProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
