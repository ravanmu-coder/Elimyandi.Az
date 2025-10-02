import { Outlet } from 'react-router-dom'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'
import { ToastContainer, useToast } from '../common/Toast'

export function AdminLayout() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Topbar */}
          <Topbar />

          {/* Page Content */}
          <main className="flex-1 p-6 bg-gray-50">
            <Outlet />
          </main>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">Ə</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Admin Panel</p>
              <p className="text-xs text-gray-500">v1.0.0</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            © 2024 Əlimyandi.az. All rights reserved.
          </p>
        </div>
      </footer>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
