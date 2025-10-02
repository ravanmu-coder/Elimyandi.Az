using AutoriaFinal.Contract.Dtos.Auctions.AuctionCar;
using AutoriaFinal.Contract.Dtos.Auctions.Bid;
using AutoriaFinal.Contract.Services.Auctions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace AutoriaFinal.API.Controllers.Auctions
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class AuctionCarController : ControllerBase
    {
        private readonly IAuctionCarService _auctionCarService;
        private readonly ILogger<AuctionCarController> _logger;
        public AuctionCarController(IAuctionCarService auctionCarService, ILogger<AuctionCarController> logger)
        {
            _auctionCarService = auctionCarService;
            _logger = logger;
        }
        #region Basic CRUD 
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<AuctionCarGetDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            _logger.LogInformation("Getting all auction cars - Page: {Page}, Size: {PageSize}",
                page, pageSize);
            var cars = await _auctionCarService.GetAllAsync();
            return Ok(cars);
        }
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<AuctionCarDetailDto>> GetById(Guid id)
        {
            _logger.LogInformation("Getting auction car details by ID: {AuctionCarId}", id);
            var car = await _auctionCarService.GetByIdAsync(id);
            return Ok(car);
        }
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<AuctionCarDetailDto>> Create([FromBody] AuctionCarCreateDto dto)
        {
            _logger.LogInformation("Creating new auction car - Lot: {LotNumber}, Auction: {AuctionId}",
                dto.LotNumber, dto.AuctionId);

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var createdCar = await _auctionCarService.AddAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = createdCar.Id }, createdCar);
        }
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<AuctionCarDetailDto>> Update(
            Guid id,
            [FromBody] AuctionCarUpdateDto dto)
        {
            _logger.LogInformation("Updating auction car details: {AuctionCarId}", id);

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedCar = await _auctionCarService.UpdateAsync(id, dto);
            return Ok(updatedCar);
        }
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<bool>> Delete(Guid id)
        {
            _logger.LogInformation("Deleting auction car: {AuctionCarId}", id);

            var result = await _auctionCarService.DeleteAsync(id);
            return Ok(new { success = result, message = "Maşın uğurla silindi" });
        }
        #endregion

        #region Auction Car Lifecycle
        [HttpPost("{id}/prepare")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<AuctionCarDetailDto>> PrepareForAuction(Guid id)
        {
            _logger.LogInformation("Preparing car for auction: {AuctionCarId}", id);

            var preparedCar = await _auctionCarService.PrepareCarForAuctionAsync(id);
            return Ok(preparedCar);
        }
        [HttpPost("{id}/activate")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<AuctionCarDetailDto>> ActivateCar(Guid id)
        {
            _logger.LogInformation("Activating car for live auction: {AuctionCarId}", id);
            var activatedCar = await _auctionCarService.ActivateCarAsync(id);
            return Ok(activatedCar);
        }
        [HttpPost("{id}/end")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<AuctionCarDetailDto>> EndAuction(Guid id)
        {
            _logger.LogInformation("Ending auction for car: {AuctionCarId}", id);
            var endedCar = await _auctionCarService.EndCarAuctionAsync(id);
            return Ok(endedCar);
        }
        [HttpPost("{id}/mark-unsold")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<AuctionCarDetailDto>> MarkUnsold(
            Guid id,
            [FromBody] MarkUnsoldRequest request)
        {
            _logger.LogInformation("Marking car as unsold: {AuctionCarId}, Reason: {Reason}",
                id, request.Reason);
            var unsoldCar = await _auctionCarService.MarkCarUnsoldAsync(id, request.Reason);
            return Ok(unsoldCar);
        }
        #endregion

        #region Timer and Status
        [HttpGet("{id}/timer")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<AuctionCarTimerDto>> GetTimer(Guid id)
        {
            _logger.LogInformation("Getting timer info for car: {AuctionCarId}", id);
            var timerInfo = await _auctionCarService.GetCarTimerInfoAsync(id);
            return Ok(timerInfo);
        }
        [HttpGet("{id}/timer/expired")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<bool>> IsTimerExpired(
            Guid id,
            [FromQuery] int timerSeconds = 10)
        {
            _logger.LogInformation("Checking timer expiry for car: {AuctionCarId}", id);
            var isExpired = await _auctionCarService.IsCarTimerExpiredAsync(id, timerSeconds);
            return Ok(new {isExpired,checkedAt = DateTime.UtcNow });
        }
        #endregion

        #region Pre-Bid Management
        [HttpGet("{id}/pre-bids")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<BidGetDto>>> GetPreBids(Guid id)
        {
            _logger.LogInformation("Getting pre-bids for car: {AuctionCarId}", id);
            var preBids = await _auctionCarService.GetPreBidsAsync(id);
            return Ok(preBids);
        }
        [HttpGet("{id}/pre-bids/highest")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<BidDetailDto?>> GetHighestPreBid(Guid id)
        {
            _logger.LogInformation("Getting highest pre-bid for car: {AuctionCarId}", id);
            var highestPreBid = await _auctionCarService.GetHighestPreBidAsync(id);
            if(highestPreBid == null) return Ok(new { message = "No pre-bids found for this car." });
            return Ok(highestPreBid);
        }
        [HttpGet("{id}/pre-bids/user/{userId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<bool>> HasUserPreBid(Guid id,Guid userId)
        {
            _logger.LogInformation("Checking if user has pre-bid: Car {AuctionCarId}, User {UserId}",
                id, userId);
            var hasPreBid = await _auctionCarService.HasUserPreBidAsync(id, userId);
            return Ok(new {hasPreBid,userId, auctionCarId = id });
        }
        [HttpGet("{id}/pre-bids/me")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<bool>> HasCurrentUserPreBid(Guid id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized("Yanlış istifadəçi token");

            _logger.LogInformation("Checking current user pre-bid: Car {AuctionCarId}, User {UserId}",
                id, userId);

            var hasPreBid = await _auctionCarService.HasUserPreBidAsync(id, userId);
            return Ok(new { hasPreBid, userId, auctionCarId = id });
        }

        #endregion

        #region Price Management
        [HttpPut("{id}/price")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<AuctionCarDetailDto>> UpdateCurrentPrice(
            Guid id,
            [FromBody] UpdatePriceRequest request)
        {
            _logger.LogInformation("Updating car price: {AuctionCarId} to ${NewPrice}",
                id, request.NewPrice);

            var updatedCar = await _auctionCarService.UpdateCurrentPriceAsync(id, request.NewPrice);
            return Ok(updatedCar);
        }
        [HttpPost("{id}/hammer")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<AuctionCarDetailDto>> SetHammerPrice(
            Guid id,
            [FromBody] SetHammerPriceRequest request)
        {
            _logger.LogInformation("Setting hammer price for car: {AuctionCarId} to ${HammerPrice}",
                id, request.HammerPrice);

            var soldCar = await _auctionCarService.SetHammerPriceAsync(id, request.HammerPrice);
            return Ok(soldCar);
        }
        [HttpGet("{id}/reserve-met")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<bool>> IsReservePriceMet(Guid id)
        {
            _logger.LogInformation("Checking reserve price met for car: {AuctionCarId}", id);

            var isReserveMet = await _auctionCarService.IsReservePriceMetAsync(id);
            return Ok(new { isReserveMet, auctionCarId = id });
        }
        [HttpGet("{id}/next-min-bid")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<decimal>> GetNextMinimumBid(Guid id)
        {
            _logger.LogInformation("Calculating next minimum bid for car: {AuctionCarId}", id);

            var nextMinBid = await _auctionCarService.CalculateNextMinimumBidAsync(id);
            return Ok(new { nextMinimumBid = nextMinBid, auctionCarId = id });
        }
        #endregion

        #region Statistics and Analysis
        [HttpGet("{id}/stats")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<BidStatsDto>> GetBidStatistics(Guid id)
        {
            _logger.LogInformation("Getting bid statistics for car: {AuctionCarId}", id);

            var stats = await _auctionCarService.GetCarBidStatsAsync(id);
            return Ok(stats);
        }
        [HttpGet("{id}/full-details")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<AuctionCarDetailDto>> GetFullDetails(Guid id)
        {
            _logger.LogInformation("Getting full details for car: {AuctionCarId}", id);

            var carDetails = await _auctionCarService.GetCarWithFullDetailsAsync(id);
            return Ok(carDetails);
        }
        #endregion

        #region Query And Navigation Methods
        [HttpGet("auction/{auctionId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<AuctionCarGetDto>>> GetCarsByAuction(Guid auctionId)
        {
            _logger.LogInformation("Getting cars for auction: {AuctionId}", auctionId);

            var cars = await _auctionCarService.GetCarsByAuctionIdAsync(auctionId);
            return Ok(cars);
        }
        [HttpGet("lot/{lotNumber}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<AuctionCarDetailDto>> GetCarByLotNumber(string lotNumber)
        {
            _logger.LogInformation("Getting car by lot number: {LotNumber}", lotNumber);

            var car = await _auctionCarService.GetCarByLotNumberAsync(lotNumber);
            if (car == null)
                return NotFound(new { message = $"Lot {lotNumber} tapılmadı" });

            return Ok(car);
        }
        [HttpGet("auction/{auctionId}/active")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<AuctionCarDetailDto>> GetActiveCar(Guid auctionId)
        {
            _logger.LogInformation("Getting active car for auction: {AuctionId}", auctionId);

            var activeCar = await _auctionCarService.GetActiveCarForAuctionAsync(auctionId);
            if (activeCar == null)
                return NotFound(new { message = $"Hərrac {auctionId} üçün aktiv maşın yoxdur" });

            return Ok(activeCar);
        }
        [HttpGet("auction/{auctionId}/next")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<AuctionCarDetailDto>> GetNextCar(
            Guid auctionId,
            [FromQuery] string currentLotNumber)
        {
            _logger.LogInformation("Getting next car after lot {CurrentLot} in auction: {AuctionId}",
                currentLotNumber, auctionId);

            var nextCar = await _auctionCarService.GetNextCarForAuctionAsync(auctionId, currentLotNumber);
            if (nextCar == null)
                return NotFound(new { message = $"Lot {currentLotNumber} sonrası maşın yoxdur" });

            return Ok(nextCar);
        }
        [HttpGet("auction/{auctionId}/ready")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<AuctionCarGetDto>>> GetCarsReady(Guid auctionId)
        {
            _logger.LogInformation("Getting cars ready for auction: {AuctionId}", auctionId);

            var carsReady = await _auctionCarService.GetCarsReadyForAuctionAsync(auctionId);
            return Ok(carsReady);
        }
        [HttpGet("auction/{auctionId}/unsold")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<AuctionCarGetDto>>> GetUnsoldCars(Guid auctionId)
        {
            _logger.LogInformation("Getting unsold cars for auction: {AuctionId}", auctionId);

            var unsoldCars = await _auctionCarService.GetUnsoldCarsAsync(auctionId);
            return Ok(unsoldCars);
        }
        #endregion



        #region Request Models
        public class UpdatePriceRequest
        {
            [Range(0.01, double.MaxValue, ErrorMessage = "Qiymət 0-dan böyük olmalıdır")]
            public decimal NewPrice { get; set; }
        }

        public class SetHammerPriceRequest
        {
            [Range(0.01, double.MaxValue, ErrorMessage = "Çəkic qiyməti 0-dan böyük olmalıdır")]
            public decimal HammerPrice { get; set; }
        }

        public class MarkUnsoldRequest
        {
            [Required(ErrorMessage = "Səbəb qeyd edilməlidir")]
            [MinLength(3, ErrorMessage = "Səbəb minimum 3 simvol olmalıdır")]
            public string Reason { get; set; } = string.Empty;
        }
        #endregion
    }
}
