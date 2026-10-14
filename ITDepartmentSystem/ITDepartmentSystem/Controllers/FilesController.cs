using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ITDepartmentSystem.Controllers
{
    public class fileDTO
    {
        public IFormFile file { set; get; }
    }
    public class filesDTO
    {
        public List<IFormFile> file { set; get; }
    }
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    [AllowAnonymous]
    public class FilesController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public FilesController(IWebHostEnvironment env)
        {
            _env = env;
        }

        
        // ✅ Upload file
        [HttpPost("upload")]
        public async Task<IActionResult> Upload([FromForm] fileDTO FileDto)
        {
            if (FileDto == null || FileDto.file == null ||FileDto.file.Length == 0)
                return BadRequest("No file uploaded");

            //var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");

            //if (!Directory.Exists(uploadsFolder))
            //    Directory.CreateDirectory(uploadsFolder);

            //var uniqueFileName = $"{Guid.NewGuid()}_{FileDto.file.FileName}";
            //var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            //using (var stream = new FileStream(filePath, FileMode.Create))
            //{
            //    await FileDto.file.CopyToAsync(stream);
            //}
            string filename =await FileDto.file.Save(new() { });
            var fileUrl = $"{Request.Scheme}://{Request.Host}/api/files/{filename}";

            return Ok(new
            {
                name = FileDto.file.FileName,
                url = fileUrl,
                contentType = FileDto.file.ContentType
            });
        }

        // ✅ Get file (optional if using static files)
        [HttpGet("{fileName}")]
        public IActionResult Get(string fileName)
        {
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), FileSettings.FilesPath, fileName);

            if (!System.IO.File.Exists(filePath))
                return NotFound();

            var contentType = "application/octet-stream";
            return PhysicalFile(filePath, contentType, fileName);
        }
    }
}
