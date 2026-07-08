/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Product, SteelType, Order, CartItem, Customer } from "../types";
import { Search, ShoppingCart, Info, HardHat, Check, User, Phone, MapPin, ClipboardCheck, ArrowLeft, Clock, Truck, Save, ShieldAlert, MessageCircle, Send } from "lucide-react";
import { updateCustomerProfile } from "../services/api";

interface ClientPageProps {
  products: Product[];
  steelTypes: SteelType[];
  orders: Order[];
  cart: CartItem[];
  addToCart: (product: Product, qty: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, qty: number) => void;
  onSubmitOrder: (
    clientName: string,
    clientPhone: string,
    clientAddress: string,
    clientProvince?: string,
    customerId?: string | null
  ) => Promise<any>;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  currentCustomer: Customer | null;
  onOpenAuthModal: () => void;
  onUpdateCustomer: (customer: Customer) => void;
}

const IRAQI_GOVERNORATES = [
  "بغداد",
  "البصرة",
  "نينوى",
  "أربيل",
  "السليمانية",
  "دهوك",
  "كركوك",
  "بابل",
  "كربلاء",
  "النجف",
  "الأنبار",
  "ذي قار",
  "ميسان",
  "المثنى",
  "القادسية",
  "واسط",
  "صلاح الدين",
  "ديالى"
];

