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
    public class AuctionRepository : GenericRepository<Auction>, IAuctionRepository
    {
        public AuctionRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<Auction>> GetActiveAuctionsAsync()
        {
            return await _context.Auctions
                .Where(a => a.Status == AuctionStatus.Running || a.Status == AuctionStatus.Scheduled)
                .Include(a => a.AuctionCars)
                .OrderBy(a => a.StartTimeUtc)
                .ToListAsync();
        }

        public async Task<IEnumerable<Auction>> GetAuctionsByLocationAsync(Guid locationId)
        {
            return await _context.Auctions
                .Where(a => a.LocationId == locationId)
                .Include(a => a.AuctionCars)
                .OrderByDescending(a => a.StartTimeUtc)
                .ToListAsync();
        }

        public async Task<decimal?> GetAuctionStartPriceAsync(Guid auctionId)
        {
            var highestPreBid = await _context.Bids
               .Where(b => b.AuctionCar.AuctionId == auctionId && b.IsPreBid)
               .OrderByDescending(b => b.Amount)
               .FirstOrDefaultAsync();

            return highestPreBid?.Amount;
        }

        public async Task<Auction?> GetAuctionWithCarsAsync(Guid auctionId)
        {
            return await _context.Auctions
                 .Include(a => a.AuctionCars)
                     .ThenInclude(ac => ac.Bids.OrderByDescending(b => b.Amount)) //  Bid-ləri sıralı gətir
                 .Include(a => a.AuctionCars)
                     .ThenInclude(ac => ac.AuctionWinner)
                 .FirstOrDefaultAsync(a => a.Id == auctionId);
        }

        public async Task<IEnumerable<Auction>> GetUpcomingAuctionsAsync(DateTime from, DateTime to)
        {
            return await _context.Auctions
                .Where(a => a.StartTimeUtc >= from && a.StartTimeUtc <= to)
                .Include(a => a.AuctionCars)
                .OrderBy(a => a.StartTimeUtc)
                .ToListAsync();
        }

        public async Task<Auction?> GetLiveAuctionAsync()
        {
            return await _context.Auctions
                .Include(a => a.AuctionCars)
                    .ThenInclude(ac => ac.Bids)
                .Where(a => a.IsLive && a.Status == AuctionStatus.Running)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<Auction>> GetLiveAuctionsAsync()
        {
            return await _context.Auctions
                .Include(a => a.AuctionCars)
                    .ThenInclude(ac => ac.Bids)
                .Where(a => a.IsLive && a.Status == AuctionStatus.Running)
                .OrderBy(a => a.StartTimeUtc)
                .ToListAsync();
        }

        public async Task<Auction?> GetAuctionByCurrentCarAsync(string lotNumber)
        {
            return await _context.Auctions
                .Include(a => a.AuctionCars)
                    .ThenInclude(ac => ac.Bids)
                .Where(a => a.CurrentCarLotNumber == lotNumber && a.Status == AuctionStatus.Running)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<Auction>> GetScheduledAuctionsReadyToStartAsync()
        {
            var now = DateTime.UtcNow;
            return await _context.Auctions
                .Include(a => a.AuctionCars)
                    .ThenInclude(ac => ac.Bids.Where(b => b.IsPreBid))
                .Where(a => a.Status == AuctionStatus.Scheduled &&
                           a.StartTimeUtc <= now &&
                           a.AuctionCars.Any(ac => ac.Bids.Any(b => b.IsPreBid)))
                .OrderBy(a => a.StartTimeUtc)
                .ToListAsync();
        }

        public async Task<Auction?> GetNextScheduledAuctionAsync()
        {
            return await _context.Auctions
                .Include(a => a.AuctionCars)
                .Where(a => a.Status == AuctionStatus.Scheduled)
                .OrderBy(a => a.StartTimeUtc)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<Auction>> GetAuctionsByStatusAsync(AuctionStatus status)
        {
            return await _context.Auctions
                .Include(a => a.AuctionCars)
                .Where(a => a.Status == status)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        // Atomic update already present in your codebase (kept as-is)
        public async Task<bool> TryTransitionAuctionStatusAsync(Guid auctionId, AuctionStatus expectedStatus, AuctionStatus newStatus, CancellationToken ct = default)
        {
            var rows = await _context.Database.ExecuteSqlInterpolatedAsync($@"
        UPDATE Auctions
        SET Status = {(int)newStatus}, UpdatedAtUtc = {DateTime.UtcNow}
        WHERE Id = {auctionId} AND Status = {(int)expectedStatus}", ct);

            return rows > 0;
        }

        // <-- NEW: DB-side filter: get running auctions whose EndTimeUtc <= asOfUtc
        public async Task<IEnumerable<Auction>> GetActiveAuctionsReadyToEndAsync(DateTime asOfUtc, int limit = 100)
        {
            return await _context.Auctions
                .Where(a => a.Status == AuctionStatus.Running && a.EndTimeUtc <= asOfUtc)
                .Include(a => a.AuctionCars)
                .OrderBy(a => a.EndTimeUtc)
                .Take(limit)
                .ToListAsync();
        }
    }
}