import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import SubmitContract from "@/pages/SubmitContract";
import UsersPage from "@/pages/UsersPage";

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Memuat...</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/contracts" element={<Protected><Dashboard /></Protected>} />
            <Route path="/submit" element={<Protected roles={["admin","business_unit"]}><SubmitContract /></Protected>} />
            <Route path="/users" element={<Protected roles={["admin"]}><UsersPage /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