export default function ClientPage({
  products,
  steelTypes,
  orders,
  cart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  onSubmitOrder,
  cartOpen,
  setCartOpen,
  currentCustomer,
  onOpenAuthModal,
  onUpdateCustomer
}: ClientPageProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "tracking">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDiameter, setSelectedDiameter] = useState("all");

  // Cart Form state
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientProvince, setClientProvince] = useState("بغداد");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [clientNotes, setClientNotes] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");

  // Profile Edit states
  const [profileName, setProfileName] = useState("");
  const [profileGov, setProfileGov] = useState("بغداد");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");

  // Tracking query state
  const [trackingPhone, setTrackingPhone] = useState("");
  const [trackedOrders, setTrackedOrders] = useState<Order[]>([]);
  const [hasTracked, setHasTracked] = useState(false);

  const ordersToDisplay = currentCustomer
    ? orders.filter((o) => o.customerId === currentCustomer.id || o.clientPhone.trim() === currentCustomer.phone.trim())
    : trackedOrders;

  const sortedOrdersToDisplay = [...ordersToDisplay].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Synchronize state with logged in customer
  useEffect(() => {
    if (currentCustomer) {
      setClientName(currentCustomer.name);
      setClientPhone(currentCustomer.phone);
      setClientAddress(currentCustomer.address || "");
      setClientProvince(currentCustomer.governorate || "بغداد");

      setProfileName(currentCustomer.name);
      setProfileGov(currentCustomer.governorate || "بغداد");
      setProfileAddress(currentCustomer.address || "");
    } else {
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setClientProvince("بغداد");

      setProfileName("");
      setProfileGov("بغداد");
      setProfileAddress("");
    }
    setProfileSuccess("");
  }, [currentCustomer]);

  // Extract unique diameters
  const diameters = Array.from(new Set(products.map((p) => p.diameter)));

  // Filter products
  const filteredProducts = products.filter((p) => {
    const typeMatches = selectedType === "all" || p.typeId === selectedType;
    const diameterMatches = selectedDiameter === "all" || p.diameter === selectedDiameter;
    const nameMatches = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.diameter.includes(searchQuery);
    return typeMatches && diameterMatches && nameMatches;
  });

  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !clientAddress) {
      alert("يرجى ملء جميع الحقول المطلوبة لإرسال الطلب");
      return;
    }
    if (!cart.length) {
      alert("سلتك فارغة حالياً");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Capture cart items before submitting (since onSubmitOrder clears the cart)
      const cartItemsCopy = [...cart];
      
      // 2. Submit order to the backend database
      const order = await onSubmitOrder(
        clientName,
        clientPhone,
        clientAddress,
        clientProvince,
        currentCustomer?.id
      );

      // 3. Construct WhatsApp message and official URL
      const managerPhone = "9647732670436";
      const productsText = cartItemsCopy.map((item) => {
        const typeObj = steelTypes.find((t) => t.id === item.product.typeId);
        const typeName = typeObj?.name || "حديد تسليح";
        return `- اسم المنتج: ${item.product.name}
- النوع: ${typeName}
- القطر: ${item.product.diameter}
- الكمية: ${item.quantity} طن
- سعر الوحدة: ${item.product.price.toLocaleString()} د.ع`;
      }).join("\n\n");

      const messageText = `طلب جديد من منصة أساس

اسم العميل: ${clientName}
رقم الهاتف: ${clientPhone}

المنتجات:
${productsText}

إجمالي الطلب: ${cartTotal.toLocaleString()} د.ع

عنوان التسليم: ${clientProvince} - ${clientAddress}

ملاحظات العميل: ${clientNotes.trim() || "لا توجد"}`;

      const waUrl = `https://wa.me/${managerPhone}?text=${encodeURIComponent(messageText)}`;
      setWhatsappUrl(waUrl);
      setOrderSuccess(order);

      // Reset form if not logged in (if logged in, keep details prefilled)
      if (!currentCustomer) {
        setClientName("");
        setClientPhone("");
        setClientAddress("");
        setClientProvince("بغداد");
        setClientNotes("");
      } else {
        setClientNotes("");
      }
      setCartOpen(false);

      // 4. Automatically open WhatsApp in a new tab/application
      setTimeout(() => {
        try {
          window.open(waUrl, "_blank");
        } catch (err) {
          console.error("Failed to automatically open WhatsApp popup:", err);
        }
      }, 200);

    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء إرسال الطلب. يرجى التحقق من توفر كميات كافية في المستودع.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    setProfileLoading(true);
    setProfileSuccess("");
    try {
      const res = await updateCustomerProfile(currentCustomer.id, {
        name: profileName,
        governorate: profileGov,
        address: profileAddress
      });
      if (res.success && res.customer) {
        setProfileSuccess("تم تحديث بياناتك الشخصية بنجاح بنظام أساس");
        onUpdateCustomer(res.customer);
      }
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء تحديث الملف الشخصي");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleTrackOrders = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingPhone) return;
    const found = orders.filter(
      (o) => o.clientPhone.trim() === trackingPhone.trim()
    );
    // Sort by newest
    found.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setTrackedOrders(found);
    setHasTracked(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">قيد المراجعة</span>;
      case "approved":
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">تمت الموافقة</span>;
      case "assigned":
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-800 border border-sky-200">تم تحويل الطلب إلى المورد</span>;
      case "preparing":
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">قيد التجهيز</span>;
      case "ready":
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-violet-100 text-violet-800 border border-violet-200">جاهز للتسليم</span>;
      case "delivered":
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-emerald-800 border border-green-200 font-sans">تم التسليم</span>;
      case "rejected":
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">مرفوض</span>;
      default:
        return <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getStatusTextArabic = (status: string) => {
    switch (status) {
      case "pending_review": return "تم استلام طلبك وهو قيد المراجعة والتدقيق حالياً من قبل الإدارة";
      case "approved": return "وافقت الإدارة على طلبك تمهيداً لاختيار المورد الأنسب للبدء بالتوريد";
      case "assigned": return "تم اختيار المورد المناسب وتحويل الطلب إليه لبدء اللوجستيات والتعبئة";
      case "preparing": return "يقوم المورد حالياً بوزن وربط وتجهيز حديد التسليح المطلوب من المخازن";
      case "ready": return "الشحنة جاهزة للتسليم ومنطلقة باتجاه موقع العمل المحدد بالتفصيل";
      case "delivered": return "تم تفريغ حديد التسليح بنجاح وتسليم الشحنة لموقع العميل. شكراً لتعاملكم!";
      case "rejected": return "نعتذر منك، تم رفض الطلب بسبب عدم تطابق الكميات أو شروط التجهيز";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Hero Banner Section */}
      <div className="relative bg-slate-950 text-white overflow-hidden py-16 px-4 border-b border-orange-500/20">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f97316_1px,transparent_1.5px)] [background-size:24px_24px] construction-grid"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between relative z-10 gap-8">
          <div className="text-right max-w-xl">
            <div className="inline-flex items-center space-x-2 space-x-reverse bg-orange-500/15 border border-orange-500/30 px-3.5 py-1.5 rounded-full text-orange-400 text-sm font-bold mb-4">
              <HardHat className="h-4 w-4 animate-bounce-slow" />
              <span>حديد تسليح مطابِق للمواصفات القياسية</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight font-sans">
              نبني المستقبل على <span className="text-orange-500 underline decoration-2 decoration-orange-500/50">أَسَاسٍ</span> مَتِين
            </h1>
            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
              المنصة الرسمية الأولى لبيع وتوريد حديد التسليح بكافة الأقطار والمواصفات (التركي، الإماراتي، العراقي). دقة في التجهيز، سرعة في التوصيل، وأسعار منافسة بالطن.
            </p>
          </div>
          <div className="flex space-x-3 space-x-reverse">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === "catalog"
                  ? "bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20 transform scale-105"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              استعراض حديد التسليح
            </button>
            <button
              onClick={() => setActiveTab("tracking")}
              className={`px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === "tracking"
                  ? "bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20 transform scale-105"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              تتبع الطلبات القائمة
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {/* Success Modal / Banner */}
        {orderSuccess && (
          <div className="mb-8 p-6 bg-emerald-50 border-r-4 border-emerald-500 rounded-xl shadow-sm text-right relative overflow-hidden">
            <div className="absolute left-4 top-4 bg-emerald-500/10 p-3 rounded-full text-emerald-600">
              <ClipboardCheck className="h-8 w-8 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-emerald-900 font-sans">تم حفظ وإرسال طلبك بنجاح!</h3>
            <p className="text-emerald-700 text-sm mt-1">
              رقم طلبك الفريد هو: <strong className="text-emerald-900 select-all">#{orderSuccess.id}</strong>.
            </p>
            <p className="text-emerald-800 text-xs mt-3 leading-relaxed">
              لقد تم حفظ الطلب بنجاح بنظام منصة أساس. لتأكيد الطلب وتسريعه فورياً، يرجى إرسال نسخة من الفاتورة للمدير عبر واتساب بالنقر على الزر الملون أدناه.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 items-center">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 shadow-sm hover:shadow-md animate-pulse"
                >
                  <MessageCircle className="h-4.5 w-4.5 text-white" />
                  <span>إرسال الطلب الآن عبر واتساب</span>
                </a>
              )}
              <button
                onClick={() => {
                  setTrackingPhone(orderSuccess.clientPhone);
                  setActiveTab("tracking");
                  setOrderSuccess(null);
                  // Fire tracking search
                  const found = orders.filter((o) => o.clientPhone.trim() === orderSuccess.clientPhone.trim());
                  found.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                  setTrackedOrders([orderSuccess, ...found.filter(o => o.id !== orderSuccess.id)]);
                  setHasTracked(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all"
              >
                تتبع طلبي بالمنصة
              </button>
              <button
                onClick={() => setOrderSuccess(null)}
                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-4 py-2.5 rounded-lg text-xs font-bold transition-all"
              >
                إغلاق التنبيه
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Product Catalog */}
        {activeTab === "catalog" && (
          <div>
            {/* Filters Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse w-full lg:w-auto">
                <Search className="text-slate-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="ابحث عن قياس، قطر، أو اسم الحديد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full lg:w-80 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center">
                {/* Steel Type Filter */}
                <div className="flex items-center space-x-1.5 space-x-reverse">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">النوع:</span>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  >
                    <option value="all">الكل</option>
                    {steelTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Diameter Filter */}
                <div className="flex items-center space-x-1.5 space-x-reverse">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">القطر:</span>
                  <select
                    value={selectedDiameter}
                    onChange={(e) => setSelectedDiameter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  >
                    <option value="all">الكل</option>
                    {diameters.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Catalog Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <HardHat className="mx-auto h-12 w-12 text-slate-300 mb-3 animate-pulse" />
                <p className="text-slate-500 font-bold">لا توجد منتجات حديد تسليح تطابق خيارات البحث الحالية.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedType("all");
                    setSelectedDiameter("all");
                  }}
                  className="mt-4 text-orange-500 hover:text-orange-600 font-bold text-sm"
                >
                  إعادة تعيين خيارات التصفية
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((p) => {
                  const typeObj = steelTypes.find((t) => t.id === p.typeId);
                  const isLowStock = p.quantity > 0 && p.quantity <= 15;
                  const isOutOfStock = p.quantity <= 0;

                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-orange-500/30 transition-all duration-300 flex flex-col"
                    >
                      {/* Product Image Panel */}
                      <div className="relative h-48 bg-slate-100 overflow-hidden group">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Type Tag */}
                        <span className="absolute top-3 right-3 bg-slate-900/95 backdrop-blur-xs text-white text-[11px] font-black px-2.5 py-1 rounded-md border border-slate-700">
                          {typeObj?.name || "حديد تسليح"}
                        </span>
                        {/* Diameter Tag */}
                        <span className="absolute bottom-3 right-3 bg-orange-500 text-slate-950 text-xs font-black px-2.5 py-1 rounded-md shadow-sm">
                          قطر {p.diameter}
                        </span>
                      </div>

                      {/* Content Panel */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 font-sans tracking-tight mb-2">
                            {p.name}
                          </h3>
                          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold leading-none">السعر للطن</span>
                              <span className="text-base font-black text-slate-900">
                                {p.price.toLocaleString()} <span className="text-[10px] font-bold text-slate-500">د.ع</span>
                              </span>
                            </div>
                            <div className="text-left">
                              <span className="text-[10px] text-slate-400 block font-bold leading-none">المستودع</span>
                              {isOutOfStock ? (
                                <span className="text-xs font-extrabold text-red-500">نفذت الكمية</span>
                              ) : isLowStock ? (
                                <span className="text-xs font-extrabold text-amber-500">محدود ({p.quantity} طن)</span>
                              ) : (
                                <span className="text-xs font-extrabold text-emerald-600">متوفر ({p.quantity} طن)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Add to Cart Section */}
                        <div className="mt-2">
                          {isOutOfStock ? (
                            <button
                              disabled
                              className="w-full py-3 px-4 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center space-x-2 space-x-reverse"
                            >
                              <span>غير متوفر حالياً بالمستودع</span>
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => addToCart(p, 1)}
                                className="flex-1 bg-slate-900 hover:bg-orange-600 hover:text-slate-950 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-2 space-x-reverse shadow-sm hover:shadow-md"
                              >
                                <ShoppingCart className="h-4.5 w-4.5" />
                                <span>إضافة إلى السلة</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Order Tracking */}
        {activeTab === "tracking" && (
          <div className="max-w-3xl mx-auto space-y-8">
              {/* Profile Details Panel (Only if logged in) */}
              {currentCustomer ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-right">
                  <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <User className="h-5 w-5 text-orange-500" />
                    <span>حساب العميل والبيانات الشخصية</span>
                  </h3>
                  {profileSuccess && (
                    <div className="mb-4 p-3.5 bg-emerald-50 border-r-4 border-emerald-500 rounded-xl text-emerald-800 text-xs font-bold flex gap-2 items-center flex-row-reverse">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}
                  <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">الاسم الكامل للعميل *</label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">رقم الهاتف (معرف الحساب)</label>
                      <input
                        type="tel"
                        disabled
                        value={currentCustomer.phone}
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">المحافظة *</label>
                      <select
                        value={profileGov}
                        onChange={(e) => setProfileGov(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-750 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        {IRAQI_GOVERNORATES.map((gov) => (
                          <option key={gov} value={gov}>
                            {gov}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">تاريخ إنشاء الحساب</label>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-500">
                        {new Date(currentCustomer.createdAt).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" })}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">عنوان وموقع العمل الافتراضي</label>
                      <textarea
                        rows={2}
                        value={profileAddress}
                        onChange={(e) => setProfileAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="sm:col-span-2 text-left pt-2">
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 justify-center inline-flex"
                      >
                        <Save className="h-4 w-4" />
                        <span>{profileLoading ? "جاري الحفظ والتوثيق..." : "تحديث بيانات الحساب"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-right">
                  {/* Promo for Login */}
                  <div className="mb-6 p-5 bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-right">
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 justify-end sm:justify-start">
                        <User className="h-4 w-4 text-orange-500" />
                        <span>تتبع طلباتك تلقائياً وبشكل آمن</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        سجل دخولك الآن لعرض وتعديل بياناتك الشخصية وتتبع مسارات جميع شحنات حديد التسليح السابقة والحالية تلقائياً دون الحاجة لإدخال الرقم يدوياً.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenAuthModal}
                      className="bg-orange-500 hover:bg-orange-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm whitespace-nowrap"
                    >
                      تسجيل الدخول / إنشاء حساب
                    </button>
                  </div>

                  <h2 className="text-lg font-extrabold text-slate-900 mb-2 font-sans flex items-center gap-2">
                    <Truck className="h-5 w-5 text-orange-500" />
                    <span>نظام تتبع شحنات حديد التسليح السريع</span>
                  </h2>
                  <p className="text-slate-500 text-xs mb-6 leading-relaxed">
                    أدخل رقم الهاتف الذي استخدمته عند تقديم الطلب للاطلاع على حالة الشحنة وخطوات التجهيز والتوصيل الحية وتأكيدات المورد.
                  </p>

                  <form onSubmit={handleTrackOrders} className="flex gap-2 mb-2">
                    <input
                      type="tel"
                      required
                      placeholder="مثال: 07732670436"
                      value={trackingPhone}
                      onChange={(e) => setTrackingPhone(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="submit"
                      className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-sm"
                    >
                      بحث وتتبع
                    </button>
                  </form>
                </div>
              )}

              {/* Orders List Section */}
              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 pr-1">
                  <ClipboardCheck className="h-4.5 w-4.5 text-orange-500" />
                  <span>{currentCustomer ? "شحنات حديد التسليح الخاصة بك" : "نتائج تتبع الشحنات"}</span>
                </h3>

                {currentCustomer && sortedOrdersToDisplay.length === 0 && (
                  <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
                    <HardHat className="mx-auto h-12 w-12 text-slate-300 mb-3 animate-pulse" />
                    <p className="font-bold text-sm">لا توجد لديك طلبات حديد تسليح حالياً</p>
                    <p className="text-xs text-slate-400 mt-1">تصفح الكتالوج وأضف كميات حديد التسليح المطلوبة بالطن لبدء طلبك الأول!</p>
                    <button
                      onClick={() => setActiveTab("catalog")}
                      className="mt-4 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-all shadow-sm"
                    >
                      استعراض حديد التسليح بالطن
                    </button>
                  </div>
                )}

                {!currentCustomer && hasTracked && sortedOrdersToDisplay.length === 0 && (
                  <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
                    لم يتم العثور على أي طلبات مسجلة برقم الهاتف هذا. يرجى التأكد من كتابة الرقم بشكل صحيح.
                  </div>
                )}

                {sortedOrdersToDisplay.map((order) => { return (
                <div key={order.id} className="border border-slate-200 rounded-xl p-5 mb-5 hover:border-slate-300 bg-slate-50/50 transition-all text-right">
                  <div className="flex justify-between items-start flex-wrap gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block leading-none">رقم الطلب</span>
                      <span className="text-base font-black text-slate-900 font-mono">#{order.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block leading-none text-left">التاريخ</span>
                      <span className="text-xs text-slate-600 font-medium">
                        {new Date(order.createdAt).toLocaleDateString("ar-IQ", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </span>
                    </div>
                    <div>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="py-4 border-b border-slate-100 text-xs">
                    <h4 className="font-extrabold text-slate-700 mb-2">المواد المطلوبة:</h4>
                    <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-100">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600">
                          <span>{item.name} ({item.diameter}) × {item.quantity} طن</span>
                          <span className="font-bold text-slate-900">{(item.price * item.quantity).toLocaleString()} د.ع</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-100 mt-2 text-sm">
                        <span>الإجمالي</span>
                        <span className="text-orange-600">{order.totalPrice.toLocaleString()} د.ع</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Stepper Progression Pipeline */}
                  {order.status !== "rejected" && (
                    <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <h4 className="font-extrabold text-xs text-slate-700 mb-4 font-sans border-b pb-2">مسار تقدم وتجهيز الطلب:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-y-4 gap-x-2 text-center relative">
                        {[
                          { key: "pending_review", label: "قيد المراجعة" },
                          { key: "approved", label: "تمت الموافقة" },
                          { key: "assigned", label: "تم تحويله للمورد" },
                          { key: "preparing", label: "قيد التجهيز" },
                          { key: "ready", label: "جاهز للتسليم" },
                          { key: "delivered", label: "تم التسليم" },
                        ].map((step, idx) => {
                          const statusOrder = ["pending_review", "approved", "assigned", "preparing", "ready", "delivered"];
                          const currentIdx = statusOrder.indexOf(order.status);
                          const stepIdx = statusOrder.indexOf(step.key);
                          const isCompleted = stepIdx <= currentIdx && currentIdx !== -1;
                          const isActive = step.key === order.status;

                          return (
                            <div key={step.key} className="flex flex-col items-center relative z-10">
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs border transition-all ${
                                  isActive
                                    ? "bg-orange-500 text-slate-950 border-orange-500 ring-4 ring-orange-100 scale-110"
                                    : isCompleted
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                }`}
                              >
                                {isCompleted && !isActive ? <Check className="h-4.5 w-4.5" /> : idx + 1}
                              </div>
                              <span
                                className={`text-[10px] font-black mt-2 whitespace-nowrap block ${
                                  isActive
                                    ? "text-orange-600 font-extrabold scale-105"
                                    : isCompleted
                                    ? "text-slate-900 font-extrabold"
                                    : "text-slate-400"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Progress Pipeline Timeline */}
                  <div className="mt-4">
                    <h4 className="font-extrabold text-xs text-slate-700 mb-4">سجل وحالة الشحنة الفعلي:</h4>
                    
                    <div className="relative pr-6 border-r-2 border-slate-200 space-y-6">
                      {order.statusHistory.map((history, hIdx) => (
                        <div key={hIdx} className="relative">
                          {/* Circle indicator */}
                          <span className="absolute -right-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 ring-4 ring-white">
                            <Check className="h-2.5 w-2.5 text-slate-950 font-bold" />
                          </span>
                          
                          <div className="pr-2">
                            <span className="text-[10px] font-bold text-slate-400 block leading-none">
                              {new Date(history.updatedAt).toLocaleString("ar-IQ")}
                            </span>
                            <span className="text-xs font-extrabold text-slate-800 block mt-1">
                              {history.status === "pending_review" && "تم استلام الطلب وقيد المراجعة"}
                              {history.status === "approved" && "تمت الموافقة على طلب حديد التسليح"}
                              {history.status === "assigned" && "تم تكليف وتحويل الطلب للمورد المعتمد"}
                              {history.status === "preparing" && "قيد التجهيز والوزن وربط الحديد"}
                              {history.status === "ready" && "الحمولة جاهزة للتسليم ومنطلقة للموقع"}
                              {history.status === "delivered" && "تم تسليم الشحنة للموقع وتفريغها بنجاح"}
                              {history.status === "rejected" && "نعتذر، تم رفض الطلب من قبل الإدارة"}
                            </span>
                            {history.note && (
                              <p className="text-slate-500 text-[11px] mt-1.5 bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed font-medium">
                                {history.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100 text-[11px] text-orange-800 leading-relaxed font-medium flex gap-2">
                      <Clock className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>ملاحظة هامة:</strong> {getStatusTextArabic(order.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ); })}
              </div>
            </div>
          )}
      </main>

      {/* Cart Drawer / Sidebar Modal */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay */}
            <div
              onClick={() => setCartOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            ></div>

            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-0 pl-0 sm:pl-10">
              <div className="pointer-events-auto w-screen max-w-md">
                <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl border-r border-slate-200">
                  {/* Cart Header */}
                  <div className="bg-slate-900 px-6 py-6 border-b border-orange-500 text-white flex justify-between items-center">
                    <h2 className="text-base font-black font-sans flex items-center space-x-2 space-x-reverse text-orange-500">
                      <ShoppingCart className="h-5 w-5" />
                      <span>سلة حديد التسليح</span>
                    </h2>
                    <button
                      onClick={() => setCartOpen(false)}
                      className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg border border-slate-700 transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Cart Content */}
                  <div className="flex-1 px-6 py-6 text-right">
                    {cart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <ShoppingCart className="h-14 w-14 text-slate-200 mb-3 animate-pulse" />
                        <p className="font-extrabold text-sm text-slate-600">سلتك فارغة حالياً</p>
                        <p className="text-xs text-slate-400 mt-1">تصفح الكتالوج وأضف كميات حديد التسليح المطلوبة بالطن</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Items list */}
                        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                          {cart.map((item) => (
                            <div key={item.product.id} className="py-4 flex justify-between items-center gap-3">
                              <div className="flex-1">
                                <h4 className="text-xs font-black text-slate-900 leading-tight">
                                  {item.product.name}
                                </h4>
                                <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-sm inline-block mt-1">
                                  قطر {item.product.diameter}
                                </span>
                                <div className="text-[11px] font-extrabold text-slate-500 mt-2">
                                  سعر الطن: {item.product.price.toLocaleString()} د.ع
                                </div>
                              </div>

                              {/* Quantity and Remove controls */}
                              <div className="flex flex-col items-end space-y-2">
                                <div className="flex items-center space-x-1.5 space-x-reverse bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                                  <button
                                    onClick={() => updateCartQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                                    className="h-6 w-6 flex items-center justify-center font-bold bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-black px-2 text-slate-900">{item.quantity} طن</span>
                                  <button
                                    onClick={() => {
                                      if (item.quantity + 1 > item.product.quantity) {
                                        alert(`نعتذر، الكمية المطلوبة تتجاوز المتاح في المستودع حالياً: ${item.product.quantity} طن`);
                                        return;
                                      }
                                      updateCartQuantity(item.product.id, item.quantity + 1);
                                    }}
                                    className="h-6 w-6 flex items-center justify-center font-bold bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="text-[10px] text-red-500 font-extrabold hover:underline"
                                >
                                  حذف من السلة
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Cart Summary Card */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-center text-sm font-bold text-slate-700 mb-1">
                            <span>إجمالي وزن الحديد</span>
                            <span>{cart.reduce((acc, i) => acc + i.quantity, 0)} طن</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-950 font-black text-base border-t border-slate-200 pt-2 mt-2">
                            <span>السعر الإجمالي</span>
                            <span className="text-orange-600 text-lg">{cartTotal.toLocaleString()} د.ع</span>
                          </div>
                        </div>

                        {/* Checkout Form */}
                        {!currentCustomer ? (
                          <div className="border-t border-slate-100 pt-6 text-right space-y-4">
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-center">
                              <ShieldAlert className="h-8 w-8 text-orange-600 mx-auto mb-2 animate-pulse" />
                              <h4 className="text-xs font-black text-slate-800">يجب تسجيل الدخول لإتمام الطلب</h4>
                              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                                تفادياً للطلبات العشوائية وتأميناً لتعاملات الموردين، يرجى تسجيل الدخول برقم هاتفك وتأكيده برمز تحقق لتقديم طلب حديد التسليح ومتابعته.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setCartOpen(false);
                                onOpenAuthModal();
                              }}
                              className="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-black py-3.5 rounded-xl text-xs transition-all duration-200 shadow-md flex items-center justify-center gap-2 flex-row-reverse"
                            >
                              <User className="h-4 w-4" />
                              <span>تسجيل الدخول برقم الهاتف الآن</span>
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleCheckout} className="border-t border-slate-100 pt-4 text-right">
                            <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                              <User className="h-4.5 w-4.5 text-orange-500" />
                              <span>معلومات الشحن وتأكيد الطلب</span>
                            </h3>
                            
                            <div className="space-y-3.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">اسم العميل بالكامل *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="مثال: محمد علي أحمد"
                                  value={clientName}
                                  onChange={(e) => setClientName(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">رقم هاتف العميل *</label>
                                <input
                                  type="tel"
                                  required
                                  disabled
                                  placeholder="مثال: 07732670436"
                                  value={clientPhone}
                                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-left"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">المحافظة المستهدفة للشحن *</label>
                                <select
                                  value={clientProvince}
                                  onChange={(e) => setClientProvince(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700"
                                >
                                  {IRAQI_GOVERNORATES.map((gov) => (
                                    <option key={gov} value={gov}>
                                      {gov}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">عنوان التوصيل وموقع العمل بالتفصيل *</label>
                                <textarea
                                  required
                                  rows={2}
                                  placeholder="بغداد، الكرادة، قرب ساحة التحريات"
                                  value={clientAddress}
                                  onChange={(e) => setClientAddress(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">ملاحظات إضافية للمدير (اختياري)</label>
                                <textarea
                                  rows={2}
                                  placeholder="مثال: يرجى الاتصال قبل التحميل بساعة أو تفاصيل إضافية عن الموقع..."
                                  value={clientNotes}
                                  onChange={(e) => setClientNotes(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-slate-950 font-black py-3.5 rounded-xl text-xs transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 space-x-reverse"
                            >
                              <ClipboardCheck className="h-4.5 w-4.5" />
                              <span>{isSubmitting ? "جاري إرسال طلبك وموازنة الكميات..." : "تأكيد وإرسال طلب حديد التسليح"}</span>
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
