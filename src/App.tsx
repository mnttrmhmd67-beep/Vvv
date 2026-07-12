/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import Header from "./components/Header";
import ClientPage from "./components/ClientPage";
import AdminPage from "./components/AdminPage";
import SupplierPage from "./components/SupplierPage";
import SupportPage from "./components/SupportPage";
import CustomerAuthModal from "./components/CustomerAuthModal";
import { Product, SteelType, Order, Supplier, CartItem, OrderStatus, Customer, AdminNotification } from "./types";
import {
  fetchAppState,
  addSteelType,
  editSteelType,
  deleteSteelType,
  addProduct,
  editProduct,
  deleteProduct,
  createOrder,
  updateOrderStatus,
  addSupplier,
  updateCustomerStatus,
  updateSupplierStatus,
  updateSupplier,
  readAllNotifications,
  verifySession,
  logoutSession
} from "./services/api";
import { HardHat } from "lucide-react";

export default function App() {
  const [currentView, setView] = useState<"client" | "admin" | "supplier" | "support">("client");
  const [products, setProducts] = useState<Product[]>([]);
  const [steelTypes, setSteelTypes] = useState<SteelType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Authentication & Session persistence states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Synchronize routing path with browser location
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path === "/admin") {
        setView("admin");
      } else if (path === "/supplier" || path.startsWith("/supplier/")) {
        setView("supplier");
      } else if (path === "/support") {
        setView("support");
      } else {
        setView("client");
      }
    };

    window.addEventListener("popstate", handleLocationChange);
    handleLocationChange(); // Initial run

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  // Fetch full state from backend (or localStorage backup)
  const syncState = async () => {
    setLoading(true);
    try {
      const state = await fetchAppState();
      setProducts(state.products);
      setSteelTypes(state.steelTypes);
      setOrders(state.orders);
      setSuppliers(state.suppliers);
      setCustomers(state.customers || []);
      setNotifications(state.notifications || []);

      // Check if logged-in customer is suspended
      if (currentCustomer) {
        const freshCustomer = (state.customers || []).find(
          (c) => c.id === currentCustomer.id || c.phone === currentCustomer.phone
        );
        if (freshCustomer) {
          if (freshCustomer.status === "suspended") {
            setCurrentCustomer(null);
            localStorage.removeItem("asas_current_customer");
            alert("تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس.");
          } else {
            setCurrentCustomer(freshCustomer);
            localStorage.setItem("asas_current_customer", JSON.stringify(freshCustomer));
          }
        }
      }
    } catch (error) {
      console.error("Error synchronizing data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check session token on initial mount
  const checkSession = async () => {
    const token = localStorage.getItem("asas_session_token");
    if (token) {
      try {
        const res = await verifySession(token);
        if (res.success) {
          if (res.role === "admin") {
            setIsAdminLoggedIn(true);
            setView("admin");
            if (window.location.pathname !== "/admin") {
              window.history.replaceState({}, "", "/admin");
            }
          } else if (res.role === "supplier") {
            setCurrentSupplier(res.user);
            setView("supplier");
            if (!window.location.pathname.startsWith("/supplier/")) {
              window.history.replaceState({}, "", `/supplier/${res.user.id}`);
            }
          } else if (res.role === "customer") {
            setCurrentCustomer(res.user);
            localStorage.setItem("asas_current_customer", JSON.stringify(res.user));
          }
        } else {
          // Token expired or invalid, clear
          localStorage.removeItem("asas_session_token");
          localStorage.removeItem("asas_current_customer");
        }
      } catch (e) {
        console.warn("Session validation failed:", e);
        localStorage.removeItem("asas_session_token");
        localStorage.removeItem("asas_current_customer");
      }
    }
    setAuthChecking(false);
  };

  useEffect(() => {
    const init = async () => {
      await syncState();
      await checkSession();
    };
    init();
  }, []);

  const handleAdminLoginSuccess = (token: string, user: any) => {
    localStorage.setItem("asas_session_token", token);
    setIsAdminLoggedIn(true);
    setView("admin");
    window.history.pushState({}, "", "/admin");
  };

  const handleSupplierLoginSuccess = (token: string, supplier: Supplier) => {
    localStorage.setItem("asas_session_token", token);
    setCurrentSupplier(supplier);
    setView("supplier");
    window.history.pushState({}, "", `/supplier/${supplier.id}`);
  };

  const handleCustomerLoginSuccess = (token: string, customer: Customer) => {
    localStorage.setItem("asas_session_token", token);
    setCurrentCustomer(customer);
    localStorage.setItem("asas_current_customer", JSON.stringify(customer));
    setAuthModalOpen(false);
  };

  const handleLogoutAction = async () => {
    const token = localStorage.getItem("asas_session_token");
    if (token) {
      try {
        await logoutSession(token);
      } catch (err) {
        console.warn("Server logout failed, proceeding locally", err);
      }
    }
    localStorage.removeItem("asas_session_token");
    localStorage.removeItem("asas_current_customer");
    setIsAdminLoggedIn(false);
    setCurrentSupplier(null);
    setCurrentCustomer(null);
    setView("client");
    window.history.pushState({}, "", "/");
  };

  // ---------------------------------------------------------------------------
  // Cart Actions
  // ---------------------------------------------------------------------------
  const handleAddToCart = (product: Product, quantityToAdd: number) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        // Guard stock limit
        const totalQty = existing.quantity + quantityToAdd;
        if (totalQty > product.quantity) {
          alert(`نعتذر، الحد الأقصى المتوفر في المستودع هو ${product.quantity} طن`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: totalQty }
            : item
        );
      }
      return [...prevCart, { product, quantity: quantityToAdd }];
    });
    setCartOpen(true);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const handleUpdateCartQuantity = (productId: string, qty: number) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  // ---------------------------------------------------------------------------
  // API Call wrappers (updating state immediately)
  // ---------------------------------------------------------------------------
  const handleAddSteelTypeAction = async (name: string) => {
    const newType = await addSteelType(name);
    setSteelTypes((prev) => [...prev, newType]);
    return newType;
  };

  const handleEditSteelTypeAction = async (id: string, name: string) => {
    const updated = await editSteelType(id, name);
    setSteelTypes((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };

  const handleDeleteSteelTypeAction = async (id: string) => {
    await deleteSteelType(id);
    setSteelTypes((prev) => prev.filter((t) => t.id !== id));
    return true;
  };

  const handleAddProductAction = async (prodData: Omit<Product, "id">) => {
    const newProduct = await addProduct(prodData);
    setProducts((prev) => [...prev, newProduct]);
    return newProduct;
  };

  const handleEditProductAction = async (id: string, prodData: Partial<Omit<Product, "id">>) => {
    const updated = await editProduct(id, prodData);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const handleDeleteProductAction = async (id: string) => {
    await deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    // clear from cart if present
    setCart((prev) => prev.filter((item) => item.product.id !== id));
    return true;
  };

  const handleCreateOrderAction = async (
    clientName: string,
    clientPhone: string,
    clientAddress: string,
    clientProvince?: string,
    customerId?: string | null
  ) => {
    const itemsPayload = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity
    }));

    const newOrder = await createOrder({
      clientName,
      clientPhone,
      clientAddress,
      clientProvince,
      customerId,
      items: itemsPayload
    });

    setOrders((prev) => [...prev, newOrder]);
    // Clear cart on success
    setCart([]);
    // Update inventory stock locally
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const cartItem = cart.find((item) => item.product.id === p.id);
        if (cartItem) {
          return { ...p, quantity: Math.max(0, p.quantity - cartItem.quantity) };
        }
        return p;
      })
    );
    return newOrder;
  };

  const handleUpdateOrderStatusAction = async (
    id: string,
    status: OrderStatus,
    supplierId?: string | null,
    note?: string
  ) => {
    const updatedOrder = await updateOrderStatus(id, status, supplierId, note);
    setOrders((prev) => prev.map((o) => (o.id === id ? updatedOrder : o)));

    // If order was rejected, return stock to products locally
    if (status === "rejected") {
      setProducts((prevProds) =>
        prevProds.map((p) => {
          const item = updatedOrder.items.find((i) => i.productId === p.id);
          if (item) {
            return { ...p, quantity: p.quantity + item.quantity };
          }
          return p;
        })
      );
    }
    return updatedOrder;
  };

  const handleAddSupplierAction = async (supData: { name: string; phone: string; pin: string }) => {
    const newSup = await addSupplier(supData);
    setSuppliers((prev) => [...prev, newSup]);
    return newSup;
  };

  const handleUpdateCustomerStatusAction = async (id: string, status: "active" | "suspended") => {
    const updatedCustomer = await updateCustomerStatus(id, status);
    setCustomers((prev) => prev.map((c) => (c.id === id ? updatedCustomer : c)));
    
    if (currentCustomer && (currentCustomer.id === id || currentCustomer.phone === updatedCustomer.phone) && status === "suspended") {
      setCurrentCustomer(null);
      localStorage.removeItem("asas_current_customer");
      alert("تم إيقاف حسابك مؤقتًا، يرجى التواصل مع إدارة منصة أساس.");
    }
    return updatedCustomer;
  };

  const handleUpdateSupplierStatusAction = async (id: string, status: "pending" | "active" | "suspended") => {
    const updated = await updateSupplierStatus(id, status);
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    
    // If supplier was suspended and was logged in, log them out
    if (currentSupplier && currentSupplier.id === id && status !== "active") {
      setCurrentSupplier(null);
      localStorage.removeItem("asas_session_token");
      setView("client");
      window.history.pushState({}, "", "/");
      alert("تم تعديل حالة حسابك من قبل الإدارة، يرجى مراجعة المدير العام.");
    }
    return updated;
  };

  const handleUpdateSupplierAction = async (id: string, supplierData: Partial<Supplier>) => {
    const updated = await updateSupplier(id, supplierData);
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const handleReadAllNotificationsAction = async () => {
    await readAllNotifications();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    return true;
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <HardHat className="h-12 w-12 text-orange-500 animate-bounce mb-4" />
        <p className="text-sm font-bold text-slate-300">يرجى الانتظار، جاري تحميل منصة أساس وتأمين الجلسة...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Header component */}
      <Header
        currentView={currentView}
        setView={setView}
        cart={cart}
        toggleCartOpen={() => setCartOpen(!cartOpen)}
        onRefresh={syncState}
        loading={loading}
        currentCustomer={currentCustomer}
        onLogout={handleLogoutAction}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        currentSupplier={currentSupplier}
      />

      {/* Main Content Render */}
      <div className="flex-grow">
        {loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
            <HardHat className="h-12 w-12 text-orange-500 animate-bounce mb-3" />
            <p className="font-black text-sm">جاري تهيئة قاعدة بيانات حديد التسليح وتامين الحماية...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {currentView === "client" && (
              <ClientPage
                products={products}
                steelTypes={steelTypes}
                orders={orders}
                cart={cart}
                addToCart={handleAddToCart}
                removeFromCart={handleRemoveFromCart}
                updateCartQuantity={handleUpdateCartQuantity}
                onSubmitOrder={handleCreateOrderAction}
                cartOpen={cartOpen}
                setCartOpen={setCartOpen}
                currentCustomer={currentCustomer}
                onOpenAuthModal={() => setAuthModalOpen(true)}
                onUpdateCustomer={(cust) => {
                  setCurrentCustomer(cust);
                  localStorage.setItem("asas_current_customer", JSON.stringify(cust));
                }}
              />
            )}

            {currentView === "admin" && (
              <AdminPage
                products={products}
                steelTypes={steelTypes}
                orders={orders}
                suppliers={suppliers}
                customers={customers}
                notifications={notifications}
                onAddSteelType={handleAddSteelTypeAction}
                onEditSteelType={handleEditSteelTypeAction}
                onDeleteSteelType={handleDeleteSteelTypeAction}
                onAddProduct={handleAddProductAction}
                onEditProduct={handleEditProductAction}
                onDeleteProduct={handleDeleteProductAction}
                onUpdateOrderStatus={handleUpdateOrderStatusAction}
                onAddSupplier={handleAddSupplierAction}
                onUpdateCustomerStatus={handleUpdateCustomerStatusAction}
                onUpdateSupplierStatus={handleUpdateSupplierStatusAction}
                onUpdateSupplier={handleUpdateSupplierAction}
                onReadAllNotifications={handleReadAllNotificationsAction}
                isLoggedIn={isAdminLoggedIn}
                onLoginSuccess={handleAdminLoginSuccess}
                onLogout={handleLogoutAction}
              />
            )}

            {currentView === "supplier" && (
              <SupplierPage
                orders={orders}
                suppliers={suppliers}
                onUpdateOrderStatus={handleUpdateOrderStatusAction}
                loggedInSupplier={currentSupplier}
                onLoginSuccess={handleSupplierLoginSuccess}
                onLogout={handleLogoutAction}
              />
            )}

            {currentView === "support" && (
              <SupportPage
                onBackToApp={() => {
                  setView("client");
                  window.history.pushState({}, "", "/");
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-6 border-t border-slate-800 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-extrabold text-orange-500 mb-1">منصة أساس لحديد التسليح الإنشائي © 2026</p>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            منصة تداول وتجهيز حديد تسليح الأبنية والجسور - مطابقة للمواصفات العراقية والعربية القياسية. مصممة لدعم الموردين واللوجستيات والمقاولين.
          </p>
        </div>
      </footer>

      {/* Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={handleCustomerLoginSuccess}
      />
    </div>
  );
}
