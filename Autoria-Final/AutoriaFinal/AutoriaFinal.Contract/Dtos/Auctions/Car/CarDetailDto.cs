using AutoriaFinal.Domain.Enums.VehicleEnums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AutoriaFinal.Contract.Dtos.Auctions.Car
{
    public class CarDetailDto
    {
        public Guid Id { get; set; }
        public string Vin { get; set; }
        public int? Year { get; set; }
        public string Make { get; set; }
        public string Model { get; set; }

        // Media
        public string PhotoUrls { get; set; }     // existing semicolon string (if you keep)
        public string[] Images { get; set; }      // recommended: server returns array
        public string VideoUrls { get; set; }     // existing
        public string[] Videos { get; set; }      // optional array

        // Owner / Location
        public string OwnerId { get; set; }
        public string OwnerName { get; set; }
        public string OwnerContact { get; set; }
        public Guid? LocationId { get; set; }
        public string LocationName { get; set; }
        public string LocationAddress { get; set; }

        // Specs
        public int? Odometer { get; set; }
        public string OdometerUnit { get; set; }
        public string Fuel { get; set; }
        public string Transmission { get; set; }
        public string DriveTrain { get; set; }
        public string Condition { get; set; }
        public bool HasKeys { get; set; }
        public string PrimaryDamage { get; set; }
        public string SecondaryDamage { get; set; }
        public string TitleType { get; set; }
        public string TitleState { get; set; }
        public decimal? EstimatedRetailValue { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Auction info - if the car already assigned to an auction
        public int? LotNumber { get; set; }
        public decimal? ReservePrice { get; set; }
        public decimal? StartPrice { get; set; }
    }

}
