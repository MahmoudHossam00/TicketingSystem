using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITDepartmentSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ArticleController(IArticleService _service): ControllerBase
    {
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] CreateArticleRequest request, CancellationToken token)
        {
            var id = await _service.CreateArticle(request, token);
            return Ok(id);
        }
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] FilterArticleSummaryRequest filter, CancellationToken token)
        {
            var result = await _service.GetAllArticles(filter, token);
            return Ok(result);
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken token)
        {
            var result = await _service.GetArticleById(id, token);
            return Ok(result);
        }
        [HttpPost("{articleId}/blocks")]
        public async Task<IActionResult> AddBlock(Guid articleId, [FromForm]AddArticleBlockRequest request, CancellationToken token)
        {
            await _service.AddBlock(articleId, request, token);
            return Ok();
        }
        [HttpDelete("blocks/{blockId}")]
        public async Task<IActionResult> RemoveBlock(Guid blockId, CancellationToken token)
        {
            await _service.RemoveBlock(blockId, token);
            return Ok();
        }
        [HttpGet("AllSystemAgents")]
        public async Task<IActionResult> getallagents( CancellationToken token)
        {
            var agents=await _service.GetAllSystemsAgents( token);
            return Ok(agents);
        }
        //[AllowAnonymous]
        //[HttpGet("TestThreadBlocking")]
        //public async Task<IActionResult> TestThreadBlocking(CancellationToken token)
        //{
        //    using var client = new HttpClient();

        //    var tasks = Enumerable.Range(0, 200)
        //        .Select(_ => client.GetAsync("https://localhost:7253/api/article", token));

        //    await Task.WhenAll(tasks);

        //    return Ok("Done");
        //}
        //[HttpGet("block")]
        //public async Task<IActionResult> Block(CancellationToken ct)
        //{
        //    Thread.Sleep(10000); // ❗ THIS BLOCKS THREADS
        //    return Ok();
        //}
        //[HttpGet("cpu-block")]
        //public IActionResult CpuBlock()
        //{
        //    var start = DateTime.UtcNow;

        //    while ((DateTime.UtcNow - start).TotalSeconds < 10)
        //    {
        //        // burn CPU
        //        _ = Math.Sqrt(Random.Shared.NextDouble());
        //    }

        //    return Ok("done");
        //}
        //[HttpGet("db-stress")]
        //public async Task<IActionResult> DbStress(CancellationToken ct)
        //{
        //    var data = await _db.Articles
        //        .Include(a => a.Blocks)
        //        .ThenInclude(b => b.ListItems)
        //        .ToListAsync(ct);

        //    return Ok(data.Count);
        //}
    }
}
