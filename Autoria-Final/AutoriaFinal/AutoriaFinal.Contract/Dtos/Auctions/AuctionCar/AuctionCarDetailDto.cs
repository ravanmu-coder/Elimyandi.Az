using AutoriaFinal.Contract.Dtos.Auctions.AuctionWinner;
using AutoriaFinal.Contract.Dtos.Auctions.Bid;
using System;
using System.Collections.Generic;

namespace AutoriaFinal.Contract.Dtos.Auctions.AuctionCar
{
    public class AuctionCarDetailDto
    {
        public Guid Id { get; set; }
        public Guid AuctionId { get; set; }
        public Guid CarId { get; set; }
        public string LotNumber { get; set; } = default!;
        public int? ItemNumber { get; set; }
        public decimal? ReservePrice { get; set; }
        public decimal? HammerPrice { get; set; }
        public decimal CurrentPrice { get; set; }
        public bool IsReserveMet { get; set; }
        public decimal MinPreBid { get; set; }
        public string WinnerStatus { get; set; } = default!;
        public decimal? SoldPrice { get; set; }
        public DateTime? LastBidTime { get; set; }
        public int BidCount { get; set; }
        public bool IsActive { get; set; }
        public DateTime? ActiveStartTime { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        //  Statistika məlumatları
        public int TotalBidsCount { get; set; }
        public int PreBidsCount { get; set; }
        public decimal HighestPreBidAmount { get; set; }
        public decimal HighestBidAmount { get; set; }

        //  Timer məlumatları
        public int RemainingTimeSeconds { get; set; }
        public bool IsTimeExpired { get; set; }

        // Navigation properties
        public ICollection<BidGetDto> Bids { get; set; } = new List<BidGetDto>();
        public AuctionWinnerGetDto? AuctionWinner { get; set; }

        //  Car məlumatları
        public string? CarMake { get; set; }
        public string? CarModel { get; set; }
        public int? CarYear { get; set; }
        public string? CarVin { get; set; }
    }
}