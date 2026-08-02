import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { ROLE_LABEL } from "@/context/AuthContext";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get("/users").then(r => setUsers(r.data)); }, []);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-900 text-white p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Administrasi</p>
        <h1 className="font-heading text-3xl font-bold mt-2 leading-tight flex items-center gap-3"><Users className="h-7 w-7" /> Manajemen Pengguna</h1>
        <p className="text-sm text-teal-100 mt-2">Daftar pengguna sistem dengan role & akses masing-masing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map(u => (
          <Card key={u.id} className="border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-heading font-bold text-slate-900">{u.name}</p>
                <p className="text-xs text-slate-500 mt-1">{u.email}</p>
              </div>
              <Badge className="bg-teal-100 text-teal-700 border-0">{ROLE_LABEL[u.role]}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
