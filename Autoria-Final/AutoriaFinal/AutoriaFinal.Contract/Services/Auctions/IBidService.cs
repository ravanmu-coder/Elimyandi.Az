using AutoriaFinal.Contract.Dtos.Auctions.Bid;
using AutoriaFinal.Domain.Entities.Auctions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AutoriaFinal.Contract.Services.Auctions
{
    public interface IBidService : IGenericService<
        Bid,
        BidGetDto,
        BidDetailDto,
        BidCreateDto,
        BidUpdateDto>
    {
        // ========== ƏSAS BID ƏMƏLİYYATLARI ==========

        /// Əsas bid yerləşdirmə məntiq
        Task<BidDetailDto> PlaceBidAsync(BidCreateDto dto, bool resetTimer = true);

        /// Alıcılar auction başlamazdan əvvəl minimum bid verməyi üçün       
        Task<BidDetailDto> PlacePreBidAsync(BidCreateDto dto);

        /// Auction zamanı hər bid 10 saniyəlik timer-ı yeniləməlidir
        Task<BidDetailDto> PlaceLiveBidAsync(BidCreateDto dto);

        /// İstifadəçilər maksimum məbləğ təyin edib avtomatik artırma istəyə bilərlər
        Task<BidDetailDto> PlaceProxyBidAsync(ProxyBidDto dto);

        // ========== BID VALİDASİYASI ==========
            
        /// UI-də istifadəçiyə bid vermək mümkün olub-olmadığını göstərmək üçün
        Task<BidValidationResult> ValidateBidAsync(BidCreateDto dto);

        /// İstifadəçiyə neçə minimum bid verə biləcəyini göstərmək üçün
        Task<decimal> GetMinimumBidAmountAsync(Guid auctionCarId);

        /// Pre-bid verməyən istifadəçilər live auction-a qatıla bilmirlər
        Task<bool> CanUserPlaceBidAsync(Guid userId, Guid auctionCarId);

        // ========== PROXY BID İDARƏETMƏSİ ==========

        /// Yeni bid gəldikdə proxy bid-lər avtomatik artırılmalıdır
        Task ProcessProxyBidsAsync(Guid auctionCarId, decimal currentHighestBid);

        /// İstifadəçi öz proxy bid-lərini izləyə bilməlidir
        Task<IEnumerable<BidDetailDto>> GetUserActiveProxyBidsAsync(Guid userId, Guid auctionCarId);

        /// İstifadəçi proxy bid-i dayandırmaq istəyə bilər
        Task<bool> CancelProxyBidAsync(Guid bidId, Guid userId);

        // ========== BID TARİXÇƏSİ VƏ STATİSTİKA ==========

        /// Real-time bid history göstərmək üçün lazımdır
        Task<BidHistoryDto> GetBidHistoryAsync(Guid auctionCarId, int pageSize = 50);

        /// Auction səhifəsində son bid-ləri göstərmək üçün
        Task<IEnumerable<BidGetDto>> GetRecentBidsAsync(Guid auctionCarId, int count = 10);

        /// İstifadəçi öz bid tarixçəsini görə bilməlidir
        Task<IEnumerable<BidGetDto>> GetUserBidsAsync(Guid userId);

        /// İstifadəçinin auction-dakı performansını göstərmək üçün
        Task<BidSummaryDto> GetUserBidSummaryAsync(Guid userId, Guid auctionId);

        // ========== REAL-TIME DƏSTƏYİ ==========

        /// SignalR hub-lar tərəfindən real-time məlumat göndərmək üçün
        Task<BidDetailDto?> GetHighestBidAsync(Guid auctionCarId);

        /// 10 saniyəlik timer hesablamaq üçün lazımdır
        Task<DateTime?> GetLastBidTimeAsync(Guid auctionCarId);

        /// Real-time sync üçün, bəzən connection kəsilir və yenidən qoşulur
        Task<IEnumerable<BidGetDto>> GetBidsAfterTimeAsync(Guid auctionCarId, DateTime afterTime);

        // ========== STATİSTİKA ==========

        /// Auction səhifəsində statistik məlumatlar göstərmək üçün
        Task<BidStatsDto> GetBidStatsAsync(Guid auctionCarId);

        /// Auction-da ən aktiv istifadəçiləri göstərmək üçün
        Task<IEnumerable<BidderSummaryDto>> GetTopBiddersAsync(Guid auctionId, int count = 10);
    }

    // ========== HELPER CLASS-LAR ==========

    /// Bid validation nəticəsi
    public class BidValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
        public decimal MinimumBidAmount { get; set; }
        public decimal CurrentHighestBid { get; set; }
        public decimal SuggestedBidAmount { get; set; }
        public bool RequiresPreBid { get; set; }
        public bool AuctionActive { get; set; }
    }
}

