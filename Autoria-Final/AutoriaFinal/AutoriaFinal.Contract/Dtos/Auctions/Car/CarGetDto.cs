using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AutoriaFinal.Contract.Dtos.Auctions.Car
{
    public class CarGetDto
    {
        public Guid Id { get; set; }
        public string Vin { get; set; }
        public string VinMasked { get; set; }     // display üçün (məs: 1HGCM...4352 => 1HGCM****4352)
        public int? Year { get; set; }
        public string Make { get; set; }
        public string Model { get; set; }

        // existing
        public string ImagePath { get; set; }

        // NEW fields for frontend convenience
        public string ThumbnailUrl { get; set; }      // hazır tam url (serverdə set edilə bilər)
        public string[] Images { get; set; }          // optional: carousel-ready (serverdə array qaytara bilsə)
        public string OwnerId { get; set; }
        public string OwnerName { get; set; }
        public string OwnerContact { get; set; }
        public Guid? LocationId { get; set; }
        public string LocationName { get; set; }
        public string LocationAddress { get; set; }

        public string Status { get; set; }            // Available/InAuction/Sold/...
        public bool IsAvailableForAuction { get; set; }

        public bool HasKeys { get; set; }
        public string PrimaryDamage { get; set; }
        public decimal? EstimatedRetailValue { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Auction related (if exists)
        public int? LotNumber { get; set; }
        public decimal? ReservePrice { get; set; }
        public decimal? StartPrice { get; set; }
    }

}
