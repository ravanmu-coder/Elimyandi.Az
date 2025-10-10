import { useState } from 'react'
import { Settings, Bug, RefreshCw, Download } from 'lucide-react'
import { Button } from '../components/common/Button'
import { AuctionList } from '../components/AuctionList'
import { AuctionDetailModal } from '../components/AuctionDetailModal'
import { NewAuctionModal } from '../components/NewAuctionModal'
import { EditAuctionModal } from '../components/EditAuctionModal'
import { ConfigModal } from '../components/ConfigModal'
import { DebugPanel } from '../components/DebugPanel'
import { useToast } from '../components/common/Toast'

export function AuctionsListPage() {
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showNewAuctionModal, setShowNewAuctionModal] = useState(false)
  const [showEditAuctionModal, setShowEditAuctionModal] = useState(false)
  const [detailAuctionId, setDetailAuctionId] = useState<string | null>(null)
  const [editAuctionId, setEditAuctionId] = useState<string | null>(null)
  const { success, error, info } = useToast()

  const handleViewDetails = (auctionId: string) => {
    setDetailAuctionId(auctionId)
    setShowDetailModal(true)
  }

  const handleEditAuction = (auctionId: string) => {
    setEditAuctionId(auctionId)
    setShowEditAuctionModal(true)
  }

  const handleNewAuction = () => {
    setShowNewAuctionModal(true)
  }

  const handleAuctionSaved = () => {
    // Refresh the auction list
    // This will be handled by the AuctionList component
  }

  const handleRefresh = () => {
    // This will be handled by the AuctionList component
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    info('Export functionality coming soon')
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-dark-bg-primary">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-dark-bg-secondary border-b border-gray-200 dark:border-dark-border">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Auction Management</h1>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Complete auction lifecycle management</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="secondary" 
              icon={Settings} 
              onClick={() => setShowConfigModal(true)}
              className="text-gray-600 hover:text-gray-900 dark:text-dark-text-muted dark:hover:text-dark-text-primary"
            >
              Config
            </Button>
            <Button 
              variant="secondary" 
              icon={Bug} 
              onClick={() => setShowDebugPanel(true)}
              className="text-gray-600 hover:text-gray-900 dark:text-dark-text-muted dark:hover:text-dark-text-primary"
            >
              Debug
            </Button>
            <Button 
              variant="secondary" 
              icon={RefreshCw} 
              onClick={handleRefresh}
              className="text-gray-600 hover:text-gray-900 dark:text-dark-text-muted dark:hover:text-dark-text-primary"
            >
              Refresh
            </Button>
            <Button 
              variant="secondary" 
              icon={Download} 
              onClick={handleExport}
              className="text-gray-600 hover:text-gray-900 dark:text-dark-text-muted dark:hover:text-dark-text-primary"
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Single Column Layout */}
      <div className="flex-1 min-h-0">
        <AuctionList
          onViewDetails={handleViewDetails}
          onEditAuction={handleEditAuction}
          onNewAuction={handleNewAuction}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Modals */}
      {showConfigModal && (
        <ConfigModal
          onClose={() => setShowConfigModal(false)}
        />
      )}

      {showDebugPanel && (
        <DebugPanel
          onClose={() => setShowDebugPanel(false)}
        />
      )}

      {showDetailModal && detailAuctionId && (
        <AuctionDetailModal
          auctionId={detailAuctionId}
          onClose={() => {
            setShowDetailModal(false)
            setDetailAuctionId(null)
          }}
        />
      )}

      {showNewAuctionModal && (
        <NewAuctionModal
          onClose={() => setShowNewAuctionModal(false)}
          onSuccess={handleAuctionSaved}
        />
      )}

      {showEditAuctionModal && editAuctionId && (
        <EditAuctionModal
          isOpen={showEditAuctionModal}
          onClose={() => {
            setShowEditAuctionModal(false)
            setEditAuctionId(null)
          }}
          auctionId={editAuctionId}
          onSuccess={handleAuctionSaved}
        />
      )}
    </div>
  )
}