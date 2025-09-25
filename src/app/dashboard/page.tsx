// src/app/dashboard/page.tsx
"use client";

import { useSession } from "../../hooks/useSession";

export default function Dashboard() {
  const { session, loading, error, logout, isAuthenticated } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
          <a
            href="/login"
            className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Not Authenticated
          </h1>
          <a
            href="/login"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <img
                src={session?.user?.data?.[0]?.profile_picture}
                alt="Profile"
                className="h-10 w-10 rounded-full mr-4"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome, {session?.user?.data?.[0]?.name}!
                </h1>
                <p className="text-sm text-gray-600">
                  {session?.user?.data?.[0]?.email}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* User Info Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Account Information
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">User ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {session?.user?.data?.[0]?.user_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Username
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {session?.user?.data?.[0]?.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {session?.user?.data?.[0]?.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Token Status
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        session?.user?.tokenInfo?.active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {session?.user?.tokenInfo?.active ? "Active" : "Inactive"}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Scopes Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Permissions
              </h3>
              <div className="flex flex-wrap gap-2">
                {session?.user?.tokenInfo?.scope
                  ?.split(" ")
                  .map((scope: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full"
                    >
                      {scope}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded">
                  Create Alert
                </button>
                <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded">
                  Manage Webhooks
                </button>
                <button className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded">
                  View Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
