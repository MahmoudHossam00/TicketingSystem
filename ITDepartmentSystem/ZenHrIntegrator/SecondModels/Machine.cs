using System;
using System.Collections.Generic;

namespace ZenHrIntegrator.SecondModels;

public partial class Machine
{
    public int Id { get; set; }

    public string? MachineName { get; set; }

    public string IpAddres { get; set; } = null!;

    public string Username { get; set; } = null!;

    public string Password { get; set; } = null!;

    public bool IsCancelled { get; set; }

    public bool IsOffline { get; set; }
}
