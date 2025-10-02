using AutoriaFinal.API.Hubs;
using AutoriaFinal.Contract.Dtos.Auctions.Bid;
using AutoriaFinal.Contract.Enums.Bids;
using AutoriaFinal.Contract.Services.Auctions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace AutoriaFinal.API.Controllers.Auctions
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BidController : ControllerBase
    {
        private readonly IBidService _bidService;
        private readonly ILogger<BidController> _logger;
        private readonly IHubContext<AuctionHub> _hubContext;
        private readonly IHubContext<BidHub> _bidHubContext;
        public BidController(
            IBidService bidService,
            ILogger<BidController> logger,
            IHubContext<AuctionHub> hubContext,
            IHubContext<BidHub> bidHubContext)
        {
            _bidService = bidService;
            _logger = logger;
            _hubContext = hubContext;
            _bidHubContext = bidHubContext;
        }
        #region Core Bid Operations
        [HttpPost("prebid")]
        public async Task<ActionResult<BidDetailDto>> PlacePreBid([FromBody] PlacePreBidRequest request)
        {
            var userId = GetCurrentUserId();
            var dto = new BidCreateDto
            {
                AuctionCarId = request.AuctionCarId,
                UserId = userId,
                Amount = request.Amount,
                BidType = BidTypeDto.PreBid,
                IsPreBid = true,
                Notes = request.Notes,
                IPAddress = GetClientIPAddress(),
                UserAgent = GetClientUserAgent()
            };
            var validation = await _bidService.ValidateBidAsync(dto);
            if (!validation.IsValid)
            {
                return BadRequest(new
                {
                    Succes = false,
                    Errors = validation.Errors,
                    MinimumBid = validation.MinimumBidAmount,
                    SuggestedAmount = validation.SuggestedBidAmount
                });
            }
            var result = await _bidService.PlaceBidAsync(dto);
            await _bidHubContext.Clients.Group($"AuctionCar-{request.AuctionCarId}")
                .SendAsync("PreBidPlaced", new
                {
                    result.Id,
                    result.AuctionCarId,
                    result.UserId,
                    result.Amount,
                    result.PlacedAtUtc,
                    result.UserName,
                    BidType = "PreBid"
                });
            _logger.LogInformation("Pre-bid placed via API: User {UserId}, Amount {Amount}", userId, request.Amount);
            return Ok(new
            {
                Success = true,
                Data = result,
                Message = "Pre-bid uğurla yerləşdirildi"
            });
        }
        [HttpPost("live")]
        public async Task<ActionResult<BidDetailDto>> PlaceLiveBid([FromBody] PlaceLiveBidRequest request)
        {
            var userId = GetCurrentUserId();
            var dto = new BidCreateDto
            {
                AuctionCarId = request.AuctionCarId,
                UserId = userId,
                Amount = request.Amount,
                BidType = BidTypeDto.Regular,
                IsPreBid = false,
                IPAddress = GetClientIPAddress(),
                UserAgent = GetClientUserAgent()
            };
            var validation = await _bidService.ValidateBidAsync(dto);
            if (!validation.IsValid)
            {
                return BadRequest(new
                {
                    Succes = false,
                    Errors = validation.Errors,
                    MinimumBid = validation.MinimumBidAmount,
                    SuggestedAmount = validation.SuggestedBidAmount
                });
            }
            var result = await _bidService.PlaceBidAsync(dto);
            var groupName = $"AuctionCar-{request.AuctionCarId}";

            await _bidHubContext.Clients.Group(groupName).SendAsync("NewLiveBid", new
            {
                result.Id,
                result.AuctionCarId,
                result.UserId,
                result.Amount,
                result.PlacedAtUtc,
                result.UserName,
                result.IsHighestBid,
                BidType = "Live"
            });

            await _bidHubContext.Clients.Group(groupName).SendAsync("HighestBidUpdated", new
            {
                AuctionCarId = request.AuctionCarId,
                Amount = result.Amount,
                BidderId = result.UserId,
                BidderName = result.UserName,
                UpdatedAt = DateTime.UtcNow
            });

            await _bidHubContext.Clients.Group(groupName).SendAsync("AuctionTimerReset", new
            {
                AuctionCarId = request.AuctionCarId,
                SecondsRemaining = 10,
                ResetAt = DateTime.UtcNow
            });

            var stats = await _bidService.GetBidStatsAsync(request.AuctionCarId);
            await _bidHubContext.Clients.Group(groupName).SendAsync("BidStatsUpdated", stats);

            _logger.LogInformation("Live bid placed via API: User {UserId}, Amount {Amount}, Highest: {IsHighest}",
                userId, request.Amount, result.IsHighestBid);

            return Ok(new
            {
                Success = true,
                Data = result,
                Message = result.IsHighestBid ? "You are now the highest bidder!" : "Bid placed successfully",
                TimerReset = true
            });
        }
        [HttpPost("proxy")]
        public async Task<ActionResult<BidDetailDto>> PlaceProxyBid([FromBody] PlaceProxyBidRequest request)
        {
            var userId = GetCurrentUserId();

            var proxyDto = new ProxyBidDto
            {
                AuctionCarId = request.AuctionCarId,
                UserId = userId,
                StartAmount = request.StartAmount,
                MaxAmount = request.MaxAmount,
                Notes = request.Notes,
                IsPreBid = request.IsPreBid
            };

            var result = await _bidService.PlaceProxyBidAsync(proxyDto);

            await _bidHubContext.Clients.User(userId.ToString()).SendAsync("ProxyBidSuccess", new
            {
                result.Id,
                result.Amount,
                result.ProxyMax,
                result.ValidUntil,
                Message = $"Proxy bid active: ${request.StartAmount:N0} - ${request.MaxAmount:N0}"
            });

            await _bidHubContext.Clients.Group($"AuctionCar-{request.AuctionCarId}")
                .SendAsync("ProxyBidderJoined", new
                {
                    AuctionCarId = request.AuctionCarId,
                    UserId = userId,
                    StartAmount = request.StartAmount
                });

            _logger.LogInformation("Proxy bid placed via API: User {UserId}, Start {Start}, Max {Max}",
                userId, request.StartAmount, request.MaxAmount);

            return Ok(new
            {
                Success = true,
                Data = result,
                Message = "Proxy bid activated successfully"
            });
        }
        [HttpDelete("proxy/{bidId}")]
        public async Task<ActionResult> CancelProxyBid(Guid bidId)
        {
            var userId = GetCurrentUserId();
            var success = await _bidService.CancelProxyBidAsync(bidId, userId);
            if (!success)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "Failed to cancel proxy bid. It may not exist or you may not have permission."
                });
            }
            await _bidHubContext.Clients.User(userId.ToString()).SendAsync("ProxyBidCancelled", bidId);

            _logger.LogInformation("Proxy bid cancelled via API: {BidId} by user {UserId}", bidId, userId);

            return Ok(new
            {
                Success = true,
                Message = "Proxy bid cancelled successfully"
            });
        }
        #endregion

        #region Bid Info & History
        [HttpGet("{id}")]
        public async Task<ActionResult<BidDetailDto>> GetBidById(Guid id)
        {
            var bid = await _bidService.GetByIdAsync(id);
            return Ok(new
            {
                Success = true,
                Data = bid
            });
        }
        [HttpGet("auction-car/{auctionCarId}/history")]
        public async Task<ActionResult<BidHistoryDto>> GetBidHistory(Guid auctionCarId, [FromQuery] int pageSize = 50)
        {
            var history = await _bidService.GetBidHistoryAsync(auctionCarId, pageSize);

            return Ok(new
            {
                Success = true,
                Data = history
            });
        }

        [HttpGet("auction-car/{auctionCarId}/recent")]
        public async Task<ActionResult<IEnumerable<BidGetDto>>> GetRecentBids(Guid auctionCarId, [FromQuery] int count = 10)
        {
            var recentBids = await _bidService.GetRecentBidsAsync(auctionCarId, count);

            return Ok(new
            {
                Success = true,
                Data = recentBids
            });
        }

        [HttpGet("auction-car/{auctionCarId}/stats")]
        public async Task<ActionResult<BidStatsDto>> GetBidStats(Guid auctionCarId)
        {
            var stats = await _bidService.GetBidStatsAsync(auctionCarId);

            return Ok(new
            {
                Success = true,
                Data = stats
            });
        }

        [HttpGet("auction-car/{auctionCarId}/highest")]
        public async Task<ActionResult<BidDetailDto>> GetHighestBid(Guid auctionCarId)
        {
            var highestBid = await _bidService.GetHighestBidAsync(auctionCarId);

            return Ok(new
            {
                Success = true,
                Data = highestBid
            });
        }

        [HttpGet("auction-car/{auctionCarId}/minimum")]
        public async Task<ActionResult<decimal>> GetMinimumBid(Guid auctionCarId)
        {
            var minimumBid = await _bidService.GetMinimumBidAmountAsync(auctionCarId);

            return Ok(new
            {
                Success = true,
                Data = new { MinimumBidAmount = minimumBid }
            });
        }
        #endregion

        #region User Bids
        [HttpGet("my-bids")]
        public async Task<ActionResult<IEnumerable<BidGetDto>>> GetMyBids()
        {
            var userId = GetCurrentUserId();
            var userBids = await _bidService.GetUserBidsAsync(userId);

            return Ok(new
            {
                Success = true,
                Data = userBids
            });
        }

        [HttpGet("my-proxy-bids/{auctionCarId}")]
        public async Task<ActionResult<IEnumerable<BidDetailDto>>> GetMyProxyBids(Guid auctionCarId)
        {
            var userId = GetCurrentUserId();
            var proxyBids = await _bidService.GetUserActiveProxyBidsAsync(userId, auctionCarId);

            return Ok(new
            {
                Success = true,
                Data = proxyBids
            });
        }

        [HttpGet("my-summary/{auctionId}")]
        public async Task<ActionResult<BidSummaryDto>> GetMyBidSummary(Guid auctionId)
        {
            var userId = GetCurrentUserId();
            var summary = await _bidService.GetUserBidSummaryAsync(userId, auctionId);

            return Ok(new
            {
                Success = true,
                Data = summary
            });
        }
        #endregion

        #region Validation & Utilities
        [HttpPost("validate")]
        public async Task<ActionResult<BidValidationResult>> ValidateBid([FromBody] ValidateBidRequest request)
        {
            var userId = GetCurrentUserId();

            var dto = new BidCreateDto
            {
                AuctionCarId = request.AuctionCarId,
                UserId = userId,
                Amount = request.Amount,
                BidType = request.BidType,
                IsPreBid = request.IsPreBid,
                IsProxy = request.IsProxy,
                ProxyMax = request.ProxyMax
            };

            var validation = await _bidService.ValidateBidAsync(dto);

            return Ok(new
            {
                Success = true,
                Data = validation
            });
        }

        [HttpGet("can-bid/{auctionCarId}")]
        public async Task<ActionResult<bool>> CanUserPlaceBid(Guid auctionCarId)
        {
            var userId = GetCurrentUserId();
            var canBid = await _bidService.CanUserPlaceBidAsync(userId, auctionCarId);

            return Ok(new
            {
                Success = true,
                Data = new { CanPlaceBid = canBid }
            });
        }

        #endregion

        #region Realtime Integration
        [HttpPost("notify-auction-event")]
        [AllowAnonymous]
        public async Task<ActionResult> NotifyAuctionEvent([FromBody] AuctionEventRequest request)
        {
            switch (request.EventType.ToLower())
            {
                case "started":
                    await _hubContext.Clients.Group($"auction-{request.AuctionId}")
                        .SendAsync("AuctionStarted", request.AuctionId, request.Data);
                    break;

                case "ended":
                    await _hubContext.Clients.Group($"auction-{request.AuctionId}")
                        .SendAsync("AuctionEnded", request.AuctionId, request.Data);
                    break;

                case "extended":
                    await _hubContext.Clients.Group($"auction-{request.AuctionId}")
                        .SendAsync("AuctionExtended", request.AuctionId, request.Data);
                    break;

                case "timer":
                    await _hubContext.Clients.Group($"auction-{request.AuctionId}")
                        .SendAsync("AuctionTimerUpdated", request.AuctionId, request.Data);
                    break;
            }

            return Ok(new { Success = true });
        }
        #endregion

        #region Helpers Methods
        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }

        private string GetClientIPAddress()
        {
            return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "";
        }

        private string GetClientUserAgent()
        {
            return Request.Headers.UserAgent.FirstOrDefault() ?? "";
        }

        #endregion

        #region Request DTOs
        public class PlacePreBidRequest
        {
            public Guid AuctionCarId { get; set; }
            public decimal Amount { get; set; }
            public string? Notes { get; set; }
        }

        public class PlaceLiveBidRequest
        {
            public Guid AuctionCarId { get; set; }
            public decimal Amount { get; set; }
        }

        public class PlaceProxyBidRequest
        {
            public Guid AuctionCarId { get; set; }
            public decimal StartAmount { get; set; }
            public decimal MaxAmount { get; set; }
            public string? Notes { get; set; }
            public bool IsPreBid { get; set; } = false;
        }

        public class ValidateBidRequest
        {
            public Guid AuctionCarId { get; set; }
            public decimal Amount { get; set; }
            public BidTypeDto BidType { get; set; }
            public bool IsPreBid { get; set; }
            public bool IsProxy { get; set; }
            public decimal? ProxyMax { get; set; }
        }

        public class AuctionEventRequest
        {
            public Guid AuctionId { get; set; }
            public string EventType { get; set; } = default!;
            public object Data { get; set; } = default!;
        }

        #endregion
    }
}
