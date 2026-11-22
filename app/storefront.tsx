"use client";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag, MapPin, Utensils, Camera } from "lucide-react";
import dynamic from "next/dynamic";
const Shawarma = dynamic(() => import("./shawarma"), { ssr: false });
const Motion = dynamic(() => import("./motion"), { ssr: false });
import { defaults, seed, type Product } from "../lib/cafe";
export async function api(path: string, data?: unknown) {
  const r = await fetch(
    "/api/" + path,
    data === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  const result: any = await r.json();
  if (!r.ok) throw Error(result.error || "Please try again.");
  return result;
}
type Line = { id: string; variant: string; qty: number };
function Tile({
  p,
  add,
}: {
  p: Product;
  add: (p: Product, v: string) => void;
}) {
  const [v, V] = useState("");
  const choice = p.variants.find((x) => x.name === v) || p.variants[0];
  return (
    <article className="card">
      <div className="pic">
        <img loading="lazy" src={p.image} alt={p.category + " photograph"} />
      </div>
      <div className="cardbody">
        <span className="meta">{p.category}</span>
        <h3>{p.name}</h3>
        {p.description && <p>{p.description}</p>}
        {p.variants.length > 1 && (
          <select
            aria-label={p.name + " variant"}
            value={choice.name}
            onChange={(e) => V(e.target.value)}
          >
            {p.variants.map((x) => (
              <option key={x.name} value={x.name}>
                {x.name} · ₹{x.price}
              </option>
            ))}
          </select>
        )}
        <div className="row">
          <b>₹{choice.price}</b>
          <button
            className="add"
            title={p.available ? "Available · Add to cart" : "Unavailable"}
            aria-label={"Add " + p.name + " to cart"}
            disabled={!p.available}
            onClick={() => add(p, choice.name)}
          >
            +
          </button>
        </div>
        {!p.available && <small>Unavailable</small>}
      </div>
    </article>
  );
}
function MenuRow({p,add}:{p:Product,add:(p:Product,v:string)=>void}){
 const [variant,setVariant]=useState("");
 const choice=p.variants.find(x=>x.name===variant)||p.variants[0];
 return <div className="menu-row"><div><strong>{p.name}</strong>{p.variants.length>1&&<select aria-label={p.name+" variant"} value={choice.name} onChange={e=>setVariant(e.target.value)}>{p.variants.map(x=><option key={x.name} value={x.name}>{x.name} · ₹{x.price}</option>)}</select>}</div><b>₹{choice.price}</b><button className="add" disabled={!p.available} aria-label={"Add "+p.name+" to cart"} onClick={()=>add(p,choice.name)}>{p.available?"+":"−"}</button>{!p.available&&<small>Unavailable</small>}</div>
}
export default function Cafe() {
  const [menu, M] = useState<Product[]>(seed),
    [s, S] = useState(defaults),
    [popular, Popular] = useState<string[]>([]),
    [online, O] = useState(false),
    [cat, C] = useState("All"),
    [term, T] = useState(""),
    [limit, L] = useState(12),
    [cart, B] = useState<Line[]>([]),
    [ready, R] = useState(false),
    [stage, G] = useState(""),
    [msg, F] = useState(""),
    [toast, N] = useState(""),
    [loc, U] = useState<any>(null),
    [customer, K] = useState<any>({}),
    [method, Y] = useState("COD"),
    [busy, Z] = useState(false),
    [tracking, H] = useState(""),
    [result, J] = useState<any>(null);
  const dlg = useRef<HTMLDialogElement>(null),
    req = useRef(""),
    lock = useRef(false);
  useEffect(() => {
    try {
      B(JSON.parse(localStorage.getItem("90cart") || "[]"));
    } catch {}
    R(true);
    const track = new URLSearchParams(location.search).get("track");
    if (track) {
      H(track);
      G("track");
    } else H(localStorage.getItem("90last") || "");
    const sync = () =>
      api("catalog")
        .then((d) => {
          M(d.menu);
          S(d.settings);
          O(d.online);
          Popular(d.popular || []);
        })
        .catch(() => {});
    sync();
    const t = setInterval(sync, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("90cart", JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (stage) {
      if (!dlg.current?.open) dlg.current?.showModal();
    } else dlg.current?.close();
    F("");
  }, [stage]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => N(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (stage !== "track" || tracking.length !== 36) return;
    let active = true;
    const run = () =>
      api("track/" + encodeURIComponent(tracking))
        .then((d) => {
          if (active) {
            J(d);
            F("");
          }
        })
        .catch((e) => {
          if (active) {
            F(e.message);
            J(null);
          }
        });
    run();
    const t = setInterval(run, 10000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [stage, tracking]);
  const detail = cart.map((l) => {
    const p = menu.find((x) => x.id === l.id);
    return {
      ...l,
      p,
      price: p?.variants.find((x) => x.name === l.variant)?.price || 0,
    };
  });
  const subtotal = detail.reduce((n, l) => n + l.qty * l.price, 0),
    count = cart.reduce((n, l) => n + l.qty, 0);
  function whatsappRequest() {
    const digits = s.phone.replace(/[^0-9]/g, "");
    const recipient = digits.length === 10 ? "91" + digits : digits;
    const message = [
      "Hello Café 90’s! Please confirm my order request:",
      ...detail.map(l => l.qty + " × " + l.p?.name + " (" + l.variant + ") — ₹" + l.price * l.qty),
      "Items subtotal: ₹" + subtotal,
      loc && s.delivery ? "Delivery quote: ₹" + loc.fee + " · Total: ₹" + (subtotal + loc.fee) : "Please confirm delivery availability and charges.",
      "Payment preference: " + (method === "COD" ? "Cash on delivery" : "Online"),
      customer.name + " · " + customer.phone,
      [customer.building, customer.address, customer.area].filter(Boolean).join(", "),
      customer.landmark && "Landmark: " + customer.landmark,
      customer.instructions && "Delivery instructions: " + customer.instructions,
      customer.notes && "Order notes: " + customer.notes,
    ].filter(Boolean).join("\n");
    return "https://wa.me/" + recipient + "?text=" + encodeURIComponent(message);
  }
  function change(id: string, variant: string, delta: number) {
    req.current = "";
    B((old) => {
      const m = old.find((x) => x.id === id && x.variant === variant);
      if (!m) return [...old, { id, variant, qty: 1 }];
      return old
        .map((x) => (x === m ? { ...x, qty: Math.min(99, x.qty + delta) } : x))
        .filter((x) => x.qty > 0);
    });
  }
  function add(p: Product, v: string) {
    change(p.id, v, 1);
    N(p.name + " added to cart");
  }
  function section(c = "All") {
    C(c);
    T("");
    L(12);
    document.getElementById("menu")?.scrollIntoView();
  }
  function locate() {
    if (!navigator.geolocation) {
      F("Location is unavailable in this browser.");
      return;
    }
    Z(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          U({ ...point, ...(await api("quote", point)) });
          F("");
        } catch (e: any) {
          U(null);
          F(e.message);
        } finally {
          Z(false);
        }
      },
      () => {
        Z(false);
        F("Allow location access at the delivery address, or call the café.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }
  async function place() {
    if (lock.current || !s.delivery || !loc || !cart.length) return;
    lock.current = true;
    Z(true);
    try {
      req.current ||= crypto.randomUUID();
      const d = await api("order", {
        cart,
        customer: { ...customer, lat: loc.lat, lng: loc.lng },
        payment: method,
        subtotal,
        fee: loc.fee,
        requestId: req.current,
      });
      localStorage.setItem("90last", d.id);
      H(d.id);
      B([]);
      req.current = "";
      if (d.url) {
        location.assign(d.url);
        return;
      }
      J(null);
      G("track");
    } catch (e: any) {
      F(e.message);
    } finally {
      Z(false);
      lock.current = false;
    }
  }
  const featured = menu.filter((p) => p.featured);
  const ordered = [
    "chicken-double-patty-cheese-burger",
    "rumali-roll",
    "club-sandwich",
    "normal-nuggets",
  ];
  featured.sort(
    (a, b) =>
      (ordered.includes(a.id) ? ordered.indexOf(a.id) : 10) -
      (ordered.includes(b.id) ? ordered.indexOf(b.id) : 10),
  );
  const filtered = menu.filter(
    (p) =>
      (cat === "All" || p.category === cat) &&
      (p.name + " " + p.category + " " + (p.subcategory || ""))
        .toLowerCase()
        .includes(term.toLowerCase()),
  );
  return (
    <>
      <header>
        <a className="brand" href="#">
          Café 90’s<b>.</b>
        </a>
        <nav>
          <a href="#menu">Menu</a>
          <a href="#kitchen">Kitchen</a>
          <a href="#story">Our story</a>
          <a href="#visit">Visit us</a>
          <button className="link" onClick={() => G("track")}>
            Track order
          </button>
        </nav>
      </header>
      <main><Motion/>
        <section className="hero">
          <div className="food">
            <img
              src="/img/burger.webp"
              fetchPriority="high"
              alt="Crispy double-patty burger with melted cheese"
            />
          </div>
          <div className="poster">
            <div className="eyebrow">
              <MapPin size={15} /> CHATHANNOOR, KERALA
            </div>
            <h1>
              BIG BITES.
              <br />
              <em>90’S VIBES.</em>
            </h1>
            <p>{s.promo}</p>
            <div className="actions">
              <button className="primary" onClick={() => section()}>
                <Utensils size={17} /> Explore menu
              </button>
              <button className="secondary" onClick={() => count?G("cart"):section()}>
                <ShoppingBag size={17} /> Order now
              </button>
            </div>
          </div>
        </section>
        <div className="cravings" aria-label="Browse popular categories">
          {["Burgers","Shawarma","Loaded Fries","Milkshakes","Mojito","Falooda"].map(x=><button key={x} onClick={()=>section(x)}>{x}</button>)}
        </div>
        <section className="sect" id="featured">
          <div className="sectionhead">
            <div>
              <div className="eyebrow accent">FROM THE KITCHEN</div>
              <h2>Café favourites</h2>
            </div>
            <a className="under" href="#menu">
              View full menu
            </a>
          </div>
          <div className="grid">
            {featured.slice(0, 4).map((p) => (
              <Tile key={p.id} p={p} add={add} />
            ))}
          </div>
        </section>
        {(s.offers||s.events)&&<section className="sect cafe-news">          {s.offers && (
            <>
              <h3>Offers</h3>
              <p>{s.offers}</p>
            </>
          )}
          {s.events && (
            <>
              <h3>Events & announcements</h3>
              <p>{s.events}</p>
            </>
          )}
</section>}
        {popular.length > 0 && (
          <section className="sect">
            <h2>Best sellers</h2>
            <div className="grid">
              {popular
                .map((id) => menu.find((p) => p.id === id))
                .filter((p): p is Product => !!p)
                .map((p) => (
                  <Tile key={p.id} p={p} add={add} />
                ))}
            </div>
          </section>
        )}
        <section className="sect menu" id="menu">
          <aside className="menu-index">
          <h2>The menu</h2><div className="index-list">{["All",...new Set(menu.map(p=>p.category))].map(x=><button key={x} aria-pressed={cat===x} onClick={()=>{C(x);T("");L(12)}}>{x==="All"?"All categories":x}</button>)}</div></aside><div className="menu-sheet">
          <div className="filters">
            <input
              aria-label="Search the menu"
              placeholder="Search the menu…"
              value={term}
              onChange={(e) => {
                T(e.target.value);
                L(12);
              }}
            />
            <select
              aria-label="Menu category"
              value={cat}
              onChange={(e) => {
                C(e.target.value);
                L(12);
              }}
            >
              {["All", ...new Set(menu.map((x) => x.category))].map((x) => (
                <option key={x} value={x}>
                  {x === "All" ? "All categories" : x}
                </option>
              ))}
            </select>
          </div>
          <div className="printed-menu">{[...new Set(filtered.slice(0,limit).map(p=>p.category))].map(category=><section className="menu-group" key={category}><h3>{category}</h3><div>{filtered.slice(0,limit).filter(p=>p.category===category).map(p=><MenuRow key={p.id} p={p} add={add}/>)}</div></section>)}</div>
          {!filtered.length && <p>No matching dishes.</p>}
          {filtered.length > limit && (
            <button className="small more" onClick={() => L(limit + 24)}>
              Show more dishes ({filtered.length - limit})
            </button>
          )}
        </div></section>
        <div id="kitchen"><Shawarma browse={()=>section("Shawarma")}/></div><section className="coffee-scene"><div><h2>Tea &amp; coffee</h2><p>Black coffee ₹15 · Cold coffee ₹70</p><button className="pill" onClick={()=>section("Tea & Coffee")}>Browse tea &amp; coffee</button></div><iframe title="Interactive Café 90’s espresso cup. Drag to rotate." loading="lazy" src="https://my.spline.design/caf90sespressocup-D58pjJDkoF0zUTKsiyG3u6Iz/"/></section><section id="story" className="sect story">
          <img
            src="/img/room.webp"
            alt="Warm lighting, wooden tables and the counter inside Cafe 90’s"
          />
          <div>
            <div className="eyebrow accent">OUR STORY</div>
            <h2>Your corner café</h2>
            <p>
              Pull up a chair under the warm lights in Ooramvila. From a quick
              black tea to a table full of shawarma, fries and falooda, there’s
              room for every kind of craving.
            </p>
            <a className="under" href={s.instagram}>
              <Camera size={16} /> Follow Café 90’s
            </a>
          </div>
        </section>
        {s.gallery.length>0&&<section className="sect cafe-gallery">          <h3>Inside the café</h3>
          <div className="gallery">
            {s.gallery.map((x, i) => (
              <img
                key={i}
                loading="lazy"
                src={x}
                alt={"Café gallery photo " + (i + 1)}
              />
            ))}
          </div>
</section>}
        <section id="visit" className="sect menu">
          <div className="visit-details"><div className="eyebrow accent">CHATHANNOOR</div>
          <h2>Come on in</h2>
          <p>
            {s.address} · <a href={"tel:" + s.phone}>{s.phone}</a>
          </p>
          <p>{s.hours || "Call the café for today’s opening hours."}</p>
          <div className="actions">
            <a className="pill" href={s.maps}>
              Get directions
            </a>
            <a className="small" href={s.maps}>
              Read Google reviews
            </a>
          </div></div>
          <iframe className="visit-map" title="Google Maps — Café 90’s, Chathannoor" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" src={"https://maps.google.com/maps?output=embed&z=16&q="+encodeURIComponent(s.lat!==null && s.lng!==null ? s.lat+","+s.lng : "Cafe 90’s, "+s.address+", Kerala, India")}/>
        </section>
      </main>
      <footer>
        <a href="#" className="brand">
          Café 90’s<b>.</b>
        </a>
        <button className="link" onClick={() => G("track")}>
          Track order
        </button>
        <a href="/admin">Owner dashboard</a>
      </footer>
        <button className="pill floating-cart" aria-haspopup="dialog" onClick={() => G("cart")}>
          <ShoppingBag size={17} /> Cart <span>{count}</span>
        </button>

      <dialog ref={dlg} onCancel={() => G("")}>
        <button
          className="small close"
          aria-label="Close"
          onClick={() => G("")}
        >
          ×
        </button>
        {stage === "cart" && (
          <>
            <h2>Your cart</h2>
            {!cart.length ? (
              <p>Your cart is empty. Pick a dish from the menu to start.</p>
            ) : (
              <>
                {detail.map((l) => (
                  <div className="line" key={l.id + l.variant}>
                    <b>{l.p?.name || "Unavailable item"}</b>
                    <div>
                      {l.variant} · ₹{l.price} each
                    </div>
                    <div className="row">
                      <button
                        className="small"
                        onClick={() => change(l.id, l.variant, -1)}
                      >
                        −
                      </button>
                      {l.qty}
                      <button
                        className="small"
                        onClick={() => change(l.id, l.variant, 1)}
                      >
                        +
                      </button>
                      <b>₹{l.price * l.qty}</b>
                      <button
                        className="link"
                        onClick={() => change(l.id, l.variant, -l.qty)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <h3>Subtotal ₹{subtotal}</h3>
                <p>Delivery is calculated at checkout.</p>
                <button
                  className="primary"
                  onClick={() => {
                    U(null);
                    G("checkout");
                  }}
                >
                  Checkout
                </button>
              </>
            )}
          </>
        )}
        {stage === "checkout" && (
          <>
            <h2>Delivery details</h2>
            {!s.delivery && (
              <p className="notice">
                Online delivery is paused. Call{" "}
                <a href={"tel:" + s.phone}>{s.phone}</a> to order.
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                K(Object.fromEntries(new FormData(e.currentTarget)));
                req.current = "";
                G("review");
              }}
            >
              {[
                ["name", "Full name"],
                ["phone", "Mobile number"],
                ["building", "House / building"],
                ["address", "Complete delivery address"],
                ["area", "Area / locality"],
                ["landmark", "Nearby landmark"],
                ["instructions", "Delivery instructions"],
                ["notes", "Order notes"],
              ].map(([k, label], i) => (
                <label key={k}>
                  {label}
                  {i >= 5 ? " (optional)" : ""}
                  <input
                    name={k}
                    defaultValue={customer[k]}
                    required={i < 5}
                    maxLength={400}
                    type={k === "phone" ? "tel" : "text"}
                    pattern={k === "phone" ? "[0-9]{10}" : undefined}
                  />
                </label>
              ))}
              <button
                type="button"
                className="small"
                disabled={!s.delivery || busy}
                onClick={locate}
              >
                <MapPin size={16} /> Use my delivery location
              </button>
              {loc && (
                <p>
                  {loc.km.toFixed(2)} km ·{" "}
                  {loc.fee ? "Delivery ₹" + loc.fee : "FREE DELIVERY"}
                </p>
              )}
              <label>
                Payment method
                <select value={method} onChange={(e) => Y(e.target.value)}>
                  <option value="COD">Cash on delivery</option>
                  {online && <option>Online</option>}
                </select>
              </label>
              <button
                className="primary"
                disabled={busy}
              >
                Review order
              </button>
            </form>
          </>
        )}
        {stage === "review" && (
          <>
            <h2>Review order</h2>
            {detail.map((l) => (
              <p key={l.id + l.variant}>
                {l.qty} × {l.p?.name} ({l.variant}) · ₹{l.price * l.qty}
              </p>
            ))}
            <p>
              {customer.name} · {customer.phone}
              <br />
              {customer.building}, {customer.address}, {customer.area}
            </p>
            <p>
              Subtotal ₹{subtotal} · {loc ? (loc.fee ? "Delivery ₹"+loc.fee : "Free delivery") : "Delivery charge pending"} · {method==="COD"?"Cash on delivery":method}
            </p>
            {loc && <h3>Total ₹{subtotal + loc.fee}</h3>}
            {!s.delivery ? <p className="notice">Online delivery is paused. Call <a href={"tel:"+s.phone}>{s.phone}</a> to order.</p> : !loc && <p className="notice">Confirm your location to calculate the delivery charge. <button className="small" disabled={busy} onClick={locate}>Check delivery location</button></p>}
            {detail.length > 0 && detail.every(l => l.p?.available && l.price > 0) && <div className="whatsapp-request">
              <a className="pill" href={whatsappRequest()} target="_blank" rel="noopener noreferrer">Order via WhatsApp</a>
              <p>Tap Send in WhatsApp. The café will reply to confirm your order.</p>
            </div>}
            <div className="actions">
              <button className="small" onClick={() => G("checkout")}>
                Edit details
              </button>
              {method === "Online" && online && (
              <button className="primary" disabled={busy || !s.delivery || !loc || !cart.length} onClick={place}>
                Continue to payment
              </button>
              )}
            </div>
          </>
        )}
        {stage === "track" && (
          <>
            <h2>Track order</h2>
            <label>
              Order reference
              <input
                value={tracking}
                onChange={(e) => {
                  J(null);
                  H(e.target.value.trim());
                }}
                placeholder="Paste your order reference"
              />
            </label>
            {result && (
              <div className="notice">
                <strong>{result.status}</strong>
                <p>
                  Order total ₹{result.total} · {result.payment}
                </p>
                <small>
                  Keep this reference to check your order from another device.
                </small>
              </div>
            )}
          </>
        )}
        {msg && (
          <p role="alert" className="notice">
            {msg}
          </p>
        )}
      </dialog>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
