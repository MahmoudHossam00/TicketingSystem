namespace ITDepartmentSystem.Requests
{
    public class LoginToAccountRequest
    {
        public string UserNameOrEmail{ get; set; }
        public string Password { get; set; }
    }

    public class RevokeRefreshTokenRequest
    {
        public string RefreshToken { get; set; }

    }
}
