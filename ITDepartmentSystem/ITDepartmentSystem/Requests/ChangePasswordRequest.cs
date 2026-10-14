namespace ITDepartmentSystem.Requests
{
    public class ChangePasswordDTO
    {
        public required string OldPassword { set; get; }
        public required string NewPassword { set; get; }
        public required string ConfirmNewPassword { set; get; }
    }
}
