using AutoriaFinal.Domain.Entities.Auctions;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore;

namespace AutoriaFinal.Persistence.Configurations.Auctions
{
    public class AuctionCarConfiguration : BaseEntityConfiguration<AuctionCar>
    {
        public override void Configure(EntityTypeBuilder<AuctionCar> builder)
        {
            base.Configure(builder);

            builder.Property(x => x.LotNumber)
                   .IsRequired()
                   .HasMaxLength(50);

            builder.Property(x => x.ItemNumber)
                   .IsRequired(false);

            builder.Property(x => x.ReservePrice)
                   .HasColumnType("decimal(18,2)");

            builder.Property(x => x.HammerPrice)
                   .HasColumnType("decimal(18,2)");

            builder.Property(x => x.CurrentPrice)
                   .HasColumnType("decimal(18,2)")
                   .HasDefaultValue(0);

            builder.Property(x => x.MinPreBid)
                   .HasColumnType("decimal(18,2)")
                   .IsRequired();

            builder.Property(x => x.IsReserveMet)
                   .HasDefaultValue(false);

            builder.Property(x => x.WinnerStatus)
                   .HasConversion<int>();
            builder.Property(x => x.SoldPrice)
                   .HasColumnType("decimal(18,2)")
                   .IsRequired(false);

            builder.Property(x => x.LastBidTime)
                   .IsRequired(false);

            builder.Property(x => x.BidCount)
                   .HasDefaultValue(0);

            builder.Property(x => x.IsActive)
                   .HasDefaultValue(false);

            builder.Property(x => x.ActiveStartTime)
                   .IsRequired(false);

            // Index-lər - performans üçün vacibdir
            builder.HasIndex(x => new { x.AuctionId, x.CarId }).IsUnique();
            builder.HasIndex(x => new { x.AuctionId, x.LotNumber }).IsUnique();
            builder.HasIndex(x => x.IsActive); // Aktiv maşınları tez tapmaq üçün
            builder.HasIndex(x => x.LastBidTime); // Timer məntiqində istifadə üçün

            // Relationships
            builder.HasMany(x => x.Bids)
                   .WithOne(b => b.AuctionCar)
                   .HasForeignKey(b => b.AuctionCarId)
                   .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.AuctionWinner)
                   .WithOne(aw => aw.AuctionCar)
                   .HasForeignKey<AuctionWinner>(aw => aw.AuctionCarId)
                   .OnDelete(DeleteBehavior.Restrict);
        }
    }
}