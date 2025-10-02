using AutoriaFinal.Domain.Enums.VehicleEnums;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AutoriaFinal.Contract.Dtos.Auctions.Car
{
    public class CarCreateDto
    {
        [Required]
        [StringLength(17)]
        public string Vin { get; set; }

        [Required]
        public int Year { get; set; }

        [Required]
        [StringLength(100)]
        public string Make { get; set; }

        [Required]
        [StringLength(100)]
        public string Model { get; set; }

        public string BodyStyle { get; set; }
        public string Color { get; set; }

        public Guid LocationId { get; set; }    
        public IFormFile? Image { get; set; }
        public string? ImagePath { get; set; }
        public string? OwnerId { get; set; }
    }
}
