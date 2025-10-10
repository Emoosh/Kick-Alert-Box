// app/login/page.tsx

"use client";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 relative">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent mb-2">
            Kick Alert Box
          </h1>
          <p className="text-gray-300/80 text-sm">
            Kick hesabınızla alert sisteminizi kurun
          </p>
        </div>

        {/* Login button */}
        <div className="space-y-6">
          <a
            href="../api/auth/login"
            className="group w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/25 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

            <svg
              className="w-5 h-5 mr-3 transition-transform group-hover:rotate-12"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" />
            </svg>
            <span className="relative z-10">Login With Kick</span>
          </a>

          {/* Terms */}
          <div className="text-center text-xs text-gray-400/80">
            <p>
              Giriş yaparak{" "}
              <Link
                href="/terms"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
              >
                Kullanım Şartları
              </Link>{" "}
              ve{" "}
              <Link
                href="/privacy"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
              >
                Gizlilik Politikası
              </Link>
              &apos;nı kabul etmiş olursunuz.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="grid grid-cols-1 gap-3">
            {[
              { text: "Güvenli OAuth2 girişi" },
              { text: "Anında kurulum" },
              { text: "Verileriniz güvende" },
            ].map((feature, index) => (
              <div
                key={feature.text}
                className="flex items-center text-sm text-gray-300/90 animate-fade-in"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Glowing border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl"></div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
