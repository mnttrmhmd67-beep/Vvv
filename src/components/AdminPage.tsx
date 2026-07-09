/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Product, SteelType, Order, Supplier, OrderStatus, Customer, AdminNotification } from "../types";
import { Shield, Lock, Phone, Database, TrendingUp, Plus, Edit2, Trash2, Check, X, ArrowLeft, ArrowUpRight, ClipboardList, Tag, Image, Compass, HelpCircle, Truck, Users, Ban, UserCheck, Search, Eye, Calendar, LogOut, CheckSquare, MessageSquare } from "lucide-react";
import { adminLogin } from "../services/api";

interface AdminPageProps {
  products: Product[];
  steelTypes: SteelType[];
  orders: Order[];
  suppliers: Supplier[];
  customers: Customer[];
  notifications?: AdminNotification[];
  onAddSteelType: (name: string) => Promise<any>;
  onEditSteelType: (id: string, name: string) => Promise<any>;
  onDeleteSteelType: (id: string) => Promise<any>;
  onAddProduct: (prod: Omit<Product, "id">) => Promise<any>;
  onEditProduct: (id: string, prod: Partial<Omit<Product, "id">>) => Promise<any>;
  onDeleteProduct: (id: string) => Promise<any>;
  onUpdateOrderStatus: (id: string, status: OrderStatus, supplierId?: string | null, note?: string) => Promise<any>;
  onAddSupplier: (sup: { name: string; phone: string; pin: string }) => Promise<any>;
  onUpdateCustomerStatus: (id: string, status: "active" | "suspended") => Promise<any>;
  onUpdateSupplierStatus?: (id: string, status: "pending" | "active" | "suspended") => Promise<any>;
  onReadAllNotifications?: () => Promise<any>;
  isLoggedIn?: boolean;
  onLoginSuccess?: (token: string, user: any) => void;
  onLogout?: () => void;
}

