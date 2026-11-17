import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
  UtensilsCrossed,
} from "lucide-react";
import type { MenuCategory, Product } from "../../../shared/types";
import { api, compressImage } from "../../lib/api";
import { inr } from "../../lib/format";
import Modal from "../../components/Modal";

type VariantDraft = { label: string; price: string };

type Draft = {
  id?: number;
  name: string;
  categoryId: number;
  description: string;
  portion: string;
  image: string;
  available: boolean;
  featured: boolean;
  bestseller: boolean;
  variants: VariantDraft[];
};

const emptyDraft = (categoryId: number): Draft => ({
  name: "",
  categoryId,
  description: "",
  portion: "",
  image: "",
  available: true,
  featured: false,
  bestseller: false,
  variants: [{ label: "Regular", price: "" }],
});

export default function AdminMenu() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [catDrafts, setCatDrafts] = useState<MenuCategory[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", tagline: "", tint: "#f0a63c" });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.admin.menu();
      setCategories(res.categories);
      setCatDrafts(res.categories.map((c) => ({ ...c, products: [] })));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3000);
  };

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .flatMap((c) => c.products)
      .filter((p) => (filter === "all" ? true : p.categorySlug === filter))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) : true));
  }, [categories, query, filter]);

  const openCreate = () => {
    if (categories.length === 0) return;
    setDraft(emptyDraft(categories[0].id));
  };

  const openEdit = (product: Product) => {
    setDraft({
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      description: product.description,
      portion: product.portion,
      image: product.image,
      available: product.available,
      featured: product.featured,
      bestseller: product.bestseller,
      variants: product.variants.map((v) => ({ label: v.label, price: String(v.price) })),
    });
  };

  const save = async () => {
    if (!draft) return;
    const variants = draft.variants
      .map((v) => ({ label: v.label.trim() || "Regular", price: Number(v.price) }))
      .filter((v) => Number.isFinite(v.price) && v.price >= 0);
    if (!draft.name.trim() || variants.length === 0) {
      setError("Add a name and at least one price.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: draft.name.trim(),
        categoryId: draft.categoryId,
        description: draft.description.trim(),
        portion: draft.portion.trim(),
        image: draft.image.trim(),
        available: draft.available,
        featured: draft.featured,
        bestseller: draft.bestseller,
        variants,
      };
      if (draft.id) await api.admin.updateProduct(draft.id, payload);
      else await api.admin.createProduct(payload);
      await load();
      setDraft(null);
      flash(draft.id ? "Item updated" : "Item added to the menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the item");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: Product) => {
    if (!window.confirm(`Delete “${product.name}” from the menu? This cannot be undone.`)) return;
    try {
      await api.admin.deleteProduct(product.id);
      await load();
      flash("Item deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the item");
    }
  };

  const toggleProduct = async (product: Product, patch: Partial<{ available: boolean; featured: boolean; bestseller: boolean }>) => {
    const next = {
      available: patch.available ?? product.available,
      featured: patch.featured ?? product.featured,
      bestseller: patch.bestseller ?? product.bestseller,
    };
    try {
      await api.admin.updateProduct(product.id, next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the item");
    }
  };

  const uploadImage = async (file: File | null) => {
    if (!file || !draft) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const res = await api.admin.upload(compressed);
      setDraft({ ...draft, image: res.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const saveCategory = async (category: MenuCategory) => {
    try {
      await api.admin.updateCategory(category.id, {
        name: category.name,
        tagline: category.tagline,
        tint: category.tint,
        image: category.image,
      });
      await load();
      flash("Category updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the category");
    }
  };

  const addCategory = async () => {
    if (!newCategory.name.trim()) return;
    try {
      await api.admin.createCategory(newCategory);
      setNewCategory({ name: "", tagline: "", tint: "#f0a63c" });
      await load();
      flash("Category created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the category");
    }
  };

  const removeCategory = async (category: MenuCategory) => {
    if (!window.confirm(`Delete the “${category.name}” category?`)) return;
    try {
      await api.admin.deleteCategory(category.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the category");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40">Menu management</p>
          <h1 className="display mt-1 text-[clamp(1.8rem,3.6vw,2.5rem)]">Menu &amp; prices</h1>
          <p className="text-[0.82rem] text-ink/50">
            {categories.reduce((n, c) => n + c.products.length, 0)} items · edit prices, photos and availability live.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCategoryModal(true)} className="btn btn-sm btn-cream">
            Categories
          </button>
          <button type="button" onClick={() => void load()} className="btn btn-sm btn-cream">
            <RefreshCw size={14} />
          </button>
          <button type="button" onClick={openCreate} className="btn btn-sm btn-accent">
            <Plus size={14} /> Add item
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/10 px-4 py-2.5 text-[0.82rem] font-semibold text-teal-900">
          <Check size={15} /> {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-chili/30 bg-chili/5 px-4 py-2.5 text-[0.82rem] font-semibold text-chili">{error}</div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-paper p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-[180px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items…"
            className="field !py-2 !pl-9 !text-[0.85rem]"
            aria-label="Search menu items"
          />
        </div>
        <div className="no-scrollbar flex min-w-0 shrink gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`chip !py-1.5 !text-[0.72rem] ${filter === "all" ? "chip-active" : ""}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.slug)}
              className={`chip !py-1.5 !text-[0.72rem] ${filter === c.slug ? "chip-active" : ""}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper">
          <div className="divide-y divide-ink/8">
            {products.map((product) => (
              <div key={product.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                <img
                  src={product.image}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[0.86rem] font-bold">{product.name}</p>
                    {product.bestseller && <span className="badge bg-amber text-ink">Bestseller</span>}
                    {product.featured && <span className="badge bg-pink text-white">Signature</span>}
                    {!product.available && <span className="badge bg-ink/10 text-ink/60">Hidden</span>}
                  </div>
                  <p className="text-[0.72rem] text-ink/45">
                    {product.categoryName} · {product.variants.map((v) => `${v.label} ${inr(v.price)}`).join(" / ")}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void toggleProduct(product, { available: !product.available })}
                    className={`rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${
                      product.available ? "bg-teal/15 text-teal-900" : "bg-ink/10 text-ink/50"
                    }`}
                    aria-label={`Toggle availability for ${product.name}`}
                  >
                    {product.available ? "Available" : "Unavailable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleProduct(product, { featured: !product.featured })}
                    className={`grid h-7 w-7 place-items-center rounded-full border ${
                      product.featured ? "border-pink bg-pink/15 text-pink" : "border-ink/15 text-ink/35"
                    }`}
                    aria-label={`Toggle signature for ${product.name}`}
                    title="Signature item"
                  >
                    <Star size={12} className={product.featured ? "fill-pink" : ""} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    className="grid h-7 w-7 place-items-center rounded-full border border-ink/15 text-ink/60 hover:border-ink/40"
                    aria-label={`Edit ${product.name}`}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(product)}
                    className="grid h-7 w-7 place-items-center rounded-full border border-ink/15 text-ink/40 hover:border-chili hover:text-chili"
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <p className="p-10 text-center text-[0.85rem] text-ink/45">No items match this search.</p>
            )}
          </div>
        </div>
      )}

      {/* product editor */}
      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit menu item" : "Add menu item"}
        subtitle="Changes go live on the customer site immediately."
        wide
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="p-name">
                  Item name
                </label>
                <input
                  id="p-name"
                  className="field"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Special Loaded Shawarma"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="p-cat">
                  Category
                </label>
                <select
                  id="p-cat"
                  className="field"
                  value={draft.categoryId}
                  onChange={(e) => setDraft({ ...draft, categoryId: Number(e.target.value) })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="p-portion">
                  Portion / pieces
                </label>
                <input
                  id="p-portion"
                  className="field"
                  value={draft.portion}
                  onChange={(e) => setDraft({ ...draft, portion: e.target.value })}
                  placeholder="e.g. 5 pieces + fries"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="p-desc">
                  Description
                </label>
                <textarea
                  id="p-desc"
                  className="field min-h-[72px] resize-y"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Short, appetising description"
                />
              </div>
            </div>

            <div className="rounded-xl border border-ink/10 bg-paper p-3.5">
              <p className="field-label">Photo</p>
              <div className="flex gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-ink/10 bg-cream">
                  {draft.image ? (
                    <img src={draft.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-ink/25">
                      <UtensilsCrossed size={20} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    className="field !py-2 !text-[0.82rem]"
                    value={draft.image}
                    onChange={(e) => setDraft({ ...draft, image: e.target.value })}
                    placeholder="Paste an image URL…"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void uploadImage(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="btn btn-sm btn-cream"
                    >
                      {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      {uploading ? "Uploading…" : "Upload photo"}
                    </button>
                    <span className="text-[0.68rem] text-ink/40">JPG/PNG, auto-compressed</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="field-label !mb-0">Sizes / variants &amp; prices</p>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, variants: [...draft.variants, { label: "", price: "" }] })}
                  className="text-[0.75rem] font-bold text-chili hover:underline"
                >
                  + Add variant
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {draft.variants.map((variant, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className="field !py-2 !text-[0.82rem]"
                      value={variant.label}
                      onChange={(e) => {
                        const next = [...draft.variants];
                        next[index] = { ...next[index], label: e.target.value };
                        setDraft({ ...draft, variants: next });
                      }}
                      placeholder="Label (Regular / Special / Medium)"
                    />
                    <input
                      className="field !w-28 !py-2 !text-[0.82rem]"
                      value={variant.price}
                      inputMode="numeric"
                      onChange={(e) => {
                        const next = [...draft.variants];
                        next[index] = { ...next[index], price: e.target.value.replace(/[^\d.]/g, "") };
                        setDraft({ ...draft, variants: next });
                      }}
                      placeholder="Price ₹"
                    />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, variants: draft.variants.filter((_, i) => i !== index) })}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink/15 text-ink/40 hover:text-chili"
                      aria-label="Remove variant"
                      disabled={draft.variants.length === 1}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: "available" as const, label: "Available to order" },
                { key: "featured" as const, label: "Signature item" },
                { key: "bestseller" as const, label: "Bestseller badge" },
              ].map((toggle) => (
                <button
                  key={toggle.key}
                  type="button"
                  onClick={() => setDraft({ ...draft, [toggle.key]: !draft[toggle.key] })}
                  className={`chip !py-1.5 !text-[0.75rem] ${draft[toggle.key] ? "chip-active" : ""}`}
                >
                  {draft[toggle.key] ? <Check size={12} /> : null}
                  {toggle.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-ink/10 pt-4">
              <button type="button" onClick={() => setDraft(null)} className="btn btn-sm btn-cream">
                Cancel
              </button>
              <button type="button" onClick={() => void save()} disabled={saving} className="btn btn-sm btn-accent">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? "Saving…" : "Save item"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* categories */}
      <Modal
        open={categoryModal}
        onClose={() => setCategoryModal(false)}
        title="Categories"
        subtitle="Group the menu. Items move with the category."
        wide
      >
        <div className="space-y-3">
          {catDrafts.map((category) => (
            <div key={category.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink/10 bg-paper p-3">
              <input
                className="field !w-40 !py-1.5 !text-[0.82rem]"
                value={category.name}
                onChange={(e) =>
                  setCatDrafts((prev) => prev.map((c) => (c.id === category.id ? { ...c, name: e.target.value } : c)))
                }
              />
              <input
                className="field !flex-1 !py-1.5 !text-[0.82rem]"
                value={category.tagline}
                onChange={(e) =>
                  setCatDrafts((prev) => prev.map((c) => (c.id === category.id ? { ...c, tagline: e.target.value } : c)))
                }
                placeholder="Tagline"
              />
              <input
                type="color"
                value={category.tint}
                onChange={(e) =>
                  setCatDrafts((prev) => prev.map((c) => (c.id === category.id ? { ...c, tint: e.target.value } : c)))
                }
                className="h-9 w-10 cursor-pointer rounded-lg border border-ink/15 bg-paper"
                aria-label="Category colour"
              />
              <button type="button" onClick={() => void saveCategory(category)} className="btn btn-sm btn-cream">
                Save
              </button>
              <button
                type="button"
                onClick={() => void removeCategory(category)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-ink/15 text-ink/40 hover:text-chili"
                aria-label={`Delete ${category.name}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <div className="rounded-xl border border-dashed border-ink/20 bg-cream p-3">
            <p className="field-label">New category</p>
            <div className="flex flex-wrap gap-2">
              <input
                className="field !w-40 !py-1.5 !text-[0.82rem]"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="Name"
              />
              <input
                className="field !flex-1 !py-1.5 !text-[0.82rem]"
                value={newCategory.tagline}
                onChange={(e) => setNewCategory({ ...newCategory, tagline: e.target.value })}
                placeholder="Tagline"
              />
              <input
                type="color"
                value={newCategory.tint}
                onChange={(e) => setNewCategory({ ...newCategory, tint: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded-lg border border-ink/15 bg-paper"
                aria-label="New category colour"
              />
              <button type="button" onClick={() => void addCategory()} className="btn btn-sm btn-accent">
                <Plus size={13} /> Add
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
