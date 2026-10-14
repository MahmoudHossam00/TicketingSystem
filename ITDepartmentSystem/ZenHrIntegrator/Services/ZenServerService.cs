using Microsoft.EntityFrameworkCore;
using ZenHrIntegrator.Migrations;
using ZenHrIntegrator.Models;
using ZenHrIntegrator.SecondContext;
using ZenHrIntegrator.SecondModels;
using ZenHrIntegrator.Services.Interfaces;

namespace ZenHrIntegrator.Services
{
    public class ZenServerService(AppDbContext maincontext,SecondDbContext zendb) : IZenServerService
    {
        public async Task<ICollection<EmployeesBranch>> GetAllEmployeeBranches()
        {
            return (await zendb.EmployeesBranches.ToListAsync());
        }

        public async Task IntegrateEmployeesBranches()
        {
            var empbranchesmain = await maincontext.ZenHrEmployees
                                    .Where(e => e.BranchId == 18908 && e.EmploymentNumber != null)
                                    .Select(e => new
                                    {
                                        Key = e.EmploymentNumber,
                                        Value = e.BranchId
                                    })
                                    .ToDictionaryAsync(
                                        x => x.Key!.ToString(),
                                        x => x.Value.ToString()
                                    );
            var empbrancheszen = await zendb.EmployeesBranches.Where(e => e.Branches == "18908" && e.EmpId != null)
                                    .Select(e => new
                                    {
                                        Key = e.EmpId,
                                        Value = e.Branches
                                    })
                                    .ToDictionaryAsync(
                                        x => x.Key!,
                                        x => x.Value??""
                                    );
            var onlyInMain = empbranchesmain.Keys
                            .Except(empbrancheszen.Keys)
                            .ToList();
            var onlyInZen = empbrancheszen.Keys
                .Except(empbranchesmain.Keys)
                .ToList();

            foreach(var emp in onlyInMain)
            {
                EmployeesBranch variable = new()
                {
                    Branches = "18908",
                    EmpId = emp
                };
                //await zendb.EmployeesBranches.AddAsync(variable);

                await zendb.Database.ExecuteSqlRawAsync(
                    "INSERT INTO employees_branches (emp_id, branches) VALUES ({0}, {1})",
                    variable.EmpId, variable.Branches
                );
            }
            //var diff=
        }
    }
}
