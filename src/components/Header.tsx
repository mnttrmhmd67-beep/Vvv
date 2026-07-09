/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HardHat, Shield, Truck, ShoppingCart, ClipboardList, RefreshCw, User, LogOut, HelpCircle } from "lucide-react";
import { CartItem, Customer, Supplier } from "../types";

interface HeaderProps {
  currentView: "client" | "admin" | "supplier" | "support";
  setView: (view: "client" | "admin" | "supplier" | "support") => void;
  cart: CartItem[];
  toggleCartOpen: () => void;
  onRefresh: () => void;
  loading: boolean;
  currentCustomer: Customer | null;
  onLogout: () => void;
  onOpenAuthModal: () => void;
  isAdminLoggedIn?: boolean;
  currentSupplier?: Supplier | null;
}

export default function Header({
  currentView,
  setView,
  cart,
  toggleCartOpen,
  onRefresh,
  loading,
  currentCustomer,
  onLogout,
  onOpenAuthModal,
  isAdminLoggedIn = false,
  currentSupplier = null
}: HeaderProps) {
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Sync URL paths with view selection for Vercel/routing consistency
  const handleViewChange = (view: "client" | "admin" | "supplier" | "support") => {
    setView(view);
    const paths = {
      client: "/",
      admin: "/admin",
      supplier: "/supplier",
      support: "/support"
    };
    window.history.pushState({}, "", paths[view]);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b-4 border-orange-500 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Section */}
          <div className="flex items-center space-x-3 space-x-reverse cursor-pointer" onClick={() => handleViewChange("client")}>
            <div className="bg-orange-500 p-2.5 rounded-lg shadow-inner flex items-center justify-center text-slate-900 hover:bg-orange-400 transition-colors duration-200">
              <HardHat className="h-7 w-7 animate-bounce-slow" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-wider text-orange-500 font-sans">
                أَسَاس
              </span>
              <span className="text-xs block text-slate-300 font-medium -mt-1">
                منصة حديد التسليح الأولى
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="hidden md:flex space-x-4 space-x-reverse bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              id="nav-client-btn"
              onClick={() => handleViewChange("client")}
              className={`flex items-center space-x-2 space-x-reverse px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                currentView === "client"
                  ? "bg-orange-500 text-slate-950 shadow-md"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <HardHat className="h-4.5 w-4.5" />
              <span>طلب حديد التسليح</span>
            </button>

            <button
              id="nav-admin-btn"
              onClick={() => handleViewChange("admin")}
              className={`flex items-center space-x-2 space-x-reverse px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                currentView === "admin"
                  ? "bg-orange-500 text-slate-950 shadow-md"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Shield className="h-4.5 w-4.5" />
              <span>لوحة التحكم (المدير)</span>
            </button>

            <button
              id="nav-supplier-btn"
              onClick={() => handleViewChange("supplier")}
              className={`flex items-center space-x-2 space-x-reverse px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                currentView === "supplier"
                  ? "bg-orange-500 text-slate-950 shadow-md"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Truck className="h-4.5 w-4.5" />
              <span>بوابة المورد</span>
            </button>

            <button
              id="nav-support-btn"
              onClick={() => handleViewChange("support")}
              className={`flex items-center space-x-2 space-x-reverse px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                currentView === "support"
                  ? "bg-orange-500 text-slate-950 shadow-md"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <HelpCircle className="h-4.5 w-4.5" />
              <span>الدعم الفني</span>
            </button>
          </nav>

          {/* Utility buttons */}
          <div className="flex items-center space-x-3 space-x-reverse">
            {/* Sync Database */}
            <button
              onClick={onRefresh}
              disabled={loading}
              title="تحديث البيانات"
              className={`p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all ${
                loading ? "animate-spin" : ""
              }`}
            >
              <RefreshCw className="h-5 w-5" />
            </button>

            {/* Cart Button (Only relevant on client screen) */}
            <button
              onClick={toggleCartOpen}
              className="relative p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-orange-500 hover:bg-slate-700 hover:text-orange-400 transition-all duration-200"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white ring-2 ring-slate-900 animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Auth Profile Button */}
            {isAdminLoggedIn ? (
              <div className="flex items-center space-x-2 space-x-reverse bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-xl">
                <Shield className="h-4 w-4 text-orange-500 animate-pulse" />
                <span className="text-xs font-black text-orange-400">المدير العام</span>
                <button 
                  onClick={onLogout} 
                  title="تسجيل الخروج" 
                  className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : currentSupplier ? (
              <div className="flex items-center space-x-2 space-x-reverse bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
                <Truck className="h-4 w-4 text-orange-500 animate-pulse" />
                <span className="text-xs font-black text-slate-200 truncate max-w-[120px]">{currentSupplier.name}</span>
                <button 
                  onClick={onLogout} 
                  title="تسجيل الخروج" 
                  className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : currentCustomer ? (
              <div className="flex items-center space-x-2 space-x-reverse bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
                <User className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-black text-slate-200 truncate max-w-[120px]">{currentCustomer.name}</span>
                <button 
                  onClick={onLogout} 
                  title="تسجيل الخروج" 
                  className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={onOpenAuthModal} 
                className="flex items-center space-x-1.5 space-x-reverse px-3 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">تسجيل دخول العميل</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile View Switching Header */}
        <div className="md:hidden flex space-x-2 space-x-reverse pb-4 overflow-x-auto justify-center">
          <button
            onClick={() => handleViewChange("client")}
            className={`flex items-center space-x-1.5 space-x-reverse px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              currentView === "client" ? "bg-orange-500 text-slate-950" : "bg-slate-850 text-slate-300"
            }`}
          >
            <HardHat className="h-4 w-4" />
            <span>طلب الحديد</span>
          </button>
          <button
            onClick={() => handleViewChange("admin")}
            className={`flex items-center space-x-1.5 space-x-reverse px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              currentView === "admin" ? "bg-orange-500 text-slate-950" : "bg-slate-850 text-slate-300"
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>المدير</span>
          </button>
          <button
            onClick={() => handleViewChange("supplier")}
            className={`flex items-center space-x-1.5 space-x-reverse px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              currentView === "supplier" ? "bg-orange-500 text-slate-950" : "bg-slate-850 text-slate-300"
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>المورد</span>
          </button>
          <button
            onClick={() => handleViewChange("support")}
            className={`flex items-center space-x-1.5 space-x-reverse px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              currentView === "support" ? "bg-orange-500 text-slate-950" : "bg-slate-850 text-slate-300"
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>الدعم</span>
          </button>
        </div>
      </div>
    </header>
  );
}
