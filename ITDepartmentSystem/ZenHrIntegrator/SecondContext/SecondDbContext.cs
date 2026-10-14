using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using ZenHrIntegrator.SecondModels;

namespace ZenHrIntegrator.SecondContext;

public partial class SecondDbContext : DbContext
{
    public SecondDbContext()
    {
    }

    public SecondDbContext(DbContextOptions<SecondDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<EmpBranchTest> EmpBranchTests { get; set; }

    public virtual DbSet<EmployeesBranch> EmployeesBranches { get; set; }

    public virtual DbSet<Function> Functions { get; set; }

    public virtual DbSet<Ivm> Ivms { get; set; }

    public virtual DbSet<Machine> Machines { get; set; }

    public virtual DbSet<TransactionsLog> TransactionsLogs { get; set; }

    public virtual DbSet<TransactionsLogDisaster> TransactionsLogDisasters { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Data Source=10.10.55.10;Initial Catalog=ZenHR;Persist Security Info=True;User ID=sa;Password=1;Trust Server Certificate=True");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EmpBranchTest>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("emp_branch_test");

            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.EmpId).HasColumnName("emp_id");
        });

        modelBuilder.Entity<EmployeesBranch>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("employees_branches");

            entity.Property(e => e.Branches).HasMaxLength(50);
            entity.Property(e => e.EmpId)
                .HasMaxLength(50)
                .HasColumnName("emp_id");
        });

        modelBuilder.Entity<Function>(entity =>
        {
            entity.ToTable("functions");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.CardId)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("cardID");
            entity.Property(e => e.MachineId)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("machineID");
            entity.Property(e => e.RecordDatetime)
                .HasColumnType("datetime")
                .HasColumnName("recordDatetime");
            entity.Property(e => e.Status).HasColumnName("status");
        });

        modelBuilder.Entity<Ivm>(entity =>
        {
            entity.ToTable("ivms");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Datetime)
                .HasColumnType("datetime")
                .HasColumnName("datetime");
            entity.Property(e => e.Empcode)
                .HasMaxLength(50)
                .HasColumnName("empcode");
            entity.Property(e => e.Ipadd)
                .HasMaxLength(50)
                .HasColumnName("ipadd");
            entity.Property(e => e.MachName)
                .HasMaxLength(100)
                .HasColumnName("machName");
        });

        modelBuilder.Entity<Machine>(entity =>
        {
            entity.HasIndex(e => e.IpAddres, "IX_Machines_ipAddres").IsUnique();

            entity.Property(e => e.IpAddres).HasColumnName("ipAddres");
            entity.Property(e => e.IsCancelled).HasColumnName("isCancelled");
            entity.Property(e => e.IsOffline).HasColumnName("isOffline");
            entity.Property(e => e.Password).HasColumnName("password");
            entity.Property(e => e.Username).HasColumnName("username");
        });

        modelBuilder.Entity<TransactionsLog>(entity =>
        {
            entity.ToTable("TransactionsLog", tb => tb.HasTrigger("TRG_InsertSyncEmp"));

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AutoDate)
                .HasDefaultValueSql("(CONVERT([date],getdate()))", "DF_TransactionsLog_autoDate")
                .HasColumnName("autoDate");
            entity.Property(e => e.AutoTime)
                .HasPrecision(0)
                .HasDefaultValueSql("(CONVERT([time](0),getdate()))", "DF_TransactionsLog_autoTime")
                .HasColumnName("autoTime");
            entity.Property(e => e.CardId)
                .HasMaxLength(255)
                .HasColumnName("cardID");
            entity.Property(e => e.Date).HasColumnName("date");
            entity.Property(e => e.EmpId)
                .HasMaxLength(50)
                .HasColumnName("empID");
            entity.Property(e => e.IpAddress)
                .HasMaxLength(50)
                .HasColumnName("ipAddress");
            entity.Property(e => e.MacAddress)
                .HasMaxLength(100)
                .HasColumnName("macAddress");
            entity.Property(e => e.MachineId)
                .HasMaxLength(255)
                .HasColumnName("machineID");
            entity.Property(e => e.MachineName)
                .HasMaxLength(255)
                .HasColumnName("machineName");
            entity.Property(e => e.PortNo)
                .HasMaxLength(10)
                .HasColumnName("portNo");
            entity.Property(e => e.RecordDatetime)
                .HasColumnType("datetime")
                .HasColumnName("recordDatetime");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.Time)
                .HasPrecision(0)
                .HasColumnName("time");
        });

        modelBuilder.Entity<TransactionsLogDisaster>(entity =>
        {
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AutoDate)
                .HasDefaultValueSql("(CONVERT([date],getdate()))", "DF_TransactionsLogDisasters_autoDate")
                .HasColumnName("autoDate");
            entity.Property(e => e.AutoTime)
                .HasPrecision(0)
                .HasDefaultValueSql("(CONVERT([time](0),getdate()))", "DF_TransactionsLogDisasters_autoTime")
                .HasColumnName("autoTime");
            entity.Property(e => e.CardId)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("cardID");
            entity.Property(e => e.EmpId)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("empID");
            entity.Property(e => e.IpAddress).HasColumnName("ipAddress");
            entity.Property(e => e.MacAddress).HasColumnName("macAddress");
            entity.Property(e => e.MachineId)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("machineID");
            entity.Property(e => e.PortNo).HasColumnName("portNo");
            entity.Property(e => e.RecordDatetime)
                .HasColumnType("datetime")
                .HasColumnName("recordDatetime");
            entity.Property(e => e.Status).HasColumnName("status");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
