import seed from "../public/menu.json";
export type Product = (typeof seed)[number] & {
  description?: string;
  subcategory?: string;
};
export const defaults = {
  address: "Ooramvila, Chathannoor",
  phone: "8921475744",
  instagram: "https://www.instagram.com/cafe_90s_ctnr/",
  maps: "https://maps.app.goo.gl/WYaHtAS6byBRfxGG8",
  hours: "",
  radius: 3,
  lat: null as number | null,
  lng: null as number | null,
  fee: null as number | null,
  delivery: false,
  promo:
    "Burgers, shawarma & shakes from your neighbourhood spot in Chathannoor.",
  offers: "",
  events: "",
  gallery: [
    "/img/room.webp",
    "/img/shawarma.webp",
    "/img/sandwich.webp",
    "/img/nuggets.webp",
  ],
  categories: [] as string[],
};
export const statuses = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready for Delivery",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];
export function distance(a: number, b: number, c: number, d: number) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((c - a) * rad) / 2) ** 2 +
    Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export { seed };
