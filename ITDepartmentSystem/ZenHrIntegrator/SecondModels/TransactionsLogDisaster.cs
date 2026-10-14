using System;
using System.Collections.Generic;

namespace ZenHrIntegrator.SecondModels;

public partial class TransactionsLogDisaster
{
    public int Id { get; set; }

    public string? EmpId { get; set; }

    public DateTime? RecordDatetime { get; set; }

    public string? MachineId { get; set; }

    public string? CardId { get; set; }

    public int? Status { get; set; }

    public string IpAddress { get; set; } = null!;

    public string PortNo { get; set; } = null!;

    public string MacAddress { get; set; } = null!;

    public DateOnly AutoDate { get; set; }

    public TimeOnly AutoTime { get; set; }
}
