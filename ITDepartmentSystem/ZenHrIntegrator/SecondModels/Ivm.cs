using System;
using System.Collections.Generic;

namespace ZenHrIntegrator.SecondModels;

public partial class Ivm
{
    public int Id { get; set; }

    public string? Empcode { get; set; }

    public DateTime? Datetime { get; set; }

    public string? MachName { get; set; }

    public string? Ipadd { get; set; }
}
