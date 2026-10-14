//using ITDepartmentCompany.Requests.GeneralRequests;
using ITDepartmentSystem.Requests.GeneralRequests;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace ITDepartmentCompany.Services.IServices
{
    public interface ICompanyService:IUseBasic<StringDTO,StringDTO,ViewCompanyDTO,Guid>, IRemoveCache


    {
        
    }



}
