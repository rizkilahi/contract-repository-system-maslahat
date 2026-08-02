import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Loader2, KeyRound, Mail } from "lucide-react";

const DEMO = [
  { email: "muhamadrizkiilahi03@gmail.com", pw: "Admin@CRS2026", role: "Administrator" },
  { email: "bu@bsimaslahat.co.id", pw: "Demo@2026", role: "Business Unit" },
  { email: "legal@bsimaslahat.co.id", pw: "Demo@2026", role: "Legal Officer / LCG" },
  { email: "management@bsimaslahat.co.id", pw: "Demo@2026", role: "Manajemen" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Selamat datang di CRS Maslahat");
      nav("/");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Gagal masuk");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (d) => { setEmail(d.email); setPassword(d.pw); };

  return (
    <div className="min-h-screen grid lg:grid-cols-5 bg-slate-50">
      {/* Left brand pane */}
      <div className="hidden lg:flex lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-teal-700 via-emerald-800 to-slate-900 text-white p-12 flex-col justify-between">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)', backgroundSize:'48px 48px'}}></div>
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur border border-white/20">
              <ShieldCheck className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <p className="font-heading font-bold text-lg">BSI Maslahat</p>
              <p className="text-xs text-teal-100">Connecting Business Processes</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <h1 className="font-heading text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
            Contract Repository <br/>System
          </h1>
          <p className="mt-4 text-teal-100 max-w-md leading-relaxed">
            Kelola siklus hidup Perjanjian Kerja Sama (PKS) BSI Maslahat secara terpusat — dari drafting, review legal, tanda tangan, hingga monitoring masa berlaku.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-4">
              <p className="font-heading text-2xl font-bold">100%</p>
              <p className="text-[10px] text-teal-100 mt-1">Terpusat</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-4">
              <p className="font-heading text-2xl font-bold">H-60</p>
              <p className="text-[10px] text-teal-100 mt-1">Pengingat Otomatis</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-4">
              <p className="font-heading text-2xl font-bold">4 Role</p>
              <p className="text-[10px] text-teal-100 mt-1">Akses Terkontrol</p>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-teal-100/70">© 2026 BSI Maslahat. Amanah dalam Setiap Kerja Sama.</p>
      </div>

      {/* Right form */}
      <div className="lg:col-span-3 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading font-bold text-teal-700">BSI Maslahat | CRS</p>
              <p className="text-xs text-slate-500">Contract Repository System</p>
            </div>
          </div>

          <h2 className="font-heading text-3xl font-bold text-slate-900 tracking-tight">Masuk ke CRS</h2>
          <p className="mt-2 text-sm text-slate-500">Gunakan akun Maslahat Anda untuk mengakses repositori kontrak.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="email" data-testid="login-email" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="nama@bsimaslahat.co.id" className="pl-10 h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="password" data-testid="login-password" type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-11" />
              </div>
            </div>
            <Button data-testid="login-submit" type="submit" disabled={loading} className="w-full h-11 bg-teal-700 hover:bg-teal-800 font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Masuk
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
              Akun Demo — klik untuk mengisi otomatis
            </p>
            <div className="space-y-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  data-testid={`demo-${d.role.split(" ")[0].toLowerCase()}`}
                  onClick={()=>fillDemo(d)}
                  className="w-full text-left rounded-lg border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 transition-colors p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{d.role}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{d.email}</p>
                    </div>
                    <span className="text-[10px] font-mono text-teal-700 bg-teal-50 rounded px-1.5 py-0.5">{d.pw}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
