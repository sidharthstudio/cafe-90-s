import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ReceiptText, Search } from "lucide-react";
import { api } from "../lib/api";
import { useAppData } from "../lib/app-data";

export default function TrackPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();
  const { data } = useAppData();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setChecking(true);
    setError(null);
    try {
      await api.getOrder(clean);
      navigate(`/order/${clean}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't find that order.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="wrap flex min-h-[70vh] flex-col items-center justify-center py-16">
      <div className="w-full max-w-lg text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber/30">
          <ReceiptText size={24} />
        </span>
        <p className="eyebrow mt-5 text-chili">Order tracking</p>
        <h1 className="display mt-2 text-[clamp(2.2rem,5vw,3.4rem)]">
          Where&apos;s my
          <br />
          <span className="script text-chili">shawarma?</span>
        </h1>
        <p className="mt-3 text-[0.9rem] text-ink/55">
          Enter the order code from your confirmation — it looks like <strong>C90-XXXXXX</strong>.
        </p>

        <form onSubmit={submit} className="mt-7">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="C90-ABC123"
                className="field !py-3 !pl-10 text-center font-bold uppercase tracking-widest"
                aria-label="Order code"
              />
            </div>
            <button type="submit" className="btn btn-accent shrink-0" disabled={checking}>
              {checking ? "Checking…" : <>Track <ArrowRight size={15} /></>}
            </button>
          </div>
          {error && <p className="mt-2 text-[0.8rem] font-semibold text-chili">{error}</p>}
        </form>

        <p className="mt-6 text-[0.78rem] text-ink/40">
          Lost the code? Call us on{" "}
          <a href={`tel:${(data?.settings.phone ?? "").replace(/\s/g, "")}`} className="font-bold text-ink/70 hover:text-chili">
            {data?.settings.phone ?? "+91 89214 75744"}
          </a>{" "}
          and we&apos;ll look it up.
        </p>
      </div>
    </div>
  );
}
