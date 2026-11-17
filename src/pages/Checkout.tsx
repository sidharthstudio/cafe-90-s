import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
import { useCart } from "../lib/cart";
import { useAppData } from "../lib/app-data";
import { api } from "../lib/api";
import { inr, whatsappLink } from "../lib/format";
import type { DeliveryCheck } from "../../shared/types";

type Form = {
  customerName: string;
  phone: string;
  house: string;
  area: string;
  landmark: string;
  address: string;
  instructions: string;
  notes: string;
  paymentMethod: "cod" | "online";
};

const EMPTY: Form = {
  customerName: "",
  phone: "",
  house: "",
  area: "",
  landmark: "",
  address: "",
  instructions: "",
  notes: "",
  paymentMethod: "cod",
};

const DRAFT_KEY = "c90_checkout_draft";

function loadDraft(): Form {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}

export default function CheckoutPage() {
  const { lines, subtotal, setQty, remove, clear } = useCart();
  const { data } = useAppData();
  const navigate = useNavigate();
  const settings = data?.settings;

  const [form, setForm] = useState<Form>(loadDraft);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zone, setZone] = useState<DeliveryCheck | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const update = (key: keyof Form, value: string) => {
    const next = { ...form, [key]: value };
    setForm(next);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const offers = data?.offers ?? [];

  const discount = useMemo(() => {
    if (!applied) return 0;
    return Math.min(applied.discount, subtotal);
  }, [applied, subtotal]);

  const deliveryFee = zone?.inZone ? 0 : (zone?.fee ?? 0);
  const total = Math.max(0, subtotal - discount + deliveryFee);

  const locate = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("This browser cannot share your location. Please call us to order.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCoords(next);
        try {
          const check = await api.checkDelivery(next.lat, next.lng);
          setZone(check);
        } catch (err) {
          setLocationError(err instanceof Error ? err.message : "Could not check the delivery zone");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked. Allow location access for this site, or call us to order."
            : "We could not read your location. Move somewhere with better signal and try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  };

  const applyCoupon = () => {
    setCouponError(null);
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    const offer = offers.find((o: any) => String(o.code).toUpperCase() === code && (o.active ?? 1));
    if (!offer) {
      setApplied(null);
      setCouponError("That code is not valid right now.");
      return;
    }
    const min = Number((offer as any).minOrder ?? (offer as any).min_order ?? 0);
    if (subtotal < min) {
      setApplied(null);
      setCouponError(`This code needs a minimum order of ${inr(min)}.`);
      return;
    }
    const type = (offer as any).discountType ?? (offer as any).discount_type;
    const value = Number((offer as any).discountValue ?? (offer as any).discount_value ?? 0);
    const amount = type === "percent" ? Math.round((subtotal * value) / 100) : Math.min(value, subtotal);
    setApplied({ code, discount: amount });
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (lines.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (!coords || !zone) {
      setError("Please share your delivery location so we can confirm the delivery zone.");
      return;
    }
    if (!zone.allowed) {
      setError(zone.message);
      return;
    }
    setPlacing(true);
    try {
      const res = await api.placeOrder({
        ...form,
        lat: coords.lat,
        lng: coords.lng,
        couponCode: applied?.code ?? "",
        items: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          qty: l.qty,
          notes: l.notes,
        })),
      });
      clear();
      navigate(`/order/${res.order.code}?placed=1`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place the order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="wrap flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-amber/25">
          <Truck size={26} />
        </span>
        <h1 className="display mt-4 text-3xl">Your cart is empty</h1>
        <p className="mt-2 max-w-[40ch] text-sm text-ink/55">
          Add a shawarma, a falooda or a mojito — then come back and we&apos;ll get it to your door.
        </p>
        <Link to="/menu" className="btn btn-accent mt-6">
          Browse the menu <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-8">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-chili">Checkout</p>
            <h1 className="display mt-2 text-[clamp(2.2rem,5vw,3.6rem)]">
              Almost there.
              <br />
              <span className="script text-chili">two minutes, tops</span>
            </h1>
          </div>
          <Link to="/menu" className="text-[0.8rem] font-semibold text-ink/50 hover:text-chili">
            ← Back to menu
          </Link>
        </div>

        <form onSubmit={placeOrder} className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <section className="card p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[0.7rem] font-extrabold text-cream">
                  1
                </span>
                <h2 className="display text-xl">Delivery details</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="name">
                    Full name *
                  </label>
                  <input
                    id="name"
                    className="field"
                    required
                    minLength={2}
                    autoComplete="name"
                    value={form.customerName}
                    onChange={(e) => update("customerName", e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="phone">
                    Mobile number *
                  </label>
                  <input
                    id="phone"
                    className="field"
                    required
                    inputMode="numeric"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="10-digit mobile"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="house">
                    House / building *
                  </label>
                  <input
                    id="house"
                    className="field"
                    required
                    value={form.house}
                    onChange={(e) => update("house", e.target.value)}
                    placeholder="House name or number"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="area">
                    Area / locality *
                  </label>
                  <input
                    id="area"
                    className="field"
                    required
                    value={form.area}
                    onChange={(e) => update("area", e.target.value)}
                    placeholder="e.g. Chathannoor"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="landmark">
                    Nearby landmark
                  </label>
                  <input
                    id="landmark"
                    className="field"
                    value={form.landmark}
                    onChange={(e) => update("landmark", e.target.value)}
                    placeholder="Helps the rider find you"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="instructions">
                    Delivery instructions
                  </label>
                  <input
                    id="instructions"
                    className="field"
                    value={form.instructions}
                    onChange={(e) => update("instructions", e.target.value)}
                    placeholder="Gate code, call on arrival…"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="address">
                    Complete delivery address *
                  </label>
                  <textarea
                    id="address"
                    className="field min-h-[76px] resize-y"
                    required
                    minLength={6}
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="House, street, area, landmark, town"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="notes">
                    Order notes (optional)
                  </label>
                  <input
                    id="notes"
                    className="field"
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Less spicy, extra chutney, no onion…"
                  />
                </div>
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[0.7rem] font-extrabold text-cream">
                  2
                </span>
                <h2 className="display text-xl">Delivery location</h2>
              </div>
              <p className="mt-2 text-[0.82rem] text-ink/55">
                We deliver free within {settings?.freeRadiusKm ?? 3.5} km of the cafe. Share your location and
                we&apos;ll confirm instantly.
              </p>

              <button
                type="button"
                onClick={locate}
                disabled={locating}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-bold transition-colors ${
                  zone
                    ? "border-teal/40 bg-teal/10 text-teal-900"
                    : "border-ink/20 bg-cream text-ink hover:border-chili hover:text-chili"
                }`}
              >
                {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
                {locating ? "Finding you…" : zone ? "Update my location" : "Use my current location"}
              </button>

              {locationError && (
                <div className="mt-3 rounded-xl border border-chili/25 bg-chili/5 p-3 text-[0.8rem] text-chili">
                  <p className="flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" /> {locationError}
                  </p>
                  <a
                    href={whatsappLink(settings?.whatsapp ?? "918921475744", "Hi, I can't share location on the website. Can I order?")}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block font-bold underline"
                  >
                    Order on WhatsApp instead
                  </a>
                </div>
              )}

              {zone && (
                <div
                  className={`mt-3 rounded-xl border p-4 ${
                    zone.allowed ? "border-teal/30 bg-teal/10" : "border-amber/40 bg-amber/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                        {zone.allowed ? <CheckCircle2 size={16} className="text-teal" /> : <AlertCircle size={16} className="text-amber" />}
                        {zone.inZone ? "FREE DELIVERY" : zone.allowed ? `Delivery charge ${inr(zone.fee)}` : "Outside delivery zone"}
                      </p>
                      <p className="mt-1 text-[0.8rem] text-ink/65">{zone.message}</p>
                    </div>
                    <div className="text-right">
                      <p className="display text-2xl">{zone.distanceKm} km</p>
                      <p className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/40">from cafe</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[0.7rem] font-semibold text-ink/50">
                    <MapPin size={12} /> {coords?.lat.toFixed(5)}, {coords?.lng.toFixed(5)}
                  </div>
                </div>
              )}
            </section>

            <section className="card p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[0.7rem] font-extrabold text-cream">
                  3
                </span>
                <h2 className="display text-xl">Payment</h2>
              </div>
              <div className="mt-4 space-y-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/15 bg-paper p-3.5">
                  <input
                    type="radio"
                    name="payment"
                    checked={form.paymentMethod === "cod"}
                    onChange={() => update("paymentMethod", "cod")}
                    className="mt-1"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <Wallet size={15} /> Cash on delivery
                    </span>
                    <span className="block text-[0.78rem] text-ink/55">Pay the rider when your order arrives.</span>
                  </span>
                </label>
                <label
                  className={`flex items-start gap-3 rounded-xl border border-ink/10 bg-ink/[0.03] p-3.5 ${
                    settings?.onlinePaymentEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    disabled={!settings?.onlinePaymentEnabled}
                    checked={form.paymentMethod === "online"}
                    onChange={() => update("paymentMethod", "online")}
                    className="mt-1"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <ShieldCheck size={15} /> Online payment
                    </span>
                    <span className="block text-[0.78rem] text-ink/55">
                      {settings?.onlinePaymentEnabled
                        ? "Pay securely when the payment gateway is connected."
                        : "Not enabled yet — the cafe hasn't connected a payment gateway. Use cash on delivery."}
                    </span>
                  </span>
                </label>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="card overflow-hidden">
              <div className="border-b border-ink/10 px-5 py-4">
                <h2 className="display text-xl">Your order</h2>
                <p className="text-[0.75rem] text-ink/45">
                  {lines.length} line{lines.length === 1 ? "" : "s"} · fresh to order
                </p>
              </div>

              <div className="max-h-[320px] space-y-3 overflow-y-auto px-5 py-4">
                {lines.map((line) => (
                  <div key={line.key} className="flex gap-3">
                    <img src={line.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.85rem] font-bold">{line.name}</p>
                      <p className="text-[0.7rem] uppercase tracking-wide text-ink/40">
                        {line.variantLabel} · {inr(line.price)}
                      </p>
                      {line.notes && <p className="text-[0.7rem] italic text-ink/45">“{line.notes}”</p>}
                      <div className="mt-1 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty - 1)}
                          className="grid h-5 w-5 place-items-center rounded-full border border-ink/15 text-[0.7rem]"
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className="text-[0.72rem] font-bold tabular-nums">{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty + 1)}
                          className="grid h-5 w-5 place-items-center rounded-full border border-ink/15 text-[0.7rem]"
                          aria-label="Increase"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(line.key)}
                          className="ml-1 text-[0.68rem] font-semibold text-ink/35 hover:text-chili"
                        >
                          Remove
                        </button>
                        <span className="ml-auto text-[0.82rem] font-extrabold">{inr(line.price * line.qty)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-ink/10 px-5 py-4">
                {offers.length > 0 && (
                  <>
                    <label className="field-label" htmlFor="coupon">
                      Offer code
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="coupon"
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        className="field !py-2 !text-[0.85rem] uppercase"
                      />
                      <button type="button" onClick={applyCoupon} className="btn btn-sm shrink-0">
                        Apply
                      </button>
                    </div>
                    {couponError && (
                      <p className="mt-1.5 text-[0.75rem] font-semibold text-chili">{couponError}</p>
                    )}
                    {applied && (
                  <p className="mt-1.5 flex items-center justify-between text-[0.75rem] font-semibold text-teal-900">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={13} /> {applied.code} applied
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setApplied(null);
                        setCoupon("");
                      }}
                      className="text-ink/40 hover:text-chili"
                    >
                      remove
                    </button>
                      </p>
                    )}
                  </>
                )}

                <dl className="mt-4 space-y-2 text-[0.85rem]">
                  <div className="flex justify-between">
                    <dt className="text-ink/55">Subtotal</dt>
                    <dd className="font-semibold tabular-nums">{inr(subtotal)}</dd>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-teal-900">
                      <dt>Offer discount</dt>
                      <dd className="font-semibold tabular-nums">−{inr(discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-ink/55">Delivery</dt>
                    <dd className="font-semibold tabular-nums">
                      {!zone ? "Set location" : zone.inZone ? <span className="text-teal-900">FREE</span> : inr(deliveryFee)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-ink/10 pt-2 text-base">
                    <dt className="font-bold">Total</dt>
                    <dd className="display text-xl tabular-nums">{inr(total)}</dd>
                  </div>
                </dl>

                {error && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-chili/25 bg-chili/5 p-3 text-[0.78rem] font-semibold text-chili">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={placing} className="btn btn-accent mt-4 w-full">
                  {placing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Placing order…
                    </>
                  ) : (
                    <>
                      Place order · {inr(total)} <ArrowRight size={15} />
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[0.68rem] leading-relaxed text-ink/40">
                  Cash on delivery. We&apos;ll call if we need anything before dispatch.
                </p>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
