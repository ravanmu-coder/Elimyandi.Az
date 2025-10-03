using AutoriaFinal.Contract.Dtos.Auctions.Auction;
using AutoriaFinal.Contract.Services.Auctions;
using AutoriaFinal.Infrastructure.Hubs;
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
    public class AuctionController : ControllerBase
    {
        private readonly IAuctionService _auctionService;
        private readonly IHubContext<AuctionHub> _hubContext;
        private readonly ILogger<AuctionController> _logger;

        public AuctionController(
            IAuctionService auctionService,
            IHubContext<AuctionHub> hubContext,
            ILogger<AuctionController> logger)
        {
            _auctionService = auctionService;
            _hubContext = hubContext;
            _logger = logger;
        }

        #region Basic Crud
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<AuctionGetDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<AuctionGetDto>>> GetAllAuctions()
        {
            var auctions = await _auctionService.GetAllAsync();
            _logger.LogInformation("All auctions retrieved by {User} at {Time}",
                User.Identity?.Name ?? "Anonymous", DateTime.UtcNow);
            return Ok(auctions);
        }

        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(AuctionDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<AuctionDetailDto>> GetAuctionById(Guid id)
        {
            var auction = await _auctionService.GetByIdAsync(id);
            return Ok(auction);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(AuctionDetailDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<AuctionDetailDto>> CreateAuction([FromBody] AuctionCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // ✅ Sizin hazır istifadəçi ID-niz
            var currentUserId = Guid.Parse("9f8bbe66-5499-4790-8e3e-011a4cbda67d");

            var result = await _auctionService.AddAuctionAsync(dto, currentUserId);

            // SignalR notification
            await _hubContext.Clients.All.SendAsync("AuctionScheduled", result.Id, result.StartTimeUtc);

            _logger.LogInformation("AUCTION CREATED: {AuctionId} - {Name} by ravanmu-coder (ID: {UserId}) at {Time}",
                result.Id, result.Name, currentUserId, DateTime.UtcNow);

            return CreatedAtAction(nameof(GetAuctionById), new { id = result.Id }, result);
        }

        [HttpPut("{id:guid}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(AuctionDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<AuctionDetailDto>> UpdateAuction(Guid id, [FromBody] AuctionUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _auctionService.UpdateAsync(id, dto);

            _logger.LogInformation("AUCTION UPDATED: {AuctionId} by {User} at {Time}",
                id, User.Identity?.Name ?? "Unknown", DateTime.UtcNow);

            return Ok(result);
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult> DeleteAuction(Guid id)
        {
            var success = await _auctionService.DeleteAsync(id);

            _logger.LogWarning("AUCTION DELETED: {AuctionId} by {User} at {Time}",
                id, User.Identity?.Name ?? "Unknown", DateTime.UtcNow);

            return NoContent();
        }
        #endregion

        #region Auction Main LifeCycle Methods
        [HttpPost("{id:guid}/start")]
        [Authorize(Roles = "Admin,AuctionManager")]
        [ProducesResponseType(typeof(AuctionDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<AuctionDetailDto>> StartAuction(Guid id)
        {
            var result = await _auctionService.StartAuctionAsync(id);
            await _hubContext.Clients.Group($"auction-{id}")
                .SendAsync("AuctionStarted", id, result.StartPrice ?? 0);

            _logger.LogInformation("AUCTION STARTED: {AuctionId} - Car: {LotNumber} - Price: ${StartPrice} by {User} at {Time}",
                id, result.CurrentCarLotNumber, result.StartPrice, User.Identity?.Name ?? "Unknown", DateTime.UtcNow);

            return Ok(result);
        }

        [HttpPost("{id:guid}/end")]
        [Authorize(Roles = "Admin,AuctionManager")]
        [ProducesResponseType(typeof(AuctionDetailDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<AuctionDetailDto>> EndAuction(Guid id)
        {
            var result = await _auctionService.EndAuctionAsync(id);
            var finalWinAmount = result.TotalSalesAmount;

            await _hubContext.Clients.Group($"auction-{id}")
                .SendAsync("AuctionEnded", id, Guid.Empty, finalWinAmount);

            _logger.LogInformation("AUCTION ENDED: {AuctionId} - Cars: {Total}, Sold: {Sold}, Total: ${Amount} by {User} at {Time}",
                id, result.TotalCarsCount, result.SoldCarsCount, finalWinAmount, User.Identity?.Name ?? "Unknown", DateTime.UtcNow);

            return Ok(result);
        }

        [HttpPost("{id:guid}/cancel")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(AuctionDetailDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<AuctionDetailDto>> CancelAuction(Guid id, [FromBody] AuctionCancelRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest("Ləğv etmə səbəbi mütləqdir");

            var result = await _auctionService.CancelAuctionAsync(id, request.Reason);

            await _hubContext.Clients.Group($"auction-{id}")
                .SendAsync("AuctionCanceled", id);

            _logger.LogWarning("AUCTION CANCELLED: {AuctionId} - Reason: {Reason} by {User} at {Time}",
               id, request.Reason, User.Identity?.Name ?? "Unknown", DateTime.UtcNow);

            return Ok(result);
        }

        [HttpPost("{id:guid}/extend")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(AuctionDetailDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<AuctionDetailDto>> ExtendAuction(Guid id, [FromBody] AuctionExtendRequest request)
        {
            if (request == null)
                return BadRequest("Request məlumatları mütləqdir");

            if (request.AdditionalMinutes <= 0)
                return BadRequest("Əlavə vaxt müsbət olmalıdır");

            if (string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest("Uzatma səbəbi mütləqdir");

            var result = await _auctionService.ExtendAuctionAsync(id, request.AdditionalMinutes, request.Reason);

            await _hubContext.Clients.Group($"auction-{id}")
                .SendAsync("AuctionExtended", id, result.EndTimeUtc);

            _logger.LogInformation("AUCTION EXTENDED: {AuctionId} - Minutes: +{Minutes} - Reason: {Reason} by {User} at {Time}",
               id, request.AdditionalMinutes, request.Reason, User.Identity?.Name ?? "Unknown", DateTime.UtcNow);

            return Ok(result);
        }
        #endregion

        #region Auto Car Progression Methods
        [HttpPost("{id:guid}/next-car")]
        [Authorize(Roles = "Admin,System")]
        [ProducesResponseType(typeof(AuctionDetailDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<AuctionDetailDto>> MoveToNextCar(Guid id)
        {
            var result = await _auctionService.MoveToNextCarAsync(id);

            if (result.Status == "Ended")
            {
                await _hubContext.Clients.Group($"auction-{id}")
                    .SendAsync("AuctionEnded", id, Guid.Empty, result.TotalSalesAmount);

                _logger.LogInformation("AUCTION AUTO-COMPLETED: {AuctionId} - No more cars at {Time}",
                    id, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss"));
            }
            else
            {
                await _hubContext.Clients.Group($"auction-{id}")
                    .SendAsync("AuctionStarted", id, result.StartPrice ?? 0);

                _logger.LogInformation("AUTO NEXT CAR: {AuctionId} - New Car: {LotNumber} - Price: ${StartPrice} at {Time}",
                    id, result.CurrentCarLotNumber, result.StartPrice, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss"));
            }

            return Ok(result);
        }

        [HttpPost("{id:guid}/set-current-car")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(AuctionDetailDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<AuctionDetailDto>> SetCurrentCar(Guid id, [FromBody] SetCurrentCarRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.LotNumber))
                return BadRequest("Lot nömrəsi mütləqdir");

            var result = await _auctionService.SetCurrentCarAsync(id, request.LotNumber);

            await _hubContext.Clients.Group($"auction-{id}")
               .SendAsync("AuctionStarted", id, result.StartPrice ?? 0);

            _logger.LogInformation("MANUAL CAR SWITCH: {AuctionId} - To: {LotNumber} by {User} at {Time}",
                id, request.LotNumber, User.Identity?.Name ?? "Unknown", DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss"));

            return Ok(result);
        }
        #endregion

        #region Real-Time Status Methods
        [HttpGet("live")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<AuctionGetDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<AuctionGetDto>>> GetLiveAuctions()
        {
            var auctions = await _auctionService.GetLiveAuctionsAsync();
            return Ok(auctions);
        }

        [HttpGet("active")]
        [Authorize(Roles = "Admin,AuctionManager,Seller")]
        [ProducesResponseType(typeof(IEnumerable<AuctionGetDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<AuctionGetDto>>> GetActiveAuctions()
        {
            var auctions = await _auctionService.GetActiveAuctionsAsync();
            return Ok(auctions);
        }

        [HttpGet("ready-to-start")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<AuctionGetDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<AuctionGetDto>>> GetAuctionsReadyToStart()
        {
            var auctions = await _auctionService.GetAuctionsReadyToStartAsync();
            return Ok(auctions);
        }

        [HttpGet("expired")]
        [Authorize(Roles = "System")]
        [ProducesResponseType(typeof(IEnumerable<AuctionGetDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<AuctionGetDto>>> GetExpiredAuctions()
        {
            var auctions = await _auctionService.GetExpiredAuctionsAsync();
            return Ok(auctions);
        }

        [HttpGet("location/{locationId:guid}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<AuctionGetDto>>> GetAuctionsByLocation(Guid locationId)
        {
            var auctions = await _auctionService.GetAuctionsByLocationAsync(locationId);
            return Ok(auctions);
        }
        #endregion

        #region Timer & Real-Time Info
        [HttpGet("{id:guid}/timer")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(AuctionTimerInfo), StatusCodes.Status200OK)]
        public async Task<ActionResult<AuctionTimerInfo>> GetAuctionTimer(Guid id)
        {
            var timerInfo = await _auctionService.GetAuctionTimerInfoAsync(id);
            return Ok(timerInfo);
        }

        [HttpGet("{id:guid}/current-state")]
        [AllowAnonymous]
        public async Task<ActionResult<AuctionDetailDto>> GetCurrentState(Guid id)
        {
            var result = await _auctionService.GetAuctionCurrentStateAsync(id);
            return Ok(result);
        }
        #endregion

        #region Statistics & Reports
        [HttpGet("{id:guid}/statistics")]
        [Authorize(Roles = "Admin,AuctionManager")]
        [ProducesResponseType(typeof(AuctionStatisticsDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<AuctionStatisticsDto>> GetAuctionStatistics(Guid id)
        {
            var statistics = await _auctionService.GetAuctionStatisticsAsync(id);

            _logger.LogInformation("AUCTION STATISTICS: {AuctionId} - Total: ${Amount}, Cars: {Cars} accessed by {User} at {Time}",
                id, statistics.TotalSalesAmount, statistics.TotalCars, User.Identity?.Name ?? "Unknown", DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss"));

            return Ok(statistics);
        }
        #endregion
    }
}