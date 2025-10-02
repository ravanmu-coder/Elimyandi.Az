using AutoriaFinal.Contract.Dtos.Auctions.AuctionCar;
using AutoriaFinal.Contract.Dtos.Auctions.Bid;
using AutoriaFinal.Domain.Entities.Auctions;
using AutoriaFinal.Domain.Enums.AuctionEnums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AutoriaFinal.Contract.Services.Auctions
{
    public interface IAuctionCarService : IGenericService<
        AuctionCar,
        AuctionCarGetDto,
        AuctionCarDetailDto,
        AuctionCarCreateDto,
        AuctionCarUpdateDto>
    {
        #region AuctionCar LifeCycle
        /// Copart sistemində maşın auction-a çıxarmaq üçün minimum pre-bid olmalıdır
        Task<AuctionCarDetailDto> PrepareCarForAuctionAsync(Guid auctionCarId);

        /// Auction-da növbə ilə maşınlar satılır, cari maşını aktiv etmək lazımdır
        Task<AuctionCarDetailDto> ActivateCarAsync(Guid auctionCarId);
        /// Timer bitdikdə və ya başqa səbəblə maşının auction-u bitməlidir
        Task<AuctionCarDetailDto> EndCarAuctionAsync(Guid auctionCarId);
        /// Bid olmazsa və ya reserve price çatılmazsa maşın satılmır
        Task<AuctionCarDetailDto> MarkCarUnsoldAsync(Guid auctionCarId, string reason);
#endregion

        #region Pre-Bid Management
        /// Auction-a qoşulmaq üçün mütləq pre-bid verməli şərti
        Task<bool> HasRequiredPreBidsAsync(Guid auctionCarId);

        /// Auction bu qiymətlə başlamalıdır
        Task<BidDetailDto?> GetHighestPreBidAsync(Guid auctionCarId);

        /// Pre-bid olmayan istifadəçilər live auction-a qatıla bilmirlər
        Task<bool> HasUserPreBidAsync(Guid auctionCarId, Guid userId);

        /// Pre-bid siyahısını göstərmək və statistika üçün
        Task<IEnumerable<BidGetDto>> GetPreBidsAsync(Guid auctionCarId);
        #endregion

        #region Price Management
        /// Cari qiyməti yenilər (yeni bid gəldikdə)
        Task<AuctionCarDetailDto> UpdateCurrentPriceAsync(Guid auctionCarId, decimal newPrice);

        /// Reserve price-ın çatılub-çatılmadığını yoxlayır
        Task<bool> IsReservePriceMetAsync(Guid auctionCarId);

        /// Növbəti minimum bid məbləğini hesablayır
        Task<decimal> CalculateNextMinimumBidAsync(Guid auctionCarId);

        /// Hammer price təyin edir (satış qiyməti)
        Task<AuctionCarDetailDto> SetHammerPriceAsync(Guid auctionCarId, decimal hammerPrice);
        #endregion

        #region Timer and Status
        /// Maşının timer məlumatlarını alır
        Task<AuctionCarTimerDto> GetCarTimerInfoAsync(Guid auctionCarId);

        /// Son bid vaxtını yenilər
        Task UpdateLastBidTimeAsync(Guid auctionCarId, DateTime bidTime);

        /// Maşının timer-ının bitub-bitmədiyini yoxlayır
        Task<bool> IsCarTimerExpiredAsync(Guid auctionCarId, int timerSeconds);
        #endregion

        #region Statistics and Information
        /// Maşın üçün bid statistikalarını alır
        Task<BidStatsDto> GetCarBidStatsAsync(Guid auctionCarId);

        /// Maşının tam məlumatlarını alır (bid-lər, winner və s. ilə birlikdə)
        Task<AuctionCarDetailDto> GetCarWithFullDetailsAsync(Guid auctionCarId);

        /// Auction üçün hazır olan maşınları alır (pre-bid-i olanlar)
        Task<IEnumerable<AuctionCarGetDto>> GetCarsReadyForAuctionAsync(Guid auctionId);

        /// Satılmayan maşınları alır
        Task<IEnumerable<AuctionCarGetDto>> GetUnsoldCarsAsync(Guid auctionId);
        #endregion

        #region Query and Navigation Methods
       
        // Auction-a aid bütün maşınları göstərmək üçün        
        Task<IEnumerable<AuctionCarGetDto>> GetCarsByAuctionIdAsync(Guid auctionId);

       
        // URL ilə maşın axtarışı (/lot/LOT001)
        Task<AuctionCarDetailDto?> GetCarByLotNumberAsync(string lotNumber);

        // Hal-hazırda canlı auction-da olan maşını tapmaq
        Task<AuctionCarDetailDto?> GetActiveCarForAuctionAsync(Guid auctionId);

        // "Next Car" düyməsi üçün mütləq lazım
        Task<AuctionCarDetailDto?> GetNextCarForAuctionAsync(Guid auctionId, string currentLotNumber);
        #endregion
    }
}
