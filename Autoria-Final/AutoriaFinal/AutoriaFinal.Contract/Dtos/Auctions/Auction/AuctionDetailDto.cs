using AutoriaFinal.Contract.Dtos.Auctions.AuctionCar;
using System;
using System.Collections.Generic;

namespace AutoriaFinal.Contract.Dtos.Auctions.Auction
{
    public class AuctionDetailDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = default!;
        public DateTime StartTimeUtc { get; set; }
        public DateTime EndTimeUtc { get; set; }
        public string Status { get; set; } = default!;
        public decimal MinBidIncrement { get; set; }
        public decimal? StartPrice { get; set; }
        public int TimerSeconds { get; set; }

        public string? CurrentCarLotNumber { get; set; }
        public bool IsLive { get; set; }
        public int ExtendedCount { get; set; }
        public int MaxCarDurationMinutes { get; set; }
        public DateTime? CurrentCarStartTime { get; set; }
        public Guid? CreatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public int TotalCarsCount { get; set; }
        public int CarsWithPreBidsCount { get; set; }
        public int SoldCarsCount { get; set; }
        public int UnsoldCarsCount { get; set; }
        public decimal TotalSalesAmount { get; set; }

        public ICollection<AuctionCarGetDto> AuctionCars { get; set; } = new List<AuctionCarGetDto>();
    }
}