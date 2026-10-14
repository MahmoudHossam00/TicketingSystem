using System;
using System.Collections.Generic;

namespace ZenHrIntegrator.SecondModels;

public partial class Function
{
    public int Id { get; set; }

    public DateTime? RecordDatetime { get; set; }

    public string? MachineId { get; set; }

    public string? CardId { get; set; }

    public int? Status { get; set; }

    public int? BranchId { get; set; }
}
