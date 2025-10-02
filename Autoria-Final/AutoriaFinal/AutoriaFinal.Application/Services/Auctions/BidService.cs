using AutoMapper;
using AutoriaFinal.Application.Exceptions;
using AutoriaFinal.Contract.Dtos.Auctions.Bid;
using AutoriaFinal.Contract.Services.Auctions;
using AutoriaFinal.Contract.Enums.Bids; 
using AutoriaFinal.Domain.Entities.Auctions;
using AutoriaFinal.Domain.Enums.AuctionEnums;
using AutoriaFinal.Domain.Enums.Bids;
using AutoriaFinal.Domain.Repositories;
using AutoriaFinal.Domain.Repositories.Auctions;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AutoriaFinal.Application.Services.Auctions
{
    public class BidService : GenericService<
        Bid,
        BidGetDto,
        BidDetailDto,
        BidCreateDto,
        BidUpdateDto>, IBidService
    {
        #region Dependencies & Constructor
        private readonly IBidRepository _bidRepository;
        private readonly IAuctionCarRepository _auctionCarRepository;
        private readonly IAuctionRepository _auctionRepository;

        public BidService(
            IBidRepository bidRepository,
            IAuctionCarRepository auctionCarRepository,
            IAuctionRepository auctionRepository,
            IUnitOfWork unitOfWork,
            IMapper mapper,
            ILogger<BidService> logger)
            : base(bidRepository, mapper, unitOfWork, logger)
        {
            _bidRepository = bidRepository;
            _auctionCarRepository = auctionCarRepository;
            _auctionRepository = auctionRepository;
        }
        #endregion

        #region GenericService Overrides

        public override async Task<BidDetailDto> AddAsync(BidCreateDto dto)
        {
            return await PlaceBidAsync(dto);
        }

        public new async Task<BidDetailDto> GetByIdAsync(Guid id) // ✅ Override base method
        {
            _logger.LogInformation("🔍 Getting bid details: {BidId}", id);

            var bid = await _bidRepository.GetByIdAsync(id);
            if (bid == null)
                throw new NotFoundException("Bid", id);

            var dto = _mapper.Map<BidDetailDto>(bid);
            await EnrichBidDetailsAsync(dto);

            return dto;
        }

        public new async Task<bool> DeleteAsync(Guid id) // ✅ Override, not new
        {
            _logger.LogInformation("🗑️ Retracting bid: {BidId}", id);

            var bid = await _bidRepository.GetByIdAsync(id);
            if (bid == null)
                return false;

            var auctionCar = await _auctionCarRepository.GetByIdAsync(bid.AuctionCarId);
            if (auctionCar?.IsActive == true)
                throw new AuctionBusinessException(auctionCar.LotNumber, "Active auction zamanı bid geri çəkilə bilməz");

            bid.Retract("Bid retracted by user");
            await _bidRepository.UpdateAsync(bid);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("✅ Bid retracted successfully: {BidId}", id);
            return true;
        }

        #endregion

        #region Interface Implementation

        // ✅ Interface method implementation
        public async Task<BidDetailDto> GetBidByIdAsync(Guid id)
        {
            return await GetByIdAsync(id); // Delegate to base override
        }

        #endregion

        #region Core Bid Operations

        public async Task<BidDetailDto> PlaceBidAsync(BidCreateDto dto, bool resetTimer = true)
        {
            _logger.LogInformation("💰 Placing bid: User {UserId}, Car {AuctionCarId}, Amount ${Amount}, Type: {BidType}",
                dto.UserId, dto.AuctionCarId, dto.Amount, dto.BidType);

            var validation = await ValidateBidAsync(dto);
            if (!validation.IsValid)
                throw new AuctionBusinessException("", string.Join("; ", validation.Errors));

            // ✅ Fixed enum switch with proper DTO enum
            return dto.BidType switch
            {
                BidTypeDto.PreBid => await PlacePreBidAsync(dto),
                BidTypeDto.Regular => await PlaceLiveBidAsync(dto),
                BidTypeDto.ProxyBid => await PlaceProxyBidInternalAsync(dto),
                _ => throw new BadRequestException($"Unsupported bid type: {dto.BidType}")
            };
        }

        public async Task<BidDetailDto> PlacePreBidAsync(BidCreateDto dto)
        {
            _logger.LogInformation("🏁 Placing pre-bid: User {UserId}, Amount ${Amount}", dto.UserId, dto.Amount);

            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(dto.AuctionCarId);
            if (auctionCar == null)
                throw new NotFoundException("AuctionCar", dto.AuctionCarId);

            if (auctionCar.Auction?.Status == AuctionStatus.Running)
                throw new AuctionBusinessException(auctionCar.LotNumber, "Auction başladıqdan sonra pre-bid verilə bilməz");

            if (dto.Amount < auctionCar.MinPreBid)
                throw new AuctionBusinessException(auctionCar.LotNumber,
                    $"Pre-bid minimum {auctionCar.MinPreBid:C} olmalıdır");

            var bid = Bid.CreateRegularBid(
                dto.AuctionCarId,
                dto.UserId,
                dto.Amount,
                isPreBid: true,
                dto.IPAddress,
                dto.UserAgent);

            var createdBid = await _bidRepository.AddAsync(bid);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("✅ Pre-bid placed: {BidId} - ${Amount} for {LotNumber}",
               createdBid.Id, dto.Amount, auctionCar.LotNumber);

            var result = _mapper.Map<BidDetailDto>(createdBid);
            await EnrichBidDetailsAsync(result);
            return result;
        }

        public async Task<BidDetailDto> PlaceLiveBidAsync(BidCreateDto dto)
        {
            _logger.LogInformation("🔴 Placing live bid: User {UserId}, Amount ${Amount}", dto.UserId, dto.Amount);

            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(dto.AuctionCarId);
            if (auctionCar == null)
                throw new NotFoundException("AuctionCar", dto.AuctionCarId);

            if (auctionCar.Auction?.Status != AuctionStatus.Running)
                throw new AuctionBusinessException(auctionCar.LotNumber, "Auction işləmir, live bid verilə bilməz");

            if (!auctionCar.IsActive)
                throw new AuctionBusinessException(auctionCar.LotNumber, "Bu maşın hazırda aktiv deyil");

            var minimumBid = await CalculateMinimumBidAsync(dto.AuctionCarId);
            if (dto.Amount < minimumBid)
                throw new AuctionBusinessException(auctionCar.LotNumber, $"Minimum bid {minimumBid:C} olmalıdır");

            var bid = Bid.CreateRegularBid(
                dto.AuctionCarId,
                dto.UserId,
                dto.Amount,
                isPreBid: false,
                dto.IPAddress,
                dto.UserAgent);

            var createdBid = await _bidRepository.AddAsync(bid);

            // Update AuctionCar with new bid info
            auctionCar.UpdateCurrentPrice(dto.Amount);
            await _auctionCarRepository.UpdateAsync(auctionCar);
            await _unitOfWork.SaveChangesAsync();

            // Process proxy bid after current bid is saved
            await ProcessProxyBidsAsync(dto.AuctionCarId, dto.Amount);

            var result = _mapper.Map<BidDetailDto>(createdBid);
            await EnrichBidDetailsAsync(result);

            _logger.LogInformation("✅ Live bid placed: {BidId} - ${Amount} for {LotNumber} - Timer reset",
                createdBid.Id, dto.Amount, auctionCar.LotNumber);

            return result;
        }

        public async Task<BidDetailDto> PlaceProxyBidAsync(ProxyBidDto dto)
        {
            _logger.LogInformation("🤖 Placing proxy bid: User {UserId}, Start ${StartAmount}, Max ${MaxAmount}",
                dto.UserId, dto.StartAmount, dto.MaxAmount);

            var createDto = new BidCreateDto
            {
                AuctionCarId = dto.AuctionCarId,
                UserId = dto.UserId,
                Amount = dto.StartAmount,
                IsProxy = true,
                ProxyMax = dto.MaxAmount,
                ValidUntil = dto.ValidUntil,
                Notes = dto.Notes,
                IsPreBid = dto.IsPreBid,
                BidType = dto.IsPreBid ? BidTypeDto.PreBid : BidTypeDto.ProxyBid // ✅ Fixed enum
            };
            return await PlaceProxyBidInternalAsync(createDto);
        }

        #endregion

        #region Proxy Bid Management

        private async Task<BidDetailDto> PlaceProxyBidInternalAsync(BidCreateDto dto)
        {
            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(dto.AuctionCarId);
            if (auctionCar == null)
                throw new NotFoundException("AuctionCar", dto.AuctionCarId);

            if (!dto.ProxyMax.HasValue || dto.ProxyMax.Value <= dto.Amount)
                throw new BadRequestException("Proxy max amount must be greater than current amount");

            var validUntil = dto.ValidUntil ?? (dto.IsPreBid ? DateTime.UtcNow.AddDays(7) : DateTime.UtcNow.AddHours(24));

            var proxyBid = Bid.CreateProxyBid(
                dto.AuctionCarId,
                dto.UserId,
                dto.Amount,
                dto.ProxyMax.Value,
                validUntil,
                dto.IsPreBid,
                dto.IPAddress,
                dto.UserAgent);

            var createdBid = await _bidRepository.AddAsync(proxyBid);
            await _unitOfWork.SaveChangesAsync();

            var result = _mapper.Map<BidDetailDto>(createdBid);
            await EnrichBidDetailsAsync(result);

            _logger.LogInformation("✅ Proxy bid placed: {BidId} - Start ${Amount}, Max ${MaxAmount} for {LotNumber}",
                createdBid.Id, dto.Amount, dto.ProxyMax.Value, auctionCar.LotNumber);

            return result;
        }

        public async Task ProcessProxyBidsAsync(Guid auctionCarId, decimal currentHighestBid)
        {
            _logger.LogInformation("🤖 Processing proxy bids for car {AuctionCarId}, current highest: ${Amount}",
               auctionCarId, currentHighestBid);

            var activeProxyBids = await _bidRepository.GetActiveProxyBidsAsync(auctionCarId);
            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(auctionCarId);

            if (auctionCar == null) return;

            var minIncrement = auctionCar.Auction?.MinBidIncrement ?? 100;
            var processedCount = 0;

            foreach (var proxyBid in activeProxyBids.Where(pb => pb.IsProxyBidValid()))
            {
                var nextAmount = proxyBid.CalculateNextProxyAmount(currentHighestBid, minIncrement);
                if (nextAmount > currentHighestBid && nextAmount <= proxyBid.ProxyMax)
                {
                    var autoBid = Bid.CreateAutoBid(auctionCarId, proxyBid.UserId, nextAmount, proxyBid.Id, ++processedCount);
                    await _bidRepository.AddAsync(autoBid);

                    currentHighestBid = nextAmount;
                    auctionCar.UpdateCurrentPrice(nextAmount);

                    _logger.LogInformation("🔄 Auto-bid created: ${Amount} from proxy {ProxyBidId}",
                        nextAmount, proxyBid.Id);
                }
            }

            if (processedCount > 0)
            {
                await _auctionCarRepository.UpdateAsync(auctionCar);
                await _unitOfWork.SaveChangesAsync();

                _logger.LogInformation("✅ Processed {Count} proxy bids, new highest: ${Amount}",
                    processedCount, currentHighestBid);
            }
        }

        public async Task<IEnumerable<BidDetailDto>> GetUserActiveProxyBidsAsync(Guid userId, Guid auctionCarId)
        {
            _logger.LogInformation("🔍 Getting user active proxy bids: User {UserId}, Car {AuctionCarId}", userId, auctionCarId);

            var proxyBids = await _bidRepository.GetUserProxyBidsAsync(userId, auctionCarId);
            var activeBids = proxyBids.Where(pb => pb.IsProxyBidValid() && pb.Status == BidStatus.Placed);

            var results = _mapper.Map<IEnumerable<BidDetailDto>>(activeBids);
            foreach (var result in results)
            {
                await EnrichBidDetailsAsync(result);
            }

            _logger.LogInformation("✅ Found {Count} active proxy bids for user {UserId}", results.Count(), userId);
            return results;
        }

        public async Task<bool> CancelProxyBidAsync(Guid bidId, Guid userId)
        {
            _logger.LogInformation("❌ Cancelling proxy bid: {BidId} by user {UserId}", bidId, userId);

            var bid = await _bidRepository.GetByIdAsync(bidId);
            if (bid == null || bid.UserId != userId || !bid.IsProxy)
            {
                _logger.LogWarning("Proxy bid cancel failed: Invalid bid or user mismatch");
                return false;
            }

            bid.Retract("Proxy bid cancelled by user");
            await _bidRepository.UpdateAsync(bid);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("✅ Proxy bid cancelled successfully: {BidId}", bidId);
            return true;
        }

        #endregion

        #region Bid Validation

        public async Task<BidValidationResult> ValidateBidAsync(BidCreateDto dto)
        {
            var result = new BidValidationResult { IsValid = true };

            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(dto.AuctionCarId);
            if (auctionCar == null)
            {
                result.IsValid = false;
                result.Errors.Add("Auction car not found");
                return result;
            }

            var auction = auctionCar.Auction;
            result.AuctionActive = auction?.Status == AuctionStatus.Running;

            // Auction status validation
            if (dto.IsPreBid)
            {
                if (auction?.Status == AuctionStatus.Running)
                    result.Errors.Add("Auction başladıqdan sonra pre-bid verilə bilməz");
            }
            else
            {
                if (auction?.Status != AuctionStatus.Running)
                    result.Errors.Add("Live bid yalnız running auction zamanı verilə bilər");

                if (!auctionCar.IsActive)
                    result.Errors.Add("Bu maşın hazırda aktiv deyil");
            }

            // Amount validations
            var minimumBid = await CalculateMinimumBidAsync(dto.AuctionCarId);
            result.MinimumBidAmount = minimumBid;
            result.CurrentHighestBid = auctionCar.CurrentPrice;

            if (dto.Amount < minimumBid)
            {
                result.Errors.Add($"Minimum bid {minimumBid:C} olmalıdır");
                result.SuggestedBidAmount = minimumBid;
            }
            else
            {
                var increment = auction?.MinBidIncrement ?? 100;
                result.SuggestedBidAmount = Math.Max(minimumBid, auctionCar.CurrentPrice + increment);
            }

            // Pre-bid requirement check
            if (!dto.IsPreBid && auction?.Status == AuctionStatus.Running)
            {
                var hasPreBid = await _bidRepository.HasUserPreBidAsync(dto.UserId, dto.AuctionCarId);
                if (!hasPreBid)
                {
                    result.RequiresPreBid = true;
                    result.Warnings.Add("Live auction-a qatılmaq üçün pre-bid tələb oluna bilər");
                }
            }

            // Proxy bid validations
            if (dto.IsProxy && dto.ProxyMax.HasValue)
            {
                if (dto.ProxyMax.Value <= dto.Amount)
                    result.Errors.Add("Proxy maksimumu cari məbləğdən böyük olmalıdır");

                if (dto.ProxyMax.Value > 10000000)
                    result.Errors.Add("Proxy maksimumu 10,000,000-dan çox ola bilməz");
            }

            // Rate limiting
            var recentBids = await _bidRepository.GetBidsAfterTimeAsync(dto.AuctionCarId, DateTime.UtcNow.AddMinutes(-1));
            var userRecentBids = recentBids.Count(b => b.UserId == dto.UserId);

            if (userRecentBids > 5)
            {
                result.Errors.Add("Çox tez-tez bid verirsiniz, bir dəqiqə gözləyin");
            }

            result.IsValid = result.Errors.Count == 0;

            _logger.LogInformation("Bid validation completed: User {UserId}, Car {AuctionCarId}, Valid: {IsValid}, Errors: {ErrorCount}",
                dto.UserId, dto.AuctionCarId, result.IsValid, result.Errors.Count);

            return result;
        }

        public async Task<decimal> GetMinimumBidAmountAsync(Guid auctionCarId)
        {
            return await CalculateMinimumBidAsync(auctionCarId);
        }

        private async Task<decimal> CalculateMinimumBidAsync(Guid auctionCarId)
        {
            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(auctionCarId);
            if (auctionCar == null) return 0;

            var currentPrice = auctionCar.CurrentPrice;

            var increment = currentPrice switch
            {
                < 100 => 25,
                < 500 => 50,
                < 1000 => 100,
                < 5000 => 250,
                < 10000 => 500,
                _ => 1000
            };

            return Math.Max(currentPrice + increment, auctionCar.MinPreBid);
        }

        public async Task<bool> CanUserPlaceBidAsync(Guid userId, Guid auctionCarId)
        {
            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(auctionCarId);
            if (auctionCar?.Auction == null) return false;

            // Basic checks
            if (auctionCar.Auction.Status != AuctionStatus.Running) return true; // Pre-bid allowed
            if (!auctionCar.IsActive) return false; // Car not active

            return true;
        }

        #endregion

        #region Bid History & Statistics

        public async Task<BidHistoryDto> GetBidHistoryAsync(Guid auctionCarId, int pageSize = 50)
        {
            _logger.LogInformation("📊 Getting bid history: Car {AuctionCarId}, PageSize {PageSize}", auctionCarId, pageSize);

            var auctionCar = await _auctionCarRepository.GetAuctionCarWithFullDetailsAsync(auctionCarId);
            if (auctionCar == null)
                throw new NotFoundException("AuctionCar", auctionCarId);

            var allBids = await _bidRepository.GetBidHistoryAsync(auctionCarId, pageSize);
            var bidDtos = _mapper.Map<IEnumerable<BidGetDto>>(allBids);

            // ✅ Fixed: Use auctionId instead of auctionCarId
            var topBidders = await _bidRepository.GetTopBiddersAsync(auctionCar.AuctionId, 10);
            var bidderDtos = _mapper.Map<IEnumerable<BidderSummaryDto>>(topBidders);

            var totalBids = await _bidRepository.GetTotalBidCountAsync(auctionCarId);
            var uniqueBidders = await _bidRepository.GetUniqueBiddersCountAsync(auctionCarId);

            var result = new BidHistoryDto
            {
                AuctionCarId = auctionCarId,
                LotNumber = auctionCar.LotNumber,
                CarInfo = $"{auctionCar.Car?.Year} {auctionCar.Car?.Make} {auctionCar.Car?.Model}",
                TotalBids = totalBids,
                UniqueBidders = uniqueBidders,
                StartingPrice = auctionCar.MinPreBid,
                WinningPrice = auctionCar.CurrentPrice,
                PriceIncrease = auctionCar.CurrentPrice - auctionCar.MinPreBid,
                AuctionStartTime = auctionCar.Auction?.StartTimeUtc ?? DateTime.MinValue,
                AuctionEndTime = auctionCar.Auction?.EndTimeUtc,
                Bids = bidDtos,
                TopBidders = bidderDtos
            };

            _logger.LogInformation("✅ Bid history generated: {TotalBids} bids, {UniqueBidders} bidders", totalBids, uniqueBidders);
            return result;
        }

        public async Task<IEnumerable<BidGetDto>> GetRecentBidsAsync(Guid auctionCarId, int count = 10)
        {
            _logger.LogInformation("🕐 Getting recent bids: Car {AuctionCarId}, Count {Count}", auctionCarId, count);

            var recentBids = await _bidRepository.GetRecentBidsAsync(auctionCarId, count);
            var dtos = _mapper.Map<IEnumerable<BidGetDto>>(recentBids);

            foreach (var dto in dtos)
            {
                dto.TimeAgo = CalculateTimeAgo(dto.PlacedAtUtc);
            }

            return dtos;
        }

        public async Task<IEnumerable<BidGetDto>> GetUserBidsAsync(Guid userId)
        {
            _logger.LogInformation("👤 Getting user bids: User {UserId}", userId);

            var userBids = await _bidRepository.GetUserAllBidsAsync(userId);
            var result = _mapper.Map<IEnumerable<BidGetDto>>(userBids);

            _logger.LogInformation("✅ Found {Count} bids for user {UserId}", result.Count(), userId);
            return result;
        }

        public async Task<BidSummaryDto> GetUserBidSummaryAsync(Guid userId, Guid auctionId)
        {
            _logger.LogInformation("📈 Getting user bid summary: User {UserId}, Auction {AuctionId}", userId, auctionId);

            var userBids = await _bidRepository.GetUserBidsForAuctionAsync(userId, auctionId);

            if (!userBids.Any())
            {
                return new BidSummaryDto { UserId = userId, AuctionId = auctionId };
            }

            var preBids = userBids.Count(b => b.IsPreBid);
            var liveBids = userBids.Count(b => !b.IsPreBid && !b.IsProxy);
            var proxyBids = userBids.Count(b => b.IsProxy);
            var winningBids = 0; // TODO: Implement winner check

            var result = new BidSummaryDto
            {
                UserId = userId,
                AuctionId = auctionId,
                TotalBids = userBids.Count(),
                PreBids = preBids,
                LiveBids = liveBids,
                ProxyBids = proxyBids,
                WinningBids = winningBids,
                TotalBidAmount = userBids.Sum(b => b.Amount),
                HighestBidAmount = userBids.Max(b => b.Amount),
                LowestBidAmount = userBids.Min(b => b.Amount),
                AverageBidAmount = userBids.Average(b => b.Amount),
                FirstBidTime = userBids.Min(b => b.PlacedAtUtc),
                LastBidTime = userBids.Max(b => b.PlacedAtUtc)
            };

            _logger.LogInformation("✅ User bid summary: {TotalBids} bids, Highest: ${HighestBid}",
                result.TotalBids, result.HighestBidAmount);

            return result;
        }

        #endregion

        #region Real-time Support Methods

        // ✅ Fixed: Nullable return type
        public async Task<BidDetailDto?> GetHighestBidAsync(Guid auctionCarId)
        {
            var highestBid = await _bidRepository.GetHighestBidAsync(auctionCarId);
            if (highestBid == null) return null;

            var dto = _mapper.Map<BidDetailDto>(highestBid);
            await EnrichBidDetailsAsync(dto);
            return dto;
        }

        public async Task<DateTime?> GetLastBidTimeAsync(Guid auctionCarId)
        {
            return await _bidRepository.GetLastBidTimeAsync(auctionCarId);
        }

        public async Task<IEnumerable<BidGetDto>> GetBidsAfterTimeAsync(Guid auctionCarId, DateTime afterTime)
        {
            var bids = await _bidRepository.GetBidsAfterTimeAsync(auctionCarId, afterTime);
            return _mapper.Map<IEnumerable<BidGetDto>>(bids);
        }

        public async Task<BidStatsDto> GetBidStatsAsync(Guid auctionCarId)
        {
            _logger.LogInformation("📊 Generating bid stats: Car {AuctionCarId}", auctionCarId);

            var auctionCar = await _auctionCarRepository.GetAuctionCarWithBidsAsync(auctionCarId);
            if (auctionCar == null)
                throw new NotFoundException("AuctionCar", auctionCarId);

            var totalBids = await _bidRepository.GetTotalBidCountAsync(auctionCarId);
            var activeBids = await _bidRepository.GetActiveBidCountAsync(auctionCarId);
            var preBids = auctionCar.Bids.Count(b => b.IsPreBid);
            var proxyBids = auctionCar.Bids.Count(b => b.IsProxy);
            var uniqueBidders = await _bidRepository.GetUniqueBiddersCountAsync(auctionCarId);

            var allBids = auctionCar.Bids.Where(b => b.Status == BidStatus.Placed).ToList();
            var highestBid = allBids.Any() ? allBids.Max(b => b.Amount) : 0;
            var lowestBid = allBids.Any() ? allBids.Min(b => b.Amount) : 0;
            var averageBid = allBids.Any() ? allBids.Average(b => b.Amount) : 0;

            var result = new BidStatsDto
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
                PriceIncrease = highestBid - auctionCar.MinPreBid,
                PriceIncreasePercentage = auctionCar.MinPreBid > 0 ?
                    ((highestBid - auctionCar.MinPreBid) / auctionCar.MinPreBid) * 100 : 0
            };

            _logger.LogInformation("✅ Bid stats generated: {TotalBids} bids, {UniqueBidders} bidders, Current: ${CurrentPrice}",
                totalBids, uniqueBidders, result.CurrentPrice);

            return result;
        }

        public async Task<IEnumerable<BidderSummaryDto>> GetTopBiddersAsync(Guid auctionId, int count = 10)
        {
            _logger.LogInformation("🏆 Getting top bidders: Auction {AuctionId}, Count {Count}", auctionId, count);

            var topBidders = await _bidRepository.GetTopBiddersAsync(auctionId, count);
            var result = _mapper.Map<IEnumerable<BidderSummaryDto>>(topBidders);

            _logger.LogInformation("✅ Found {Count} top bidders", result.Count());
            return result;
        }

        #endregion

        #region Private Helper Methods

        // ✅ Fixed: Null-safe EnrichBidDetailsAsync
        private async Task EnrichBidDetailsAsync(BidDetailDto dto)
        {
            var auctionCar = await _auctionCarRepository.GetAuctionCarWithFullDetailsAsync(dto.AuctionCarId);
            if (auctionCar != null)
            {
                dto.AuctionCarLotNumber = auctionCar.LotNumber;
                dto.AuctionName = auctionCar.Auction?.Name ?? "";
                dto.CarMake = auctionCar.Car?.Make;
                dto.CarModel = auctionCar.Car?.Model;
                dto.CarYear = auctionCar.Car?.Year;
                dto.CarVin = auctionCar.Car?.Vin;

                // ✅ Null-safe operations inside auctionCar != null block
                var highestBid = await _bidRepository.GetHighestBidAsync(dto.AuctionCarId);
                dto.IsHighestBid = highestBid?.Id == dto.Id;
                dto.IsWinningBid = dto.IsHighestBid && auctionCar.Auction?.Status == AuctionStatus.Ended;

                if (highestBid != null)
                    dto.DistanceFromHighest = Math.Max(0, highestBid.Amount - dto.Amount);
            }

            var nextMinBid = await CalculateMinimumBidAsync(dto.AuctionCarId);
            dto.NextMinimumBid = nextMinBid;

            if (dto.IsProxy)
            {
                dto.RemainingProxyAmount = Math.Max(0, (dto.ProxyMax ?? 0) - dto.Amount);
                dto.IsExpired = dto.ValidUntil.HasValue && DateTime.UtcNow > dto.ValidUntil.Value;
                dto.IsActive = dto.Status == "Placed" && !dto.IsExpired;
            }
        }

        private string CalculateTimeAgo(DateTime dateTime)
        {
            var timeSpan = DateTime.UtcNow - dateTime;
            return timeSpan switch
            {
                { TotalMinutes: < 1 } => "İndi",
                { TotalMinutes: < 60 } => $"{(int)timeSpan.TotalMinutes} dəqiqə əvvəl",
                { TotalHours: < 24 } => $"{(int)timeSpan.TotalHours} saat əvvəl",
                _ => $"{(int)timeSpan.TotalDays} gün əvvəl"
            };
        }

        #endregion
    }
}