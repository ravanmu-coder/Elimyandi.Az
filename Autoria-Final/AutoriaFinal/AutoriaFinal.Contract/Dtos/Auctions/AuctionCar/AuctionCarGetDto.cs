using System;

namespace AutoriaFinal.Contract.Dtos.Auctions.AuctionCar
{
    public class AuctionCarGetDto
    {
        public Guid Id { get; set; }
        public Guid AuctionId { get; set; }
        public Guid CarId { get; set; }
        public string LotNumber { get; set; } = default!;
        public decimal CurrentPrice { get; set; }
        public decimal MinPreBid { get; set; }

        //  Yeni property-lər
        public string WinnerStatus { get; set; } = default!;
        public bool IsActive { get; set; }
        public int BidCount { get; set; }
        public DateTime? LastBidTime { get; set; }
        public bool IsReserveMet { get; set; }
        public decimal? ReservePrice { get; set; }

        //  Car əsas məlumatları
        public string? CarMake { get; set; }
        public string? CarModel { get; set; }
        public int? CarYear { get; set; }
        public string? CarImage { get; set; } // Əsas şəkil
    }
}