export default function AdminPage({
  products,
  steelTypes,
  orders,
  suppliers,
  customers = [],
  notifications = [],
  onAddSteelType,
  onEditSteelType,
  onDeleteSteelType,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onAddSupplier,
  onUpdateCustomerStatus,
  onUpdateSupplierStatus,
  onReadAllNotifications,
  isLoggedIn = false,
  onLoginSuccess,
  onLogout
}: AdminPageProps) {
  // Auth state
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [authError, setAuthError] = useState("");

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<"stats" | "products" | "orders" | "suppliers" | "customers">("stats");

  // Steel Type Editing state
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState("");

  // Forms states
  const [newTypeName, setNewTypeName] = useState("");
  
  // Product Form states (Add & Edit)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodTypeId, setProdTypeId] = useState("");
  const [prodDiameter, setProdDiameter] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodQty, setProdQty] = useState("");
  const [prodImage, setProdImage] = useState("");

  // Routing supplier dialog state
  const [routingOrderId, setRoutingOrderId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  // New supplier form state
  const [newSupName, setNewSupName] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupPin, setNewSupPin] = useState("");

  // Customers tab state
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Filtered list of customers
  const filteredCustomers = (customers || []).filter((c) => {
    const search = customerSearch.trim().toLowerCase();
    if (!search) return true;
    return (
      (c.name || "").toLowerCase().includes(search) ||
      (c.phone || "").toLowerCase().includes(search)
    );
  });

  const handleSelectCustomer = (cust: Customer) => {
    if (selectedCustomer?.id === cust.id) {
      setSelectedCustomer(null);
    } else {
      setSelectedCustomer(cust);
    }
  };

  const handleToggleCustomerStatus = async (cust: Customer, targetStatus: "active" | "suspended") => {
    const confirmationMsg = targetStatus === "suspended"
      ? `هل أنت متأكد من إيقاف حساب العميل (${cust.name})؟ لن يتمكن من تسجيل الدخول أو إرسال طلبات جديدة.`
      : `هل أنت متأكد من إعادة تفعيل حساب العميل (${cust.name})؟`;

    if (confirm(confirmationMsg)) {
      try {
        await onUpdateCustomerStatus(cust.id, targetStatus);
        alert(targetStatus === "suspended" ? "تم إيقاف حساب العميل بنجاح." : "تم إعادة تفعيل حساب العميل بنجاح.");
      } catch (err: any) {
        alert("خطأ: " + err.message);
      }
    }
  };

  // Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminLogin(phone, pin);
      if (res.success && res.token) {
        if (onLoginSuccess) {
          onLoginSuccess(res.token, res.user);
        }
        setAuthError("");
      } else {
        setAuthError("رقم الهاتف أو رمز الدخول غير صحيح! يرجى التحقق من المدخلات.");
      }
    } catch (err: any) {
      setAuthError(err.message || "حدث خطأ أثناء محاولة تسجيل الدخول.");
    }
  };

  // Add steel type
  const handleAddSteelType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    try {
      await onAddSteelType(newTypeName.trim());
      setNewTypeName("");
      alert("تمت إضافة نوع حديد التسليح بنجاح!");
    } catch (err: any) {
      alert("خطأ: " + err.message);
    }
  };

  // Save steel type edit
  const handleSaveSteelTypeEdit = async (id: string) => {
    if (!editingTypeName.trim()) return;
    try {
      await onEditSteelType(id, editingTypeName.trim());
      setEditingTypeId(null);
      setEditingTypeName("");
      alert("تم تعديل نوع حديد التسليح بنجاح!");
    } catch (err: any) {
      alert("خطأ: " + err.message);
    }
  };

  // Delete steel type
  const handleDeleteSteelTypeClick = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف نوع حديد التسليح (${name}) نهائياً؟ قد يؤثر هذا على المنتجات المرتبطة به.`)) {
      try {
        await onDeleteSteelType(id);
        if (editingTypeId === id) {
          setEditingTypeId(null);
          setEditingTypeName("");
        }
        alert("تم حذف نوع حديد التسليح بنجاح.");
      } catch (err: any) {
        alert("خطأ: " + err.message);
      }
    }
  };

  // Open product modal for add
  const openAddProductModal = () => {
    setEditingProductId(null);
    setProdName("");
    setProdTypeId(steelTypes[0]?.id || "");
    setProdDiameter("12 ملم");
    setProdPrice("950000");
    setProdQty("50");
    setProdImage("https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80");
    setIsProductModalOpen(true);
  };

  // Open product modal for edit
  const openEditProductModal = (p: Product) => {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdTypeId(p.typeId);
    setProdDiameter(p.diameter);
    setProdPrice(p.price.toString());
    setProdQty(p.quantity.toString());
    setProdImage(p.imageUrl);
    setIsProductModalOpen(true);
  };

  // Submit product (add or edit)
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodTypeId || !prodDiameter || !prodPrice || !prodQty) {
      alert("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }

    const payload = {
      name: prodName,
      typeId: prodTypeId,
      diameter: prodDiameter,
      price: Number(prodPrice),
      quantity: Number(prodQty),
      imageUrl: prodImage || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
    };

    try {
      if (editingProductId) {
        await onEditProduct(editingProductId, payload);
        alert("تم تعديل منتج حديد التسليح بنجاح!");
      } else {
        await onAddProduct(payload);
        alert("تمت إضافة المنتج الجديد بنجاح!");
      }
      setIsProductModalOpen(false);
    } catch (err: any) {
      alert("حدث خطأ: " + err.message);
    }
  };

  const handleDeleteProductClick = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف المنتج (${name}) نهائياً من الكتالوج؟`)) {
      try {
        await onDeleteProduct(id);
        alert("تم الحذف بنجاح.");
      } catch (err: any) {
        alert("فشل الحذف: " + err.message);
      }
    }
  };

  // Route order to supplier
  const handleRouteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routingOrderId || !selectedSupplierId) return;

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const supplierName = supplier ? supplier.name : "المورد المحدد";

    try {
      await onUpdateOrderStatus(
        routingOrderId,
        "assigned",
        selectedSupplierId,
        `تم تحويل التجهيز واللوجستيات للمورد المعتمد: ${supplierName}`
      );
      setRoutingOrderId(null);
      setSelectedSupplierId("");
      alert("تم تحويل الطلب بنجاح وتكليف المورد المعتمد بالشحن والتجهيز!");
    } catch (err: any) {
      alert("فشل التحويل: " + err.message);
    }
  };

  // Accept order
  const handleAcceptOrder = async (id: string) => {
    try {
      await onUpdateOrderStatus(
        id,
        "approved",
        null,
        "تم قبول الطلب والموافقة عليه من قبل الإدارة، وجاري تعيين المورد الأنسب لشحن وتجهيز حديد التسليح"
      );
      alert("تم قبول الطلب بنجاح وجاري التنسيق مع الموردين!");
    } catch (err: any) {
      alert("فشل الإجراء: " + err.message);
    }
  };

  // Reject order
  const handleRejectOrder = async (id: string) => {
    const reason = prompt("يرجى كتابة سبب رفض الطلب الموجه للعميل:");
    if (reason === null) return; // cancelled prompt

    try {
      await onUpdateOrderStatus(
        id,
        "rejected",
        null,
        `تم رفض الطلب من قبل الإدارة. السبب: ${reason || "عدم تطابق شروط التوريد"}`
      );
      alert("تم رفض الطلب بنجاح وإرجاع كميات الحديد المحجوزة للمستودع.");
    } catch (err: any) {
      alert("فشل الإجراء: " + err.message);
    }
  };

  // Add Supplier
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName || !newSupPhone || !newSupPin) {
      alert("جميع حقول المورد مطلوبة");
      return;
    }
    try {
      await onAddSupplier({ name: newSupName, phone: newSupPhone, pin: newSupPin });
      setNewSupName("");
      setNewSupPhone("");
      setNewSupPin("");
      alert("تم تسجيل وتوثيق حساب المورد الجديد بنجاح!");
    } catch (err: any) {
      alert("فشل إضافة المورد: " + err.message);
    }
  };

  // Calculations for Stats
  const totalProducts = products.length;
  const totalOrders = orders.length;
  const newOrders = orders.filter((o) => o.status === "pending_review").length;
  const pendingOrders = orders.filter((o) => o.status === "approved" || o.status === "assigned" || o.status === "preparing" || o.status === "ready").length;
  const completedOrders = orders.filter((o) => o.status === "delivered").length;
  const rejectedOrders = orders.filter((o) => o.status === "rejected").length;

  const totalSalesRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((acc, o) => acc + o.totalPrice, 0);

  // Authentication Guard Render
  if (!isLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#f97316_1px,transparent_1.5px)] [background-size:20px_20px] pointer-events-none"></div>
        <div className="w-full max-w-md bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600"></div>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-orange-500/10 text-orange-500 mb-4 border border-orange-500/20">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-black text-white font-sans">بوابة الإدارة والمراقبة</h2>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">منصة أساس لتجهيز حديد التسليح</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 text-right">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">رقم هاتف المدير *</label>
              <div className="relative">
                <Phone className="absolute right-3.5 top-3.5 text-slate-500 h-4 w-4" />
                <input
                  type="text"
                  required
                  placeholder="أدخل رقم هاتف المدير"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-10 pl-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-right"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">رمز الدخول السري *</label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-3.5 text-slate-500 h-4 w-4" />
                <input
                  type="password"
                  required
                  placeholder="أدخل رمز الدخول السري"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-10 pl-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-right"
                />
              </div>
            </div>

            {authError && (
              <p className="text-xs font-extrabold text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20 leading-relaxed">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-black py-3.5 rounded-xl text-xs transition-all shadow-lg hover:shadow-orange-500/20"
            >
              تسجيل الدخول للوحة التحكم
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Admin Subheader Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <div className="text-right flex items-center gap-4">
          <div className="bg-orange-500/10 p-3 rounded-2xl text-orange-500 border border-orange-500/20">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-black font-sans text-orange-500">لوحة تحكم المدير العام</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">منصة أساس لبيع وتوريد حديد التسليح</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="mr-4 flex items-center space-x-1.5 space-x-reverse px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </button>
          )}
        </div>

        {/* Tab Selector Links */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "stats" ? "bg-orange-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            لوحة الإحصائيات
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "products" ? "bg-orange-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            كتالوج المنتجات
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "orders" ? "bg-orange-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            إدارة الطلبات القائمة
            {newOrders > 0 && (
              <span className="mr-1.5 px-1.5 py-0.5 text-[9px] font-black bg-red-600 text-white rounded-full">
                {newOrders} جديد
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "suppliers" ? "bg-orange-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            توثيق الموردين
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "customers" ? "bg-orange-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            إدارة العملاء
          </button>
        </div>
      </div>

      {/* VIEW 1: Statistics Dashboard */}
      {activeTab === "stats" && (
        <div className="space-y-8">
          {/* Admin Notifications / Alerts Panel */}
          {notifications && notifications.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl text-right">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-3 border-b border-slate-800 gap-2">
                {onReadAllNotifications && (
                  <button
                    onClick={async () => {
                      try {
                        await onReadAllNotifications();
                      } catch (err: any) {
                        alert(err.message);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                  <h3 className="text-sm font-black text-white font-sans">تنبيهات المنصة والإشعارات الأخيرة</h3>
                </div>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-2xl border transition-all text-xs flex justify-between items-start gap-4 ${
                      notif.read
                        ? "bg-slate-950/40 border-slate-900/60 text-slate-400"
                        : "bg-slate-950 border-orange-500/20 text-slate-200"
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 font-mono">
                      {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString("ar-IQ") : "الآن"}
                    </span>
                    <div className="flex-1 text-right">
                      <div className="flex items-center gap-2 mb-1.5 justify-end">
                        <strong className="text-white font-extrabold">{notif.title}</strong>
                        {!notif.read && <span className="h-2 w-2 rounded-full bg-orange-500"></span>}
                      </div>
                      <p className="whitespace-pre-line text-slate-300 text-[11px] leading-relaxed font-semibold">{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dashboard Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 text-right shadow-xs">
              <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">عدد منتجات الحديد</span>
              <strong className="text-2xl font-black text-slate-950">{totalProducts}</strong>
              <div className="text-[10px] text-slate-500 mt-2 font-medium">صنف تسليح نشط بالكتالوج</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 text-right shadow-xs">
              <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">إجمالي الطلبات</span>
              <strong className="text-2xl font-black text-slate-950">{totalOrders}</strong>
              <div className="text-[10px] text-slate-500 mt-2 font-medium">طلب مستلم من العملاء</div>
            </div>

            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 text-right">
              <span className="text-[10px] font-black text-blue-500 block mb-1 uppercase">طلبات جديدة</span>
              <strong className="text-2xl font-black text-blue-900">{newOrders}</strong>
              <div className="text-[10px] text-blue-600 mt-2 font-medium">بانتظار موافقتك وتحويلها</div>
            </div>

            <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 text-right">
              <span className="text-[10px] font-black text-amber-600 block mb-1 uppercase">طلبات قيد التجهيز</span>
              <strong className="text-2xl font-black text-amber-900">{pendingOrders}</strong>
              <div className="text-[10px] text-amber-600 mt-2 font-medium">لدى الموردين في ساحة العمل</div>
            </div>

            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 text-right col-span-2 lg:col-span-1">
              <span className="text-[10px] font-black text-emerald-600 block mb-1 uppercase">طلبات مكتملة ومسلمة</span>
              <strong className="text-2xl font-black text-emerald-900">{completedOrders}</strong>
              <div className="text-[10px] text-emerald-600 mt-2 font-medium">إجمالي مبيعات طن الحديد</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Financial summary */}
            <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f97316_1px,transparent_1.5px)] [background-size:16px_16px] pointer-events-none"></div>
              <div>
                <span className="text-xs font-black text-orange-400 block mb-1">قيمة المبيعات المكتملة</span>
                <h3 className="text-3xl font-black text-white leading-none font-mono tracking-tight mt-2">
                  {totalSalesRevenue.toLocaleString()} <span className="text-sm">د.ع</span>
                </h3>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed font-semibold">
                  تحتسب فقط الطلبات المستلمة والمسلمة بالكامل من قبل المورد المعتمد وتوقيع العميل النهائي.
                </p>
              </div>
              <div className="mt-8 border-t border-slate-800 pt-4 flex justify-between items-center text-xs">
                <span className="text-slate-400">حجم الحديد المورد</span>
                <strong className="text-white text-sm">
                  {orders.filter(o => o.status === "delivered").reduce((acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + item.quantity, 0), 0)} طن
                </strong>
              </div>
            </div>

            {/* Quick steel type expansion */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 text-right">
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <Tag className="h-4.5 w-4.5 text-orange-500" />
                <span>إضافة أنواع ومصادر حديد تسليح جديدة</span>
              </h3>
              <form onSubmit={handleAddSteelType} className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="مثال: حديد تركي (كردوش)، حديد كربلاء"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-orange-600 hover:text-slate-950 text-white font-bold py-3 rounded-xl text-xs transition-all"
                >
                  حفظ وتسجيل المصدر
                </button>
              </form>

              {/* Steel types count list */}
              <div className="mt-5 text-right">
                <h4 className="text-[10px] font-black text-slate-400 mb-2">الأنواع الحالية المسجلة:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {steelTypes.map((t) => {
                    const isEditing = editingTypeId === t.id;
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between bg-slate-50 text-slate-700 text-[11px] font-bold px-3 py-2 rounded-xl border border-slate-200"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 w-full flex-row-reverse">
                            <input
                              type="text"
                              value={editingTypeName}
                              onChange={(e) => setEditingTypeName(e.target.value)}
                              className="flex-grow bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 text-right"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveSteelTypeEdit(t.id)}
                                className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shrink-0"
                                title="حفظ"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTypeId(null);
                                  setEditingTypeName("");
                                }}
                                className="p-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-all shrink-0"
                                title="إلغاء"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full flex-row-reverse">
                            <span className="text-slate-800 font-extrabold">{t.name}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTypeId(t.id);
                                  setEditingTypeName(t.name);
                                }}
                                className="p-1 text-slate-400 hover:text-orange-500 hover:bg-slate-100 rounded transition-all"
                                title="تعديل الاسم"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSteelTypeClick(t.id, t.name)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition-all"
                                title="حذف النوع"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* User instructions box */}
            <div className="bg-orange-50/50 rounded-3xl border border-orange-200/60 p-6 text-right">
              <h3 className="text-sm font-black text-orange-950 mb-3 flex items-center gap-2">
                <Compass className="h-4.5 w-4.5 text-orange-600" />
                <span>دليل سير العمل التفاعلي</span>
              </h3>
              <ul className="text-[11px] text-orange-900 space-y-2.5 leading-relaxed font-semibold">
                <li className="flex items-start gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-orange-200 text-orange-800 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>يقوم العميل بالطلب وحجز الحديد من المستودع.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-orange-200 text-orange-800 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>يصلك الطلب باللون الأزرق كطلب "جديد" في علامة تبويب "الطلبات".</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-orange-200 text-orange-800 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>اضغط "موافقة وتوجيه" لتحديد المورد وحيازة الشحنة له.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-orange-200 text-orange-800 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                  <span>يقوم المورد بالتجهيز والشحن وتغيير الحالات حتى وصولها لموقع العميل بنجاح.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Products Catalog CRUD */}
      {activeTab === "products" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs text-right">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-black text-slate-900 font-sans">إدارة كتالوج ومنتجات حديد التسليح</h2>
            <button
              onClick={openAddProductModal}
              className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة صنف حديد جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-55 block lg:table-header-group">
                <tr className="border-b border-slate-200 block lg:table-row">
                  <th className="p-4 font-black block lg:table-cell text-slate-600">المنتج</th>
                  <th className="p-4 font-black block lg:table-cell text-slate-600">مصنع الحديد</th>
                  <th className="p-4 font-black block lg:table-cell text-slate-600">القطر</th>
                  <th className="p-4 font-black block lg:table-cell text-slate-600">السعر للطن</th>
                  <th className="p-4 font-black block lg:table-cell text-slate-600">المخزون المتاح</th>
                  <th className="p-4 font-black block lg:table-cell text-slate-600 text-left">التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 block lg:table-row-group">
                {products.map((p) => {
                  const type = steelTypes.find((t) => t.id === p.typeId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 block lg:table-row">
                      <td className="p-4 font-bold block lg:table-cell">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <img src={p.imageUrl} className="h-10 w-10 object-cover rounded-md border" alt="" referrerPolicy="no-referrer" />
                          <span className="font-extrabold text-slate-900">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-semibold block lg:table-cell text-slate-600">
                        {type?.name || "عام"}
                      </td>
                      <td className="p-4 font-black block lg:table-cell">
                        <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-sm text-[10px] border border-orange-100">
                          {p.diameter}
                        </span>
                      </td>
                      <td className="p-4 font-black block lg:table-cell text-slate-900">
                        {p.price.toLocaleString()} د.ع
                      </td>
                      <td className="p-4 font-bold block lg:table-cell">
                        <span className={`${p.quantity <= 15 ? "text-amber-600 font-extrabold" : "text-emerald-600"}`}>
                          {p.quantity} طن
                        </span>
                      </td>
                      <td className="p-4 block lg:table-cell text-left">
                        <div className="flex gap-2 justify-start lg:justify-end">
                          <button
                            onClick={() => openEditProductModal(p)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                            title="تعديل المنتج"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProductClick(p.id, p.name)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                            title="حذف المنتج"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Orders management */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs text-right">
          <h2 className="text-base font-black text-slate-900 font-sans mb-6">متابعة وتوجيه طلبات حديد التسليح المستلمة</h2>

          {orders.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ClipboardList className="mx-auto h-12 w-12 text-slate-200 mb-3" />
              <p className="font-extrabold text-sm">لا توجد طلبات مسجلة في المنصة بعد.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const isPendingReview = order.status === "pending_review";
                const activeSupplier = suppliers.find((s) => s.id === order.supplierId);

                return (
                  <div
                    key={order.id}
                    className={`border-2 rounded-2xl p-5 transition-all text-right ${
                      isPendingReview ? "border-blue-500 bg-blue-50/15" : "border-slate-200 bg-slate-50/10"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-150 gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">رقم الطلب:</span>
                          <strong className="text-base font-black text-slate-900 font-mono">#{order.id}</strong>
                          {isPendingReview && (
                            <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                              طلب جديد قيد المراجعة
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          بتاريخ: {new Date(order.createdAt).toLocaleString("ar-IQ")}
                        </span>
                      </div>

                      {/* Display Status and supplier */}
                      <div className="flex items-center gap-3">
                        {activeSupplier && (
                          <div className="text-left">
                            <span className="text-[10px] text-slate-400 block font-bold">المورد المكلّف</span>
                            <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 font-sans">
                              {activeSupplier.name}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold text-left mb-0.5">الحالة الحالية</span>
                          {order.status === "pending_review" && <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">قيد المراجعة</span>}
                          {order.status === "approved" && <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800">تمت الموافقة</span>}
                          {order.status === "assigned" && <span className="px-3 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-800">تم تحويل الطلب للمورد</span>}
                          {order.status === "preparing" && <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800">قيد التجهيز</span>}
                          {order.status === "ready" && <span className="px-3 py-1 text-xs font-bold rounded-full bg-violet-100 text-violet-800">جاهز للتسليم</span>}
                          {order.status === "delivered" && <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-emerald-800 font-sans">تم التسليم</span>}
                          {order.status === "rejected" && <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800">مرفوض</span>}
                        </div>
                      </div>
                    </div>

                    {/* Client info and order items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                      {/* Client info */}
                      <div className="space-y-1.5 text-xs">
                        <h4 className="font-extrabold text-slate-800 block border-b border-dashed pb-1.5">معلومات العميل والشحن:</h4>
                        <div className="text-slate-600"><span className="font-bold text-slate-400">الاسم:</span> {order.clientName}</div>
                        <div className="text-slate-600"><span className="font-bold text-slate-400">الهاتف:</span> <span className="font-bold select-all text-slate-900">{order.clientPhone}</span></div>
                        <div className="text-slate-600"><span className="font-bold text-slate-400">عنوان التوصيل:</span> {order.clientAddress}</div>
                      </div>

                      {/* Items */}
                      <div className="text-xs">
                        <h4 className="font-extrabold text-slate-800 block border-b border-dashed pb-1.5">الحديد المطلوب بالطن:</h4>
                        <div className="space-y-1.5 mt-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-slate-700 bg-white p-2 rounded border">
                              <span>{item.name} ({item.diameter}) × {item.quantity} طن</span>
                              <strong className="text-slate-900">{(item.price * item.quantity).toLocaleString()} د.ع</strong>
                            </div>
                          ))}
                          <div className="flex justify-between font-black text-slate-900 pt-2 text-sm">
                            <span>السعر الإجمالي</span>
                            <span className="text-orange-600">{order.totalPrice.toLocaleString()} د.ع</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions and Status History Timeline */}
                    <div className="border-t border-slate-150 pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                      {/* History dropdown display */}
                      <div className="text-xs text-slate-500 max-w-md w-full">
                        <span className="font-extrabold text-slate-700 block mb-1">آخر تحديث في التتبع:</span>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-[11px] leading-relaxed font-semibold">
                          {order.statusHistory[order.statusHistory.length - 1]?.note}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {isPendingReview && (
                          <>
                            <button
                              onClick={() => handleAcceptOrder(order.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1 shadow-sm"
                            >
                              <Check className="h-4 w-4" />
                              <span>قبول الطلب</span>
                            </button>
                            <button
                              onClick={() => {
                                setRoutingOrderId(order.id);
                                setSelectedSupplierId(suppliers[0]?.id || "");
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1 shadow-sm"
                            >
                              <Truck className="h-4 w-4" />
                              <span>توجيه للمورد</span>
                            </button>
                            <button
                              onClick={() => handleRejectOrder(order.id)}
                              className="bg-red-50 hover:bg-red-150 text-red-600 font-extrabold px-4 py-2 rounded-xl text-xs transition-all"
                            >
                              رفض الطلب
                            </button>
                          </>
                        )}

                        {order.status === "approved" && (
                          <>
                            <button
                              onClick={() => {
                                setRoutingOrderId(order.id);
                                setSelectedSupplierId(suppliers[0]?.id || "");
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1 shadow-sm"
                            >
                              <Truck className="h-4 w-4" />
                              <span>اختيار وتحويل للمورد</span>
                            </button>
                            <button
                              onClick={() => handleRejectOrder(order.id)}
                              className="bg-red-50 hover:bg-red-150 text-red-600 font-extrabold px-4 py-2 rounded-xl text-xs transition-all"
                            >
                              رفض الطلب
                            </button>
                          </>
                        )}

                        <div className="flex items-center space-x-2 space-x-reverse bg-slate-150 p-1 rounded-xl border">
                          <span className="text-[10px] font-black text-slate-600 whitespace-nowrap">تغيير الحالة في أي وقت:</span>
                          <select
                            value={order.status}
                            onChange={async (e) => {
                              try {
                                await onUpdateOrderStatus(
                                  order.id,
                                  e.target.value as OrderStatus,
                                  order.supplierId,
                                  `قام مدير المنصة بتحديث حالة الشحنة إدارياً إلى: ${e.target.value}`
                                );
                                alert("تم تحديث حالة الشحنة بنجاح!");
                              } catch (err: any) {
                                alert("فشل التحديث: " + err.message);
                              }
                            }}
                            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                          >
                            <option value="pending_review">قيد المراجعة</option>
                            <option value="approved">تمت الموافقة</option>
                            <option value="assigned">تم تحويل الطلب للمورد</option>
                            <option value="preparing">قيد التجهيز</option>
                            <option value="ready">جاهز للتسليم</option>
                            <option value="delivered">تم التسليم</option>
                            <option value="rejected">مرفوض</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: Suppliers credentials registry */}
      {activeTab === "suppliers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Supplier Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 text-right shadow-xs h-fit">
            <h2 className="text-base font-black text-slate-900 font-sans mb-2">تسجيل حساب مورد جديد بالمنصة</h2>
            <p className="text-slate-500 text-xs mb-5 leading-relaxed">
              قم بإنشاء حسابات مستقلة للموردين وأصحاب المذاخر والتجهيز لتوجيه حمولات حديد التسليح إليهم مباشرة.
            </p>

            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">اسم المورد / الشركة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة تجهيز حديد بغداد"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">رقم الهاتف للدخول *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 07701111111"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">الرمز السري للدخول (PIN) *</label>
                <input
                  type="password"
                  required
                  placeholder="مثال: 123456"
                  value={newSupPin}
                  onChange={(e) => setNewSupPin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-orange-600 hover:text-slate-950 text-white font-black py-3 rounded-xl text-xs transition-all shadow-md"
              >
                تسجيل واعتماد المورد بالبوابة
              </button>
            </form>
          </div>

          {/* List existing suppliers */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 text-right col-span-2 shadow-xs space-y-8">
            {/* 1. Pending Approvals */}
            {suppliers.filter((s) => s.status === "pending").length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-orange-600 flex items-center gap-1 justify-end">
                  <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping"></span>
                  <span>طلبات تسجيل الموردين بانتظار الموافقة ({suppliers.filter((s) => s.status === "pending").length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suppliers.filter((s) => s.status === "pending").map((sup) => {
                    return (
                      <div key={sup.id} className="border-2 border-orange-200 rounded-2xl p-4.5 bg-orange-50/20 text-right space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="bg-orange-100 text-orange-800 text-[9px] font-black px-2 py-0.5 rounded-md">بانتظار الموافقة</span>
                          <h3 className="text-sm font-extrabold text-slate-900">{sup.name}</h3>
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-slate-700">
                          <div><span className="font-bold text-slate-400">اسم المسؤول:</span> <span className="font-bold text-slate-800">{sup.managerName || "غير محدد"}</span></div>
                          <div><span className="font-bold text-slate-400">رقم الهاتف:</span> <strong className="font-bold select-all text-slate-800">{sup.phone}</strong></div>
                          <div><span className="font-bold text-slate-400">المحافظة:</span> <span className="font-bold text-slate-800">{sup.governorate || "غير محدد"}</span></div>
                          {sup.address && <div><span className="font-bold text-slate-400">العنوان:</span> <span className="font-semibold text-slate-600 text-[11px]">{sup.address}</span></div>}
                        </div>

                        {onUpdateSupplierStatus && (
                          <div className="pt-3 border-t border-orange-100 flex gap-2">
                            <button
                              onClick={async () => {
                                if (confirm(`هل أنت متأكد من قبول حساب المورد (${sup.name}) وتنشيطه بالمنصة؟`)) {
                                  try {
                                    await onUpdateSupplierStatus(sup.id, "active");
                                    alert("تم قبول وتنشيط حساب المورد بنجاح!");
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }
                              }}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-[10px] transition-all cursor-pointer text-center"
                            >
                              قبول وتفعيل الحساب
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`هل أنت متأكد من رفض طلب المورد (${sup.name})؟`)) {
                                  try {
                                    await onUpdateSupplierStatus(sup.id, "suspended");
                                    alert("تم رفض طلب المورد بنجاح.");
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }
                              }}
                              className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer text-center"
                            >
                              رفض الطلب
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Approved Suppliers */}
            <div className="space-y-4">
              <h2 className="text-base font-black text-slate-900 font-sans">الموردون واللوجستيون النشطون والموقوفون</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suppliers.filter((s) => s.status !== "pending").map((sup) => {
                  const assignedCount = orders.filter((o) => o.supplierId === sup.id).length;
                  const activeCount = orders.filter((o) => o.supplierId === sup.id && o.status !== "delivered" && o.status !== "rejected").length;
                  const isSuspended = sup.status === "suspended";

                  return (
                    <div key={sup.id} className={`border rounded-2xl p-4.5 bg-slate-50/50 hover:border-slate-300 transition-all text-right space-y-3 ${isSuspended ? "border-red-200 bg-red-50/5" : "border-slate-200"}`}>
                      <div className="flex justify-between items-start">
                        {isSuspended ? (
                          <span className="bg-red-100 text-red-800 text-[9px] font-black px-2 py-0.5 rounded-md">موقف مؤقتاً</span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md">نشط ومفعل</span>
                        )}
                        <h3 className="text-sm font-extrabold text-slate-900">{sup.name}</h3>
                      </div>
                      
                      <div className="space-y-1 mt-1 text-xs text-slate-700">
                        {sup.managerName && <div><span className="font-bold text-slate-400">المسؤول:</span> <span className="font-bold text-slate-800">{sup.managerName}</span></div>}
                        <div><span className="font-bold text-slate-400">هاتف الدخول:</span> <strong className="font-bold select-all text-slate-800">{sup.phone}</strong></div>
                        {sup.governorate && <div><span className="font-bold text-slate-400">المحافظة:</span> <span className="font-bold text-slate-800">{sup.governorate}</span></div>}
                        {sup.pin && <div><span className="font-bold text-slate-400">الرمز السري (PIN):</span> <span className="font-semibold text-slate-800">{sup.pin}</span></div>}
                      </div>

                      <div className="pt-2.5 border-t border-slate-150 flex justify-between items-center text-[10px] font-bold text-slate-500">
                        <span>الطلبات الموجهة: <strong className="text-slate-800 text-xs font-black">{assignedCount}</strong></span>
                        <span className="text-orange-600">قيد التجهيز: <strong className="text-orange-700 text-xs font-black">{activeCount}</strong></span>
                      </div>

                      {onUpdateSupplierStatus && (
                        <div className="pt-2.5 flex justify-end">
                          {isSuspended ? (
                            <button
                              onClick={async () => {
                                if (confirm(`هل أنت متأكد من إعادة تفعيل حساب المورد (${sup.name})؟`)) {
                                  try {
                                    await onUpdateSupplierStatus(sup.id, "active");
                                    alert("تمت إعادة تفعيل حساب المورد بنجاح.");
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }
                              }}
                              className="w-full bg-slate-900 hover:bg-emerald-600 hover:text-white text-white font-bold py-1.5 rounded-lg text-[10px] transition-all cursor-pointer text-center"
                            >
                              إعادة تفعيل الحساب
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                if (confirm(`هل أنت متأكد من إيقاف حساب المورد (${sup.name}) مؤقتاً؟ لن يستطيع تسجيل الدخول أو استلام الطلبات.`)) {
                                  try {
                                    await onUpdateSupplierStatus(sup.id, "suspended");
                                    alert("تم إيقاف حساب المورد بنجاح.");
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }
                              }}
                              className="w-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 font-bold py-1.5 rounded-lg text-[10px] transition-all cursor-pointer text-center"
                            >
                              إيقاف حساب المورد مؤقتاً
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: Customers Management */}
      {activeTab === "customers" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs text-right space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 font-sans">إدارة حسابات العملاء والتحكم بالصلاحيات</h2>
              <p className="text-slate-500 text-xs mt-1">تفعيل أو إيقاف مؤقت لحسابات العملاء، والاطلاع على سجل طلباتهم بشكل دقيق.</p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
              />
            </div>
          </div>

          {/* Table / List */}
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="mx-auto h-12 w-12 text-slate-200 mb-3" />
              <p className="font-extrabold text-sm">لا يوجد عملاء مطابقين للبحث.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="p-4 font-black text-slate-600">العميل</th>
                    <th className="p-4 font-black text-slate-600">رقم الهاتف</th>
                    <th className="p-4 font-black text-slate-600">المحافظة</th>
                    <th className="p-4 font-black text-slate-600">تاريخ التسجيل</th>
                    <th className="p-4 font-black text-slate-600">حالة الحساب</th>
                    <th className="p-4 font-black text-slate-600 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((cust) => {
                    const isSuspended = cust.status === "suspended";
                    const isSelected = selectedCustomer?.id === cust.id;
                    const customerOrdersCount = orders.filter((o) => o.customerId === cust.id || o.clientPhone === cust.phone).length;

                    return (
                      <React.Fragment key={cust.id}>
                        <tr className="hover:bg-slate-50/50 cursor-pointer" onClick={() => handleSelectCustomer(cust)}>
                          <td className="p-4 font-bold">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <div className="h-8 w-8 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center font-black">
                                {cust.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 block">{cust.name}</span>
                                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{cust.address || "العنوان غير محدد"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-600 select-all">
                            {cust.phone}
                          </td>
                          <td className="p-4 font-semibold text-slate-600">
                            {cust.governorate}
                          </td>
                          <td className="p-4 font-bold text-slate-500">
                            {cust.createdAt ? new Date(cust.createdAt).toLocaleDateString("ar-IQ") : "سابق"}
                          </td>
                          <td className="p-4">
                            {isSuspended ? (
                              <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-[10px] border border-red-150 font-black">
                                <Ban className="h-3 w-3" />
                                <span>موقوف (Suspended)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] border border-emerald-150 font-black">
                                <UserCheck className="h-3 w-3" />
                                <span>نشط (Active)</span>
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-left" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 justify-start lg:justify-end">
                              <button
                                onClick={() => handleSelectCustomer(cust)}
                                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                                  isSelected ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                }`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>عرض الطلبات ({customerOrdersCount})</span>
                              </button>
                              
                              {isSuspended ? (
                                <button
                                  onClick={() => handleToggleCustomerStatus(cust, "active")}
                                  className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all flex items-center gap-1"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  <span>تفعيل الحساب</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleCustomerStatus(cust, "suspended")}
                                  className="px-2.5 py-1.5 text-[10px] font-extrabold rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all flex items-center gap-1"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  <span>إيقاف الحساب</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Customer Orders History Drawer / Section */}
                        {isSelected && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={6} className="p-5 text-right border-b border-slate-200">
                              <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                    <ClipboardList className="h-4 w-4 text-orange-500" />
                                    <span>سجل الطلبات والبيانات للعميل: <strong className="text-slate-950 font-black">{cust.name}</strong></span>
                                  </h4>
                                  <button
                                    onClick={() => setSelectedCustomer(null)}
                                    className="p-1 bg-white hover:bg-slate-100 border rounded text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200 text-right space-y-2">
                                  <h5 className="text-[11px] font-bold text-slate-400">معلومات العميل الكاملة</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs mt-1 text-slate-700 font-bold">
                                    <div><span className="text-slate-400 ml-1">الاسم:</span> {cust.name}</div>
                                    <div><span className="text-slate-400 ml-1">رقم الهاتف:</span> {cust.phone}</div>
                                    <div><span className="text-slate-400 ml-1">المحافظة:</span> {cust.governorate}</div>
                                    <div><span className="text-slate-400 ml-1">العنوان بالتفصيل:</span> {cust.address || "غير محدد"}</div>
                                  </div>
                                </div>

                                {/* Orders filtered by this specific customer */}
                                {orders.filter((o) => o.customerId === cust.id || o.clientPhone === cust.phone).length === 0 ? (
                                  <p className="text-xs text-slate-400 font-bold py-4 text-center">لا توجد أي طلبات سابقة لهذا العميل في المنصة.</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {orders
                                      .filter((o) => o.customerId === cust.id || o.clientPhone === cust.phone)
                                      .map((order) => (
                                        <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 text-right space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="font-mono text-xs font-black text-slate-900">رقم الطلب: #{order.id}</span>
                                            <span className="text-[10px] text-slate-400 font-bold">
                                              {new Date(order.createdAt).toLocaleDateString("ar-IQ")} {new Date(order.createdAt).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                          </div>
                                          
                                          <div className="border-t border-slate-100 pt-2 text-[11px] space-y-1 text-slate-600 font-semibold">
                                            {order.items.map((it, idx) => (
                                              <div key={idx} className="flex justify-between">
                                                <span>{it.name} ({it.diameter}) × {it.quantity} طن</span>
                                                <span className="font-bold text-slate-800">{(it.price * it.quantity).toLocaleString()} د.ع</span>
                                              </div>
                                            ))}
                                          </div>

                                          <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs">
                                            <div>
                                              {order.status === "pending_review" && <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-100 text-blue-800">قيد المراجعة</span>}
                                              {order.status === "approved" && <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-indigo-100 text-indigo-800">تمت الموافقة</span>}
                                              {order.status === "assigned" && <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-sky-100 text-sky-800">محول للمورد</span>}
                                              {order.status === "preparing" && <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800">قيد التجهيز</span>}
                                              {order.status === "ready" && <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-violet-100 text-violet-800">جاهز للتسليم</span>}
                                              {order.status === "delivered" && <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-green-100 text-emerald-850">تم التسليم</span>}
                                              {order.status === "rejected" && <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-red-100 text-red-800">مرفوض</span>}
                                            </div>
                                            <strong className="text-orange-600 font-black">{order.totalPrice.toLocaleString()} د.ع</strong>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Product Add / Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md p-6 text-right relative shadow-2xl">
            <h3 className="text-base font-black text-slate-950 mb-4 font-sans">
              {editingProductId ? "تعديل مواصفات حديد التسليح" : "إضافة صنف حديد جديد بالكتالوج"}
            </h3>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الاسم التجاري للمنتج *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شيش حديد 12 ملم"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">المصنع / النوع *</label>
                  <select
                    value={prodTypeId}
                    onChange={(e) => setProdTypeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {steelTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">القطر بالمليمتر *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 12 ملم"
                    value={prodDiameter}
                    onChange={(e) => setProdDiameter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">سعر الطن (د.ع) *</label>
                  <input
                    type="number"
                    required
                    placeholder="مثال: 950000"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-left"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">المخزون المتوفر بالطن *</label>
                  <input
                    type="number"
                    required
                    placeholder="مثال: 120"
                    value={prodQty}
                    onChange={(e) => setProdQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">رابط صورة حديد تسليح توضيحية</label>
                <div className="relative">
                  <Image className="absolute right-3 top-2.5 text-slate-400 h-4 w-4" />
                  <input
                    type="url"
                    placeholder="https://example.com/steel.jpg"
                    value={prodImage}
                    onChange={(e) => setProdImage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-left"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-all"
                >
                  حفظ البيانات
                </button>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Route / Assign Order to Supplier Dialog */}
      {routingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md p-6 text-right relative shadow-2xl">
            <h3 className="text-base font-black text-slate-950 mb-1 font-sans flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-orange-500" />
              <span>موافقة وتوجيه الحمولة لمورد الحديد</span>
            </h3>
            <p className="text-slate-500 text-xs mb-5">
              حدد المورد أو المذخر المعتمد المناسب ليتكلف بتجهيز طلب الحديد رقم #{routingOrderId} وشحنه لموقع العمل للعميل.
            </p>

            {suppliers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-red-500 font-bold mb-4">يرجى تسجيل مورد معتمد أولاً في علامة التبويب "توثيق الموردين" قبل توجيه الطلب.</p>
                <button
                  type="button"
                  onClick={() => {
                    setRoutingOrderId(null);
                    setActiveTab("suppliers");
                  }}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold"
                >
                  تسجيل مورد جديد
                </button>
              </div>
            ) : (
              <form onSubmit={handleRouteOrder} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">اختر المورد المسؤول عن هذا التجهيز *</label>
                  <select
                    value={selectedSupplierId}
                    required
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                  >
                    <option value="" disabled>-- اختر المورد التجهيزي --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs transition-all"
                  >
                    اعتماد الموافقة وتكليف المورد بالشحن
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoutingOrderId(null);
                      setSelectedSupplierId("");
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
