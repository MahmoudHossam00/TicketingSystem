
using ITDepartmentSystem.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace ITDepartmentSystem.Repositories
{
    public class GenericRepository<TEntity> :IGenericRepository<TEntity>  where TEntity : Entity
    {
        protected readonly AppDbContext _context;
        protected readonly DbSet<TEntity> _dbSet;

        public GenericRepository(AppDbContext context)
        {
            _context = context;
            _dbSet = context.Set<TEntity>();
        }

        public virtual async Task<TEntity> CreateAsync(
            TEntity entity,
            CancellationToken token = default)
        {
            await _dbSet.AddAsync(entity, token);
            await _context.SaveChangesAsync(token);
            return entity;
        }

        public virtual async Task<TEntity?> GetByIdAsync(
            Guid id,
            CancellationToken token = default)
        {
            return await _dbSet.FindAsync(new object[] { id }, token);
        }

        public virtual async Task<IQueryable<TEntity>> GetAllAsync(
            CancellationToken token = default)
        {
            return _dbSet.OrderByDescending(i=>i.CreatedAt).Where(i=>!i.IsDeleted).AsQueryable();
        }

        public virtual async Task UpdateAsync(
            TEntity entity,
            CancellationToken token = default)
        {
            _dbSet.Update(entity);
            await _context.SaveChangesAsync(token);
        }

        public virtual async Task DeleteAsync(
            TEntity entity,
            CancellationToken token = default)
        {
            //_dbSet.Remove(entity);
            entity.IsDeleted=true;
            await _context.SaveChangesAsync(token);
        }

        public async Task SaveChangesAsync( CancellationToken token = default)
        {
            await _context.SaveChangesAsync(token);
        }

        public async Task AddAsync(TEntity entity, CancellationToken token = default)
        {
            await _dbSet.AddAsync(entity, token);
        }
        public async Task AddRangeAsync(ICollection<TEntity> entity, CancellationToken token = default)
        {
            await _dbSet.AddRangeAsync(entity, token);
        }

        public async Task<IQueryable<TEntity>> Where(Expression<Func<TEntity, bool>> expr, CancellationToken token = default)
        {
            return _dbSet.Where(expr);
        }
        public IQueryable<TEntity> Wheree(Expression<Func<TEntity, bool>> expr, CancellationToken token = default)
        {
            return _dbSet.Where(expr);
        }

        public async Task<bool> AnyAsync(Expression<Func<TEntity, bool>> expr, CancellationToken token = default)
        {
            return await _dbSet.AnyAsync(expr);
        }

        public async Task<TEntity?> FirstOrDefaultWithIncludes(Expression<Func<TEntity, bool>> predicate, CancellationToken token = default, params Expression<Func<TEntity, object>>[] includes)
        {
            IQueryable<TEntity> query = _context.Set<TEntity>();

            if (includes != null && includes.Length > 0)
            {
                query = includes.Aggregate(query, (current, include) =>
                    current.Include(include));
            }

            return await query.FirstOrDefaultAsync(predicate, token);
        }

        public async Task<TEntity?> FirstOrDefaultWithIncludes(
            Expression<Func<TEntity, bool>> predicate,
            Func<IQueryable<TEntity>, IQueryable<TEntity>>? include = null,
            CancellationToken token = default
        )
        {
            IQueryable<TEntity> query = _context.Set<TEntity>();

            if (include != null)
                query = include(query);

            return await query.FirstOrDefaultAsync(predicate, token);
        }
        //public Task RemoveRange(ICollection<TEntity> entity, CancellationToken token = default)
        //{
        //    await _dbSet.(entity, token);
        //}
    }

    public class NotEntityGenericRepository<TEntity> : INotEntityGenericRepository<TEntity> where TEntity : class
    {
        protected readonly AppDbContext _context;
        protected readonly DbSet<TEntity> _dbSet;

        public NotEntityGenericRepository(AppDbContext context)
        {
            _context = context;
            _dbSet = context.Set<TEntity>();
        }
        public async Task<IQueryable<TEntity>> Where(Expression<Func<TEntity, bool>> expr, CancellationToken token = default)
        {
            return _dbSet.Where(expr);
        }
        public virtual async Task<TEntity> CreateAsync(
            TEntity entity,
            CancellationToken token = default)
        {
            await _dbSet.AddAsync(entity, token);
            await _context.SaveChangesAsync(token);
            return entity;
        }

        public virtual async Task<TEntity?> GetByIdAsync(
            Guid id,
            CancellationToken token = default)
        {
            return await _dbSet.FindAsync(new object[] { id }, token);
        }

        public virtual async Task<IQueryable<TEntity>> GetAllAsync(
            CancellationToken token = default)
        {
            return _dbSet.AsQueryable();
        }

        public virtual async Task UpdateAsync(
            TEntity entity,
            CancellationToken token = default)
        {
            _dbSet.Update(entity);
            await _context.SaveChangesAsync(token);
        }

        public virtual async Task DeleteAsync(
            TEntity entity,
            CancellationToken token = default)
        {
            _dbSet.Remove(entity);
            //entity.IsDeleted = true;
            await _context.SaveChangesAsync(token);
        }
        public async Task SaveChangesAsync(CancellationToken token = default)
        {
            await _context.SaveChangesAsync(token);
        }

        public async Task AddAsync(TEntity entity, CancellationToken token = default)
        {
            await _dbSet.AddAsync(entity, token);
        }
        public async Task AddRangeAsync(ICollection<TEntity> entity, CancellationToken token = default)
        {
            await _dbSet.AddRangeAsync(entity, token);
        }

        public void RemoveRange(ICollection<TEntity> entity, CancellationToken token = default)
        {
            _dbSet.RemoveRange(entity);
        }
    }
}
