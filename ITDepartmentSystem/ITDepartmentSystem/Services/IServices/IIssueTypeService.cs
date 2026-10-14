using ITDepartmentSystem.Requests.GeneralRequests;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace ITDepartmentCompany.Services.IServices
{
    public interface IIssueTypeService:IUseBasic<StringDTO,StringDTO,ViewIssueTypeDTO,Guid>, IRemoveCache


    {
        
    }



}
