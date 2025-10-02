using AutoriaFinal.Domain.Entities.Auctions;
using AutoriaFinal.Domain.Enums.AuctionEnums;
using AutoriaFinal.Domain.Repositories.Auctions;
using AutoriaFinal.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoriaFinal.Persistence.Repositories.Auctions
{
    public class AuctionCarRepository : GenericRepository<AuctionCar>, IAuctionCarRepository
    {
        public AuctionCarRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<AuctionCar>> GetAuctionCarsReadyForAuctionAsync(Guid auctionId)
        {
            return await _context.AuctionCars
                .Where(ac => ac.AuctionId == auctionId && ac.Bids.Any(b => b.IsPreBid))
                .Include(ac => ac.Bids.Where(b => b.IsPreBid)) //  Yalnız pre-bid-ləri yüklə
                .Include(ac => ac.Car) //  Car məlumatları da lazım ola bilər
                .OrderBy(ac => ac.LotNumber) //  Lot nömrəsi sırası ilə
                .ToListAsync();
        }

        public async Task<AuctionCar?> GetAuctionCarWithBidsAsync(Guid auctionCarId)
        {
            return await _context.AuctionCars
                .Include(ac => ac.Bids.OrderByDescending(b => b.PlacedAtUtc)) //  Bid-ləri tarixə görə sıralı gətir
                .Include(ac => ac.AuctionWinner)
                .Include(ac => ac.Car) //  Car məlumatları
                .Include(ac => ac.Auction) //  Auction məlumatları
                .FirstOrDefaultAsync(ac => ac.Id == auctionCarId);
        }

        public async Task<IEnumerable<AuctionCar>> GetByAuctionIdAsync(Guid auctionId)
        {
            return await _context.AuctionCars
                .Where(ac => ac.AuctionId == auctionId)
                .Include(ac => ac.Bids.OrderByDescending(b => b.Amount)) //  Bid-ləri məbləğə görə sıralı
                .Include(ac => ac.Car)
                .OrderBy(ac => ac.LotNumber) //  Lot nömrəsi sırası ilə
                .ToListAsync();
        }

        public async Task<AuctionCar?> GetByLotNumberAsync(string lotNumber)
        {
            return await _context.AuctionCars
                .Include(ac => ac.Bids.OrderByDescending(b => b.PlacedAtUtc))
                .Include(ac => ac.Car)
                .Include(ac => ac.Auction)
                .FirstOrDefaultAsync(ac => ac.LotNumber == lotNumber);
        }

        public async Task<decimal?> GetCurrentPriceAsync(Guid auctionCarId)
        {
            return await _context.AuctionCars
                .Where(ac => ac.Id == auctionCarId)
                .Select(ac => (decimal?)ac.CurrentPrice)
                .FirstOrDefaultAsync();
        }

        public async Task<bool> HasUserPreBid(Guid auctionCarId, Guid userId)
        {
            return await _context.Bids
                .AnyAsync(b => b.AuctionCarId == auctionCarId &&
                              b.UserId == userId &&
                              b.IsPreBid &&
                              b.Status == BidStatus.Placed); //  Yalnız aktiv pre-bid-lər
        }

        public async Task<AuctionCar?> GetActiveAuctionCarAsync(Guid auctionId)
        {
            return await _context.AuctionCars
                .Include(ac => ac.Bids.OrderByDescending(b => b.PlacedAtUtc))
                .Include(ac => ac.Car)
                .Where(ac => ac.AuctionId == auctionId && ac.IsActive)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<AuctionCar>> GetAuctionCarsByStatusAsync(Guid auctionId, AuctionWinnerStatus status)
        {
            return await _context.AuctionCars
                .Include(ac => ac.Bids)
                .Include(ac => ac.Car)
                .Include(ac => ac.AuctionWinner)
                .Where(ac => ac.AuctionId == auctionId && ac.WinnerStatus == status)
                .OrderBy(ac => ac.LotNumber)
                .ToListAsync();
        }

        public async Task<AuctionCar?> GetNextAuctionCarAsync(Guid auctionId, string currentLotNumber)
        {
            return await _context.AuctionCars
                .Include(ac => ac.Bids.Where(b => b.IsPreBid))
                .Include(ac => ac.Car)
                .Where(ac => ac.AuctionId == auctionId &&
                            ac.Bids.Any(b => b.IsPreBid) &&
                            string.Compare(ac.LotNumber, currentLotNumber) > 0)
                .OrderBy(ac => ac.LotNumber)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<AuctionCar>> GetAuctionCarsWithExpiredTimerAsync(Guid auctionId, int timerSeconds)
        {
            var cutoffTime = DateTime.UtcNow.AddSeconds(-timerSeconds);

            return await _context.AuctionCars
                .Include(ac => ac.Bids)
                .Include(ac => ac.Car)
                .Where(ac => ac.AuctionId == auctionId &&
                            ac.IsActive &&
                            (ac.LastBidTime == null || ac.LastBidTime < cutoffTime) &&
                            (ac.ActiveStartTime == null || ac.ActiveStartTime < cutoffTime))
                .ToListAsync();
        }

        public async Task<int> GetTotalPreBidCountAsync(Guid auctionCarId)
        {
            return await _context.Bids
                .Where(b => b.AuctionCarId == auctionCarId &&
                           b.IsPreBid &&
                           b.Status == BidStatus.Placed)
                .CountAsync();
        }

        public async Task<decimal> GetHighestPreBidAmountAsync(Guid auctionCarId)
        {
            var highestBid = await _context.Bids
                .Where(b => b.AuctionCarId == auctionCarId &&
                           b.IsPreBid &&
                           b.Status == BidStatus.Placed)
                .OrderByDescending(b => b.Amount)
                .FirstOrDefaultAsync();

            return highestBid?.Amount ?? 0;
        }

        public async Task<IEnumerable<AuctionCar>> GetUnsoldAuctionCarsAsync(Guid auctionId)
        {
            return await _context.AuctionCars
                .Include(ac => ac.Bids)
                .Include(ac => ac.Car)
                .Where(ac => ac.AuctionId == auctionId &&
                            ac.WinnerStatus == AuctionWinnerStatus.Unsold)
                .OrderBy(ac => ac.LotNumber)
                .ToListAsync();
        }

        public async Task<AuctionCar?> GetAuctionCarWithFullDetailsAsync(Guid auctionCarId)
        {
            return await _context.AuctionCars
                .Include(ac => ac.Bids.OrderByDescending(b => b.PlacedAtUtc))
                .Include(ac => ac.AuctionWinner)
                    .ThenInclude(aw => aw!.WinningBid)
                .Include(ac => ac.Car)
                .Include(ac => ac.Auction)
                    .ThenInclude(a => a.Location)
                .FirstOrDefaultAsync(ac => ac.Id == auctionCarId);
        }
    }
}