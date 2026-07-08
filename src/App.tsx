/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import Header from "./components/Header";
import ClientPage from "./components/ClientPage";
import AdminPage from "./components/AdminPage";
import SupplierPage from "./components/SupplierPage";
import CustomerAuthModal from "./components/CustomerAuthModal";
import { Product, SteelType, Order, Supplier, CartItem, OrderStatus, Customer } from "./types";
import {
  fetchAppState,
  addSteelType,
  addProduct,
  editProduct,
  deleteProduct,
  createOrder,
  updateOrderStatus,
  addSupplier,
  updateCustomerStatus
} from "./services/api";
import { HardHat } from "lucide-react";

export default function App() {
  const [currentView, setView] = useState<"client" | "admin" | "supplier">("client");
  const [products, setProducts] = useState<Product[]>([]);
  const [steelTypes, setSteelTypes] = useState<SteelType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Customer states
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(() => {
    const saved = localStorage.getItem("asas_current_customer");
    return saved ? JSON.parse(saved) : null;
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Synchronize routing path with browser location
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path === "/admin") {
        setView("admin");
      } else if (path === "/supplier") {
        setView("supplier");
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

  useEffect(() => {
    syncState();
  }, []);

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
        onLogout={() => {
          setCurrentCustomer(null);
          localStorage.removeItem("asas_current_customer");
        }}
        onOpenAuthModal={() => setAuthModalOpen(true)}
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
                onAddSteelType={handleAddSteelTypeAction}
                onAddProduct={handleAddProductAction}
                onEditProduct={handleEditProductAction}
                onDeleteProduct={handleDeleteProductAction}
                onUpdateOrderStatus={handleUpdateOrderStatusAction}
                onAddSupplier={handleAddSupplierAction}
                onUpdateCustomerStatus={handleUpdateCustomerStatusAction}
              />
            )}

            {currentView === "supplier" && (
              <SupplierPage
                orders={orders}
                suppliers={suppliers}
                onUpdateOrderStatus={handleUpdateOrderStatusAction}
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
        onLoginSuccess={(customer) => setCurrentCustomer(customer)}
      />
    </div>
  );
}
