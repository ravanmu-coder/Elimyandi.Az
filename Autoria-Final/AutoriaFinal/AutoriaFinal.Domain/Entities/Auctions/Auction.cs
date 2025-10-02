using AutoriaFinal.Domain.Entities.Abstractions;
using AutoriaFinal.Domain.Enums.AuctionEnums;
using System;
using System.Collections.Generic;
using System.Linq;

namespace AutoriaFinal.Domain.Entities.Auctions
{
    public class Auction : BaseEntity
    {
        public string Name { get; set; } = default!;
        public Guid LocationId { get; set; }

        public DateTime StartTimeUtc { get; set; }
        public DateTime EndTimeUtc { get; set; }
        public AuctionStatus Status { get; set; } = AuctionStatus.Draft;

        public decimal MinBidIncrement { get; set; } = 100; // hər klikdə artım
        public decimal? StartPrice { get; set; }            // ən yüksək pre-bid ilə başlayacaq
        public int TimerSeconds { get; set; } = 10;         // hər klikdə 10 saniyə reset
        public string? CurrentCarLotNumber { get;  set; }    // Hazırda auction-da olan maşının lot nömrəsi
        public bool IsLive { get;  set; } = false;          // Auction canlı yayımda olub-olmadığı
        public int ExtendedCount { get;  set; } = 0;        // Auction neçə dəfə uzaldılıb
        public int MaxCarDurationMinutes { get;  set; } = 30; // Hər maşın üçün maksimum auction vaxtı (dəqiqə)
        public DateTime? CurrentCarStartTime { get;  set; }   // Cari maşının auction başlama vaxtı

        public Guid? CreatedByUserId { get; set; }
        public Location Location { get; set; } = default!;
        public ICollection<AuctionCar> AuctionCars { get; set; } = new List<AuctionCar>();
        public Auction() { } 

        public static Auction Create(
            string name,
            Guid locationId,
            Guid createdByUserId,
            DateTime startTime,
            int timerSeconds = 10,
            decimal minBidIncrement = 100)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Auction adı boş ola bilməz", nameof(name));

            if (startTime <= DateTime.UtcNow)
                throw new ArgumentException("Auction başlama vaxtı gələcəkdə olmalıdır", nameof(startTime));

            return new Auction
            {
                Id = Guid.NewGuid(),
                Name = name,
                LocationId = locationId,
                CreatedByUserId = createdByUserId,
                StartTimeUtc = startTime,
                TimerSeconds = timerSeconds,
                MinBidIncrement = minBidIncrement,
                CreatedAt = DateTime.UtcNow
            };
        }

        public void SetStartTime(DateTime start)
        {
            if (Status != AuctionStatus.Draft && Status != AuctionStatus.Scheduled)
                throw new InvalidOperationException("Start time yalnız Draft və ya Scheduled vəziyyətdə təyin oluna bilər.");

            StartTimeUtc = start;
            Status = AuctionStatus.Scheduled;
            MarkUpdated();
        }

        public void Schedule(DateTime start, DateTime end)
        {
            if (Status != AuctionStatus.Draft && Status != AuctionStatus.Scheduled)
                throw new InvalidOperationException("Auction yalnız Draft və ya Scheduled vəziyyətdə planlana bilər.");

            if (start >= end)
                throw new InvalidOperationException("Başlama vaxtı bitmə vaxtından əvvəl olmalıdır.");

            StartTimeUtc = start;
            EndTimeUtc = end;
            Status = AuctionStatus.Scheduled;
            MarkUpdated();
        }

        public void Start()
        {
            if (Status != AuctionStatus.Scheduled)
                throw new InvalidOperationException("Auction yalnız Scheduled vəziyyətdə start edilə bilər.");

            Status = AuctionStatus.Running;
            IsLive = true;
            var firstCarWithPreBids = AuctionCars
                .Where(ac => ac.Bids.Any(b => b.IsPreBid))
                .OrderBy(ac => ac.LotNumber)
                .FirstOrDefault();

            var firstCar = firstCarWithPreBids ?? AuctionCars
                .OrderBy(ac => ac.LotNumber)
                .FirstOrDefault();

            if (firstCar != null)
            {
                CurrentCarLotNumber = firstCar.LotNumber;
                CurrentCarStartTime = DateTime.UtcNow;
                if (firstCarWithPreBids != null)
                {
                    var highestPreBid = firstCar.Bids
                        .Where(b => b.IsPreBid)
                        .OrderByDescending(b => b.Amount)
                        .FirstOrDefault();

                    if (highestPreBid != null)
                    {
                        SetStartPrice(highestPreBid.Amount);
                        firstCar.UpdateCurrentPrice(highestPreBid.Amount);
                    }
                }
            }

            MarkUpdated();
        }


