import { NavLink } from "react-router-dom";
import { Shield, LayoutGrid, SlidersHorizontal, LockKeyhole, ArrowRight } from "lucide-react";

export default function RBACLayout({ children, activeTab }) {
  const tabs = [
    {
      to: "/rbac/roles",
      label: "Role & Akses",
      icon: Shield,
      desc: "Struktur 4 peran, profil wewenang, dan pengguna aktif"
    },
    {
      to: "/rbac/matrix",
      label: "Perbandingan Akses",
      icon: LayoutGrid,
      desc: "Matriks hak izin komparatif antar-role dan column lock"
    },
    {
      to: "/rbac/catalog",
      label: "Katalog Akses",
      icon: SlidersHorizontal,
      desc: "Daftar inventaris seluruh permission dan level risiko"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white p-6 md:p-8 shadow-sm border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <LockKeyhole className="h-4 w-4" />
              <span>Sistem Tata Kelola & Otorisasi Kepatuhan</span>
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold mt-2 leading-tight">
              Role-Based Access Control (RBAC)
            </h1>
            <p className="text-sm text-teal-100 max-w-2xl mt-1 leading-relaxed">
              Arsitektur keamanan berlapis Perjanjian Kerja Sama (PKS) BSI Maslahat — memastikan pemisahan wewenang (Segregation of Duties), isolasi data unit kerja, dan integritas siklus legalitas.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-3 border border-white/15">
            <div className="text-right">
              <p className="text-xs text-teal-200">Sesi Kriptografis</p>
              <p className="text-sm font-bold font-mono">15 Menit Sliding</p>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div className="text-right">
              <p className="text-xs text-teal-200">Total Role</p>
              <p className="text-sm font-bold font-mono">4 Entitas</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 flex flex-wrap gap-2 pt-4 border-t border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.to;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                data-testid={`rbac-tab-${tab.to.split("/").pop()}`}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all ${
                  isActive
                    ? "bg-teal-600 text-white shadow-md shadow-teal-900/40 font-semibold"
                    : "bg-white/10 text-slate-200 hover:bg-white/15 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div>{children}</div>
    </div>
  );
}
