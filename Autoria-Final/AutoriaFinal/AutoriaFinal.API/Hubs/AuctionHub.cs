using AutoriaFinal.Contract.Services.Auctions;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace AutoriaFinal.API.Hubs
{
    public class AuctionHub : Hub
    {
        private readonly ILogger<AuctionHub> _logger;
        private readonly IAuctionService _auctionService;
        private const string AuctionGroupPrefix = "auction-";
        private const string UserGroupPrefix = "user-";
        public AuctionHub(ILogger<AuctionHub> logger, IAuctionService auctionService)
        {
            _logger = logger;
            _auctionService = auctionService;
        }

        public async Task JoinAuction(Guid auctionId)
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                await Clients.Caller.SendAsync("Error", "Authentication required");
                _logger.LogWarning("Unauthenticated client attempted to join auction {AuctionId}, Connection: {ConnectionId}",
                    auctionId, Context.ConnectionId);
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, $"{AuctionGroupPrefix}{auctionId}");
            await Groups.AddToGroupAsync(Context.ConnectionId, $"{UserGroupPrefix}{userId}");

            // Caller-a təsdiq mesajı
            await Clients.Caller.SendAsync("JoinedAuction", auctionId);
            _logger.LogInformation("User {UserId} joined auction {AuctionId}", userId, auctionId);
        }

        public async Task LeaveAuction(Guid auctionId)
        {
            var userId = GetCurrentUserId();
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"{AuctionGroupPrefix}{auctionId}");
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"{UserGroupPrefix}{userId}");

            await Clients.Caller.SendAsync("LeftAuction", auctionId);
            _logger.LogInformation("User {UserId} left auction {AuctionId}", userId, auctionId);
        }

        public async Task GetAuctionStatus(Guid auctionId)
        {
            // İndi serverdən əsl statusu çəkirik və caller-a göndəririk
            try
            {
                var statusDto = await _auctionService.GetAuctionCurrentStateAsync(auctionId);
                await Clients.Caller.SendAsync("AuctionStatusResponse", statusDto);
                _logger.LogInformation("Auction status requested by connection {ConnectionId} for auction {AuctionId}",
                    Context.ConnectionId, auctionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get auction status for {AuctionId}", auctionId);
                await Clients.Caller.SendAsync("Error", "Failed to retrieve auction status");
            }
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetCurrentUserId();
            _logger.LogInformation("User connected: {ConnectionId}, UserId: {UserId}", Context.ConnectionId, userId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetCurrentUserId();
            _logger.LogInformation("Client disconnected: {ConnectionId}, UserId: {UserId}, Reason: {Reason}",
                Context.ConnectionId, userId, exception?.Message ?? "No reason");
            await base.OnDisconnectedAsync(exception);
        }
        private Guid GetCurrentUserId()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }
    }
}