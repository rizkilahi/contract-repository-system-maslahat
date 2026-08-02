import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent
} from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck, Clock } from "lucide-react";

const fmtDT = (s) => new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data.items);
      setUnread(data.unread);
    } catch {}
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const markAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  const openNotif = async (n) => {
    if (!n.read) {
      await api.post(`/notifications/${n.id}/read`);
      load();
    }
    setOpen(false);
    if (n.contract_id) nav(`/review/${n.contract_id}`);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button data-testid="notification-btn" className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors" title="Notifikasi">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0 max-h-[500px] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-slate-200">
          <div>
            <p className="font-heading text-sm font-bold">Notifikasi</p>
            <p className="text-[11px] text-slate-500">{unread} belum dibaca</p>
          </div>
          {unread > 0 && (
            <button onClick={markAll} data-testid="notif-mark-all" className="text-[11px] text-teal-700 hover:text-teal-800 font-semibold inline-flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> Tandai semua
            </button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {items.length === 0 && <p className="text-xs text-slate-400 italic text-center py-8">Belum ada notifikasi</p>}
          {items.map((n) => (
            <button key={n.id} onClick={()=>openNotif(n)} data-testid={`notif-${n.id}`}
              className={`w-full text-left border-b border-slate-100 p-3 hover:bg-slate-50 transition-colors ${!n.read ? "bg-teal-50/40" : ""}`}>
              <div className="flex items-start gap-2">
                {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 shrink-0"></span>}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDT(n.created_at)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
