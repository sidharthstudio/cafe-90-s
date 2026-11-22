import "./globals.css";
export const metadata = {
  title: "Cafe 90’s | Chathannoor",
  description:
    "Explore the official Cafe 90’s menu. Burgers, shawarma, shakes and neighbourhood delivery in Chathannoor.",
  icons: { icon: "/img/logo.webp" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
