import { useEffect, useState } from "react";
import { Check, Crosshair, Loader2, Lock, Save, Truck } from "lucide-react";
import type { Settings } from "../../../shared/types";
import { api } from "../../lib/api";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-paper p-4 sm:p-5">
      <h2 className="display text-xl">{title}</h2>
      {description && <p className="text-[0.78rem] text-ink/45">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input className="field !py-2 !text-[0.86rem]" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

export default function AdminSettings() {
  const [form, setForm] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .settings()
      .then((res) => setForm(res.settings))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.admin.saveSettings(form);
      setForm(res.settings);
      setNotice("Settings saved — the website is already updated.");
      window.setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("This browser cannot read your location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) =>
          prev
            ? {
                ...prev,
                cafeLat: Number(pos.coords.latitude.toFixed(7)),
                cafeLng: Number(pos.coords.longitude.toFixed(7)),
                mapEmbedUrl: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}&z=16&output=embed`,
              }
            : prev,
        );
        setLocating(false);
      },
      () => {
        setError("Location permission was denied.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) {
      setPwMessage("New passwords do not match.");
      return;
    }
    setPwBusy(true);
    try {
      await api.admin.changePassword(pw.current, pw.next);
      setPwMessage("Password updated.");
      setPw({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwMessage(err instanceof Error ? err.message : "Could not update the password");
    } finally {
      setPwBusy(false);
    }
  };

  if (loading) return <div className="skeleton h-72 rounded-2xl" />;
  if (!form) return <p className="text-[0.85rem] text-chili">{error ?? "Settings unavailable"}</p>;

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40">Settings</p>
          <h1 className="display mt-1 text-[clamp(1.8rem,3.6vw,2.5rem)]">Business &amp; delivery</h1>
          <p className="text-[0.82rem] text-ink/50">Everything here is live on the customer website the moment you save.</p>
        </div>
        <button type="button" onClick={() => void save()} disabled={saving} className="btn btn-sm btn-accent">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/10 px-4 py-2.5 text-[0.82rem] font-semibold text-teal-900">
          <Check size={15} /> {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-chili/30 bg-chili/5 px-4 py-2.5 text-[0.82rem] font-semibold text-chili">{error}</div>
      )}

      <Section title="Business details" description="Name, contact and social links used across the site.">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Cafe name" value={form.cafeName} onChange={(v) => update("cafeName", v)} />
          <TextField label="Tagline" value={form.tagline} onChange={(v) => update("tagline", v)} />
          <TextField label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
          <TextField label="WhatsApp number" value={form.whatsapp} onChange={(v) => update("whatsapp", v)} placeholder="918921475744" />
          <TextField label="Email" value={form.email} onChange={(v) => update("email", v)} />
          <TextField label="Instagram URL" value={form.instagram} onChange={(v) => update("instagram", v)} />
          <TextField label="Facebook URL" value={form.facebook} onChange={(v) => update("facebook", v)} />
          <TextField label="Google Maps link" value={form.mapUrl} onChange={(v) => update("mapUrl", v)} />
          <div className="sm:col-span-2">
            <TextField label="Address" value={form.address} onChange={(v) => update("address", v)} />
          </div>
          <div className="sm:col-span-2">
            <TextField label="Map embed URL" value={form.mapEmbedUrl} onChange={(v) => update("mapEmbedUrl", v)} />
          </div>
        </div>
      </Section>

      <Section title="Delivery zone" description="The cafe location and radius decide who gets free delivery.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Cafe latitude" value={String(form.cafeLat)} onChange={(v) => update("cafeLat", Number(v))} />
          <TextField label="Cafe longitude" value={String(form.cafeLng)} onChange={(v) => update("cafeLng", Number(v))} />
          <div className="flex items-end">
            <button type="button" onClick={useMyLocation} disabled={locating} className="btn btn-sm btn-cream w-full">
              {locating ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />} Use my location
            </button>
          </div>
          <div className="flex items-end">
            <a
              href={`https://www.google.com/maps?q=${form.cafeLat},${form.cafeLng}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-cream w-full"
            >
              Check on map
            </a>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-ink/10 bg-cream p-3.5">
            <div className="flex items-center justify-between">
              <span className="field-label !mb-0">Free delivery radius</span>
              <span className="badge bg-teal/15 text-teal-900">{form.freeRadiusKm} km</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={0.1}
              value={form.freeRadiusKm}
              onChange={(e) => update("freeRadiusKm", Number(e.target.value))}
              className="mt-3 w-full accent-chili"
              aria-label="Free delivery radius"
            />
            <p className="mt-1 text-[0.7rem] text-ink/45">
              Customers inside this radius always see FREE DELIVERY. The cafe recommends 3–4 km.
            </p>
          </div>

          <div className="rounded-xl border border-ink/10 bg-cream p-3.5">
            <div className="flex items-center justify-between">
              <span className="field-label !mb-0">Maximum delivery radius</span>
              <span className="badge bg-amber/25 text-amber-900">{form.maxRadiusKm} km</span>
            </div>
            <input
              type="range"
              min={Math.max(1, form.freeRadiusKm)}
              max={25}
              step={0.5}
              value={form.maxRadiusKm}
              onChange={(e) => update("maxRadiusKm", Number(e.target.value))}
              className="mt-3 w-full accent-chili"
              aria-label="Maximum delivery radius"
            />
            <p className="mt-1 text-[0.7rem] text-ink/45">Orders beyond this distance are refused automatically.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="field-label">Delivery charge outside free zone (₹)</span>
            <input
              className="field !py-2 !text-[0.86rem]"
              inputMode="numeric"
              value={String(form.outsideFee)}
              onChange={(e) => update("outsideFee", Number(e.target.value.replace(/[^\d.]/g, "") || 0))}
            />
            <p className="mt-1 text-[0.68rem] text-ink/40">Set 0 to keep it free, or add your own charge.</p>
          </div>
          <div>
            <span className="field-label">Minimum order (₹)</span>
            <input
              className="field !py-2 !text-[0.86rem]"
              inputMode="numeric"
              value={String(form.minOrderValue)}
              onChange={(e) => update("minOrderValue", Number(e.target.value.replace(/[^\d.]/g, "") || 0))}
            />
          </div>
          <div>
            <span className="field-label">Prep time shown to customers</span>
            <input className="field !py-2 !text-[0.86rem]" value={form.prepTime} onChange={(e) => update("prepTime", e.target.value)} />
          </div>
          <div className="space-y-2">
            {[
              { key: "deliveryEnabled" as const, label: "Accept online orders" },
              { key: "outsideDeliveryAllowed" as const, label: "Deliver outside free zone" },
              { key: "onlinePaymentEnabled" as const, label: "Online payment enabled" },
            ].map((toggle) => (
              <button
                key={toggle.key}
                type="button"
                onClick={() => update(toggle.key, !form[toggle.key] as never)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-[0.78rem] font-semibold ${
                  form[toggle.key] ? "border-teal/40 bg-teal/10 text-teal-900" : "border-ink/15 bg-cream text-ink/50"
                }`}
              >
                {toggle.label}
                <span
                  className={`relative h-4 w-8 rounded-full transition-colors ${form[toggle.key] ? "bg-teal" : "bg-ink/20"}`}
                >
                  <span
                    className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                      form[toggle.key] ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
            ))}
            <p className="text-[0.66rem] leading-relaxed text-ink/40">
              Online payment stays off until a real gateway is connected — no fake payment screens.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-ink/10">
          <iframe title="Cafe location" src={form.mapEmbedUrl} className="h-56 w-full" loading="lazy" />
        </div>
      </Section>

      <Section title="Homepage & announcement" description="Headline copy customers see first.">
        <div className="grid gap-3">
          <TextField label="Hero headline" value={form.heroHeadline} onChange={(v) => update("heroHeadline", v)} />
          <label className="block">
            <span className="field-label">Hero subline</span>
            <textarea className="field min-h-[70px] !text-[0.86rem]" value={form.heroSubline} onChange={(e) => update("heroSubline", e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Announcement ticker</span>
            <input className="field !py-2 !text-[0.86rem]" value={form.announcement} onChange={(e) => update("announcement", e.target.value)} />
          </label>
        </div>
      </Section>

      <Section title="Opening hours">
        <div className="space-y-2">
          {form.hours.map((hour, index) => (
            <div key={hour.day} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink/10 bg-cream px-3 py-2">
              <span className="w-24 text-[0.8rem] font-bold">{hour.day}</span>
              <input
                type="time"
                value={hour.open}
                onChange={(e) => {
                  const next = [...form.hours];
                  next[index] = { ...hour, open: e.target.value };
                  update("hours", next);
                }}
                className="field !w-32 !py-1 !text-[0.8rem]"
                aria-label={`${hour.day} opening time`}
              />
              <span className="text-ink/40">to</span>
              <input
                type="time"
                value={hour.close}
                onChange={(e) => {
                  const next = [...form.hours];
                  next[index] = { ...hour, close: e.target.value };
                  update("hours", next);
                }}
                className="field !w-32 !py-1 !text-[0.8rem]"
                aria-label={`${hour.day} closing time`}
              />
              <label className="ml-auto flex items-center gap-1.5 text-[0.75rem] font-semibold text-ink/55">
                <input
                  type="checkbox"
                  checked={Boolean(hour.closed)}
                  onChange={(e) => {
                    const next = [...form.hours];
                    next[index] = { ...hour, closed: e.target.checked };
                    update("hours", next);
                  }}
                />
                Closed
              </label>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Owner password" description="Change the dashboard password. Minimum 8 characters.">
        <form onSubmit={changePassword} className="grid gap-3 sm:grid-cols-3">
          <TextField label="Current password" type="password" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} />
          <TextField label="New password" type="password" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} />
          <TextField label="Confirm new password" type="password" value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} />
          <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pwBusy} className="btn btn-sm btn-cream">
              {pwBusy ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />} Update password
            </button>
            {pwMessage && <span className="text-[0.78rem] font-semibold text-ink/60">{pwMessage}</span>}
          </div>
        </form>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3">
        <p className="flex items-center gap-2 text-[0.78rem] text-ink/50">
          <Truck size={15} /> Free delivery radius currently {form.freeRadiusKm} km · max {form.maxRadiusKm} km
        </p>
        <button type="button" onClick={() => void save()} disabled={saving} className="btn btn-sm btn-accent">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save changes
        </button>
      </div>
    </div>
  );
}
