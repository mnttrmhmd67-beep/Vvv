/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { X, Phone, User, MapPin, Check, ShieldCheck, ArrowRight, HardHat, AlertCircle } from "lucide-react";
import { checkPhone, sendOtp, verifyOtp, registerCustomer } from "../services/api";
import { Customer } from "../types";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, customer: Customer) => void;
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

export default function CustomerAuthModal({
  isOpen,
  onClose,
  onLoginSuccess
}: CustomerAuthModalProps) {
  const [step, setStep] = useState<"phone" | "otp" | "register">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSimulation, setOtpSimulation] = useState("");
  
  // Tab Mode
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Registration form
  const [fullName, setFullName] = useState("");
  const [governorate, setGovernorate] = useState("بغداد");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const resetState = () => {
    setStep("phone");
    setActiveTab("login");
    setPhone("");
    setOtp("");
    setOtpSimulation("");
    setFullName("");
    setGovernorate("بغداد");
    setAddress("");
    setError("");
    setSuccessMsg("");
    setLoading(false);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setError("");
    setLoading(true);

    try {
      // 1. Check if number is registered
      const { exists, customer } = await checkPhone(phone);

      if (exists && customer) {
        // Registered: send OTP
        const otpRes = await sendOtp(phone);
        setOtpSimulation(otpRes.otpSimulation);
        setStep("otp");
        setSuccessMsg("تم إرسال رمز التحقق بنجاح إلى رقمك عبر واتساب");
      } else {
        // New user: suggest register
        setActiveTab("register");
        setStep("register");
        setSuccessMsg("رقم الهاتف هذا غير مسجل لدينا. يرجى إكمال التسجيل أدناه لإنشاء حسابك.");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء فحص رقم الهاتف");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setError("");
    setLoading(true);

    try {
      const res = await verifyOtp(phone, otp);
      if (res.success && res.customer) {
        onLoginSuccess(res.token || "sess_fallback_customer", res.customer);
        resetState();
        onClose();
      } else {
        setError("فشل تسجيل الدخول، يرجى المحاولة لاحقاً");
      }
    } catch (err: any) {
      setError(err.message || "رمز التحقق المدخل غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !governorate) {
      setError("الاسم ورقم الهاتف والمحافظة حقول مطلوبة");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Check if phone number is already registered
      const { exists } = await checkPhone(phone);
      if (exists) {
        setError("رقم الهاتف هذا مسجل بالفعل. يرجى الانتقال إلى تسجيل الدخول.");
        return;
      }

      const res = await registerCustomer({
        name: fullName,
        phone,
        governorate,
        address
      });

      if (res.success && res.customer) {
        onLoginSuccess(res.token || "sess_fallback_customer", res.customer);
        resetState();
        onClose();
      } else {
        setError("حدث خطأ أثناء إنشاء حساب العميل");
      }
    } catch (err: any) {
      setError(err.message || "فشل تسجيل الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={() => {
          resetState();
          onClose();
        }}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
      ></div>

      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md relative z-10 overflow-hidden animate-scale-up text-right">
        {/* Header decoration */}
        <div className="bg-slate-900 px-6 py-5 border-b-4 border-orange-500 text-white flex justify-between items-center flex-row-reverse">
          <div className="flex items-center gap-2 flex-row-reverse">
            <ShieldCheck className="h-6 w-6 text-orange-500" />
            <div>
              <h3 className="text-base font-black font-sans leading-none">بوابة عملاء منصة أساس</h3>
              <span className="text-[10px] text-slate-300 font-bold block mt-1">تداول آمن وحصري لحديد التسليح</span>
            </div>
          </div>
          <button 
            onClick={() => {
              resetState();
              onClose();
            }}
            className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded-lg border border-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection (only visible if we are not verifying OTP) */}
        {step !== "otp" && (
          <div className="flex border-b border-slate-100 bg-slate-50">
            <button
              onClick={() => {
                setActiveTab("login");
                setStep("phone");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-3 text-xs font-black transition-all ${
                activeTab === "login"
                  ? "bg-white border-b-2 border-orange-500 text-orange-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setStep("register");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-3 text-xs font-black transition-all ${
                activeTab === "register"
                  ? "bg-white border-b-2 border-orange-500 text-orange-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              إنشاء حساب جديد
            </button>
          </div>
        )}

        {/* Content body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-r-4 border-red-500 rounded-lg text-red-800 text-xs font-bold flex gap-2 items-center flex-row-reverse">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-blue-50 border-r-4 border-blue-500 rounded-lg text-blue-800 text-xs font-bold flex gap-2 items-center flex-row-reverse">
              <Check className="h-4 w-4 text-blue-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Enter Phone (Login Mode) */}
          {activeTab === "login" && step === "phone" && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  مرحباً بك مجدداً. يرجى إدخال رقم هاتفك لتسجيل الدخول السريع وتأكيد هويتك عبر رمز التحقق.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">رقم الهاتف *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 pointer-events-none">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="077XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm font-bold text-left focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-1">يرجى كتابة رقم الهاتف مسبوقاً بـ 07 (مثال: 07701234567)</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-slate-950 font-black py-3.5 rounded-xl text-xs transition-all duration-200 shadow-md flex items-center justify-center gap-2 flex-row-reverse"
              >
                <span>{loading ? "جاري التحقق..." : "متابعة"}</span>
                <ArrowRight className="h-4 w-4 transform rotate-180" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("register");
                    setStep("register");
                  }}
                  className="text-xs text-orange-600 hover:text-orange-700 font-bold underline"
                >
                  ليس لديك حساب؟ إنشاء حساب جديد الآن
                </button>
              </div>
            </form>
          )}

          {/* STEP 2 (A): Enter OTP */}
          {step === "otp" && (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div className="text-center pb-2">
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  لقد وجدنا حساباً مسجلاً بالرقم <strong className="text-slate-800">{phone}</strong>.
                  تم إرسال رمز تحقق (OTP) إلى حساب واتساب الخاص بك.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">رمز التحقق (OTP) *</label>
                <input
                  type="text"
                  required
                  placeholder="أدخل الرمز المكون من 4 أرقام"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center text-lg font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                />
              </div>

              {/* Simulation Helper Badge */}
              {otpSimulation && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 justify-end mb-1">
                    <span>محاكاة واتساب النشطة</span>
                    <HardHat className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  رمز التحقق السري المرسل هو: <strong className="text-slate-900 text-sm select-all">{otpSimulation}</strong>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-slate-950 font-black py-3 rounded-xl text-xs transition-all duration-200 shadow-md"
                >
                  {loading ? "جاري التحقق..." : "تأكيد الدخول"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setActiveTab("login");
                  }}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all"
                >
                  تعديل الرقم
                </button>
              </div>
            </form>
          )}

          {/* STEP 2 (B): Register Mode */}
          {activeTab === "register" && step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center border-b border-slate-100 pb-3">
                <p className="text-xs text-slate-500 font-bold">
                  قم بإنشاء حساب عميل جديد لتسجيل ومتابعة طلباتك بذكاء وسرعة
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">الاسم الكامل للعميل *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="الاسم الثلاثي (مثال: علي كريم ناصر)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">رقم الهاتف *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="077XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-xs font-bold text-left focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">المحافظة *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <select
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
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
                <label className="block text-xs font-black text-slate-700 mb-1.5">العنوان وموقع العمل (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="مثال: بغداد، حي المنصور، قرب ساحة اللقاء"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-grow bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-slate-950 font-black py-3 rounded-xl text-xs transition-all duration-200 shadow-md"
                >
                  {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب وتأكيد الدخول"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setStep("phone");
                  }}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all"
                >
                  الرجوع لتسجيل الدخول
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
