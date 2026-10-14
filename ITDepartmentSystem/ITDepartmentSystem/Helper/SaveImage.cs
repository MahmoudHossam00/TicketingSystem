namespace ITDepartmentSystem.Helper
{
    public static class SaveImage
    {
        public static async Task<string> Save(this IFormFile file, List<string>? folders)
        {
            var invalidChars = Path.GetInvalidFileNameChars();
            var safeName = new string(file.FileName.Where(c => !invalidChars.Contains(c)).ToArray());

            // Replace common unsafe characters for URLs
            safeName = safeName
                .Replace("#", "_")
                .Replace("%", "_")
                .Replace("&", "_")
                .Replace("?", "_")
                .Replace(" ", "_")
                .Replace("+", "_");
            string currentpath = string.Empty;
            if (folders != null)
            {
                foreach (var folder in folders)
                {
                    currentpath = Path.Combine(currentpath, folder);
                }
            }
            var covername = $"{Path.GetFileNameWithoutExtension(safeName)}_{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            string folderPath = Path.Combine(Directory.GetCurrentDirectory(), FileSettings.FilesPath, currentpath);
            Directory.CreateDirectory(folderPath);
            string filePath = Path.Combine(folderPath, covername);
            using (var stream = System.IO.File.Create(filePath))
            {
                await file.CopyToAsync(stream);
            }
            //return Path.Combine(currentpath, covername);
            return covername;
        }
        public static IFormFile Base64ToFormFile(string base64, string fileName, string contentType)
        {
            var bytes = Convert.FromBase64String(base64); // decode base64
            var stream = new MemoryStream(bytes);         // create a stream from bytes
            return new FormFile(stream, 0, bytes.Length, "file", fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = contentType
            };
        }
        public static string getdefault()
        {
            return Path.Combine(Directory.GetCurrentDirectory(), FileSettings.FilesPath); 
        }
        public static Task Delete(string fileName)
        {
            string folderPath = Path.Combine(Directory.GetCurrentDirectory(), FileSettings.FilesPath);
            string filePath = Path.Combine(folderPath, fileName);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }

            return Task.CompletedTask;
        }

        public static string GetContentType(string path)
        {
            var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();

            if (!provider.TryGetContentType(path, out var contentType))
            {
                contentType = "application/octet-stream";
            }

            return contentType;
        }
    }

    public class FileSettings
    {
        //public static string AllowedExtensions = ".jpg,.jpeg,.png,.bmp,.gif,.svg,.webp,.avif,.apng";
        public static string FilesPath = "Files";
        public static string UploadsPath = Path.Combine(Directory.GetCurrentDirectory(), FilesPath);
    }

    public class FileDTO
    {
        public IFormFile file { set; get; }
    }
}
