using AutoriaFinal.Domain.Entities.Abstractions;
using AutoriaFinal.Domain.Enums.AuctionEnums;
using AutoriaFinal.Domain.Enums.Bids;
using System;

namespace AutoriaFinal.Domain.Entities.Auctions
{
    public class Bid : BaseEntity
    {
        public Guid AuctionCarId { get; set; }
        public Guid UserId { get; set; }

        public decimal Amount { get; set; }
        public bool IsProxy { get; set; }
        public decimal? ProxyMax { get; set; }

        public bool IsPreBid { get; set; } = false; // Auction başlamamışdan əvvəl qoyulubsa

        public BidStatus Status { get; set; } = BidStatus.Placed;
        public DateTime PlacedAtUtc { get; set; } = DateTime.UtcNow;
        public BidType BidType { get; set; } // Bid növü
        public string? Notes { get; set; }                       // Bid haqqında qeydlər
        public DateTime? ValidUntil { get; set; }               // Proxy bid-lər üçün etibarlılıq müddəti
        public DateTime? ProcessedAt { get; set; }              // Bid-in işləndiyi vaxt
        public string? IPAddress { get; set; }                  // Bid verənin IP ünvanı
        public string? UserAgent { get; set; }                  // Browser məlumatları
        public int SequenceNumber { get; set; }                // Bu maşın üçün bid sıra nömrəsi
        public bool IsAutoBid { get; set; } = false;           // Avtomatik bid olub-olmadığı
        public Guid? ParentBidId { get; set; }                 // Proxy bid-in əsas bid-i

        // Navigation Properties
        public AuctionCar AuctionCar { get; set; } = default!;
        public Bid? ParentBid { get; set; }                    // Proxy bid-in əsas bid-i
        public ICollection<Bid> ChildBids { get; set; } = new List<Bid>(); // Proxy bid-in törəmələri

        public Bid() { } // EF Core üçün

        public static Bid CreateRegularBid(
            Guid auctionCarId,
            Guid userId,
            decimal amount,
            bool isPreBid = false,
            string? ipAddress = null,
            string? userAgent = null)
        {
            if (amount <= 0)
                throw new ArgumentException("Bid məbləği sıfırdan böyük olmalıdır", nameof(amount));

            var bid = new Bid
            {
                Id = Guid.NewGuid(),
                AuctionCarId = auctionCarId,
                UserId = userId,
                Amount = amount,
                IsPreBid = isPreBid,
                BidType = isPreBid ? BidType.PreBid : BidType.Regular,
                Status = BidStatus.Placed,
                PlacedAtUtc = DateTime.UtcNow,
                IPAddress = ipAddress,
                UserAgent = userAgent,
                CreatedAt = DateTime.UtcNow
            };

            return bid;
        }

        /// Proxy bid yaratmaq üçün factory metod
       
        public static Bid CreateProxyBid(
            Guid auctionCarId,
            Guid userId,
            decimal currentAmount,
            decimal maxAmount,
            DateTime validUntil,
            bool isPreBid = false,
            string? ipAddress = null,
            string? userAgent = null)
        {
            if (currentAmount <= 0)
                throw new ArgumentException("Cari bid məbləği sıfırdan böyük olmalıdır", nameof(currentAmount));

            if (maxAmount <= currentAmount)
                throw new ArgumentException("Maksimum məbləğ cari məbləğdən böyük olmalıdır", nameof(maxAmount));

            if (validUntil <= DateTime.UtcNow)
                throw new ArgumentException("Etibarlılıq tarixi gələcəkdə olmalıdır", nameof(validUntil));

            var bid = new Bid
            {
                Id = Guid.NewGuid(),
                AuctionCarId = auctionCarId,
                UserId = userId,
                Amount = currentAmount,
                IsProxy = true,
                ProxyMax = maxAmount,
                ValidUntil = validUntil,
                IsPreBid = isPreBid,
                BidType = isPreBid ? BidType.PreBid : BidType.ProxyBid,
                Status = BidStatus.Placed,
                PlacedAtUtc = DateTime.UtcNow,
                IPAddress = ipAddress,
                UserAgent = userAgent,
                CreatedAt = DateTime.UtcNow
            };

            return bid;
        }
        /// Avtomatik bid yaratmaq üçün factory metod (proxy bid-dən törənən)
      
