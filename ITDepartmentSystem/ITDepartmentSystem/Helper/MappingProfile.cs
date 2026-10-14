using AutoMapper;

namespace ITDepartmentSystem.Helper
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<EmployeeCache, EmployeeCacheDTO>()
                .ForMember(dest => dest.ManagerName,
                    opt => opt.MapFrom(src => src.Manager != null ? src.Manager.NameEn : null));
        }
    }
}
