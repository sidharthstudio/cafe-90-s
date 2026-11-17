import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, MapPin, Truck } from "lucide-react";
import { useAppData } from "../lib/app-data";
import { inr } from "../lib/format";

const Hero3D = lazy(() => import("./Hero3D"));

const IMG_SHAWARMA =
  "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=80";

export default function Hero() {
  const { data } = useAppData();
  const reduce = useReducedMotion();
  const [show3D, setShow3D] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0.15]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    setShow3D(mq.matches);
    const handler = () => setShow3D(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const settings = data?.settings;
  const items = data?.stats.items ?? 174;
  const categories = data?.stats.categories ?? 21;
  const radius = settings?.freeRadiusKm ?? 3.5;

  return (
    <section ref={ref} className="relative overflow-hidden pb-16 pt-10 sm:pt-14 lg:pb-24">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-amber/30 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-pink/15 blur-3xl" />
      <div className="pointer-events-none absolute left-[46%] top-8 hidden h-40 w-40 rotate-12 halftone opacity-60 lg:block" />

      <div className="wrap relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <motion.div style={reduce ? undefined : { y: textY, opacity: fade }}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1.5 text-[0.7rem] font-bold text-teal-900">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" /> Accepting orders
            </span>
          </div>

          <h1 className="display mt-6 text-[clamp(2.9rem,7.2vw,5.6rem)]">
            {settings?.heroHeadline ?? "Nineties flavour. Served fresh."}
          </h1>
          <p className="script mt-2 text-[clamp(1.6rem,3.4vw,2.5rem)] text-chili">chai, shawarma &amp; shake</p>

          <p className="mt-5 max-w-[46ch] text-[0.98rem] leading-relaxed text-ink/65 sm:text-[1.05rem]">
            {settings?.heroSubline ??
              "Shawarma off the spit, falooda in layers, 24 kinds of mojito — the cafe Chathannoor keeps coming back to, now delivered to your door."}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/menu" className="btn btn-accent">
              Order online <ArrowUpRight size={16} />
            </Link>
            <Link to="/menu" className="btn btn-ghost">
              Explore the menu
            </Link>
          </div>

          <div className="mt-9 grid max-w-md grid-cols-3 gap-3 border-t border-ink/10 pt-6">
            {[
              { value: items, label: "dishes & drinks" },
              { value: categories, label: "categories" },
              { value: `${radius} km`, label: "free delivery" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="display text-2xl">{stat.value}</p>
                <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink/45">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="relative" style={reduce ? undefined : { y: imageY }}>
          <div className="relative mx-auto max-w-[420px] lg:max-w-none">
            <div className="absolute inset-0 -z-10 scale-95 rounded-[999px_999px_2rem_2rem] bg-amber/40 blur-2xl" />

            {show3D && (
              <div className="pointer-events-none absolute -left-36 -top-20 z-0 hidden h-[470px] w-[470px] opacity-90 [mask-image:radial-gradient(circle_at_52%_46%,black_42%,transparent_72%)] sm:block">
                <Suspense fallback={null}>
                  <Hero3D />
                </Suspense>
              </div>
            )}

            <div className="relative z-10 h-[380px] overflow-hidden rounded-[999px_999px_2rem_2rem] border border-ink/10 bg-paper shadow-[0_40px_70px_-50px_#17100b] sm:h-[460px]">
              <img
                src={IMG_SHAWARMA}
                alt="Chicken shawarma wrap from Café 90's"
                className="h-full w-full object-cover"
                fetchPriority="high"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl border border-cream/20 bg-ink/55 px-4 py-3 backdrop-blur-md">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-widest text-amber">Most ordered</p>
                  <p className="display text-lg text-cream">Kuboos Shawarma Roll</p>
                </div>
                <p className="display text-xl text-cream">{inr(90)}</p>
              </div>
            </div>

            <div
              className="bob absolute -right-2 top-10 z-20 rounded-2xl border border-ink/10 bg-paper/95 px-3 py-2 shadow-lg backdrop-blur sm:-right-6"
              style={{ ["--r" as string]: "5deg" }}
            >
              <p className="flex items-center gap-1.5 text-[0.65rem] font-extrabold uppercase tracking-wider text-chili">
                <Truck size={12} /> Free delivery
              </p>
              <p className="text-[0.7rem] font-semibold text-ink/60">within {radius} km</p>
            </div>

            <div
              className="bob absolute -left-3 bottom-24 z-20 rounded-full border border-ink/10 bg-paper/95 px-3 py-2 text-[0.7rem] font-extrabold shadow-lg backdrop-blur sm:-left-8"
              style={{ ["--r" as string]: "-6deg", animationDelay: "1.2s" }}
            >
              24 mojitos 🍹
            </div>
          </div>

          <a
            href={settings?.mapUrl ?? "https://maps.app.goo.gl/WYaHtAS6byBRfxGG8"}
            target="_blank"
            rel="noreferrer"
            className="mt-6 flex items-center justify-center gap-2 text-[0.78rem] font-semibold text-ink/50 transition-colors hover:text-chili lg:justify-end"
          >
            <MapPin size={13} /> Chathannoor, Kollam · open in Maps
          </a>
        </motion.div>
      </div>
    </section>
  );
}
