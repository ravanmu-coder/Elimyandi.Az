using AutoMapper;
using AutoriaFinal.Application.Exceptions;
using AutoriaFinal.Contract.Dtos.Auctions.AuctionCar;
using AutoriaFinal.Contract.Dtos.Auctions.Bid;
using AutoriaFinal.Contract.Services.Auctions;
using AutoriaFinal.Domain.Entities.Auctions;
using AutoriaFinal.Domain.Enums.AuctionEnums;
using AutoriaFinal.Domain.Repositories;
using AutoriaFinal.Domain.Repositories.Auctions;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AutoriaFinal.Application.Services.Auctions
{
    public class AuctionCarService : GenericService<
        AuctionCar,
        AuctionCarGetDto,
        AuctionCarDetailDto,
        AuctionCarCreateDto,
        AuctionCarUpdateDto>, IAuctionCarService
    {
        private readonly IAuctionCarRepository _auctionCarRepository;
        private readonly IBidRepository _bidRepository;
        private readonly IAuctionRepository _auctionRepository;

        public AuctionCarService(
            IAuctionCarRepository auctionCarRepository,
            IBidRepository bidRepository,
            IAuctionRepository auctionRepository,
            IUnitOfWork unitOfWork,
            IMapper mapper,
            ILogger<GenericService<AuctionCar, AuctionCarGetDto, AuctionCarDetailDto, AuctionCarCreateDto, AuctionCarUpdateDto>> logger)
            : base(auctionCarRepository, mapper, unitOfWork, logger)
        {
            _auctionCarRepository = auctionCarRepository;
            _bidRepository = bidRepository;
            _auctionRepository = auctionRepository;
        }

        #region Override Generic Methods    
        public override async Task<AuctionCarDetailDto> AddAsync(AuctionCarCreateDto dto)
        {
            _logger.LogInformation("➕ Creating new auction car - Auction: {AuctionId}, Car: {CarId}, Lot: {LotNumber}",
                dto.AuctionId, dto.CarId, dto.LotNumber);

            if (dto == null)
            {
                throw new BadRequestException("AuctionCar create data cannot be null");
            }

            var existingLot = await _auctionCarRepository.GetByLotNumberAsync(dto.LotNumber);
            if (existingLot != null)
            {
                throw new ConflictException($"Lot number {dto.LotNumber} already exists");
            }
            
            var auctionCar = AuctionCar.Create(
                dto.AuctionId,
                dto.CarId,
                dto.LotNumber,
                dto.MinPreBid,
                dto.ReservePrice,
                dto.ItemNumber
            );

            var createdAuctionCar = await _auctionCarRepository.AddAsync(auctionCar);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("✅ Auction car created successfully: {LotNumber} with MinPreBid: ${MinPreBid}",
               dto.LotNumber, dto.MinPreBid);

            return _mapper.Map<AuctionCarDetailDto>(createdAuctionCar);
        }

        public override async Task<AuctionCarDetailDto> UpdateAsync(Guid id, AuctionCarUpdateDto dto)
        {
            _logger.LogInformation("✏️ Updating auction car: {AuctionCarId}", id);

            if (dto == null)
            {
                throw new BadRequestException("Update data cannot be null");
            }

            var auctionCar = await _auctionCarRepository.GetByIdAsync(id);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", id);
            }

            if (auctionCar.IsActive)
            {
                throw new AuctionBusinessException(auctionCar.LotNumber, "Cannot update active auction car");
            }

            if (dto.ReservePrice.HasValue)
            {
                auctionCar.SetReserve(dto.ReservePrice.Value);
                _logger.LogInformation("Updated reserve price to ${ReservePrice} for {LotNumber}",
                    dto.ReservePrice.Value, auctionCar.LotNumber);
            }

            if (dto.MinPreBid.HasValue)
            {
                var hasBids = await _bidRepository.GetTotalBidCountAsync(id) > 0;
                if (hasBids)
                {
                    _logger.LogWarning("⚠️ Cannot update MinPreBid - bids already placed for {LotNumber}",
                        auctionCar.LotNumber);
                    throw new AuctionBusinessException(auctionCar.LotNumber, "Cannot update MinPreBid after bids are placed");
                }

            }

            var updatedAuctionCar = await _auctionCarRepository.UpdateAsync(auctionCar);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<AuctionCarDetailDto>(updatedAuctionCar);
        }

        //  Bu metodu override edək DeleteAuctionCarAsync yerinə
        public new async Task<bool> DeleteAsync(Guid id)
        {
            _logger.LogInformation("🗑️ Deleting auction car: {AuctionCarId}", id);

            var auctionCar = await _auctionCarRepository.GetByIdAsync(id);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", id);
            }

            var bidCount = await _bidRepository.GetTotalBidCountAsync(id);
            if (bidCount > 0)
            {
                throw new AuctionBusinessException(auctionCar.LotNumber, $"Cannot delete car that has {bidCount} bids");
            }

            var auction = await _auctionRepository.GetByIdAsync(auctionCar.AuctionId);
            if (auction?.Status == AuctionStatus.Running)
            {
                throw new AuctionBusinessException(auctionCar.LotNumber, "Cannot delete car from running auction");
            }

            return await base.DeleteAsync(id);
        }
        public new async Task<AuctionCarDetailDto> GetByIdAsync(Guid id)
        {
            _logger.LogInformation("🔍 Getting auction car by ID: {AuctionCarId}", id);

            var auctionCar = await _auctionCarRepository.GetAuctionCarWithFullDetailsAsync(id);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", id);
            }

            var dto = _mapper.Map<AuctionCarDetailDto>(auctionCar);

            if (auctionCar.IsActive)
            {
                var timerInfo = await GetCarTimerInfoAsync(id);
                dto.RemainingTimeSeconds = timerInfo.RemainingTimeSeconds;
                dto.IsTimeExpired = timerInfo.IsExpired;
            }

            return dto;
        }

        #endregion

        #region AuctionCar LifeCycle
        public async Task<AuctionCarDetailDto> PrepareCarForAuctionAsync(Guid auctionCarId)
        {
            _logger.LogInformation("🏁 Preparing car for auction: {AuctionCarId}", auctionCarId);
            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(auctionCarId);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", auctionCarId);
            }

            var preBidCount = await _auctionCarRepository.GetTotalPreBidCountAsync(auctionCarId);

            if (preBidCount == 0)
            {
                _logger.LogInformation("⚠️ Car has no pre-bids, using MinPreBid: ${MinPreBid} for {LotNumber}",
                    auctionCar.MinPreBid, auctionCar.LotNumber);

                auctionCar.UpdateCurrentPrice(auctionCar.MinPreBid);

                await _auctionCarRepository.UpdateAsync(auctionCar);
                await _unitOfWork.SaveChangesAsync();

                _logger.LogInformation("✅ Car prepared for auction: {LotNumber} with NO pre-bids, starting at ${StartPrice}",
                    auctionCar.LotNumber, auctionCar.MinPreBid);
            }
            else
            {
                var highestPreBid = await _auctionCarRepository.GetHighestPreBidAmountAsync(auctionCarId);
                if (highestPreBid > 0)
                {
                    auctionCar.UpdateCurrentPrice(highestPreBid);
                    _logger.LogInformation("💰 Starting price set to highest pre-bid: ${Amount} for {LotNumber}",
                        highestPreBid, auctionCar.LotNumber);
                }

                await _auctionCarRepository.UpdateAsync(auctionCar);
                await _unitOfWork.SaveChangesAsync();

                _logger.LogInformation("✅ Car prepared for auction: {LotNumber} with {PreBidCount} pre-bids, starting at ${StartPrice}",
                    auctionCar.LotNumber, preBidCount, highestPreBid);
            }

            return _mapper.Map<AuctionCarDetailDto>(auctionCar);
        }
        public async Task<AuctionCarDetailDto> ActivateCarAsync(Guid auctionCarId)
        {
            _logger.LogInformation("🎯 Activating car for live auction: {AuctionCarId}", auctionCarId);

            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(auctionCarId);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", auctionCarId);
            }

            var hasPreBids = await HasRequiredPreBidsAsync(auctionCarId);
            if (!hasPreBids)
            {
                _logger.LogInformation("⚠️ Car activating without pre-bids, using MinPreBid: ${MinPreBid} for {LotNumber}",
                    auctionCar.MinPreBid, auctionCar.LotNumber);

                if (auctionCar.CurrentPrice <= 0)
                {
                    auctionCar.UpdateCurrentPrice(auctionCar.MinPreBid);
                }
            }

            var currentActiveCar = await _auctionCarRepository.GetActiveAuctionCarAsync(auctionCar.AuctionId);
            if (currentActiveCar != null && currentActiveCar.Id != auctionCarId)
            {
                currentActiveCar.MarkAsInactive();
                await _auctionCarRepository.UpdateAsync(currentActiveCar);
                _logger.LogInformation("🔄 Deactivated previous active car: {PreviousLotNumber}",
                    currentActiveCar.LotNumber);
            }

            auctionCar.MarkAsActive();
            await _auctionCarRepository.UpdateAsync(auctionCar);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("✅ Car activated for live auction: {LotNumber} - Timer started, Price: ${CurrentPrice}",
               auctionCar.LotNumber, auctionCar.CurrentPrice);

            return _mapper.Map<AuctionCarDetailDto>(auctionCar);
        }
        public async Task<AuctionCarDetailDto> EndCarAuctionAsync(Guid auctionCarId)
        {
            _logger.LogInformation("⏹️ Ending auction for car: {AuctionCarId}", auctionCarId);
            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(auctionCarId);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", auctionCarId);
            }
            var highestBid = await _bidRepository.GetHighestBidAsync(auctionCarId);
            if (highestBid != null && highestBid.Amount > 0)
            {
                var isReserveMet = !auctionCar.ReservePrice.HasValue ||
                                  highestBid.Amount >= auctionCar.ReservePrice.Value;

                if (isReserveMet)
                {
                    // Car is WON
                    auctionCar.MarkWon(highestBid.Amount);
                    _logger.LogInformation("🏆 Car WON by user {UserId} for ${Amount}: {LotNumber}",
                        highestBid.UserId, highestBid.Amount, auctionCar.LotNumber);
                }
                else
                {
                    auctionCar.MarkUnsold();
                    _logger.LogInformation("❌ Car UNSOLD - reserve not met (${Reserve} required, ${Bid} offered): {LotNumber}",
                        auctionCar.ReservePrice, highestBid.Amount, auctionCar.LotNumber);
                }
            }
            else
            {
                auctionCar.MarkUnsold();
                _logger.LogInformation("❌ Car UNSOLD - no bids received: {LotNumber}", auctionCar.LotNumber);
            }
            await _auctionCarRepository.UpdateAsync(auctionCar);
            await _unitOfWork.SaveChangesAsync();
            return _mapper.Map<AuctionCarDetailDto>(auctionCar);
        }
        public async Task<AuctionCarDetailDto> MarkCarUnsoldAsync(Guid auctionCarId, string reason)
        {
            _logger.LogInformation("❌ Marking car as unsold: {AuctionCarId}, Reason: {Reason}",
                auctionCarId, reason);
            var auctionCar = await _auctionCarRepository.GetByIdAsync(auctionCarId);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", auctionCarId);
            }
            auctionCar.MarkUnsold();
            await _auctionCarRepository.UpdateAsync(auctionCar);
            await _unitOfWork.SaveChangesAsync();
            _logger.LogInformation("✅ Car marked as unsold: {LotNumber}, Reason: {Reason}",
                auctionCar.LotNumber, reason);

            return _mapper.Map<AuctionCarDetailDto>(auctionCar);
        }
        #endregion

        #region Pre-Bid Management  
        public async Task<bool> HasRequiredPreBidsAsync(Guid auctionCarId)
        {
            var preBidCount = await _auctionCarRepository.GetTotalPreBidCountAsync(auctionCarId);
            var hasRequiredPreBids = preBidCount > 0;

            _logger.LogInformation("Pre-bid check for car {AuctionCarId}: {PreBidCount} pre-bids, Pre-bid requirement: OPTIONAL",
                auctionCarId, preBidCount);

            return hasRequiredPreBids;
        }
        public async Task<BidDetailDto?> GetHighestPreBidAsync(Guid auctionCarId)
        {
            var highestPreBid = await _bidRepository.GetHighestPreBidAsync(auctionCarId);
            if (highestPreBid == null)
            {
                _logger.LogInformation("No pre-bids found for car: {AuctionCarId}", auctionCarId);
                return null;
            }

            _logger.LogInformation("Highest pre-bid for car {AuctionCarId}: ${Amount}",
                auctionCarId, highestPreBid.Amount);

            return _mapper.Map<BidDetailDto>(highestPreBid);
        }
        public async Task<bool> HasUserPreBidAsync(Guid auctionCarId, Guid userId)
        {
            var hasPreBid = await _auctionCarRepository.HasUserPreBid(auctionCarId, userId);
            _logger.LogInformation("User {UserId} pre-bid check for car {AuctionCarId}: {HasPreBid}",
                userId, auctionCarId, hasPreBid);

            return hasPreBid;
        }
        public async Task<IEnumerable<BidGetDto>> GetPreBidsAsync(Guid auctionCarId)
        {
            var preBids = await _bidRepository.GetPreBidsAsync(auctionCarId);
            var dtos = _mapper.Map<IEnumerable<BidGetDto>>(preBids);
            _logger.LogInformation("Retrieved {Count} pre-bids for car: {AuctionCarId}",
                preBids.Count(), auctionCarId);

            return dtos;
        }
        #endregion

        #region Price Management
        public async Task<AuctionCarDetailDto> UpdateCurrentPriceAsync(Guid auctionCarId, decimal newPrice)
        {
            _logger.LogInformation("💰 Updating current price: {AuctionCarId}, New Price: ${NewPrice}",
                auctionCarId, newPrice);

            var auctionCar = await _auctionCarRepository.GetByIdAsync(auctionCarId);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", auctionCarId);
            }
            if (newPrice <= auctionCar.CurrentPrice)
            {
                throw new AuctionBusinessException(auctionCar.LotNumber, "New price must be greater than current price");
            }
            var oldPrice = auctionCar.CurrentPrice;
            auctionCar.UpdateCurrentPrice(newPrice);
            await _auctionCarRepository.UpdateAsync(auctionCar);
            await _unitOfWork.SaveChangesAsync();
            _logger.LogInformation("✅ Price updated from ${OldPrice} to ${NewPrice} for {LotNumber}",
               oldPrice, newPrice, auctionCar.LotNumber);

            return _mapper.Map<AuctionCarDetailDto>(auctionCar);
        }
        public async Task<bool> IsReservePriceMetAsync(Guid auctionCarId)
        {
            var auctionCar = await _auctionCarRepository.GetByIdAsync(auctionCarId);
            if (auctionCar == null) return false;
            var isReserveMet = auctionCar.IsReserveMet;
            _logger.LogInformation("Reserve price check for {AuctionCarId}: Reserve=${Reserve}, Current=${Current}, Met={Met}",
                auctionCarId, auctionCar.ReservePrice, auctionCar.CurrentPrice, isReserveMet);

            return isReserveMet;
        }
        public async Task<decimal> CalculateNextMinimumBidAsync(Guid auctionCarId)
        {
            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(auctionCarId);
            if (auctionCar == null) return 0;
            var minIncrement = auctionCar.Auction?.MinBidIncrement ?? 100; // Default increment
            var nextMinBid = auctionCar.CurrentPrice + minIncrement;
            _logger.LogInformation("Next minimum bid for {LotNumber}: Current=${Current} + Increment=${Increment} = ${NextMin}",
                auctionCar.LotNumber, auctionCar.CurrentPrice, minIncrement, nextMinBid);

            return nextMinBid;
        }
        public async Task<AuctionCarDetailDto> SetHammerPriceAsync(Guid auctionCarId, decimal hammerPrice)
        {
            _logger.LogInformation("🔨 Setting hammer price: {AuctionCarId}, Price: ${HammerPrice}",
                auctionCarId, hammerPrice);

            var auctionCar = await _auctionCarRepository.GetByIdAsync(auctionCarId);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", auctionCarId);
            }
            if (hammerPrice <= 0)
            {
                throw new BadRequestException("Hammer price must be greater than zero");
            }
            auctionCar.SetHammer(hammerPrice);
            await _auctionCarRepository.UpdateAsync(auctionCar);
            await _unitOfWork.SaveChangesAsync();
            _logger.LogInformation("✅ Hammer price set to ${HammerPrice} for {LotNumber} - SOLD!",
               hammerPrice, auctionCar.LotNumber);
            return _mapper.Map<AuctionCarDetailDto>(auctionCar);
        }
        #endregion

        #region Timer and Status
        public async Task<AuctionCarTimerDto> GetCarTimerInfoAsync(Guid auctionCarId)
        {
            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(auctionCarId);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", auctionCarId);
            }

            var timerSeconds = auctionCar.Auction?.TimerSeconds ?? 10;
            var isExpired = auctionCar.IsTimeExpired(timerSeconds);
            var remainingTime = 0;
            if (!isExpired && auctionCar.IsActive)
            {
                var lastActionTime = auctionCar.LastBidTime ?? auctionCar.ActiveStartTime ?? DateTime.UtcNow;
                var elapsed = (DateTime.UtcNow - lastActionTime).TotalSeconds;
                remainingTime = Math.Max(0, (int)(timerSeconds - elapsed));
                if (remainingTime <= 5)
                {
                    remainingTime = Math.Max(0, (int)((timerSeconds * 1000 - (DateTime.UtcNow - lastActionTime).TotalMilliseconds) / 1000));
                }
            }

            var nextTimeoutAt = auctionCar.LastBidTime?.AddSeconds(timerSeconds);

            var timerDto = new AuctionCarTimerDto
            {
                AuctionCarId = auctionCarId,
                LotNumber = auctionCar.LotNumber,
                RemainingTimeSeconds = remainingTime,
                IsExpired = isExpired,
                LastBidTime = auctionCar.LastBidTime,
                NextTimeoutAt = nextTimeoutAt,
                IsActive = auctionCar.IsActive,
                ShowFinalCall = remainingTime <= 30 && remainingTime > 0,
                IsInCriticalTime = remainingTime <= 10 && remainingTime > 0
            };

            _logger.LogInformation("Timer info for {LotNumber}: Remaining={Remaining}s, Expired={Expired}, Active={Active}, FinalCall={FinalCall}",
                auctionCar.LotNumber, remainingTime, isExpired, auctionCar.IsActive, timerDto.ShowFinalCall);

            return timerDto;
        }
        public async Task UpdateLastBidTimeAsync(Guid auctionCarId, DateTime bidTime)
        {
            var auctionCar = await _auctionCarRepository.GetByIdAsync(auctionCarId);
            if(auctionCar == null) return;
            _logger.LogInformation("Timer reset for car {AuctionCarId} at {BidTime}", auctionCarId, bidTime);

            await _auctionCarRepository.UpdateAsync(auctionCar);
            await _unitOfWork.SaveChangesAsync();
        }
        public async Task<bool> IsCarTimerExpiredAsync(Guid auctionCarId, int timerSeconds)
        {
            var auctionCar = await _auctionCarRepository.GetByIdAsync(auctionCarId);
            if(auctionCar == null) return false;
            var isExpired = auctionCar.IsTimeExpired(timerSeconds);
            _logger.LogInformation("Timer expiry check for car {AuctionCarId}: Expired={Expired}",
                auctionCarId, isExpired);
            return isExpired;
        }
        #endregion

        #region Statistics and Information
        public async Task<BidStatsDto> GetCarBidStatsAsync(Guid auctionCarId)
        {
            _logger.LogInformation("📊 Generating bid stats for car: {AuctionCarId}", auctionCarId);
            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(auctionCarId);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", auctionCarId);
            }
            var totalBids = await _bidRepository.GetTotalBidCountAsync(auctionCarId);
            var activeBids = await _bidRepository.GetActiveBidCountAsync(auctionCarId);
            var preBids = auctionCar.Bids.Count(b => b.IsPreBid);
            var proxyBids = auctionCar.Bids.Count(b => b.IsProxy);
            var uniqueBidders = await _bidRepository.GetUniqueBiddersCountAsync(auctionCarId);

            var allBids = auctionCar.Bids.Where(b => b.Status == Domain.Enums.AuctionEnums.BidStatus.Placed).ToList();

            var highestBid = allBids.Any() ? allBids.Max(b => b.Amount) : 0;
            var lowestBid = allBids.Any() ? allBids.Min(b => b.Amount) : 0;
            var averageBid = allBids.Any() ? allBids.Average(b => b.Amount) : 0;

            var firstBidTime = allBids.Any() ? allBids.Min(b => b.PlacedAtUtc) : (DateTime?)null;
            var lastBidTime = allBids.Any() ? allBids.Max(b => b.PlacedAtUtc) : (DateTime?)null;

            var biddingDuration = firstBidTime.HasValue && lastBidTime.HasValue
                ? lastBidTime.Value - firstBidTime.Value
                : (TimeSpan?)null;

            var timeSinceLastBid = lastBidTime.HasValue
                ? DateTime.UtcNow - lastBidTime.Value
                : (TimeSpan?)null;
            var priceIncrease = highestBid - (auctionCar.MinPreBid > 0 ? auctionCar.MinPreBid : highestBid);
            var priceIncreasePercentage = auctionCar.MinPreBid > 0
                ? ((highestBid - auctionCar.MinPreBid) / auctionCar.MinPreBid) * 100
                : 0;

            var bidsPerHour = biddingDuration?.TotalHours > 0
                ? (decimal)(totalBids / biddingDuration.Value.TotalHours)
                : 0;

            var averageBidInterval = allBids.Count > 1 && biddingDuration?.TotalMinutes > 0
                ? (decimal)(biddingDuration.Value.TotalMinutes / (allBids.Count - 1))
                : 0;
            string trendDirection = "Stable";
            if (allBids.Count >= 3)
            {
                var recentBids = allBids.OrderBy(b => b.PlacedAtUtc).TakeLast(3).ToList();
                if (recentBids.Count == 3)
                {
                    var trend1 = recentBids[1].Amount - recentBids[0].Amount;
                    var trend2 = recentBids[2].Amount - recentBids[1].Amount;

                    if (trend1 > 0 && trend2 > 0)
                        trendDirection = "Up";
                    else if (trend1 < 0 && trend2 < 0)
                        trendDirection = "Down";
                }
            }
            var stats = new BidStatsDto
            {
                AuctionCarId = auctionCarId,
                LotNumber = auctionCar.LotNumber,
                TotalBids = totalBids,
                UniqueBidders = uniqueBidders,
                ActiveBids = activeBids,
                PreBids = preBids,
                ProxyBids = proxyBids,
                CurrentPrice = auctionCar.CurrentPrice,
                StartingPrice = auctionCar.MinPreBid,
                HighestBid = highestBid,
                LowestBid = lowestBid,
                AverageBid = averageBid,
                PriceIncrease = priceIncrease,
                PriceIncreasePercentage = priceIncreasePercentage,
                FirstBidTime = firstBidTime,
                LastBidTime = lastBidTime,
                BiddingDuration = biddingDuration,
                TimeSinceLastBid = timeSinceLastBid,
                BidsPerHour = bidsPerHour,
                AverageBidInterval = averageBidInterval,
                TrendDirection = trendDirection
            };

            _logger.LogInformation("✅ Generated comprehensive stats for {LotNumber}: {TotalBids} bids, {UniqueBidders} bidders",
                auctionCar.LotNumber, totalBids, uniqueBidders);

            return stats;
        }
        public async Task<AuctionCarDetailDto> GetCarWithFullDetailsAsync(Guid auctionCarId)
        {
            _logger.LogInformation("🔍 Getting car with full details: {AuctionCarId}", auctionCarId);

            var auctionCar = await _auctionCarRepository.GetAuctionCarWithFullDetailsAsync(auctionCarId);
            if (auctionCar == null)
            {
                throw new NotFoundException("AuctionCar", auctionCarId);
            }

            var dto = _mapper.Map<AuctionCarDetailDto>(auctionCar);

            //  real-time statistics
            var stats = await GetCarBidStatsAsync(auctionCarId);
            dto.TotalBidsCount = stats.TotalBids;
            dto.PreBidsCount = stats.PreBids;
            dto.HighestPreBidAmount = await _auctionCarRepository.GetHighestPreBidAmountAsync(auctionCarId);
            dto.HighestBidAmount = stats.HighestBid;
            if (auctionCar.IsActive)
            {
                var timerInfo = await GetCarTimerInfoAsync(auctionCarId);
                dto.RemainingTimeSeconds = timerInfo.RemainingTimeSeconds;
                dto.IsTimeExpired = timerInfo.IsExpired;
            }

            _logger.LogInformation("✅ Retrieved full details for {LotNumber}", auctionCar.LotNumber);
            return dto;
        }

        public async Task<IEnumerable<AuctionCarGetDto>> GetCarsReadyForAuctionAsync(Guid auctionId)
        {
            _logger.LogInformation("🚗 Getting cars ready for auction: {AuctionId}", auctionId);

            var carsReady = await _auctionCarRepository.GetAuctionCarsReadyForAuctionAsync(auctionId);
            var dtos = _mapper.Map<IEnumerable<AuctionCarGetDto>>(carsReady);

            _logger.LogInformation("✅ Found {Count} cars ready for auction {AuctionId}",
                carsReady.Count(), auctionId);

            return dtos;
        }

        public async Task<IEnumerable<AuctionCarGetDto>> GetUnsoldCarsAsync(Guid auctionId)
        {
            _logger.LogInformation("❌ Getting unsold cars for auction: {AuctionId}", auctionId);

            var unsoldCars = await _auctionCarRepository.GetUnsoldAuctionCarsAsync(auctionId);
            var dtos = _mapper.Map<IEnumerable<AuctionCarGetDto>>(unsoldCars);

            _logger.LogInformation("Found {Count} unsold cars in auction {AuctionId}",
                unsoldCars.Count(), auctionId);

            return dtos;
        }
        #endregion

        #region Query And Navigation Methods
        public async Task<IEnumerable<AuctionCarGetDto>> GetCarsByAuctionIdAsync(Guid auctionId)
        {
            _logger.LogInformation("🔍 Getting all cars for auction: {AuctionId}", auctionId);

            var cars = await _auctionCarRepository.GetByAuctionIdAsync(auctionId);
            var dtos = _mapper.Map<IEnumerable<AuctionCarGetDto>>(cars);

            _logger.LogInformation("✅ Retrieved {Count} cars for auction {AuctionId}",
                cars.Count(), auctionId);

            return dtos;
        }

        public async Task<AuctionCarDetailDto?> GetCarByLotNumberAsync(string lotNumber)
        {
            _logger.LogInformation("🔍 Getting car by lot number: {LotNumber}", lotNumber);

            var auctionCar = await _auctionCarRepository.GetByLotNumberAsync(lotNumber);
            if (auctionCar == null)
            {
                _logger.LogInformation("No car found with lot number: {LotNumber}", lotNumber);
                return null;
            }

            var dto = _mapper.Map<AuctionCarDetailDto>(auctionCar);

            _logger.LogInformation("✅ Found car: {LotNumber}", lotNumber);
            return dto;
        }

        public async Task<AuctionCarDetailDto?> GetActiveCarForAuctionAsync(Guid auctionId)
        {
            _logger.LogInformation("🔴 Getting active car for auction: {AuctionId}", auctionId);

            var activeCar = await _auctionCarRepository.GetActiveAuctionCarAsync(auctionId);
            if (activeCar == null)
            {
                _logger.LogInformation("No active car found for auction: {AuctionId}", auctionId);
                return null;
            }

            var dto = _mapper.Map<AuctionCarDetailDto>(activeCar);

            // Add real-time timer info for active car
            var timerInfo = await GetCarTimerInfoAsync(activeCar.Id);
            dto.RemainingTimeSeconds = timerInfo.RemainingTimeSeconds;
            dto.IsTimeExpired = timerInfo.IsExpired;

            _logger.LogInformation("✅ Active car for auction {AuctionId}: {LotNumber}",
                auctionId, activeCar.LotNumber);

            return dto;
        }

        public async Task<AuctionCarDetailDto?> GetNextCarForAuctionAsync(Guid auctionId, string currentLotNumber)
        {
            _logger.LogInformation("⏭️ Getting next car after {CurrentLotNumber} for auction: {AuctionId}",
                currentLotNumber, auctionId);

            var nextCar = await _auctionCarRepository.GetNextAuctionCarAsync(auctionId, currentLotNumber);
            if (nextCar == null)
            {
                _logger.LogInformation("No next car found after {CurrentLotNumber} for auction {AuctionId}",
                    currentLotNumber, auctionId);
                return null;
            }

            var dto = _mapper.Map<AuctionCarDetailDto>(nextCar);

            _logger.LogInformation("✅ Next car after {CurrentLotNumber}: {NextLotNumber}",
                currentLotNumber, nextCar.LotNumber);

            return dto;
        }
        #endregion
    }
}
