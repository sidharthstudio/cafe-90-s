import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Bell,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu as MenuIcon,
  ReceiptText,
  Settings,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { AdminUser } from "../../../shared/types";
import { api } from "../../lib/api";

type AdminContextValue = {
  admin: AdminUser | null;
  newOrders: number;
  refreshStats: () => void;
};

const AdminContext = createContext<AdminContextValue>({ admin: null, newOrders: 0, refreshStats: () => {} });

export function useAdmin() {
  return useContext(AdminContext);
}

const LINKS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: ReceiptText },
  { to: "/admin/menu", label: "Menu & prices", icon: UtensilsCrossed },
  { to: "/admin/content", label: "Offers & content", icon: Megaphone },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    window.setTimeout(() => void ctx.close(), 400);
  } catch {
    /* sound is optional */
  }
}

export default function AdminLayout() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [newOrders, setNewOrders] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const lastTotal = useRef<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api.admin
      .me()
      .then((res) => setAdmin(res.admin))
      .catch(() => navigate("/admin/login", { replace: true }))
      .finally(() => setChecking(false));
  }, [navigate]);

  const poll = useCallback(async () => {
    try {
      const stats = await api.admin.stats();
      setNewOrders(stats.newOrders);
      if (lastTotal.current !== null && stats.totalOrders > lastTotal.current) {
        beep();
        setToast(`${stats.totalOrders - lastTotal.current} new order received`);
        window.setTimeout(() => setToast(null), 6000);
      }
      lastTotal.current = stats.totalOrders;
    } catch {
      /* keep the dashboard usable if a poll fails */
    }
  }, []);

  useEffect(() => {
    if (!admin) return;
    void poll();
    const timer = window.setInterval(() => void poll(), 15_000);
    return () => window.clearInterval(timer);
  }, [admin, poll]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const signOut = async () => {
    await api.admin.logout().catch(() => undefined);
    navigate("/admin/login", { replace: true });
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cream/20 border-t-amber" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <AdminContext.Provider value={{ admin, newOrders, refreshStats: () => void poll() }}>
      <div className="min-h-screen bg-[#efe5d1] text-ink">
        <div className="flex min-h-screen">
          {/* sidebar */}
          <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col justify-between bg-ink px-4 py-6 text-cream lg:flex">
            <div>
              <div className="flex items-center gap-2.5 px-2">
                <span
                  className="grid h-9 w-9 place-items-center rounded-full bg-chili text-[12px] font-extrabold text-paper"
                  style={{ transform: "rotate(-7deg)" }}
                >
                  90&apos;s
                </span>
                <div>
                  <p className="display text-[1.05rem] leading-none text-cream">Café 90&apos;s</p>
                  <p className="text-[0.6rem] font-bold uppercase tracking-widest text-cream/40">Owner dashboard</p>
                </div>
              </div>

              <nav className="mt-8 space-y-1">
                {LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.84rem] font-semibold transition-colors ${
                        isActive ? "bg-cream/12 text-cream" : "text-cream/55 hover:bg-cream/[0.06] hover:text-cream"
                      }`
                    }
                  >
                    <link.icon size={16} />
                    {link.label}
                    {link.to === "/admin/orders" && newOrders > 0 && (
                      <span className="ml-auto grid h-5 min-w-[20px] place-items-center rounded-full bg-chili px-1 text-[10px] font-extrabold text-white">
                        {newOrders}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="space-y-2">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[0.78rem] font-semibold text-cream/50 hover:bg-cream/[0.06] hover:text-cream"
              >
                <ExternalLink size={14} /> View live site
              </a>
              <div className="rounded-2xl border border-cream/10 bg-cream/[0.04] p-3">
                <p className="truncate text-[0.78rem] font-bold text-cream">{admin.name}</p>
                <p className="truncate text-[0.68rem] text-cream/40">{admin.email}</p>
                <button
                  type="button"
                  onClick={signOut}
                  className="mt-2 flex items-center gap-1.5 text-[0.72rem] font-semibold text-cream/50 hover:text-amber"
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </div>
          </aside>

          {/* main */}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink/10 bg-[#efe5d1]/90 px-4 py-3 backdrop-blur-md sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-ink/15 bg-paper lg:hidden"
                  aria-label="Open dashboard menu"
                >
                  <MenuIcon size={16} />
                </button>
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/40">Café 90&apos;s</p>
                  <p className="display text-[1.05rem] leading-none">
                    {LINKS.find((l) => (l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)))?.label ??
                      "Dashboard"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/admin/orders")}
                  className="relative grid h-9 w-9 place-items-center rounded-full border border-ink/15 bg-paper"
                  aria-label={`${newOrders} pending orders`}
                >
                  <Bell size={15} />
                  {newOrders > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-chili px-1 text-[9px] font-extrabold text-white">
                      {newOrders}
                    </span>
                  )}
                </button>
                <a href="/" target="_blank" rel="noreferrer" className="btn btn-sm hidden sm:inline-flex">
                  Live site <ArrowUpRight size={13} />
                </a>
              </div>
            </header>

            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-[1200px]">
                <Outlet />
              </div>
            </main>
          </div>
        </div>

        {/* mobile sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button type="button" className="absolute inset-0 bg-ink/60" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
              <motion.div
                className="absolute left-0 top-0 h-full w-[264px] bg-ink p-4 text-cream"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 280 }}
              >
                <div className="flex items-center justify-between">
                  <p className="display text-lg">Dashboard</p>
                  <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full border border-cream/20">
                    <X size={15} />
                  </button>
                </div>
                <nav className="mt-6 space-y-1">
                  {LINKS.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.86rem] font-semibold ${
                          isActive ? "bg-cream/12 text-cream" : "text-cream/60"
                        }`
                      }
                    >
                      <link.icon size={16} /> {link.label}
                    </NavLink>
                  ))}
                </nav>
                <button type="button" onClick={signOut} className="mt-8 flex items-center gap-2 px-3 text-[0.8rem] font-semibold text-cream/50">
                  <LogOut size={14} /> Sign out
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full bg-chili px-5 py-3 text-sm font-bold text-white shadow-xl"
            >
              <Bell size={15} /> {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminContext.Provider>
  );
}
