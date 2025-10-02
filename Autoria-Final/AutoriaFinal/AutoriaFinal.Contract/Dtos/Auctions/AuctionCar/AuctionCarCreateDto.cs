using System;
using System.ComponentModel.DataAnnotations;

namespace AutoriaFinal.Contract.Dtos.Auctions.AuctionCar
{
    public class AuctionCarCreateDto
    {
        [Required(ErrorMessage = "Auction ID mütləqdir")]
        public Guid AuctionId { get; set; }
        [Required(ErrorMessage = "Car ID mütləqdir")]
        public Guid CarId { get; set; }

        [Required(ErrorMessage = "Lot nömrəsi mütləqdir")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "Lot nömrəsi 1-50 simvol arasında olmalıdır")]
        public string LotNumber { get; set; } = default!;

        [Range(1, 999999, ErrorMessage = "Item nömrəsi 1-999999 arasında olmalıdır")]
        public int? ItemNumber { get; set; }

        [Required(ErrorMessage = "Minimum pre-bid mütləqdir")]
        [Range(1, 1000000, ErrorMessage = "Minimum pre-bid 1-1000000 arasında olmalıdır")]
        public decimal MinPreBid { get; set; }

        [Range(0, 10000000, ErrorMessage = "Reserve price 0-10000000 arasında olmalıdır")]
        public decimal? ReservePrice { get; set; }
    }
}