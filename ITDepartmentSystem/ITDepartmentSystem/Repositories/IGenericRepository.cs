
using System.Linq.Expressions;

namespace ITDepartmentSystem.Repositories
{
    public interface IGenericRepository<TEntity>
    where TEntity : Entity
    {
        Task<TEntity> CreateAsync(TEntity entity, CancellationToken token = default);
        Task<TEntity?> GetByIdAsync(Guid id, CancellationToken token = default);
        Task<IQueryable<TEntity>> Where(Expression<Func<TEntity,bool>> expr, CancellationToken token = default);
        IQueryable<TEntity> Wheree(Expression<Func<TEntity, bool>> expr, CancellationToken token = default);

        Task<bool> AnyAsync(Expression<Func<TEntity,bool>> expr, CancellationToken token = default);
        Task<IQueryable<TEntity>> GetAllAsync(CancellationToken token = default);
        Task UpdateAsync(TEntity entity, CancellationToken token = default);
        Task DeleteAsync(TEntity entity, CancellationToken token = default);
        //Task<IQueryable<TEntity>> Where(Func<TEntity,bool> predicate);
        Task SaveChangesAsync( CancellationToken token = default);
        //Task RemoveRange(ICollection<TEntity> entity, CancellationToken token = default);
        Task AddAsync(TEntity entity, CancellationToken token = default);
        Task AddRangeAsync(ICollection<TEntity> entity, CancellationToken token = default);
        Task<TEntity?> FirstOrDefaultWithIncludes(
            Expression<Func<TEntity, bool>> predicate,
            CancellationToken token = default,
            params Expression<Func<TEntity, object>>[] includes
        );
        Task<TEntity?> FirstOrDefaultWithIncludes(
    Expression<Func<TEntity, bool>> predicate,
    Func<IQueryable<TEntity>, IQueryable<TEntity>>? include = null,
    CancellationToken token = default
);
    }

    public interface INotEntityGenericRepository<TEntity>
    where TEntity : class
    {
        Task<TEntity> CreateAsync(TEntity entity, CancellationToken token = default);
        Task<TEntity?> GetByIdAsync(Guid id, CancellationToken token = default);
        Task<IQueryable<TEntity>> GetAllAsync(CancellationToken token = default);

        Task UpdateAsync(TEntity entity, CancellationToken token = default);
        Task DeleteAsync(TEntity entity, CancellationToken token = default);
        Task SaveChangesAsync(CancellationToken token = default);
        Task AddAsync(TEntity entity, CancellationToken token = default);
        Task AddRangeAsync(ICollection<TEntity> entity, CancellationToken token = default);
        Task<IQueryable<TEntity>> Where(Expression<Func<TEntity, bool>> expr, CancellationToken token = default);
        void RemoveRange(ICollection<TEntity> entity, CancellationToken token = default);


    }
}
