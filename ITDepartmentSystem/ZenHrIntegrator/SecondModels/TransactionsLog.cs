using System;
using System.Collections.Generic;

namespace ZenHrIntegrator.SecondModels;

public partial class TransactionsLog
{
    public int Id { get; set; }

    public string? EmpId { get; set; }

    public DateTime? RecordDatetime { get; set; }

    public DateOnly? Date { get; set; }

    public TimeOnly? Time { get; set; }

    public string? CardId { get; set; }

    public int? Status { get; set; }

    public string? MachineId { get; set; }

    public string? MachineName { get; set; }

    public string? IpAddress { get; set; }

    public string? MacAddress { get; set; }

    public string? PortNo { get; set; }

    public DateOnly AutoDate { get; set; }

    public TimeOnly AutoTime { get; set; }
}
