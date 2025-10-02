using AutoriaFinal.Domain.Entities.Auctions;
using AutoriaFinal.Domain.Enums.AuctionEnums;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoriaFinal.Domain.Repositories.Auctions
{
    
    public interface IAuctionRepository : IGenericRepository<Auction>
    {
        Task<IEnumerable<Auction>> GetActiveAuctionsAsync();
        Task<IEnumerable<Auction>> GetAuctionsByLocationAsync(Guid locationId);
        Task<IEnumerable<Auction>> GetUpcomingAuctionsAsync(DateTime from, DateTime to);
        Task<Auction?> GetAuctionWithCarsAsync(Guid auctionId);
        Task<decimal?> GetAuctionStartPriceAsync(Guid auctionId);
        Task<Auction?> GetLiveAuctionAsync(); // Hal-hazırda canlı olan auction
        Task<IEnumerable<Auction>> GetLiveAuctionsAsync(); // Bütün canlı auction-lar
        Task<Auction?> GetAuctionByCurrentCarAsync(string lotNumber); // Cari maşına görə auction tap
        Task<IEnumerable<Auction>> GetScheduledAuctionsReadyToStartAsync(); // Başlamağa hazır olan auction-lar
        Task<Auction?> GetNextScheduledAuctionAsync(); // Növbəti planlaşdırılmış auction
        Task<IEnumerable<Auction>> GetAuctionsByStatusAsync(AuctionStatus status); // Status-a görə auction-lar
    }
}