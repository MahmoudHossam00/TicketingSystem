using System.Text.RegularExpressions;

namespace ZenHrIntegrator.Helper
{
    public static class SensitiveDataMasker
    {
        public static string Mask(string? value, int visible = 4)
        {
            if (string.IsNullOrEmpty(value)) return value ?? "";
            if (value.Length <= visible) return "****";
            return $"{value[..visible]}****{value[^visible..]}";
        }

        public static string MaskJson(string json)
        {
            return Regex.Replace(
                json,
                "(\"(access_token|refresh_token|authorization)\"\\s*:\\s*\")([^\"]+)",
                m => $"{m.Groups[1].Value}{Mask(m.Groups[4].Value)}",
                RegexOptions.IgnoreCase
            );
        }
    }

}