        public static Bid CreateAutoBid(
            Guid auctionCarId,
            Guid userId,
            decimal amount,
            Guid parentBidId,
            int sequenceNumber)
        {
            var bid = new Bid
            {
                Id = Guid.NewGuid(),
                AuctionCarId = auctionCarId,
                UserId = userId,
                Amount = amount,
                IsAutoBid = true,
                ParentBidId = parentBidId,
                SequenceNumber = sequenceNumber,
                BidType = BidType.AutoBid,
                Status = BidStatus.Placed,
                PlacedAtUtc = DateTime.UtcNow,
                ProcessedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            return bid;
        }

        // BIZNES MƏNTİQİ METODLARI

        public void Invalidate(string? reason = null)
        {
            Status = BidStatus.Invalidated;
            Notes = string.IsNullOrEmpty(Notes) ? reason : $"{Notes}; {reason}";
            MarkUpdated();
        }

        public void Retract(string? reason = null)
        {
            if (Status != BidStatus.Placed)
                throw new InvalidOperationException("Yalnız aktiv bid-lər geri çəkilə bilər");

            Status = BidStatus.Retracted;
            Notes = string.IsNullOrEmpty(Notes) ? reason : $"{Notes}; {reason}";
            MarkUpdated();
        }

        
        /// Bid-i işlənmiş olaraq işarələ
        
        public void MarkAsProcessed()
        {
            ProcessedAt = DateTime.UtcNow;
            MarkUpdated();
        }

       
        /// Proxy bid-in hələ etibarlı olub-olmadığını yoxla
       
        public bool IsProxyBidValid()
        {
            if (!IsProxy) return false;
            if (Status != BidStatus.Placed) return false;
            if (!ValidUntil.HasValue) return true;

            return DateTime.UtcNow <= ValidUntil.Value;
        }

        
        /// Proxy bid-in artırıla biləcəyi maksimum məbləği qaytar
        
        public decimal GetRemainingProxyAmount()
        {
            if (!IsProxy || !ProxyMax.HasValue)
                return 0;

            return Math.Max(0, ProxyMax.Value - Amount);
        }

        
        /// Bu bid-in növbəti avtomatik artırıla biləcəyini yoxla
        
        public bool CanAutoIncrease(decimal requiredAmount, decimal increment)
        {
            if (!IsProxy || !IsProxyBidValid()) return false;
            if (!ProxyMax.HasValue) return false;

            var nextAmount = Math.Max(Amount + increment, requiredAmount);
            return nextAmount <= ProxyMax.Value;
        }
        


        /// Proxy bid üçün növbəti məbləği hesabla

        public decimal CalculateNextProxyAmount(decimal currentHighestBid, decimal increment)
        {
            if (!IsProxy || !ProxyMax.HasValue) return 0;

            var nextAmount = currentHighestBid + increment;
            return Math.Min(nextAmount, ProxyMax.Value);
        }

        
        /// Bid-in vaxtının keçib-keçmədiyini yoxla (pre-bid-lər üçün)
        
        public bool IsExpired()
        {
            if (!ValidUntil.HasValue) return false;
            return DateTime.UtcNow > ValidUntil.Value;
        }

        
        /// Bid məlumatlarını təhlükəsiz şəkildə yenilə
        
        public void UpdateAmount(decimal newAmount, string? reason = null)
        {
            if (Status != BidStatus.Placed)
                throw new InvalidOperationException("Yalnız aktiv bid-lər yenilənə bilər");

            if (newAmount <= 0)
                throw new ArgumentException("Yeni məbləğ sıfırdan böyük olmalıdır");

            if (IsProxy && ProxyMax.HasValue && newAmount > ProxyMax.Value)
                throw new InvalidOperationException("Yeni məbləğ proxy maksimumundan böyük ola bilməz");

            Amount = newAmount;
            if (!string.IsNullOrEmpty(reason))
            {
                Notes = string.IsNullOrEmpty(Notes) ? reason : $"{Notes}; {reason}";
            }

            MarkUpdated();
        }

    }

}