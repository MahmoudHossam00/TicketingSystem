namespace ITDepartmentSystem.Requests
{
    public class ViewSystemDTO:EntityResponse
    {
        public string Name { set; get; }

        public static ViewSystemDTO FromModel(ITSystem system)
        {
            var sys = new ViewSystemDTO()
            {
                Name = system.Name,
            };
            MapBase(system, sys);
            return sys;
        }
    }
}
