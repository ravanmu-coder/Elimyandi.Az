using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AutoriaFinal.Domain.Enums.AuctionEnums
{
    public enum AuctionStatus
    {
        Draft,
        Scheduled,
        Running,
        Ended,
        Cancelled,
        Settled
    }
}
