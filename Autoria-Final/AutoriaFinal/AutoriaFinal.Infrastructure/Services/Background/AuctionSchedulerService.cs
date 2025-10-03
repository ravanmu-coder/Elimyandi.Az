using AutoriaFinal.Contract.Services.Auctions;
using AutoriaFinal.Domain.Entities.Options;
using AutoriaFinal.Domain.Enums.AuctionEnums;
using AutoriaFinal.Domain.Repositories.Auctions;
using Microsoft.Extensions.Hosting;
using AutoriaFinal.Infrastructure.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection; 
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace AutoriaFinal.Infrastructure.Services
{
    public class AuctionSchedulerService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<AuctionHub> _auctionHub;
        private readonly IHubContext<BidHub> _bidHub;
        private readonly ILogger<AuctionSchedulerService> _logger;
        private readonly AuctionSchedulerOptions _options;

        public AuctionSchedulerService(
            IServiceScopeFactory scopeFactory,
            IHubContext<AuctionHub> auctionHub,
            IHubContext<BidHub> bidHub,
            IOptions<AuctionSchedulerOptions> options,
            ILogger<AuctionSchedulerService> logger)
        {
            _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
            _auctionHub = auctionHub ?? throw new ArgumentNullException(nameof(auctionHub));
            _bidHub = bidHub ?? throw new ArgumentNullException(nameof(bidHub));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _options = options?.Value ?? new AuctionSchedulerOptions();
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("AuctionSchedulerService started. PollIntervalSeconds={poll}", _options.PollIntervalSeconds);

            if (_options.CatchUpOnStart)
            {
                try
                {
                    await DoCatchUpAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Catch-up failed at startup");
                }
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Process in separate scopes
                    await ProcessStartsAsync(stoppingToken);
                    await ProcessEndsAsync(stoppingToken);
                    if (_options.EnableLotTimerProcessing)
                    {
                        await ProcessExpiredCarsAsync(stoppingToken);
                    }
                }
                catch (OperationCanceledException) { break; }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "AuctionSchedulerService loop failed");
                }

                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(_options.PollIntervalSeconds), stoppingToken);
                }
                catch (OperationCanceledException) { break; }
            }

            _logger.LogInformation("AuctionSchedulerService stopping.");
        }

        private async Task ProcessStartsAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var auctionRepo = scope.ServiceProvider.GetRequiredService<IAuctionRepository>();
            var auctionService = scope.ServiceProvider.GetRequiredService<IAuctionService>();

            var toStart = (await auctionRepo.GetScheduledAuctionsReadyToStartAsync())
                          .Take(_options.BatchSize)
                          .ToList();

            foreach (var auction in toStart)
            {
                if (ct.IsCancellationRequested) break;

                try
                {
                    var transitioned = await auctionRepo.TryTransitionAuctionStatusAsync(auction.Id, AuctionStatus.Scheduled, AuctionStatus.Running, ct);
                    if (!transitioned)
                    {
                        _logger.LogDebug("Scheduler: auction {AuctionId} transition Scheduled->Running skipped (another worker?).", auction.Id);
                        continue;
                    }

                    _logger.LogDebug("Scheduler: starting auction {AuctionId}", auction.Id);

                    await auctionService.StartAuctionAsync(auction.Id);

                    await _auctionHub.Clients.Group($"auction-{auction.Id}")
                        .SendAsync("AuctionStarted", new { AuctionId = auction.Id, StartTimeUtc = auction.StartTimeUtc }, ct);

                    _logger.LogInformation("Scheduler: AuctionStarted emitted for {AuctionId}", auction.Id);
                }
                catch (Exception exAuctionStart)
                {
                    _logger.LogError(exAuctionStart, "Failed to start auction {AuctionId} in scheduler", auction.Id);
                }
            }
        }

        private async Task ProcessEndsAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var auctionRepo = scope.ServiceProvider.GetRequiredService<IAuctionRepository>();
            var auctionService = scope.ServiceProvider.GetRequiredService<IAuctionService>();

            var now = DateTime.UtcNow;
            var toEnd = (await auctionRepo.GetActiveAuctionsReadyToEndAsync(now, _options.BatchSize))
                        .ToList();

            foreach (var auction in toEnd)
            {
                if (ct.IsCancellationRequested) break;

                try
                {
                    var transitioned = await auctionRepo.TryTransitionAuctionStatusAsync(auction.Id, AuctionStatus.Running, AuctionStatus.Ended, ct);
                    if (!transitioned)
                    {
                        _logger.LogDebug("Scheduler: auction {AuctionId} transition Running->Ended skipped (another worker?).", auction.Id);
                        continue;
                    }

                    _logger.LogDebug("Scheduler: ending auction {AuctionId}", auction.Id);

                    await auctionService.EndAuctionAsync(auction.Id);

                    await _auctionHub.Clients.Group($"auction-{auction.Id}")
                        .SendAsync("AuctionEnded", new { AuctionId = auction.Id, EndTimeUtc = auction.EndTimeUtc }, ct);

                    _logger.LogInformation("Scheduler: AuctionEnded emitted for {AuctionId}", auction.Id);
                }
                catch (Exception exAuctionEnd)
                {
                    _logger.LogError(exAuctionEnd, "Failed to end auction {AuctionId} in scheduler", auction.Id);
                }
            }
        }

        private async Task ProcessExpiredCarsAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var auctionCarRepo = scope.ServiceProvider.GetRequiredService<IAuctionCarRepository>();
            var auctionCarService = scope.ServiceProvider.GetRequiredService<IAuctionCarService>();
            var auctionService = scope.ServiceProvider.GetRequiredService<IAuctionService>();

            var now = DateTime.UtcNow;

            // Prefer global expired query (implement GetExpiredCarsAsync in repository). If not available,
            // fallback to per-auction GetAuctionCarsWithExpiredTimerAsync logic.
            var expiredCars = Enumerable.Empty<dynamic>().ToList();

            // Try to resolve method GetExpiredCarsAsync; if not present, fall back to old behavior.
            var repoType = auctionCarRepo.GetType();
            var method = repoType.GetMethod("GetExpiredCarsAsync");
            if (method != null)
            {
                // Use reflection invocation to avoid compile-time dependency if repository wasn't updated
                var task = (Task)method.Invoke(auctionCarRepo, new object[] { now, _options.BatchSize, ct })!;
                await task.ConfigureAwait(false);

                // retrieve Result via reflection
                var resultProperty = task.GetType().GetProperty("Result");
                if (resultProperty != null)
                {
                    var result = resultProperty.GetValue(task) as System.Collections.IEnumerable;
                    expiredCars = result?.Cast<object>().ToList() ?? new List<object>();
                }
            }
            else
            {
                // Fallback: iterate running auctions and call existing per-auction method
                var auctionRepo = scope.ServiceProvider.GetRequiredService<IAuctionRepository>();
                var allRunning = (await auctionRepo.GetAuctionsByStatusAsync(AuctionStatus.Running)).ToList();

                var aggregator = new System.Collections.Generic.List<object>();
                foreach (var auction in allRunning)
                {
                    if (ct.IsCancellationRequested) break;
                    var timerSeconds = auction.TimerSeconds;
                    var cars = (await auctionCarRepo.GetAuctionCarsWithExpiredTimerAsync(auction.Id, timerSeconds))
                               .Take(_options.BatchSize)
                               .ToList();

                    aggregator.AddRange(cars);
                    if (aggregator.Count >= _options.BatchSize) break;
                }

                expiredCars = aggregator;
            }

            if (!expiredCars.Any())
            {
                _logger.LogDebug("No expired cars to process in this cycle.");
                return;
            }

            _logger.LogInformation("Processing {count} expired cars", expiredCars.Count);

            // expiredCars elements are either AuctionCar entities or dynamic objects depending on repository implementation
            foreach (var carObj in expiredCars)
            {
                if (ct.IsCancellationRequested) break;

                try
                {
                    // We expect an AuctionCar type. Use dynamic to call Id/AuctionId/LotNumber if needed,
                    // or cast to your AuctionCar type in your project.
                    dynamic car = carObj;

                    await auctionCarService.EndCarAuctionAsync((Guid)car.Id);
                    await auctionService.MoveToNextCarAsync((Guid)car.AuctionId);

                    await _bidHub.Clients.Group($"auction-{car.AuctionId}")
                        .SendAsync("LotChanged", new { AuctionId = car.AuctionId, OldLot = car.LotNumber }, ct);

                  //  _logger.LogInformation("Scheduler: expired car processed {CarId} for auction {AuctionId}", car.Id, car.AuctionId);
                }
                catch (Exception exCar)
                {
                    _logger.LogError(exCar, "Failed to process expired car in scheduler");
                }
            }
        }

        private async Task DoCatchUpAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var auctionRepo = scope.ServiceProvider.GetRequiredService<IAuctionRepository>();
            var auctionService = scope.ServiceProvider.GetRequiredService<IAuctionService>();

            var now = DateTime.UtcNow;

            // Start missed auctions
            var missedToStart = (await auctionRepo.GetScheduledAuctionsReadyToStartAsync()).ToList();
            foreach (var a in missedToStart)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    var transitioned = await auctionRepo.TryTransitionAuctionStatusAsync(a.Id, AuctionStatus.Scheduled, AuctionStatus.Running, ct);
                    if (!transitioned)
                    {
                        _logger.LogDebug("CatchUp: auction {AuctionId} already handled by other worker.", a.Id);
                        continue;
                    }

                    await auctionService.StartAuctionAsync(a.Id);
                    await _auctionHub.Clients.Group($"auction-{a.Id}")
                        .SendAsync("AuctionStarted", new { AuctionId = a.Id, StartTimeUtc = a.StartTimeUtc }, ct);

                    _logger.LogInformation("CatchUp: Started auction {AuctionId}", a.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "CatchUp: Failed to start auction {AuctionId}", a.Id);
                }
            }

            // End auctions which already passed EndTimeUtc (DB-side)
            var needToEnd = (await auctionRepo.GetActiveAuctionsReadyToEndAsync(now, _options.BatchSize)).ToList();
            foreach (var a in needToEnd)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    var transitioned = await auctionRepo.TryTransitionAuctionStatusAsync(a.Id, AuctionStatus.Running, AuctionStatus.Ended, ct);
                    if (!transitioned)
                    {
                        _logger.LogDebug("CatchUp: auction {AuctionId} already handled by other worker.", a.Id);
                        continue;
                    }

                    await auctionService.EndAuctionAsync(a.Id);
                    await _auctionHub.Clients.Group($"auction-{a.Id}")
                        .SendAsync("AuctionEnded", new { AuctionId = a.Id, EndTimeUtc = a.EndTimeUtc }, ct);

                    _logger.LogInformation("CatchUp: Ended auction {AuctionId}", a.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "CatchUp: Failed to end auction {AuctionId}", a.Id);
                }
            }
        }
    }
}
