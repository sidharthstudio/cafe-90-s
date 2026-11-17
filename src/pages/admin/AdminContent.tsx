import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Pencil, Plus, Star, Trash2, Upload, X } from "lucide-react";
import type { EventItem, GalleryItem, Review } from "../../../shared/types";
import { api, compressImage } from "../../lib/api";
import { inr, timeAgo } from "../../lib/format";
import Modal from "../../components/Modal";

type OfferRow = {
  id: number;
  title: string;
  description: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  image: string;
  badge: string;
  active: number | boolean;
};

type OfferDraft = {
  id?: number;
  title: string;
  description: string;
  code: string;
  discountType: "percent" | "flat";
  discountValue: string;
  minOrder: string;
  image: string;
  badge: string;
  active: boolean;
};

const emptyOffer: OfferDraft = {
  title: "",
  description: "",
  code: "",
  discountType: "percent",
  discountValue: "",
  minOrder: "0",
  image: "",
  badge: "",
  active: true,
};

const TABS = ["Offers", "Events", "Gallery", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export default function AdminContent() {
  const [tab, setTab] = useState<Tab>("Offers");
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [offerDraft, setOfferDraft] = useState<OfferDraft | null>(null);
  const [eventDraft, setEventDraft] = useState<(Partial<EventItem> & { id?: number }) | null>(null);
  const [galleryDraft, setGalleryDraft] = useState<{ image: string; caption: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<"offer" | "event" | "gallery">("gallery");

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const [o, e, g, r] = await Promise.all([
        api.admin.offers(),
        api.admin.events(),
        api.admin.gallery(),
        api.admin.reviews(),
      ]);
      setOffers(o.offers as unknown as OfferRow[]);
      setEvents(e.events);
      setGallery(g.gallery);
      setReviews(r.reviews);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadFor = async (file: File | null, target: "offer" | "event" | "gallery") => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.admin.upload(await compressImage(file));
      if (target === "offer" && offerDraft) setOfferDraft({ ...offerDraft, image: res.url });
      if (target === "event" && eventDraft) setEventDraft({ ...eventDraft, image: res.url });
      if (target === "gallery" && galleryDraft) setGalleryDraft({ ...galleryDraft, image: res.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const pickFile = (target: "offer" | "event" | "gallery") => {
    targetRef.current = target;
    fileRef.current?.click();
  };

  const saveOffer = async () => {
    if (!offerDraft) return;
    setSaving(true);
    try {
      const payload = {
        title: offerDraft.title,
        description: offerDraft.description,
        code: offerDraft.code,
        discountType: offerDraft.discountType,
        discountValue: Number(offerDraft.discountValue) || 0,
        minOrder: Number(offerDraft.minOrder) || 0,
        image: offerDraft.image,
        badge: offerDraft.badge,
        active: offerDraft.active,
      };
      if (offerDraft.id) await api.admin.updateOffer(offerDraft.id, payload);
      else await api.admin.createOffer(payload);
      setOfferDraft(null);
      await load();
      flash("Offer saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the offer");
    } finally {
      setSaving(false);
    }
  };

  const saveEvent = async () => {
    if (!eventDraft) return;
    setSaving(true);
    try {
      const payload = {
        title: eventDraft.title ?? "",
        description: eventDraft.description ?? "",
        date: eventDraft.date ?? "",
        time: eventDraft.time ?? "",
        image: eventDraft.image ?? "",
        active: eventDraft.active ?? true,
      };
      if (eventDraft.id) await api.admin.updateEvent(eventDraft.id, payload);
      else await api.admin.createEvent(payload);
      setEventDraft(null);
      await load();
      flash("Event saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the event");
    } finally {
      setSaving(false);
    }
  };

  const saveGallery = async () => {
    if (!galleryDraft || !galleryDraft.image) return;
    setSaving(true);
    try {
      await api.admin.addGallery(galleryDraft);
      setGalleryDraft(null);
      await load();
      flash("Photo added to the gallery");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the photo");
    } finally {
      setSaving(false);
    }
  };

  const removeOffer = async (id: number) => {
    if (!window.confirm("Delete this offer?")) return;
    await api.admin.deleteOffer(id).catch(() => undefined);
    await load();
  };

  const removeEvent = async (id: number) => {
    if (!window.confirm("Delete this event?")) return;
    await api.admin.deleteEvent(id).catch(() => undefined);
    await load();
  };

  const removeGallery = async (id: number) => {
    if (!window.confirm("Remove this photo?")) return;
    await api.admin.deleteGallery(id).catch(() => undefined);
    await load();
  };

  const approveReview = async (review: Review) => {
    await api.admin.approveReview(review.id, !review.approved).catch(() => undefined);
    await load();
    flash(review.approved ? "Review hidden" : "Review published");
  };

  const removeReview = async (id: number) => {
    if (!window.confirm("Delete this review?")) return;
    await api.admin.deleteReview(id).catch(() => undefined);
    await load();
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40">Content</p>
        <h1 className="display mt-1 text-[clamp(1.8rem,3.6vw,2.5rem)]">Offers &amp; content</h1>
        <p className="text-[0.82rem] text-ink/50">Promotions, events, gallery photos and customer reviews.</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void uploadFor(e.target.files?.[0] ?? null, targetRef.current)}
      />

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`chip ${tab === t ? "chip-active" : ""}`}>
            {t}
          </button>
        ))}
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/10 px-4 py-2.5 text-[0.82rem] font-semibold text-teal-900">
          <Check size={15} /> {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-chili/30 bg-chili/5 px-4 py-2.5 text-[0.82rem] font-semibold text-chili">{error}</div>
      )}

      {loading ? (
        <div className="skeleton h-40 rounded-2xl" />
      ) : tab === "Offers" ? (
        <section className="space-y-3">
          <div className="flex justify-end">
            <button type="button" onClick={() => setOfferDraft(emptyOffer)} className="btn btn-sm btn-accent">
              <Plus size={13} /> New offer
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {offers.map((offer) => (
              <div key={offer.id} className="flex gap-3 rounded-2xl border border-ink/10 bg-paper p-3">
                <img src={offer.image} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[0.86rem] font-bold">{offer.title}</p>
                    {offer.active ? (
                      <span className="badge bg-teal/15 text-teal-900">Live</span>
                    ) : (
                      <span className="badge bg-ink/10 text-ink/50">Paused</span>
                    )}
                  </div>
                  <p className="text-[0.74rem] text-ink/50">
                    {offer.code || "No code"} ·{" "}
                    {offer.discount_type === "percent" ? `${offer.discount_value}% off` : `${inr(offer.discount_value)} off`} ·
                    min {inr(offer.min_order)}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setOfferDraft({
                          id: offer.id,
                          title: offer.title,
                          description: offer.description,
                          code: offer.code,
                          discountType: offer.discount_type === "flat" ? "flat" : "percent",
                          discountValue: String(offer.discount_value),
                          minOrder: String(offer.min_order),
                          image: offer.image,
                          badge: offer.badge,
                          active: Boolean(offer.active),
                        })
                      }
                      className="btn btn-sm btn-cream !px-2.5 !py-1"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button type="button" onClick={() => void removeOffer(offer.id)} className="btn btn-sm btn-cream !px-2.5 !py-1 !text-chili">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {offers.length === 0 && <p className="text-[0.85rem] text-ink/45">No offers yet.</p>}
          </div>
        </section>
      ) : tab === "Events" ? (
        <section className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setEventDraft({ title: "", description: "", date: "", time: "", image: "", active: true })}
              className="btn btn-sm btn-accent"
            >
              <Plus size={13} /> New event
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {events.map((event) => (
              <div key={event.id} className="flex gap-3 rounded-2xl border border-ink/10 bg-paper p-3">
                <img src={event.image} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.86rem] font-bold">{event.title}</p>
                  <p className="text-[0.74rem] text-ink/50">
                    {event.date} · {event.time}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEventDraft({ ...event })}
                      className="btn btn-sm btn-cream !px-2.5 !py-1"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button type="button" onClick={() => void removeEvent(event.id)} className="btn btn-sm btn-cream !px-2.5 !py-1 !text-chili">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && <p className="text-[0.85rem] text-ink/45">No events yet.</p>}
          </div>
        </section>
      ) : tab === "Gallery" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => setGalleryDraft({ image: "", caption: "" })} className="btn btn-sm btn-accent">
              <ImagePlus size={13} /> Add photo
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.map((item) => (
              <figure key={item.id} className="group relative overflow-hidden rounded-xl border border-ink/10">
                <img src={item.image} alt={item.caption} className="aspect-square w-full object-cover" loading="lazy" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent px-2 pb-1.5 pt-5 text-[0.68rem] font-semibold text-cream">
                  {item.caption}
                </figcaption>
                <button
                  type="button"
                  onClick={() => void removeGallery(item.id)}
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/70 text-cream opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  <Trash2 size={12} />
                </button>
              </figure>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {reviews.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink/20 bg-paper p-10 text-center text-[0.85rem] text-ink/45">
              No reviews submitted yet. Approved reviews appear on the homepage.
            </div>
          )}
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-ink/10 bg-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-[0.86rem] font-bold">{review.name}</p>
                  <span className="flex text-amber">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} size={11} className="fill-amber" />
                    ))}
                  </span>
                  <span className="text-[0.7rem] text-ink/40">{review.createdAt ? timeAgo(review.createdAt) : ""}</span>
                  {review.approved ? (
                    <span className="badge bg-teal/15 text-teal-900">Published</span>
                  ) : (
                    <span className="badge bg-amber/25 text-amber-900">Awaiting approval</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => void approveReview(review)} className="btn btn-sm btn-cream !px-2.5 !py-1">
                    {review.approved ? <X size={12} /> : <Check size={12} />}
                    {review.approved ? "Unpublish" : "Approve"}
                  </button>
                  <button type="button" onClick={() => void removeReview(review.id)} className="btn btn-sm btn-cream !px-2.5 !py-1 !text-chili">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[0.84rem] text-ink/70">{review.text}</p>
            </div>
          ))}
        </section>
      )}

      {/* offer modal */}
      <Modal open={Boolean(offerDraft)} onClose={() => setOfferDraft(null)} title="Offer" subtitle="Applies to the homepage and checkout codes.">
        {offerDraft && (
          <div className="space-y-3">
            <div>
              <label className="field-label">Title</label>
              <input className="field" value={offerDraft.title} onChange={(e) => setOfferDraft({ ...offerDraft, title: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea
                className="field min-h-[70px]"
                value={offerDraft.description}
                onChange={(e) => setOfferDraft({ ...offerDraft, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Code</label>
                <input
                  className="field uppercase"
                  value={offerDraft.code}
                  onChange={(e) => setOfferDraft({ ...offerDraft, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="field-label">Badge</label>
                <input className="field" value={offerDraft.badge} onChange={(e) => setOfferDraft({ ...offerDraft, badge: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Discount type</label>
                <select
                  className="field"
                  value={offerDraft.discountType}
                  onChange={(e) => setOfferDraft({ ...offerDraft, discountType: e.target.value as "percent" | "flat" })}
                >
                  <option value="percent">Percent %</option>
                  <option value="flat">Flat ₹</option>
                </select>
              </div>
              <div>
                <label className="field-label">Discount value</label>
                <input
                  className="field"
                  inputMode="numeric"
                  value={offerDraft.discountValue}
                  onChange={(e) => setOfferDraft({ ...offerDraft, discountValue: e.target.value.replace(/[^\d.]/g, "") })}
                />
              </div>
              <div>
                <label className="field-label">Minimum order ₹</label>
                <input
                  className="field"
                  inputMode="numeric"
                  value={offerDraft.minOrder}
                  onChange={(e) => setOfferDraft({ ...offerDraft, minOrder: e.target.value.replace(/[^\d.]/g, "") })}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setOfferDraft({ ...offerDraft, active: !offerDraft.active })}
                  className={`chip !py-2 ${offerDraft.active ? "chip-active" : ""}`}
                >
                  {offerDraft.active ? "Live" : "Paused"}
                </button>
              </div>
            </div>
            <div>
              <label className="field-label">Image</label>
              <div className="flex gap-2">
                <input
                  className="field !py-2 !text-[0.82rem]"
                  value={offerDraft.image}
                  onChange={(e) => setOfferDraft({ ...offerDraft, image: e.target.value })}
                  placeholder="Image URL"
                />
                <button type="button" onClick={() => pickFile("offer")} className="btn btn-sm btn-cream shrink-0">
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                </button>
              </div>
            </div>
            <button type="button" onClick={() => void saveOffer()} disabled={saving} className="btn btn-accent w-full">
              {saving ? "Saving…" : "Save offer"}
            </button>
          </div>
        )}
      </Modal>

      {/* event modal */}
      <Modal open={Boolean(eventDraft)} onClose={() => setEventDraft(null)} title="Event" subtitle="Shown in the events section.">
        {eventDraft && (
          <div className="space-y-3">
            <div>
              <label className="field-label">Title</label>
              <input className="field" value={eventDraft.title ?? ""} onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea
                className="field min-h-[70px]"
                value={eventDraft.description ?? ""}
                onChange={(e) => setEventDraft({ ...eventDraft, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Date / day</label>
                <input className="field" value={eventDraft.date ?? ""} onChange={(e) => setEventDraft({ ...eventDraft, date: e.target.value })} placeholder="Every Friday" />
              </div>
              <div>
                <label className="field-label">Time</label>
                <input className="field" value={eventDraft.time ?? ""} onChange={(e) => setEventDraft({ ...eventDraft, time: e.target.value })} placeholder="7:00 PM – 11:00 PM" />
              </div>
            </div>
            <div>
              <label className="field-label">Image</label>
              <div className="flex gap-2">
                <input
                  className="field !py-2 !text-[0.82rem]"
                  value={eventDraft.image ?? ""}
                  onChange={(e) => setEventDraft({ ...eventDraft, image: e.target.value })}
                  placeholder="Image URL"
                />
                <button type="button" onClick={() => pickFile("event")} className="btn btn-sm btn-cream shrink-0">
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                </button>
              </div>
            </div>
            <button type="button" onClick={() => void saveEvent()} disabled={saving} className="btn btn-accent w-full">
              {saving ? "Saving…" : "Save event"}
            </button>
          </div>
        )}
      </Modal>

      {/* gallery modal */}
      <Modal open={Boolean(galleryDraft)} onClose={() => setGalleryDraft(null)} title="Add gallery photo">
        {galleryDraft && (
          <div className="space-y-3">
            <div className="rounded-xl border border-ink/10 bg-paper p-3">
              {galleryDraft.image ? (
                <img src={galleryDraft.image} alt="" className="aspect-video w-full rounded-lg object-cover" />
              ) : (
                <div className="grid aspect-video w-full place-items-center rounded-lg bg-cream text-ink/30">
                  <ImagePlus size={26} />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="field !py-2 !text-[0.82rem]"
                value={galleryDraft.image}
                onChange={(e) => setGalleryDraft({ ...galleryDraft, image: e.target.value })}
                placeholder="Image URL"
              />
              <button type="button" onClick={() => pickFile("gallery")} className="btn btn-sm btn-cream shrink-0">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload
              </button>
            </div>
            <div>
              <label className="field-label">Caption</label>
              <input
                className="field"
                value={galleryDraft.caption}
                onChange={(e) => setGalleryDraft({ ...galleryDraft, caption: e.target.value })}
                placeholder="e.g. The counter at 9 PM"
              />
            </div>
            <button type="button" onClick={() => void saveGallery()} disabled={saving || !galleryDraft.image} className="btn btn-accent w-full">
              {saving ? "Saving…" : "Add photo"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