        // Növbəti maşına keçmək üçün metod
        public void MoveToNextCar()
        {
            if (Status != AuctionStatus.Running)
                throw new InvalidOperationException("Yalnız işləyən auction-da maşın dəyişdirilə bilər.");

            var currentCar = AuctionCars.FirstOrDefault(ac => ac.LotNumber == CurrentCarLotNumber);
            if (currentCar == null)
                throw new InvalidOperationException("Cari maşın tapılmadı.");

            // Növbəti maşını tap
            // Növbəti maşını tap - pre-bid şərti isteğe bağlı
            var nextCar = AuctionCars
                .Where(ac => string.Compare(ac.LotNumber, CurrentCarLotNumber) > 0)
                .OrderBy(ac => ac.LotNumber)
                .FirstOrDefault();

            if (nextCar != null)
            {
                CurrentCarLotNumber = nextCar.LotNumber;
                CurrentCarStartTime = DateTime.UtcNow;

                // ✅ Yalnız pre-bid varsa qiyməti təyin et
                var highestPreBid = nextCar.Bids
                    .Where(b => b.IsPreBid)
                    .OrderByDescending(b => b.Amount)
                    .FirstOrDefault();

                if (highestPreBid != null)
                {
                    SetStartPrice(highestPreBid.Amount);
                    nextCar.UpdateCurrentPrice(highestPreBid.Amount);
                }
                else
                {
                    // Pre-bid yoxdursa, MinPreBid ilə başlat
                    SetStartPrice(nextCar.MinPreBid);
                    nextCar.UpdateCurrentPrice(nextCar.MinPreBid);
                }
            }

            MarkUpdated();
        }

        public void End()
        {
            if (Status != AuctionStatus.Running)
                throw new InvalidOperationException("Auction yalnız Running vəziyyətdə bitirilə bilər.");

            Status = AuctionStatus.Ended;
            IsLive = false;
            EndTimeUtc = DateTime.UtcNow;
            CurrentCarLotNumber = null;
            CurrentCarStartTime = null;
            MarkUpdated();
        }

        public void SetStartPrice(decimal amount)
        {
            if (Status != AuctionStatus.Scheduled && Status != AuctionStatus.Running)
                throw new InvalidOperationException("StartPrice yalnız Scheduled və Running vəziyyətində təyin edilə bilər.");

            if (amount <= 0)
                throw new InvalidOperationException("StartPrice sıfırdan böyük olmalıdır.");

            StartPrice = amount;
            MarkUpdated();
        }

        //  Auction vaxtını uzatmaq (Copart sistemində var)
        public void ExtendAuction(int additionalMinutes)
        {
            if (Status != AuctionStatus.Running)
                throw new InvalidOperationException("Yalnız işləyən auction uzaldıla bilər.");

            if (additionalMinutes <= 0)
                throw new ArgumentException("Əlavə vaxt müsbət olmalıdır.");

            EndTimeUtc = EndTimeUtc.AddMinutes(additionalMinutes);
            ExtendedCount++;
            MarkUpdated();
        }

        public void Cancel()
        {
            if (Status == AuctionStatus.Ended)
                throw new InvalidOperationException("Bitmiş auction ləğv edilə bilməz.");

            Status = AuctionStatus.Cancelled;
            IsLive = false;
            MarkUpdated();
        }

        public void Settle()
        {
            if (Status != AuctionStatus.Ended)
                throw new InvalidOperationException("Auction yalnız Ended vəziyyətdə yekunlaşdırıla bilər.");

            Status = AuctionStatus.Settled;
            MarkUpdated();
        }

        //  Auction-un cari maşınının vaxtının bitib-bitmədiyini yoxlamaq
        public bool IsCurrentCarTimeExpired()
        {
            if (!CurrentCarStartTime.HasValue || Status != AuctionStatus.Running)
                return false;

            var timeElapsed = DateTime.UtcNow - CurrentCarStartTime.Value;
            return timeElapsed.TotalMinutes >= MaxCarDurationMinutes;
        }


    }
}