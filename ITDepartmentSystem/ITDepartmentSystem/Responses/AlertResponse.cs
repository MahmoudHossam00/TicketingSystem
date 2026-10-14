namespace ITDepartmentSystem.Responses
{
    public class AlertResponse
    {
        public Guid id { set; get; }
        public string Text { set; get; } = default!;
        public DateTime EndDate { set; get; }
        public bool isHidden { set; get; }
        
        public static AlertResponse FromModel(Alert alert,string currentuserid)
        {
            return new AlertResponse()
            {
                id = alert.Id,
                EndDate=alert.EndDate,
                isHidden=alert.Hiders.Any(h=>h.Id==currentuserid) ? true : false,
                Text = alert.Text
            };
        }
    }
    public class NewsLetterResponse
    {
            public Guid id { set; get; }
            public string Text { set; get; } = default!;

            public DateTime EndDate { set; get; }
           
            public static NewsLetterResponse FromModel(NewsLetter alert)
            {
                return new NewsLetterResponse()
                {
                    id = alert.Id,
                    EndDate=alert.EndDate,
                    Text=alert.Text
                };
            }
    }
}
