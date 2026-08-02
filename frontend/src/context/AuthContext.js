import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("crs_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("crs_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then((r) => {
        setUser(r.data);
        localStorage.setItem("crs_user", JSON.stringify(r.data));
      })
      .catch(() => {
        localStorage.removeItem("crs_token");
        localStorage.removeItem("crs_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("crs_token", data.token);
    localStorage.setItem("crs_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("crs_token");
    localStorage.removeItem("crs_user");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export const ROLE_LABEL = {
  admin: "Administrator",
  business_unit: "Business Unit",
  legal_officer: "Legal Officer / LCG",
  management: "Manajemen",
};
