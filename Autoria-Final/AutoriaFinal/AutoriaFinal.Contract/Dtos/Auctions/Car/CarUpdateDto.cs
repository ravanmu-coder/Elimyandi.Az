using AutoriaFinal.Domain.Enums.VehicleEnums;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AutoriaFinal.Contract.Dtos.Auctions.Car
{
    public class CarUpdateDto
    {
        public string Vin { get; set; } = default!;
        public int Year { get; set; }
        public string Make { get; set; } = default!;
        public string Model { get; set; } = default!;
        public string? BodyStyle { get; set; }
        public string? Color { get; set; }
        public Guid LocationId { get; set; }
        public int? Odometer { get; set; }
        public string OdometerUnit { get; set; } = "km";

        public FuelType Fuel { get; set; }
        public Transmission Transmission { get; set; }
        public DriveTrain DriveTrain { get; set; }
        public CarCondition Condition { get; set; }
        public bool HasKeys { get; set; }
        public DamageType PrimaryDamage { get; set; }
        public DamageType SecondaryDamage { get; set; }
        public TitleType TitleType { get; set; }
        public string? TitleState { get; set; }
        public decimal? EstimatedRetailValue { get; set; }

        public IFormFile? ImageCar { get; set; }
    }
}
