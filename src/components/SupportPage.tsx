/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { HelpCircle, Mail, MessageSquare, ArrowLeft, PhoneCall } from "lucide-react";

interface SupportPageProps {
  onBackToApp?: () => void;
}

export default function SupportPage({ onBackToApp }: SupportPageProps) {
  const whatsappUrl = "https://wa.me/9647732670436";
  const emailUrl = `mailto:mnttrmhmd67@gmail.com?subject=${encodeURIComponent("الدعم الفني - منصة أساس")}`;

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col justify-center">
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#f97316_1px,transparent_1.5px)] [background-size:20px_20px] pointer-events-none"></div>

      {/* Main Support Card */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600"></div>

        <div className="p-8 md:p-12 text-right">
          {/* Header section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-orange-500/10 text-orange-500 mb-4 border border-orange-500/20">
              <HelpCircle className="h-9 w-9" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white font-sans">الدعم الفني والتواصل</h1>
            <p className="text-sm text-slate-400 mt-2 font-medium">نحن هنا لمساعدتك في إتمام أعمالك على منصة أساس بكل سهولة</p>
          </div>

          {/* Explanation Box */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 leading-relaxed mb-10 shadow-inner">
            <p className="text-sm md:text-base text-slate-300 text-center font-medium">
              "إذا واجهت أي مشكلة في استخدام منصة أساس، يمكنك التواصل مع الإدارة عبر واتساب أو البريد الإلكتروني، وسنعمل على مساعدتك في أقرب وقت."
            </p>
          </div>

          {/* Support Channels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* WhatsApp Contact */}
            <div className="bg-slate-850 border border-slate-800 hover:border-emerald-500/30 rounded-2xl p-6 transition-all group flex flex-col justify-between">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-black text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">نشط الآن</span>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  {/* WhatsApp SVG Icon */}
                  <svg
                    className="h-6 w-6 fill-current"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">محادثة واتساب الفورية</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                تواصل مباشر وسريع مع المدير العام للإجابة على الاستفسارات وحل المشكلات الفنية المتعلقة بالطلبات والأسعار.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl text-xs text-center transition-all shadow-md hover:shadow-emerald-500/10 flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-4.5 w-4.5" />
                <span>التواصل مع المدير عبر واتساب</span>
              </a>
            </div>

            {/* Email Contact */}
            <div className="bg-slate-850 border border-slate-800 hover:border-orange-500/30 rounded-2xl p-6 transition-all group flex flex-col justify-between">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-black text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">مراسلة رسمية</span>
                <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20 group-hover:scale-110 transition-transform">
                  <Mail className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">الدعم عبر البريد الإلكتروني</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                راسلنا بطلب الدعم الرسمي أو الاقتراحات الفنية على بريد المنصة وسيقوم فريق الدعم الفني بمراجعتها.
              </p>
              <a
                href={emailUrl}
                className="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-black py-3 rounded-xl text-xs text-center transition-all shadow-md hover:shadow-orange-500/10 flex items-center justify-center gap-2"
              >
                <Mail className="h-4.5 w-4.5" />
                <span>إرسال بريد إلكتروني</span>
              </a>
            </div>
          </div>

          {/* Quick contact numbers */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-bold text-slate-400">
            <span className="text-slate-300">ساعات عمل الدعم الفني: طوال أيام الأسبوع 24/7</span>
            <div className="flex items-center gap-2 text-orange-400">
              <PhoneCall className="h-4 w-4" />
              <span>هاتف الإدارة الرئيسي: 07732670436</span>
            </div>
          </div>

          {/* Back button */}
          {onBackToApp && (
            <div className="mt-10 text-center">
              <button
                onClick={onBackToApp}
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold bg-slate-850 px-5 py-2.5 rounded-xl border border-slate-800 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة للرئيسية</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
