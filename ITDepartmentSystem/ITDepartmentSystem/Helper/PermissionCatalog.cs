using System.Reflection;

namespace ITDepartmentSystem.Helper
{
    public static class PermissionCatalog
    {
        public record PermissionItem(string Key, string Group, string Name);

        public static IReadOnlyList<PermissionItem> GetAll()
        {
            var root = typeof(Permission);

            var list = new List<PermissionItem>();

            foreach (var nested in root.GetNestedTypes(BindingFlags.Public))
            {
                var group = nested.Name; // Survey, Employee, ...

                var fields = nested.GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy);

                foreach (var f in fields)
                {
                    // only const string
                    if (f.FieldType != typeof(string)) continue;
                    if (!f.IsLiteral || f.IsInitOnly) continue;

                    var key = (string?)f.GetRawConstantValue();
                    if (string.IsNullOrWhiteSpace(key)) continue;

                    list.Add(new PermissionItem(key, group, f.Name)); // "Create", "Read", ...
                }
            }

            return list;
        }
    }
}
