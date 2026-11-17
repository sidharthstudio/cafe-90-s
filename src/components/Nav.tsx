import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Menu, ShoppingBag, X, Phone, MapPin, Instagram } from "lucide-react";
import Logo from "./Logo";
import { useCart } from "../lib/cart";
import { useAppData } from "../lib/app-data";
import Marquee from "./Marquee";

const NAV_LINKS: { label: string; to: string; needsOffers?: boolean }[] = [
  { label: "Menu", to: "/menu" },
  { label: "Our story", to: "/#story" },
  { label: "Offers", to: "/#offers", needsOffers: true },
  { label: "Gallery", to: "/#gallery" },
  { label: "Visit", to: "/#visit" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count, open } = useCart();
  const { data } = useAppData();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, hash]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const announcement =
    data?.settings.announcement ?? "Free delivery within 3.5 km of the cafe. Fresh off the grill, every order.";

  // The offers section only renders when there are live offers, so hide its links too.
  const links = NAV_LINKS.filter((link) => !link.needsOffers || (data?.offers.length ?? 0) > 0);

  return (
    <>
      <div className="relative z-40 overflow-hidden bg-ink text-cream">
        <Marquee className="py-2">
          <span className="eyebrow flex items-center gap-6 px-6 text-[0.62rem] text-cream/90">
            <span className="text-amber">★</span> {announcement}
            <span className="text-amber/60">/</span>
            <span>Open 9 AM – 1 AM</span>
            <span className="text-amber/60">/</span>
            <a href={`tel:${(data?.settings.phone ?? "").replace(/\s/g, "")}`} className="hover:text-amber">
              {data?.settings.phone ?? "+91 89214 75744"}
            </a>
          </span>
        </Marquee>
      </div>

      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "border-b border-ink/10 bg-cream/90 backdrop-blur-xl shadow-[0_10px_30px_-24px_#17100b]"
            : "border-b border-transparent bg-cream/40 backdrop-blur-sm"
        }`}
      >
        <div className="wrap flex h-[70px] items-center justify-between gap-4">
          <Logo />

          <nav className="hidden items-center gap-7 lg:flex">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="link-underline text-[0.9rem] font-semibold text-ink/80 transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/track"
              className="hidden text-[0.82rem] font-semibold text-ink/70 transition-colors hover:text-chili md:block"
            >
              Track order
            </Link>
            <button
              type="button"
              onClick={open}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-ink/15 bg-paper text-ink transition-all hover:-translate-y-0.5 hover:border-ink/40"
              aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
            >
              <ShoppingBag size={17} strokeWidth={2.2} />
              {count > 0 && (
                <span className="pulse-ring absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-chili px-1 text-[10px] font-extrabold text-white">
                  {count}
                </span>
              )}
            </button>
            <Link to="/menu" className="btn btn-sm hidden sm:inline-flex">
              Order now
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full border border-ink/15 bg-paper lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-ink text-cream"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="wrap flex h-[70px] shrink-0 items-center justify-between">
              <Logo light />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full border border-cream/20"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="wrap flex flex-1 flex-col justify-center gap-1 pb-16">
              {links.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                >
                  <Link
                    to={link.to}
                    className="display block border-b border-cream/10 py-4 text-[2rem] text-cream"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <Link to="/track" className="display block border-b border-cream/10 py-4 text-[2rem] text-cream">
                Track order
              </Link>
              <Link to="/menu" className="btn btn-amber mt-8 w-full">
                Order online
              </Link>
              <div className="mt-8 space-y-3 text-sm text-cream/70">
                <a href="tel:+918921475744" className="flex items-center gap-2">
                  <Phone size={15} /> {data?.settings.phone ?? "+91 89214 75744"}
                </a>
                <a
                  href={data?.settings.instagram ?? "https://www.instagram.com/cafe_90s_ctnr"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2"
                >
                  <Instagram size={15} /> @cafe_90s_ctnr
                </a>
                <a href={data?.settings.mapUrl ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                  <MapPin size={15} /> Chathannoor, Kollam
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
