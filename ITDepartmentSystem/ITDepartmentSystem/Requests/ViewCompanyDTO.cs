namespace ITDepartmentSystem.Requests
{
    public class ViewCompanyDTO : EntityResponse
    {
        public string Name { set; get; }

        public static ViewCompanyDTO FromModel(Company system)
        {
            var sys = new ViewCompanyDTO()
            {
                Name = system.Name,
            };
            MapBase(system, sys);
            return sys;
        }
    }
    public class ViewFixedKPIDTO : EntityResponse
    {
        public string Name { set; get; }

        public static ViewFixedKPIDTO FromModel(KPIMasterData system)
        {
            var sys = new ViewFixedKPIDTO()
            {
                Name = system.Name,
            };
            MapBase(system, sys);
            return sys;
        }
    }
}
