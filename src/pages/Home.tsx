import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  Flame,
  Instagram,
  MapPin,
  Phone,
  Quote,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import Hero from "../components/Hero";
import ProductCard from "../components/ProductCard";
import Marquee from "../components/Marquee";
import { Reveal } from "../components/Reveal";
import { useAppData } from "../lib/app-data";
import { api } from "../lib/api";
import { inr, whatsappLink } from "../lib/format";

function SectionHead({
  eyebrow,
  title,
  script,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  script?: string;
  copy?: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow text-chili">{eyebrow}</p>
        <h2 className="display mt-3 text-[clamp(2rem,4.6vw,3.4rem)]">
          {title} {script && <span className="script text-chili">{script}</span>}
        </h2>
        {copy && <p className="mt-3 max-w-[52ch] text-[0.95rem] leading-relaxed text-ink/60">{copy}</p>}
      </div>
      {action && (
        <Link to={action.to} className="btn btn-ghost btn-sm shrink-0 self-start sm:self-auto">
          {action.label} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

function CategoryStrip() {
  const { data } = useAppData();
  if (!data) return null;
  return (
    <section className="relative border-y border-ink/10 bg-ink py-4">
      <Marquee>
        <div className="flex items-center gap-8 px-4 text-cream">
          {data.categories.map((c) => (
            <Link
              key={c.id}
              to={`/menu?category=${c.slug}`}
              className="group flex shrink-0 items-center gap-2.5 text-[0.82rem] font-bold uppercase tracking-wider text-cream/80 transition-colors hover:text-amber"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: c.tint }} />
              {c.name}
              <span className="text-[0.65rem] text-cream/35">{c.count}</span>
            </Link>
          ))}
        </div>
      </Marquee>
    </section>
  );
}

function SignatureSection() {
  const { data } = useAppData();
  if (!data) return null;
  return (
    <section className="wrap py-20" id="signature">
      <SectionHead
        eyebrow="Straight off the grill"
        title="The ones everybody"
        script="orders twice"
        copy="Six plates that made the name. Each one built to order — nothing sits under a lamp."
        action={{ label: `See all ${data.stats.items} items`, to: "/menu" }}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.signature.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}

function StorySection() {
  const { data } = useAppData();
  const radius = data?.settings.freeRadiusKm ?? 3.5;
  // The two most recently uploaded gallery photos become the story strip.
  const gallery = data?.gallery ?? [];
  const storyA = gallery[gallery.length - 2] ?? gallery[0];
  const storyB = gallery[gallery.length - 1] ?? gallery[1];
  return (
    <section id="story" className="relative overflow-hidden bg-ink py-20 text-cream">
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-chili/20 blur-3xl" />
      <div className="wrap relative grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <div className="arch overflow-hidden border border-cream/15">
              <img
                src={storyA?.image ?? "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=75"}
                alt="Inside Café 90's"
                loading="lazy"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
            <div className="mt-10 space-y-4">
              <div className="overflow-hidden rounded-3xl border border-cream/15">
                <img
                  src={storyB?.image ?? "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=800&q=75"}
                  alt="Shawarma being prepared"
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </div>
              <div className="rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3">
                <p className="script text-2xl text-amber">Open daily</p>
                <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-cream/50">
                  9 AM – 1 AM · Chathannoor, Kollam
                </p>
              </div>
            </div>
          </div>
          <span className="sticker absolute -bottom-4 left-6 !border-cream/30 !bg-cream !text-ink">
            <Star size={13} className="fill-chili text-chili" /> Vibe with taste
          </span>
        </div>

        <div>
          <p className="eyebrow text-amber">Our story</p>
          <h2 className="display mt-3 text-[clamp(2.1rem,4.6vw,3.6rem)] text-cream">
            A cafe that never really
            <br /> left the nineties.
          </h2>
          <div className="mt-5 space-y-4 text-[0.95rem] leading-relaxed text-cream/65">
            <p>
              Café 90&apos;s started with a simple idea — good food, cold drinks and a playlist that makes
              people stay a little longer. The walls got the posters, the kitchen got the recipes.
            </p>
            <p>
              Today the menu runs from shawarma rolls and loaded fries to falooda built in five layers and
              twenty-four kinds of mojito. Everything is made fresh when you order, and it travels well —
              we deliver free within {radius} km.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              { icon: Flame, title: "Made to order", copy: "Nothing pre-packed, nothing reheated." },
              { icon: Truck, title: "Free delivery", copy: `Within ${radius} km of the cafe.` },
              { icon: Sparkles, title: "174 items", copy: "One kitchen, the whole 90's menu." },
              { icon: Clock, title: "Open late", copy: "Daily, 9 AM – 1 AM." },
            ].map((f) => (
              <div key={f.title} className="flex gap-3 rounded-2xl border border-cream/12 bg-cream/[0.04] p-4">
                <f.icon size={18} className="mt-0.5 shrink-0 text-amber" />
                <div>
                  <p className="text-[0.86rem] font-bold text-cream">{f.title}</p>
                  <p className="text-[0.78rem] text-cream/55">{f.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MenuPreview() {
  const { data } = useAppData();
  if (!data) return null;
  const preview = data.categories.slice(0, 8);
  return (
    <section className="wrap py-20" id="menu-preview">
      <SectionHead
        eyebrow="The full menu"
        title="Twenty-one categories."
        script="Zero shortcuts."
        copy="Tea at ₹10, falooda at ₹220 and everything in between. Browse by category or open the full menu."
        action={{ label: "Open full menu", to: "/menu" }}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {preview.map((category, i) => (
          <Reveal key={category.id} delay={i * 0.04}>
            <Link
              to={`/menu?category=${category.slug}`}
              className="group relative block overflow-hidden rounded-3xl border border-ink/10"
            >
              <img
                src={category.image}
                alt={category.name}
                loading="lazy"
                className="aspect-[5/4] w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-[0.64rem] font-bold uppercase tracking-widest" style={{ color: category.tint }}>
                  {category.count} items · from {inr(category.from)}
                </p>
                <div className="flex items-end justify-between gap-2">
                  <h3 className="display text-xl text-cream">{category.name}</h3>
                  <ArrowUpRight
                    size={18}
                    className="translate-y-1 text-cream/60 transition-transform group-hover:-translate-y-0 group-hover:text-amber"
                  />
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function OffersSection() {
  const { data } = useAppData();
  const [copied, setCopied] = useState<string | null>(null);
  if (!data || data.offers.length === 0) return null;

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(code);
    }
  };

  return (
    <section id="offers" className="relative overflow-hidden bg-paper py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-ink/10" />
      <div className="wrap">
        <SectionHead
          eyebrow="Offers & promotions"
          title="Use the code,"
          script="skip the maths."
          copy="Running offers are applied at checkout. Minimum order values apply."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {data.offers.map((offer, i) => (
            <Reveal key={offer.id} delay={i * 0.08}>
              <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-ink/12 bg-cream sm:flex-row">
                <div className="relative h-40 w-full overflow-hidden sm:h-auto sm:w-2/5">
                  <img src={offer.image} alt={offer.title} loading="lazy" className="h-full w-full object-cover" />
                  {offer.badge && (
                    <span className="badge absolute left-3 top-3 bg-ink text-cream">{offer.badge}</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="display text-2xl leading-tight">{offer.title}</h3>
                  <p className="mt-2 flex-1 text-[0.85rem] leading-relaxed text-ink/60">{offer.description}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copy(offer.code)}
                      className="flex items-center gap-2 rounded-xl border-2 border-dashed border-ink/25 bg-paper px-3 py-2 text-sm font-extrabold tracking-wider transition-colors hover:border-chili hover:text-chili"
                    >
                      {offer.code}
                      {copied === offer.code ? <Check size={14} className="text-teal" /> : <Copy size={13} />}
                    </button>
                    <span className="text-[0.7rem] font-semibold text-ink/45">
                      Min. {
                        inr(
                          Number(
                            (offer as unknown as { minOrder?: number; min_order?: number }).minOrder ??
                              (offer as unknown as { min_order?: number }).min_order ??
                              0,
                          ),
                        )
                      }
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function DeliverySection() {
  const { data } = useAppData();
  const radius = data?.settings.freeRadiusKm ?? 3.5;
  return (
    <section className="wrap py-20">
      <div className="grid items-center gap-10 overflow-hidden rounded-[2rem] border border-ink/10 bg-gradient-to-br from-amber/25 via-cream to-pink/10 p-8 md:grid-cols-2 md:p-12">
        <div>
          <p className="eyebrow text-chili">Delivery</p>
          <h2 className="display mt-3 text-[clamp(1.9rem,4vw,3rem)]">
            Free delivery
            <br /> within {radius} km.
          </h2>
          <p className="mt-4 max-w-[44ch] text-[0.92rem] leading-relaxed text-ink/65">
            We check your distance from the cafe before you pay — no guessing, no surprise charges. Share
            your location at checkout and we&apos;ll confirm instantly.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/menu" className="btn btn-accent">
              Start an order <ArrowRight size={15} />
            </Link>
            <a
              href={whatsappLink(data?.settings.whatsapp ?? "918921475744", "Hi! Do you deliver to my area?")}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
        <div className="relative mx-auto grid aspect-square w-full max-w-[320px] place-items-center">
          <div className="absolute inset-0 rounded-full border border-ink/10" />
          <div className="absolute inset-[14%] rounded-full border-2 border-dashed border-chili/40" />
          <div className="absolute inset-[28%] rounded-full border border-ink/10 bg-paper/60 backdrop-blur" />
          <div className="relative text-center">
            <MapPin size={22} className="mx-auto text-chili" />
            <p className="display mt-1 text-3xl">{radius} km</p>
            <p className="text-[0.66rem] font-bold uppercase tracking-widest text-ink/45">free radius</p>
          </div>
          <span className="absolute left-[8%] top-[22%] h-3 w-3 rounded-full bg-teal" />
          <span className="absolute bottom-[16%] right-[18%] h-2.5 w-2.5 rounded-full bg-chili" />
          <span className="absolute right-[10%] top-[38%] h-2 w-2 rounded-full bg-amber" />
        </div>
      </div>
    </section>
  );
}

function GallerySection() {
  const { data } = useAppData();
  if (!data) return null;
  return (
    <section id="gallery" className="wrap py-20">
      <SectionHead
        eyebrow="Inside the cafe"
        title="Good light,"
        script="better plates."
        copy="A look at the counter, the plates and the people who make them. Replace these with your own photos any time from the dashboard."
        action={{ label: "Follow on Instagram", to: data.settings.instagram || "/" }}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {data.gallery.slice(0, 8).map((item, i) => (
          <Reveal key={item.id} delay={i * 0.03} className={i % 5 === 0 ? "col-span-2 md:row-span-2" : ""}>
            <figure className="group relative h-full overflow-hidden rounded-2xl border border-ink/10">
              <img
                src={item.image}
                alt={item.caption || "Café 90's"}
                loading="lazy"
                className={`w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${
                  i % 5 === 0 ? "aspect-square md:aspect-[4/5]" : "aspect-square"
                }`}
              />
              <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink/80 to-transparent px-3 pb-2.5 pt-6 text-[0.7rem] font-semibold text-cream opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                {item.caption}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ReviewsSection() {
  const { data, reload } = useAppData();
  const [form, setForm] = useState({ name: "", rating: 5, text: "" });
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    try {
      const res = await api.submitReview(form);
      setMessage(res.message);
      setState("done");
      setForm({ name: "", rating: 5, text: "" });
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not post the review");
      setState("error");
    }
  };

  const reviews = data?.reviews ?? [];

  return (
    <section id="reviews" className="relative overflow-hidden bg-paper py-20">
      <div className="wrap grid gap-12 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <p className="eyebrow text-chili">Word on the street</p>
          <h2 className="display mt-3 text-[clamp(2rem,4.4vw,3.2rem)]">
            What people say
            <br />
            <span className="script text-chili">after the last sip</span>
          </h2>

          {reviews.length > 0 ? (
            <div className="mt-8 space-y-4">
              {reviews.slice(0, 4).map((review) => (
                <Reveal key={review.id}>
                  <blockquote className="rounded-2xl border border-ink/10 bg-cream p-5">
                    <Quote size={18} className="text-chili/40" />
                    <p className="mt-2 text-[0.92rem] leading-relaxed text-ink/75">{review.text}</p>
                    <footer className="mt-3 flex items-center gap-2 text-[0.78rem] font-semibold">
                      <span>{review.name}</span>
                      <span className="flex text-amber">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} size={12} className="fill-amber" />
                        ))}
                      </span>
                    </footer>
                  </blockquote>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-cream p-6">
              <Quote size={20} className="text-chili/50" />
              <p className="mt-2 text-[0.92rem] font-semibold text-ink/75">
                No published reviews yet — be the first to tell Chathannoor how it went.
              </p>
              <p className="mt-1 text-[0.82rem] text-ink/50">
                Reviews are approved by the cafe before they appear here.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-ink/10 bg-cream p-6">
          <h3 className="display text-2xl">Leave a review</h3>
          <p className="mt-1 text-[0.82rem] text-ink/55">Tell us about the food, the delivery, the vibe.</p>

          {state === "done" ? (
            <div className="mt-6 rounded-xl border border-teal/30 bg-teal/10 p-4 text-[0.85rem] font-semibold text-teal-900">
              <Check size={16} className="mb-1" /> {message}
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <div>
                <label className="field-label" htmlFor="rv-name">
                  Your name
                </label>
                <input
                  id="rv-name"
                  className="field"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Anjali"
                />
              </div>
              <div>
                <span className="field-label">Rating</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm({ ...form, rating: n })}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      className="p-0.5"
                    >
                      <Star
                        size={22}
                        className={n <= form.rating ? "fill-amber text-amber" : "text-ink/20"}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="rv-text">
                  Your review
                </label>
                <textarea
                  id="rv-text"
                  className="field min-h-[92px] resize-y"
                  required
                  minLength={10}
                  maxLength={600}
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  placeholder="The falooda was unreal…"
                />
              </div>
              {state === "error" && <p className="text-[0.8rem] font-semibold text-chili">{message}</p>}
              <button type="submit" className="btn btn-accent w-full" disabled={state === "sending"}>
                {state === "sending" ? "Posting…" : "Post review"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function EventsSection() {
  const { data } = useAppData();
  if (!data || data.events.length === 0) return null;
  return (
    <section id="events" className="wrap py-20">
      <SectionHead
        eyebrow="What's on"
        title="Events &"
        script="regulars"
        copy="Weekly things worth planning around."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {data.events.map((event, i) => (
          <Reveal key={event.id} delay={i * 0.06}>
            <article className="group relative overflow-hidden rounded-3xl border border-ink/10">
              <img
                src={event.image}
                alt={event.title}
                loading="lazy"
                className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-cream">
                <span className="badge bg-amber text-ink">{event.date}</span>
                <h3 className="display mt-3 text-2xl">{event.title}</h3>
                <p className="mt-1 max-w-[42ch] text-[0.84rem] text-cream/70">{event.description}</p>
                <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] font-semibold text-cream/55">
                  <Clock size={13} /> {event.time}
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function VisitSection() {
  const { data } = useAppData();
  const s = data?.settings;
  return (
    <section id="visit" className="wrap pb-8 pt-10">
      <div className="grid gap-8 rounded-[2rem] border border-ink/10 bg-paper p-6 md:grid-cols-2 md:p-8">
        <div>
          <p className="eyebrow text-chili">Visit us</p>
          <h2 className="display mt-3 text-[clamp(1.9rem,3.8vw,2.9rem)]">
            Chathannoor,
            <br />
            <span className="script text-chili">right off the main road</span>
          </h2>
          <div className="mt-5 space-y-3 text-[0.9rem] text-ink/70">
            <p className="flex items-start gap-2.5">
              <MapPin size={17} className="mt-0.5 shrink-0 text-chili" />
              {s?.address ?? "Café 90's, Ooramvila, Chathannoor, Kollam, Kerala 691572"}
            </p>
            <p className="flex items-center gap-2.5">
              <Phone size={17} className="shrink-0 text-chili" />
              <a href={`tel:${(s?.phone ?? "").replace(/\s/g, "")}`} className="hover:text-chili">
                {s?.phone ?? "+91 89214 75744"}
              </a>
            </p>
            <p className="flex items-center gap-2.5">
              <Instagram size={17} className="shrink-0 text-chili" />
              <a href={s?.instagram} target="_blank" rel="noreferrer" className="hover:text-chili">
                @cafe_90s_ctnr
              </a>
            </p>
            <p className="flex items-center gap-2.5">
              <Star size={16} className="shrink-0 fill-amber text-amber" />
              <a href={s?.mapUrl ?? "#"} target="_blank" rel="noreferrer" className="hover:text-chili">
                <strong>4.7</strong> on Google · see reviews
              </a>
            </p>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {(s?.hours ?? []).map((h) => (
              <div key={h.day} className="flex items-center justify-between rounded-xl border border-ink/8 bg-cream px-3 py-2 text-[0.78rem]">
                <span className="font-semibold">{h.day}</span>
                <span className="text-ink/50">{h.closed ? "Closed" : `${h.open} – ${h.close}`}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href={s?.mapUrl ?? "#"} target="_blank" rel="noreferrer" className="btn btn-sm">
              Get directions <ArrowUpRight size={14} />
            </a>
            <a
              href={whatsappLink(s?.whatsapp ?? "918921475744", "Hi Café 90's!")}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink/10">
          <iframe
            title="Café 90's location on Google Maps"
            src={s?.mapEmbedUrl ?? "https://www.google.com/maps?q=8.8593821,76.7227549&z=16&output=embed"}
            className="h-full min-h-[330px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { data, loading } = useAppData();
  const bestsellers = data?.bestsellers ?? [];

  return (
    <>
      <Hero />
      <CategoryStrip />

      {bestsellers.length > 0 && (
        <section className="border-b border-ink/10 bg-paper/60 py-4">
          <Marquee reverse>
            <div className="flex items-center gap-6 px-4">
              {bestsellers.map((b) => (
                <Link
                  key={b.id}
                  to="/menu"
                  className="flex shrink-0 items-center gap-2 rounded-full border border-ink/10 bg-cream px-3.5 py-1.5 text-[0.78rem] font-semibold transition-colors hover:border-chili hover:text-chili"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-chili" />
                  {b.name}
                  <span className="text-ink/40">{inr(Math.min(...b.variants.map((v) => v.price)))}</span>
                </Link>
              ))}
            </div>
          </Marquee>
        </section>
      )}

      {loading && !data ? (
        <div className="wrap grid gap-5 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-[4/3] w-full" />
              <div className="space-y-2 p-4">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <SignatureSection />
          <StorySection />
          <MenuPreview />
          <DeliverySection />
          <OffersSection />
          <GallerySection />
          <ReviewsSection />
          <EventsSection />
          <VisitSection />
        </>
      )}

      <AnimatePresence>
        {!loading && (
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="wrap py-14"
          >
            <div className="relative overflow-hidden rounded-[2rem] bg-chili px-6 py-12 text-center text-cream sm:px-12">
              <div className="pointer-events-none absolute inset-0 checker opacity-20" />
              <p className="script relative text-2xl text-amber">hungry yet?</p>
              <h2 className="display relative mx-auto mt-2 max-w-2xl text-[clamp(2rem,4.6vw,3.4rem)]">
                Order in under two minutes. Free delivery within {data?.settings.freeRadiusKm ?? 3.5} km.
              </h2>
              <div className="relative mt-7 flex flex-wrap justify-center gap-3">
                <Link to="/menu" className="btn btn-cream">
                  Browse the menu <ArrowRight size={15} />
                </Link>
                <Link to="/track" className="btn border-cream/40 bg-transparent text-cream hover:bg-cream/10">
                  Track an order
                </Link>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
