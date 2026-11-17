import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAppData } from "../../lib/app-data";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { data } = useAppData();

  useEffect(() => {
    api.admin
      .me()
      .then(() => navigate("/admin", { replace: true }))
      .catch(() => undefined);
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.admin.login(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-ink text-cream lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-cream/10 p-12 lg:flex">
        <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-chili/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2 text-[0.8rem] font-semibold text-cream/60 hover:text-cream">
          <ArrowLeft size={14} /> Back to the cafe site
        </Link>

        <div className="relative max-w-md">
          <p className="script text-2xl text-amber">the owner&apos;s desk</p>
          <h1 className="display mt-3 text-[clamp(2.6rem,4.6vw,4rem)] text-cream">
            Run the cafe
            <br /> from one screen.
          </h1>
          <p className="mt-4 text-[0.9rem] leading-relaxed text-cream/55">
            Orders, menu, prices, delivery radius and everything customers see — all live, all in one place.
          </p>
        </div>

        <div className="relative grid grid-cols-2 gap-3 text-[0.78rem]">
          {[
            { label: "Orders", value: "Live queue" },
            { label: "Menu", value: "174 items" },
            { label: "Delivery", value: "Radius control" },
            { label: "Content", value: "Offers & events" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-cream/12 bg-cream/[0.04] px-4 py-3">
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-amber">{item.label}</p>
              <p className="mt-0.5 font-semibold text-cream">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-[0.78rem] font-semibold text-cream/50 hover:text-cream lg:hidden">
            <ArrowLeft size={14} /> Cafe site
          </Link>

          <div className="rounded-3xl border border-cream/10 bg-cream/[0.04] p-6 backdrop-blur">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber" />
              <p className="eyebrow text-amber">Secure access</p>
            </div>
            <h2 className="display mt-2 text-3xl text-cream">Cafe dashboard</h2>
            <p className="mt-1 text-[0.82rem] text-cream/45">
              {data?.settings.cafeName ?? "Café 90's"} · owner sign in
            </p>

            <form onSubmit={submit} className="mt-6 space-y-3">
              <div>
                <label className="mb-1 block text-[0.68rem] font-bold uppercase tracking-widest text-cream/45" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/35" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-cream/15 bg-ink/40 py-2.5 pl-10 pr-3 text-sm text-cream placeholder:text-cream/25 focus:border-amber focus:outline-none"
                    placeholder="owner@cafe90s.in"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[0.68rem] font-bold uppercase tracking-widest text-cream/45" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/35" />
                  <input
                    id="password"
                    type={show ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-cream/15 bg-ink/40 py-2.5 pl-10 pr-10 text-sm text-cream placeholder:text-cream/25 focus:border-amber focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/35 hover:text-cream"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-chili/40 bg-chili/10 px-3 py-2 text-[0.78rem] font-semibold text-[#ffb4a2]">
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy} className="btn btn-amber w-full">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-4 text-[0.68rem] leading-relaxed text-cream/35">
              Access is limited to authorised cafe staff. Sessions expire after 7 days.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
