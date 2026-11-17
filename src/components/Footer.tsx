import { Link } from "react-router-dom";
import { Instagram, MapPin, Phone, Clock, ArrowUpRight, MessageCircle } from "lucide-react";
import Logo from "./Logo";
import { useAppData } from "../lib/app-data";
import { whatsappLink } from "../lib/format";

export default function Footer() {
  const { data } = useAppData();
  const s = data?.settings;
  const hours = s?.hours ?? [];

  return (
    <footer className="relative mt-24 overflow-hidden bg-ink text-cream">
      <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-chili/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-teal/20 blur-3xl" />

      <div className="wrap relative py-16 md:py-20">
        <div className="flex flex-col gap-10 border-b border-cream/15 pb-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="script text-2xl text-amber">one last thing</p>
            <h2 className="display mt-2 max-w-xl text-[clamp(2.4rem,5vw,4.2rem)] text-cream">
              Still reading?
              <br />
              The grill is already hot.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/menu" className="btn btn-amber">
              Browse the menu
            </Link>
            <a
              href={whatsappLink(s?.whatsapp ?? "918921475744", "Hi Café 90's! I'd like to place an order.")}
              target="_blank"
              rel="noreferrer"
              className="btn border-cream/30 bg-transparent text-cream hover:bg-cream/10"
            >
              <MessageCircle size={16} /> WhatsApp us
            </a>
          </div>
        </div>

        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo light />
            <p className="mt-5 max-w-[26ch] text-sm leading-relaxed text-cream/60">
              A retro-cool cafe in Chathannoor, Kollam. Shawarma, shakes, falooda and twenty-four kinds of mojito.
            </p>
            <div className="mt-5 flex gap-2">
              <a
                href={s?.instagram ?? "https://www.instagram.com/cafe_90s_ctnr"}
                target="_blank"
                rel="noreferrer"
                className="grid h-9 w-9 place-items-center rounded-full border border-cream/20 transition-colors hover:border-amber hover:text-amber"
                aria-label="Instagram"
              >
                <Instagram size={15} />
              </a>
              <a
                href={`tel:${(s?.phone ?? "918921475744").replace(/\s/g, "")}`}
                className="grid h-9 w-9 place-items-center rounded-full border border-cream/20 transition-colors hover:border-amber hover:text-amber"
                aria-label="Call"
              >
                <Phone size={15} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="eyebrow mb-4 text-amber">Explore</h3>
            <ul className="space-y-2.5 text-sm text-cream/70">
              {[
                { label: "Full menu", to: "/menu" },
                { label: "Order online", to: "/checkout" },
                { label: "Track your order", to: "/track" },
                { label: "Our story", to: "/#story" },
                ...(data?.offers.length ? [{ label: "Offers & events", to: "/#offers" }] : []),
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="transition-colors hover:text-cream">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-4 text-amber">Find us</h3>
            <ul className="space-y-3 text-sm text-cream/70">
              <li className="flex gap-2.5">
                <MapPin size={16} className="mt-0.5 shrink-0 text-amber" />
                <a href={s?.mapUrl ?? "#"} target="_blank" rel="noreferrer" className="hover:text-cream">
                  {s?.address ?? "Ooramvila, Chathannoor, Kollam, Kerala 691572"}
                </a>
              </li>
              <li className="flex gap-2.5">
                <Phone size={16} className="mt-0.5 shrink-0 text-amber" />
                <a href={`tel:${(s?.phone ?? "").replace(/\s/g, "")}`} className="hover:text-cream">
                  {s?.phone ?? "+91 89214 75744"}
                </a>
              </li>
              <li className="flex gap-2.5">
                <ArrowUpRight size={16} className="mt-0.5 shrink-0 text-amber" />
                <a
                  href={s?.mapUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-cream"
                >
                  Open in Google Maps
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-4 text-amber">Opening hours</h3>
            <ul className="space-y-1.5 text-[0.82rem] text-cream/70">
              {hours.map((h) => (
                <li key={h.day} className="flex items-center justify-between gap-3">
                  <span>{h.day.slice(0, 3)}</span>
                  <span className="flex items-center gap-1.5 tabular-nums text-cream/55">
                    <Clock size={12} /> {h.closed ? "Closed" : `${h.open} – ${h.close}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-cream/15 pt-8 text-[0.75rem] text-cream/45 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Café 90&apos;s, Chathannoor. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span>Free delivery within {s?.freeRadiusKm ?? 3.5} km</span>
            <Link to="/admin" className="transition-colors hover:text-cream/80">
              Cafe dashboard
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
