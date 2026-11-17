import { Route, Routes } from "react-router-dom";
import { AppDataProvider } from "./lib/app-data";
import { CartProvider } from "./lib/cart";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import MenuPage from "./pages/Menu";
import CheckoutPage from "./pages/Checkout";
import OrderPage from "./pages/Order";
import TrackPage from "./pages/Track";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminMenu from "./pages/admin/AdminMenu";
import AdminContent from "./pages/admin/AdminContent";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <AppDataProvider>
      <CartProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order/:code" element={<OrderPage />} />
            <Route path="/track" element={<TrackPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="menu" element={<AdminMenu />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </CartProvider>
    </AppDataProvider>
  );
}
