import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Giriş Yap</h1>
          <p className="text-gray-400">
            Kick hesabınızla alert sisteminizi kurun
          </p>
        </div>

        <div className="space-y-4">
          <a
            href="../api/auth/login"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" />
            </svg>
            Kick ile Giriş Yap
          </a>

          <div className="text-center text-sm text-gray-500">
            <p>
              Giriş yaparak{" "}
              <Link href="/terms" className="underline hover:text-gray-400">
                Kullanım Şartları
              </Link>{" "}
              ve{" "}
              <Link href="/privacy" className="underline hover:text-gray-400">
                Gizlilik Politikası
              </Link>
              'nı kabul etmiş olursunuz.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="text-sm text-gray-400 space-y-2">
            <div className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              Güvenli OAuth2 girişi
            </div>
            <div className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              Verileriniz güvende
            </div>
            <div className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              Anında kurulum
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
