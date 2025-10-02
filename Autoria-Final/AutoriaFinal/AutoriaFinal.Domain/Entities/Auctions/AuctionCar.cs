using AutoriaFinal.Domain.Entities.Abstractions;
using AutoriaFinal.Domain.Enums.AuctionEnums;
using System;
using System.Collections.Generic;
using System.Linq;

namespace AutoriaFinal.Domain.Entities.Auctions
{
    public class AuctionCar : BaseEntity
    {
        public Guid AuctionId { get; set; }
        public Guid CarId { get; set; }

        public string LotNumber { get; set; } = default!;
        public int? ItemNumber { get; set; }

        public decimal? ReservePrice { get; set; }
        public decimal? HammerPrice { get; set; }
        public decimal? SoldPrice { get; set; } // Son satış qiyməti

        public decimal CurrentPrice { get; set; } = 0;
        public bool IsReserveMet { get; set; }

        public decimal MinPreBid { get; set; }
        public DateTime? LastBidTime { get;  set; } // Son bid vaxtı - timer üçün vacibdir
        public int BidCount { get; set; } = 0;      // Bu maşın üçün bid sayı
        public bool IsActive { get; set; } = false; // Hal-hazırda auction-da aktivdir
        public DateTime? ActiveStartTime { get; set; } // Bu maşının auction-da aktiv olduğu vaxt

        public Car Car { get; set; } = default!;
        public Auction Auction { get; set; } = default!;
        public AuctionWinner? AuctionWinner { get; set; }
        public ICollection<Bid> Bids { get; set; } = new List<Bid>();

        public AuctionWinnerStatus WinnerStatus { get; set; } = AuctionWinnerStatus.Pending;
        public AuctionCar() { } // EF Core üçün

        public static AuctionCar Create(
            Guid auctionId,
            Guid carId,
            string lotNumber,
            decimal minPreBid,
            decimal? reservePrice = null,
            int? itemNumber = null)
        {
            if (string.IsNullOrWhiteSpace(lotNumber))
                throw new ArgumentException("Lot nömrəsi boş ola bilməz", nameof(lotNumber));

            if (minPreBid <= 0)
                throw new ArgumentException("Minimum pre-bid sıfırdan böyük olmalıdır", nameof(minPreBid));

            return new AuctionCar
            {
                Id = Guid.NewGuid(),
                AuctionId = auctionId,
                CarId = carId,
                LotNumber = lotNumber,
                MinPreBid = minPreBid,
                ReservePrice = reservePrice,
                ItemNumber = itemNumber,
                CreatedAt = DateTime.UtcNow
            };
        }

        public void SetReserve(decimal? reserve)
        {
            if (reserve.HasValue && reserve.Value < 0)
                throw new InvalidOperationException("Reserve price mənfi ola bilməz.");

            ReservePrice = reserve;
            MarkUpdated();
        }

        public void SetHammer(decimal amount)
        {
            if (amount <= 0)
                throw new InvalidOperationException("Hammer price sıfırdan böyük olmalıdır.");

            HammerPrice = amount;
            SoldPrice = amount; // Sold price də eyni vaxtda təyin edilir
            MarkUpdated();
        }

        public void UpdateCurrentPrice(decimal bidAmount)
        {
            if (bidAmount <= CurrentPrice)
                throw new InvalidOperationException("Yeni qiymət mövcud qiymətdən böyük olmalıdır.");

            CurrentPrice = bidAmount;
            LastBidTime = DateTime.UtcNow; //  Son bid vaxtını yenilə
            BidCount++; //  Bid sayını artır

            if (ReservePrice.HasValue && CurrentPrice >= ReservePrice.Value)
                IsReserveMet = true;

            MarkUpdated();
        }

        public void MarkAsActive()
        {
            IsActive = true;
            ActiveStartTime = DateTime.UtcNow;
            MarkUpdated();
        }

        // Bu maşını auction-da qeyri-aktiv et
        public void MarkAsInactive()
        {
            IsActive = false;
            ActiveStartTime = null;
            MarkUpdated();
        }

        public void SetWinner(AuctionWinnerStatus status)
        {
            if (status == AuctionWinnerStatus.None)
                throw new InvalidOperationException("Winner 'None' olaraq təyin edilə bilməz.");

            if (WinnerStatus == AuctionWinnerStatus.Completed ||
                WinnerStatus == AuctionWinnerStatus.PaymentFailed ||
                WinnerStatus == AuctionWinnerStatus.Rejected)
            {
                throw new InvalidOperationException("AuctionCar artıq yekunlaşıb, qalib dəyişdirilə bilməz.");
            }

            WinnerStatus = status;
            MarkUpdated();
        }

        public void MarkUnsold()
        {
            SetWinner(AuctionWinnerStatus.Unsold);
            MarkAsInactive(); //  Satılmayan maşın qeyri-aktiv olur
        }

        public void MarkWon(decimal winningBid)
        {
            if (winningBid <= 0)
                throw new InvalidOperationException("Qalib bid sıfırdan böyük olmalıdır.");

            UpdateCurrentPrice(winningBid);
            SetHammer(winningBid);
            SetWinner(AuctionWinnerStatus.Won);
            MarkAsInactive(); //  Qazanan maşın qeyri-aktiv olur
        }

        public void ConfirmWinner()
        {
            if (WinnerStatus != AuctionWinnerStatus.Won && WinnerStatus != AuctionWinnerStatus.Pending)
                throw new InvalidOperationException("Qalib yalnız Won və ya Pending vəziyyətində təsdiqlənə bilər.");

            SetWinner(AuctionWinnerStatus.Confirmed);
        }

        public void MarkPaymentFailed()
        {
            if (WinnerStatus != AuctionWinnerStatus.Confirmed)
                throw new InvalidOperationException("Ödəniş yalnız təsdiqlənmiş qalib üçün uğursuz ola bilər.");

            SetWinner(AuctionWinnerStatus.PaymentFailed);
        }

        public void CompleteSale()
        {
            if (WinnerStatus != AuctionWinnerStatus.Confirmed)
                throw new InvalidOperationException("Yalnız təsdiqlənmiş qalib Completed vəziyyətinə keçə bilər.");

            SetWinner(AuctionWinnerStatus.Completed);
        }

        //  Bu maşının auction vaxtının bitib-bitmədiyini yoxlamaq
        public bool IsTimeExpired(int timerSeconds)
        {
            if (!LastBidTime.HasValue)
                return ActiveStartTime.HasValue &&
                       (DateTime.UtcNow - ActiveStartTime.Value).TotalSeconds >= timerSeconds;

            return (DateTime.UtcNow - LastBidTime.Value).TotalSeconds >= timerSeconds;
        }

        //  Bu maşında pre-bid olub-olmadığını yoxlamaq
        public bool HasPreBids()
        {
            return Bids.Any(b => b.IsPreBid);
        }

        //  Ən yüksək pre-bid-i almaq
        public Bid? GetHighestPreBid()
        {
            return Bids.Where(b => b.IsPreBid)
                      .OrderByDescending(b => b.Amount)
                      .FirstOrDefault();
        }

        //  Ən yüksək bid-i almaq
        public Bid? GetHighestBid()
        {
            return Bids.OrderByDescending(b => b.Amount)
                      .FirstOrDefault();
        }
       
    }
}