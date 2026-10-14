using ITDepartmentSystem.General;
using ITDepartmentSystem.Requests.GeneralRequests;

namespace ITDepartmentSystem.Services.IServices.GenericInterafaces
{
    public interface ICreate<CreateDTO,ReturnType>
    {
        public Task<ReturnType> Create(CreateDTO obj,CancellationToken token=default);
    }
    public interface IUpdate<UpdateDTO, KeyType, ReturnType>
    {
        public Task<ReturnType> Update(KeyType id, UpdateDTO obj, CancellationToken token=default);
    }
    public interface IGetAll<ViewAllDTO>
    {
        public Task<ICollection<ViewAllDTO>> GetAll( CancellationToken token=default);
    }
    public interface IGetAllPaginated<ViewAllDTO>
    {
        public Task<PaginatedResponse<ViewAllDTO>> GetAll(CancellationToken token = default);
    }
    public interface IGetById<ViewDTO,KeyType>
    {
        public Task<ViewDTO> GetById(KeyType id, CancellationToken token=default);
    }
    public interface IDelete<KeyType>
    {
        public Task Delete(KeyType id, CancellationToken token=default);
    }
    public interface IIsDeleted<KeyType>
    {
        public Task SetIsDeleted(KeyType id, CancellationToken token=default);
    }
    public interface IRemoveCache
    {
        public Task DeleteCache(CancellationToken token = default);
    }

    public interface IUseBasic<CreateDTO,UpdateDTO, ViewDTO,Key> : 
        ICreate<CreateDTO, ViewDTO>,
        IUpdate<UpdateDTO, Key, ViewDTO>,
        IDelete<Key>,
        IIsDeleted<Key>,
        IGetById<ViewDTO, Key>,
        IGetAll<ViewDTO>
    {

    }

    public interface IUseBasic2<CreateDTO, UpdateDTO, ViewDTO, Key> :
        ICreate<CreateDTO, ViewDTO>,
        IUpdate<UpdateDTO, Key, ViewDTO>,
        IDelete<Key>,
        IIsDeleted<Key>,
        IGetAllPaginated<ViewDTO>,
        IGetById<ViewDTO, Key>
    {

    }
}
