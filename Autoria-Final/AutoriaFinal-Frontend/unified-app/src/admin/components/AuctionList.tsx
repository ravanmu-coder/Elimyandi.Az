import { useState, useEffect } from 'react'
import { Search, Filter, Loader2, AlertCircle } from 'lucide-react'
import { AuctionListItem } from './AuctionListItem'
import { Pagination } from './common/Pagination'
import { Button } from './common/Button'
import { apiClient } from '../services/apiClient'
import { useToast } from './common/Toast'

interface Auction {
  id: string
  name: string
  description: string
  startTimeUtc: string
  endTimeUtc: string
  status: string
  locationId: string
  locationName?: string
  vehicleCount: number
  totalRevenue?: number
}

interface AuctionListProps {
  selectedAuctionId: string | null
  onAuctionSelect: (auctionId: string) => void
  onViewDetails: (auctionId: string) => void
  onRefresh: () => void
}

export function AuctionList({ selectedAuctionId, onAuctionSelect, onViewDetails, onRefresh }: AuctionListProps) {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { success, error: showError } = useToast()

  const pageSize = 10

  const loadAuctions = async (page: number = currentPage, search: string = searchTerm, status: string = statusFilter) => {
    try {
      setLoading(true)
      setError(null)

      const params: any = {
        page,
        limit: pageSize
      }

      if (search.trim()) {
        params.search = search.trim()
      }

      if (status) {
        params.status = status
      }

      const response = await apiClient.getAuctions(params)
      
      // Handle different response formats
      let auctionsData: Auction[] = []
      let totalCount = 0

      if (Array.isArray(response)) {
        auctionsData = response
        totalCount = response.length
      } else if (response && Array.isArray(response.items)) {
        auctionsData = response.items
        totalCount = response.totalItems || response.totalCount || response.items.length
      } else if (response && Array.isArray(response.data)) {
        auctionsData = response.data
        totalCount = response.totalItems || response.totalCount || response.data.length
      }

      setAuctions(auctionsData)
      setTotalPages(Math.ceil(totalCount / pageSize))
      setTotalItems(totalCount)
    } catch (err) {
      console.error('Failed to load auctions:', err)
      setError('Failed to load auctions')
      showError('Failed to load auctions')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
    loadAuctions(1, value, statusFilter)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setCurrentPage(1)
    loadAuctions(1, searchTerm, status)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadAuctions(page, searchTerm, statusFilter)
  }

  const handleRefresh = () => {
    loadAuctions(currentPage, searchTerm, statusFilter)
    onRefresh()
  }

  useEffect(() => {
    loadAuctions()
  }, [])

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Ready', label: 'Ready' },
    { value: 'Running', label: 'Running' },
    { value: 'Ended', label: 'Ended' },
    { value: 'Cancelled', label: 'Cancelled' }
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-h1 font-heading text-dark-text-primary">Auctions</h1>
            <p className="text-body-md text-dark-text-secondary mt-1">Manage your auction lifecycle</p>
          </div>
          <Button variant="secondary" icon={Filter} onClick={handleRefresh}>
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-dark-text-muted absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search auctions by name or ID..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-bg-quaternary border border-dark-border rounded-lg text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-3 py-2 bg-dark-bg-quaternary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-dark-bg-tertiary rounded-lg border border-dark-border p-4 animate-pulse">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-dark-bg-quaternary rounded w-1/3"></div>
                    <div className="h-6 bg-dark-bg-quaternary rounded-full w-16"></div>
                  </div>
                  <div className="h-3 bg-dark-bg-quaternary rounded w-1/4"></div>
                  <div className="h-3 bg-dark-bg-quaternary rounded w-1/2"></div>
                  <div className="grid grid-cols-1 gap-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-dark-bg-quaternary rounded"></div>
                        <div className="h-3 bg-dark-bg-quaternary rounded w-1/3"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-accent-error mx-auto mb-4" />
            <h3 className="text-h3 font-heading text-dark-text-primary mb-2">Error Loading Auctions</h3>
            <p className="text-body-md text-dark-text-secondary mb-6">{error}</p>
            <Button onClick={handleRefresh} icon={Filter}>
              Try Again
            </Button>
          </div>
        ) : auctions.length > 0 ? (
          <div className="p-6 space-y-4">
            {auctions.map((auction) => (
              <AuctionListItem
                key={auction.id}
                auction={auction}
                isSelected={selectedAuctionId === auction.id}
                onClick={() => onAuctionSelect(auction.id)}
                onViewDetails={() => onViewDetails(auction.id)}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-dark-bg-quaternary rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-dark-text-muted" />
            </div>
            <h3 className="text-h3 font-heading text-dark-text-primary mb-2">No Auctions Found</h3>
            <p className="text-body-md text-dark-text-secondary mb-6">
              {searchTerm || statusFilter 
                ? 'Try adjusting your search or filter criteria'
                : 'No auctions have been created yet'
              }
            </p>
            {!searchTerm && !statusFilter && (
              <Button onClick={() => onAuctionSelect('')}>
                Create First Auction
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && auctions.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isLoading={loading}
        />
      )}

      {/* Footer Info */}
      {!loading && !error && (
        <div className="px-6 py-3 border-t border-dark-border">
          <p className="text-body-xs text-dark-text-muted text-center">
            Showing {auctions.length} of {totalItems} auctions
          </p>
        </div>
      )}
    </div>
  )
}
