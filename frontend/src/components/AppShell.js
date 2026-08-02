import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, ROLE_LABEL } from "@/context/AuthContext";
import {
  LayoutDashboard, FileText, FilePlus2, Users, LogOut,
  ChevronLeft, ChevronRight, Search, ShieldCheck, AlertOctagon, MessageCircleQuestion, BarChart3
} from "lucide-react";
import { Input } from "@/components/ui/input";
import NotificationBell from "@/components/NotificationBell";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Dasbor Utama", icon: LayoutDashboard, roles: ["admin","business_unit","legal_officer","management"] },
  { to: "/contracts", label: "Repositori Kontrak", icon: FileText, roles: ["admin","business_unit","legal_officer","management"] },
  { to: "/analytics", label: "Analitik Portofolio", icon: BarChart3, roles: ["admin","business_unit","legal_officer","management"] },
  { to: "/submit", label: "Pengajuan PKS Baru", icon: FilePlus2, roles: ["admin","business_unit"] },
  { to: "/users", label: "Manajemen Pengguna", icon: Users, roles: ["admin"] },
];

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const initials = (user?.name || "?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
      <header data-testid="app-navbar" className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex h-16 items-center gap-4 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="hidden sm:block">
              <p className="font-heading text-sm font-bold text-teal-700 leading-none">BSI Maslahat</p>
              <p className="text-xs text-slate-500 leading-none mt-1">Contract Repository System</p>
            </div>
          </div>

          <div className="ml-6 hidden md:flex flex-1 max-w-lg items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input data-testid="quick-search" placeholder="Cari kontrak, mitra, atau nomor PKS..." className="pl-10 h-10 bg-slate-50 border-slate-200 focus-visible:ring-teal-500" />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-trigger" className="flex items-center gap-2.5 rounded-full border border-slate-200 pl-1 pr-3 py-1 hover:bg-slate-50 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-teal-600 text-white text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold leading-none">{user?.name}</p>
                    <p className="text-[10px] text-slate-500 leading-none mt-1">{ROLE_LABEL[user?.role]}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-semibold">{user?.name}</div>
                  <div className="text-xs text-slate-500">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="logout-btn" onClick={()=>{ logout(); toast.success("Berhasil keluar"); nav("/login"); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside data-testid="app-sidebar" className={`sticky top-16 h-[calc(100vh-4rem)] shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 ${collapsed ? "w-16" : "w-64"}`}>
          <div className="flex h-full flex-col">
            <nav className="flex-1 space-y-1 p-3">
              {NAV.filter(n => n.roles.includes(user?.role)).map((n) => {
                const Icon = n.icon;
                return (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.to === "/"}
                    data-testid={`nav-${n.to.replace("/", "") || "home"}`}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-teal-50 text-teal-700 border-l-4 border-teal-600 pl-2"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`
                    }
                  >
                    <Icon className={`h-5 w-5 shrink-0`} strokeWidth={1.75} />
                    {!collapsed && <span className="truncate">{n.label}</span>}
                  </NavLink>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 p-3">
              <button
                data-testid="sidebar-collapse-btn"
                onClick={() => setCollapsed((v) => !v)}
                className="flex w-full items-center justify-center gap-2 rounded-md p-2 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : (<><ChevronLeft className="h-4 w-4" /><span className="text-xs">Ciutkan</span></>)}
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-7xl px-6 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 left-6 z-30">
        <Button data-testid="fab-report" className="rounded-full bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-lg shadow-rose-500/30 pl-4 pr-5 h-11 transition-transform hover:-translate-y-0.5">
          <AlertOctagon className="h-4 w-4 mr-2" /> LAPORKAN SEKARANG
        </Button>
      </div>
      <div className="fixed bottom-6 right-6 z-30">
        <Button data-testid="fab-help" className="rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-teal-500/30 pl-4 pr-5 h-11 transition-transform hover:-translate-y-0.5">
          <MessageCircleQuestion className="h-4 w-4 mr-2" /> Tanya aku!
        </Button>
      </div>
    </div>
  );
}
