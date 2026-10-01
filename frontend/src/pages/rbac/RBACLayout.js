export default function RBACLayout({ title, actions, children }) {
  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Row matching Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="text-slate-400 font-medium">RBAC</span>
          <span className="text-slate-300 font-light">/</span>
          <span className="text-slate-800">{title}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {actions}
        </div>
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}
