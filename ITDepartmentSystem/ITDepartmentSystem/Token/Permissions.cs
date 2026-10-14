namespace ITDepartmentSystem.Token
{
    public static class Permission
    {
        public static class EmployeePermissions
        {
            //public const string Create = "employee:create";
            public const string Read = "employee:read";
            //public const string safasf = Permission.Employee.Create;
            //public const string Update = "employee:update";
            //public const string Delete = "employee:delete";
        }
        public static class AppUserPermissions
        {
            public const string Create = "appuser:create";
            public const string Read = "appuser:read";
            public const string Update = "appuser:update";
            public const string Delete = "appuser:delete";
        }
    }
}
