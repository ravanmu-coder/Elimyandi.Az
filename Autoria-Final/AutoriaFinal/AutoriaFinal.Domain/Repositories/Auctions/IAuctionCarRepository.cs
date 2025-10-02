using AutoriaFinal.Domain.Entities.Auctions;
using AutoriaFinal.Domain.Enums.AuctionEnums;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AutoriaFinal.Domain.Repositories.Auctions
{
    public interface IAuctionCarRepository : IGenericRepository<AuctionCar>
    {
        Task<AuctionCar?> GetByLotNumberAsync(string lotNumber);
        Task<IEnumerable<AuctionCar>> GetByAuctionIdAsync(Guid auctionId);
        Task<decimal?> GetCurrentPriceAsync(Guid auctionCarId);
        Task<AuctionCar?> GetAuctionCarWithBidsAsync(Guid auctionCarId);
        Task<IEnumerable<AuctionCar>> GetAuctionCarsReadyForAuctionAsync(Guid auctionId);
        Task<bool> HasUserPreBid(Guid auctionCarId, Guid userId);
        Task<AuctionCar?> GetActiveAuctionCarAsync(Guid auctionId); // Aktiv olan maşın
        Task<IEnumerable<AuctionCar>> GetAuctionCarsByStatusAsync(Guid auctionId, AuctionWinnerStatus status);
        Task<AuctionCar?> GetNextAuctionCarAsync(Guid auctionId, string currentLotNumber); // Növbəti maşın
        Task<IEnumerable<AuctionCar>> GetAuctionCarsWithExpiredTimerAsync(Guid auctionId, int timerSeconds);
        Task<int> GetTotalPreBidCountAsync(Guid auctionCarId); // Pre-bid sayı
        Task<decimal> GetHighestPreBidAmountAsync(Guid auctionCarId); // Ən yüksək pre-bid məbləği
        Task<IEnumerable<AuctionCar>> GetUnsoldAuctionCarsAsync(Guid auctionId); // Satılmayan maşınlar
        Task<AuctionCar?> GetAuctionCarWithFullDetailsAsync(Guid auctionCarId); // Tam detallar ilə
    }
}