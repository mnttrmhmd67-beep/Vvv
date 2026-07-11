/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Product, Order, Supplier, OrderStatus } from "../types";
import { Truck, Phone, Lock, Calendar, ClipboardCheck, Play, Send, CheckCircle2, Navigation, MessageSquare, AlertCircle, Ban, User, MapPin } from "lucide-react";
import { supplierLogin, registerSupplier } from "../services/api";

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

interface SupplierPageProps {
  orders: Order[];
  suppliers: Supplier[];
  onUpdateOrderStatus: (id: string, status: OrderStatus, supplierId?: string | null, note?: string) => Promise<any>;
  loggedInSupplier?: Supplier | null;
  onLoginSuccess?: (token: string, supplier: Supplier) => void;
  onLogout?: () => void;
}

export default function SupplierPage({
  orders,
  suppliers,
  onUpdateOrderStatus,
  loggedInSupplier = null,
  onLoginSuccess,
  onLogout
}: SupplierPageProps) {
  // Authentication & View States
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [authError, setAuthError] = useState("");

  // Registration States
  const [regName, setRegName] = useState("");
  const [regManagerName, setRegManagerName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regGovernorate, setRegGovernorate] = useState("بغداد");
  const [regAddress, setRegAddress] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const pathParts = window.location.pathname.split("/");
  const requestedSupplierId = pathParts[2] || null;

  // Check if they are accessing a different supplier ID than logged in
  const isUnauthorized = loggedInSupplier && requestedSupplierId && requestedSupplierId !== loggedInSupplier.id;

  React.useEffect(() => {
    // If logged in and at /supplier (no ID), redirect to their own ID page
    if (loggedInSupplier && !requestedSupplierId) {
      window.history.replaceState({}, "", `/supplier/${loggedInSupplier.id}`);
    }
  }, [loggedInSupplier, requestedSupplierId]);

  // Custom driver/note state for active orders
  const [deliveryNote, setDeliveryNote] = useState<{ [orderId: string]: string }>({});

  const handleSupplierLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await supplierLogin(phone);
      if (res.success && res.token && res.user) {
        if (onLoginSuccess) {
          onLoginSuccess(res.token, res.user);
        }
        setAuthError("");
      } else {
        setAuthError("رقم الهاتف غير مسجل أو غير صحيح.");
      }
    } catch (err: any) {
      setAuthError(err.message || "حدث خطأ أثناء محاولة تسجيل الدخول.");
    }
  };

  const handleSupplierRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setRegLoading(true);
    try {
      const res = await registerSupplier({
        name: regName,
        managerName: regManagerName,
        phone: regPhone,
        governorate: regGovernorate,
        address: regAddress
      });
      if (res.success) {
        setRegSuccess(true);
        
        // Open WhatsApp in a new window immediately
        try {
          const text = `🆕 تم تسجيل مورد جديد (بانتظار الموافقة)\nالشركة: ${regName}\nالمسؤول: ${regManagerName}\nالهاتف: ${regPhone}\nالمحافظة: ${regGovernorate}`;
          const encodedText = encodeURIComponent(text);
          window.open(`https://wa.me/9647732670436?text=${encodedText}`, "_blank");
        } catch (waErr) {
          console.error("Failed to auto-open WhatsApp:", waErr);
        }

        // Reset form
        setRegName("");
        setRegManagerName("");
        setRegPhone("");
        setRegAddress("");
      }
    } catch (err: any) {
      setAuthError(err.message || "حدث خطأ أثناء تقديم طلب التسجيل");
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    setPhone("");
  };

  // Filter orders assigned ONLY to this supplier
  const assignedOrders = loggedInSupplier
    ? orders.filter((o) => o.supplierId === loggedInSupplier.id)
    : [];

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await onUpdateOrderStatus(
        orderId,
        "preparing",
        loggedInSupplier!.id,
        "أكد المورد استلام أمر الشحن، وجاري البدء بوزن وتجهيز حديد التسليح المطلوب."
      );
      alert("تم قبول الطلب وبدء عملية التجهيز بنجاح!");
    } catch (err: any) {
      alert("فشل الإجراء: " + err.message);
    }
  };

  const handleShipOrder = async (orderId: string) => {
    const note = deliveryNote[orderId] || "";
    const fullNote = `تم تحميل حديد التسليح على الشاحنة وهو في طريقه لموقع العميل حالياً. ${
      note ? "ملاحظة الشحن والتسليم: " + note : ""
    }`;

    try {
      await onUpdateOrderStatus(
        orderId,
        "ready",
        loggedInSupplier!.id,
        fullNote
      );
      // clear note input
      setDeliveryNote((prev) => ({ ...prev, [orderId]: "" }));
      alert("تم إطلاق الشاحنة وتحديث حالة الشحنة إلى (جاهز للتسليم)!");
    } catch (err: any) {
      alert("فشل الإجراء: " + err.message);
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    try {
      await onUpdateOrderStatus(
        orderId,
        "delivered",
        loggedInSupplier!.id,
        "أكد المورد تسليم الشحنة وتفريغ حديد التسليح بالكامل في موقع العمل المحدد، وتم استلام الوصل."
      );
      alert("تم تأكيد توصيل الشحنة بنجاح وإغلاق ملف الطلب كمكتمل!");
    } catch (err: any) {
      alert("فشل الإجراء: " + err.message);
    }
  };

  // Stats for logged in supplier
  const incomingCount = assignedOrders.filter((o) => o.status === "assigned").length;
  const preparingCount = assignedOrders.filter((o) => o.status === "preparing").length;
  const shippedCount = assignedOrders.filter((o) => o.status === "ready").length;
  const completedCount = assignedOrders.filter((o) => o.status === "delivered").length;

  if (isUnauthorized) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ef4444_1px,transparent_1.5px)] [background-size:20px_20px] pointer-events-none"></div>
        <div className="w-full max-w-md bg-slate-900 border-2 border-red-900/50 rounded-3xl shadow-2xl p-8 relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>

          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500/10 text-red-500 mb-6 border border-red-500/20 animate-pulse">
            <Ban className="h-9 w-9" />
          </div>

          <h2 className="text-xl font-black text-white font-sans mb-3">غير مصرح بالوصول!</h2>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            عذراً، لا تملك الصلاحية للوصول إلى بيانات أو طلبات مورد آخر. تم منع هذا الإجراء لحماية أمن وسرية البيانات.
          </p>

          <button
            onClick={() => {
              window.history.pushState({}, "", `/supplier/${loggedInSupplier.id}`);
              window.dispatchEvent(new Event("popstate"));
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-black py-3.5 rounded-xl text-xs transition-all shadow-lg hover:shadow-orange-500/20 cursor-pointer"
          >
            الذهاب إلى لوحة التحكم الخاصة بي
          </button>
        </div>
      </div>
    );
  }

  if (!loggedInSupplier) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#f97316_1px,transparent_1.5px)] [background-size:20px_20px] pointer-events-none"></div>
        <div className="w-full max-w-lg bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600"></div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-orange-500/10 text-orange-500 mb-4 border border-orange-500/20">
              <Truck className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-black text-white font-sans">بوابة الموردين واللوجستيات</h2>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">منصة أساس لتجهيز حديد التسليح</p>
          </div>

          {/* Tab Selector */}
          {!regSuccess && (
            <div className="grid grid-cols-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-6">
              <button
                onClick={() => { setActiveTab("login"); setAuthError(""); }}
                className={`py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === "login"
                    ? "bg-orange-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => { setActiveTab("register"); setAuthError(""); }}
                className={`py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === "register"
                    ? "bg-orange-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                إنشاء حساب مورد جديد
              </button>
            </div>
          )}

          {regSuccess ? (
            <div className="text-center py-6 space-y-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 mb-2">
                <CheckCircle2 className="h-9 w-9 animate-bounce" />
              </div>
              <h3 className="text-lg font-black text-white">تم تقديم طلب التسجيل بنجاح!</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                حساب المورد الخاص بك قيد الانتظار حالياً وبانتظار تفعيل وموافقة الإدارة العامة لمنصة أساس.
              </p>

              <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-800 text-right text-xs text-slate-300 space-y-2.5 leading-relaxed font-semibold">
                <span className="text-orange-500 font-black block">لتسريع عملية التفعيل:</span>
                <p className="text-[11px] text-slate-400">
                  يرجى النقر على الزر أدناه لإرسال بيانات تسجيل حسابك تلقائياً إلى رقم المدير العام لتسريع الموافقة:
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    const text = `🆕 تم تسجيل مورد جديد (بانتظار الموافقة)\nيرجى تفعيل حسابي:\nالشركة: ${regName}\nالمسؤول: ${regManagerName}\nالهاتف: ${regPhone}`;
                    const encodedText = encodeURIComponent(text);
                    window.open(`https://wa.me/9647732670436?text=${encodedText}`, "_blank");
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-green-500/20"
                >
                  <MessageSquare className="h-4 w-4" />
                  إرسال طلب التفعيل لواتساب المدير العام
                </button>

                <button
                  onClick={() => {
                    setRegSuccess(false);
                    setActiveTab("login");
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl text-xs transition-all"
                >
                  الذهاب لصفحة تسجيل الدخول
                </button>
              </div>
            </div>
          ) : activeTab === "login" ? (
            <div className="space-y-6">
              <form onSubmit={handleSupplierLogin} className="space-y-5 text-right">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 font-sans">رقم هاتف المورد المسجل *</label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-3.5 text-slate-500 h-4 w-4" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: 077XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-10 pl-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                    />
                  </div>
                </div>

                {authError && (
                  <p className="text-xs font-extrabold text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-black py-3.5 rounded-xl text-xs transition-all shadow-lg hover:shadow-orange-500/20 cursor-pointer"
                >
                  تسجيل الدخول لبوابة التجهيز
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSupplierRegister} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 font-sans">اسم الشركة أو المكتب التجاري *</label>
                <div className="relative">
                  <Truck className="absolute right-3.5 top-3.5 text-slate-500 h-4 w-4" />
                  <input
                    type="text"
                    required
                    placeholder="مثال: مذخر حديد الرافدين للتجهيز"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-10 pl-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 font-sans">اسم المدير / الشخص المسؤول *</label>
                <div className="relative">
                  <User className="absolute right-3.5 top-3.5 text-slate-500 h-4 w-4" />
                  <input
                    type="text"
                    required
                    placeholder="الاسم الكامل للشخص المسؤول عن الطلبات والتحميل"
                    value={regManagerName}
                    onChange={(e) => setRegManagerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-10 pl-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 font-sans">رقم الهاتف (فريد لتسجيل الدخول) *</label>
                <div className="relative">
                  <Phone className="absolute right-3.5 top-3.5 text-slate-500 h-4 w-4" />
                  <input
                    type="text"
                    required
                    placeholder="مثال: 077XXXXXXXX"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-10 pl-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 font-sans">المحافظة *</label>
                <div className="relative">
                  <MapPin className="absolute right-3.5 top-3.5 text-slate-500 h-4 w-4 pointer-events-none" />
                  <select
                    value={regGovernorate}
                    onChange={(e) => setRegGovernorate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-10 pl-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-right appearance-none"
                  >
                    {IRAQI_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 font-sans">العنوان (اختياري)</label>
                <textarea
                  placeholder="مثال: المنطقة الصناعية، قرب المعارض"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                />
              </div>

              {authError && (
                <p className="text-xs font-extrabold text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={regLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-slate-950 font-black py-3.5 rounded-xl text-xs transition-all shadow-lg hover:shadow-orange-500/20 cursor-pointer"
              >
                {regLoading ? "جاري إرسال طلب التسجيل..." : "تقديم طلب تسجيل المورد للتدقيق الإداري"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Welcome subheader */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <div className="text-right flex items-center gap-4">
          <div className="bg-orange-500/10 p-3 rounded-2xl text-orange-500 border border-orange-500/20">
            <Truck className="h-8 w-8" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none mb-1">المورد المعتمد النشط</span>
            <h1 className="text-lg font-black font-sans text-orange-500">{loggedInSupplier.name}</h1>
            <p className="text-xs text-slate-300 font-medium mt-0.5">رمز تسجيل الدخول: {loggedInSupplier.phone}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="bg-slate-950 hover:bg-red-950 text-slate-300 hover:text-red-400 border border-slate-800 hover:border-red-900 px-4 py-2 rounded-xl text-xs font-bold transition-all"
        >
          تسجيل خروج المورد
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 text-right shadow-xs">
          <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">طلبات جديدة معلّقة</span>
          <strong className="text-2xl font-black text-indigo-600">{incomingCount}</strong>
          <div className="text-[10px] text-slate-500 mt-2 font-medium">بانتظار تأكيد الاستلام</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 text-right shadow-xs">
          <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">قيد الوزن والتجهيز</span>
          <strong className="text-2xl font-black text-amber-600">{preparingCount}</strong>
          <div className="text-[10px] text-slate-500 mt-2 font-medium">حمولات يتم ربطها ووزنها</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 text-right shadow-xs">
          <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">حمولات في الطريق</span>
          <strong className="text-2xl font-black text-purple-600">{shippedCount}</strong>
          <div className="text-[10px] text-slate-500 mt-2 font-medium">شاحنات في الطريق للموقع</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 text-right shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">طلبات مسلمة ومكتملة</span>
          <strong className="text-2xl font-black text-emerald-600">{completedCount}</strong>
          <div className="text-[10px] text-slate-500 mt-2 font-medium">وصل الاستلام موقع بالكامل</div>
        </div>
      </div>

      {/* Orders List scoped to this Supplier */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs text-right">
        <h2 className="text-base font-black text-slate-900 font-sans mb-6">أوامر شحن وتجهيز حديد التسليح النشطة</h2>

        {assignedOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <AlertCircle className="mx-auto h-12 w-12 text-slate-200 mb-3" />
            <p className="font-extrabold text-sm">لا توجد طلبات موجهة إليك من قبل الإدارة حالياً.</p>
            <p className="text-xs text-slate-400 mt-1">عند قيام المدير بالموافقة على الطلبات وتكليفك، ستظهر هنا فوراً.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {assignedOrders.map((order) => {
              const currentStatus = order.status;

              return (
                <div
                  key={order.id}
                  className={`border rounded-2xl p-5 transition-all text-right bg-slate-50/50 ${
                    currentStatus === "assigned" ? "border-indigo-500 bg-indigo-50/5" : "border-slate-200"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-150 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">أمر الشحن:</span>
                        <strong className="text-base font-black text-slate-900 font-mono">#{order.id}</strong>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        تاريخ النشوء: {new Date(order.createdAt).toLocaleString("ar-IQ")}
                      </span>
                    </div>

                    <div>
                      {currentStatus === "assigned" && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                          بانتظار تأكيد استلامك للطلب
                        </span>
                      )}
                      {currentStatus === "preparing" && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          جاري تجهيز وربط الحديد
                        </span>
                      )}
                      {currentStatus === "ready" && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          الشحنة جاهزة للتسليم
                        </span>
                      )}
                      {currentStatus === "delivered" && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-emerald-800 border border-green-200 font-sans">
                          مكتمل - تم التسليم للموقع
                        </span>
                      )}
                      {currentStatus === "rejected" && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                          مرفوض
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Shipment Details and Client Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 border-b border-slate-150/60">
                    {/* Client destination */}
                    <div className="space-y-1.5 text-xs">
                      <h4 className="font-extrabold text-slate-800 block border-b border-dashed pb-1">موقع تسليم الشحنة للعميل:</h4>
                      <div className="text-slate-600"><span className="font-bold text-slate-400">اسم العميل المستلم:</span> {order.clientName}</div>
                      <div className="text-slate-600"><span className="font-bold text-slate-400">رقم هاتف المستلم:</span> <strong className="font-bold select-all text-slate-900">{order.clientPhone}</strong></div>
                      <div className="text-slate-600"><span className="font-bold text-slate-400">موقع التفريغ بالتفصيل:</span> {order.clientAddress}</div>
                    </div>

                    {/* Weight and materials */}
                    <div className="text-xs">
                      <h4 className="font-extrabold text-slate-800 block border-b border-dashed pb-1">المواد والمقاييس الواجب تجهيزها:</h4>
                      <div className="space-y-1 mt-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-slate-700 bg-white p-2 rounded border">
                            <span className="font-extrabold text-slate-800">{item.name} ({item.diameter})</span>
                            <span className="font-black text-orange-600">{item.quantity} طن (وزن صافي)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Supplier Interactive Workflow buttons */}
                  <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    {/* Notes display */}
                    <div className="text-xs text-slate-500 w-full sm:max-w-md">
                      {order.statusHistory[order.statusHistory.length - 1]?.note && (
                        <div>
                          <span className="font-extrabold text-slate-700 block mb-1">الحالة المسجلة بالتاريخ:</span>
                          <p className="bg-slate-50 p-2.5 rounded-lg border text-[11px] leading-relaxed font-semibold">
                            {order.statusHistory[order.statusHistory.length - 1]?.note}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Active Action Button */}
                    <div className="shrink-0 w-full sm:w-auto">
                      {currentStatus === "assigned" && (
                        <button
                          onClick={() => handleAcceptOrder(order.id)}
                          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/10"
                        >
                          <Play className="h-4.5 w-4.5" />
                          <span>تأكيد استلام الطلب وبدء التجهيز</span>
                        </button>
                      )}

                      {currentStatus === "preparing" && (
                        <div className="space-y-3 w-full">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="اسم السائق، هاتف السائق، رقم الشاحنة..."
                              value={deliveryNote[order.id] || ""}
                              onChange={(e) =>
                                setDeliveryNote((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value
                                }))
                              }
                              className="bg-white border rounded-lg px-3 py-2 text-xs font-bold w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
                            />
                            <button
                              onClick={() => handleShipOrder(order.id)}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-black px-5 py-2 rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0"
                            >
                              <Send className="h-4 w-4" />
                              <span>شحن الشاحنة</span>
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-medium">اكتب معلومات السائق لتسهيل تواصل العميل معه وتتبعه.</span>
                        </div>
                      )}

                      {currentStatus === "ready" && (
                        <button
                          onClick={() => handleDeliverOrder(order.id)}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-500/15"
                        >
                          <CheckCircle2 className="h-4.5 w-4.5 animate-pulse" />
                          <span>تأكيد التسليم النهائي وتفريغ الحمولة</span>
                        </button>
                      )}

                      {currentStatus === "delivered" && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black font-sans">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>الطلب مسلم للعميل بنجاح</span>
                        </span>
                      )}

                      {currentStatus === "rejected" && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-black font-sans">
                          <span>الطلب مرفوض من قبل الإدارة</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
