using DocumentFormat.OpenXml.Office.SpreadSheetML.Y2023.MsForms;
using DocumentFormat.OpenXml.Spreadsheet;
using ITDepartmentSystem.General;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore.Query.SqlExpressions;
using OfficeOpenXml.FormulaParsing.LexicalAnalysis;
using OpenTelemetry.Trace;
using System.IdentityModel.Tokens.Jwt;
using System.Reflection;
using System.Security.Claims;

namespace ITDepartmentSystem.Services
{
    public class ProjectService(
        IGenericRepository<Project> repo,
        IGenericRepository<ProjectMessage> ProjectMessagerepo,
        //IGenericRepository<Company> repo,
        //IGenericRepository<Ticket> repo,
        //IGenericRepository<Ticket> repo,
        IGenericRepository<IssueStatus> Statuses,
        IGenericRepository<ITSystem> Systems,
        INotificationService _notificationService,
        IConfiguration configuration,
        IGenericRepository<SystemAgent> SystemAgents,
        IGenericRepository<IssueType> IssueTypes,
        IHttpContextAccessor httpContextAccessor,
        //IBackgroundQueue _backgroundQueue,
         UserManager<AppUser> userManager,
        HybridCache cache

        )
        : IProjectService
    {
        private string fronturl => configuration["FrontEnd:BaseUrl"]??"";
        private readonly UserManager<AppUser> _userManager = userManager;

        private ClaimsPrincipal User =>
        httpContextAccessor.HttpContext?.User
        ?? throw new BusinessRuleException("Unauthorized", StatusCodes.Status401Unauthorized);
        private const string Cache_AllTickets = "projects:all";
        private const string DefaultStatusName = "Not Assigned Yet";
        private static string Cache_TicketById(Guid id) => $"Project:{id}";
        private static string Cache_TaskByProjectId(Guid id) => $"ProjectTasks:{id}";


        private string GetCacheChatKey(Guid ticketId) => $"ProjectChat_{ticketId}";

        private async Task<Guid> getdefaultstatusissueid()
        {
            var status = await (await Statuses.GetAllAsync()).FirstOrDefaultAsync(a => a.StatusName == "Not Assigned Yet");
            if (status == null)
            {
                throw new BusinessRuleException("Default status Not found", StatusCodes.Status404NotFound);
            }
            return status.Id;
        }
        private string GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub"); // JWT fallback

            if (id == null)
                throw new BusinessRuleException("User ID not found in token", StatusCodes.Status401Unauthorized);

            return id;
        }
        private string GetUserName()
        {
            var id = User.FindFirstValue(ClaimTypes.Name)
                  ?? User.FindFirstValue("sub")
                  ?? User.FindFirstValue("name")
                  ?? User?.FindFirstValue(ClaimTypes.Name)

             ?? User?.FindFirstValue(JwtRegisteredClaimNames.Sub); // JWT fallback

            if (id == null)
                throw new BusinessRuleException("User ID not found in token", StatusCodes.Status401Unauthorized);

            return id;
        }

        private void throwifclosed(Project prj)
        {
            if(prj.isClosed)
            {
                throw new BusinessRuleException("Project is closed", StatusCodes.Status405MethodNotAllowed);
            }
        }
        private async Task throwifnotagent(Project prj,string userId=null)
        {
            userId ??= GetUserId();
            if (!(await SystemAgents.AnyAsync(s => userId == s.AgentId && s.SystemId == prj.SystemId)))
            {
                throw new BusinessRuleException("You are not a system agent.", StatusCodes.Status404NotFound);
            }
           
        }
        private string? GetIpAddress()
        {
            var ctx = httpContextAccessor.HttpContext;
            if (ctx == null) return null;

            if (ctx.Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded))
                return forwarded.ToString().Split(',')[0].Trim();

            var ip = ctx.Connection.RemoteIpAddress;
            if (ip == null) return null;

            return ip.IsIPv4MappedToIPv6
                ? ip.MapToIPv4().ToString()
                : ip.ToString();
        }

        public async Task AddPrivateNote(Guid Id, StringDTO note, CancellationToken token = default)
        {
            var userid = GetUserId();
            var ticket = await (await repo.GetAllAsync(token))
                .Include(T => T.ProjectPrivateNotes)
                .FirstOrDefaultAsync(t => t.Id == Id);
            if (ticket == null)
            {
                throw new BusinessRuleException("Project was not found", StatusCodes.Status404NotFound);
            }
            ticket.ProjectPrivateNotes.Add(new()
            {
                AppUserId = userid,
                note = note.Name,
                ProjectId = ticket.Id
            });
            await repo.SaveChangesAsync();
        }
        private async Task<Project> PrivateGetById(Guid id, CancellationToken token = default)
        {
            var ticket = await repo.GetByIdAsync(id, token);
            if (ticket == null)
            {
                throw new BusinessRuleException("Project does not exist", StatusCodes.Status404NotFound);
            }
            return ticket;
        }
        private async Task<IssueStatus?> PrivateGetStatusById(Guid id, CancellationToken token = default)
        {
            var IssueStatus = await Statuses.GetByIdAsync(id, token);

            return IssueStatus;
        }
        public async Task ChangeStatus(Guid Id, Guid StatusId, CancellationToken token = default)
        {
            var ticket = await PrivateGetById(Id);
            var status = await PrivateGetStatusById(StatusId);
            if (status == null)
            {
                throw new BusinessRuleException("status does not exist", StatusCodes.Status404NotFound);
            }

            
            throwifclosed(ticket);
            //ticket.stat.Add(new()
            //{
            //    TicketId = ticket.Id,
            //    IssueStatusId = statusId,
            //    DateTime = DateTime.Now
            //});
            ticket.CurrentStatusId = StatusId;
            await repo.UpdateAsync(ticket);
            await repo.SaveChangesAsync();
            await cache.RemoveAsync(Cache_TicketById(Id),token);
        }

        public async Task<ProjectResponse> Create(CreateProjectRequest obj, CancellationToken token = default)
        {
            if (obj.SystemId != null && !(await Systems.GetAllAsync(token)).Any(a => a.Id == obj.SystemId))
            {
                throw new BusinessRuleException("Invalid System id was sent", StatusCodes.Status400BadRequest);
            }


            var entity = await CreateProjectRequest.ToModel(obj);

            entity.IpAddress = GetIpAddress() ?? "not found";
            entity.UserId = (GetUserId());
            Guid issuestatusid = obj.CurrentStatusId ?? await getdefaultstatusissueid();
            //entity.TicketStatuses ??= new List<TicketStatusDate>();
            //entity.To ??= new List<AppUser>();
            //entity.CCs ??= new List<AppUser>();
            //entity.Attachments ??= n/ew List<string>();

            //entity.TicketStatuses.Add(new TicketStatusDate()
            //{
            //    DateTime = DateTime.Now,
            //    id = Guid.Empty,
            //    Ticket = entity,
            //    IssueStatusId = issuestatusid
            //});
            if (obj.CurrentStatusId != null && !(await Statuses.GetAllAsync(token)).Any(a => a.Id == obj.CurrentStatusId))
            {
                throw new BusinessRuleException("Invalid System id was sent", StatusCodes.Status400BadRequest);
            }
            entity.CurrentStatusId = issuestatusid;

            
            await repo.AddAsync(entity, token);
            await repo.SaveChangesAsync(token); // <-- rename if your repo uses SaveChangesAsync()

            // 5) Clear caches
            await((IRemoveCache)this).DeleteCache(token);
            var agents=await SystemAgents.Wheree(s => s.SystemId == obj.SystemId).Select(s => s.AgentId).ToListAsync(token);
            await _notificationService.SaveNotification(new()
            {
                Type=notificationType.Project,
                RedirectLink= fronturl+ $"/projectdetails/{entity.Id}",
                Text="A new project for your system has been created",
                UserId=[..agents]
            }, token);
            //await _backgroundQueue.EnqueueAsync(send)
            return ProjectResponse.FromModel(entity);
        }

        public async Task Delete(Guid id, CancellationToken token = default)
        {
            var q = await repo.GetAllAsync(token);
            var entity = await q.Include(q=>q.Tasks).FirstOrDefaultAsync(t => t.Id == id, token);

            if (entity == null)
                throw new BusinessRuleException("Project not found.", StatusCodes.Status404NotFound);

            if (entity.Tasks.Any(t => !t.IsDeleted))
            {
                throw new BusinessRuleException("Cant delete project without finishing tasks", StatusCodes.Status405MethodNotAllowed);
            }
            throwifclosed(entity);


            await repo.DeleteAsync(entity, token); // or DeleteAsync(id)
            await repo.SaveChangesAsync(token);

            await cache.RemoveAsync(Cache_TicketById(id), token);
            await cache.RemoveAsync(Cache_AllTickets, token);
        }

        public async Task DeleteCache(CancellationToken token = default)
        {
           
                await cache.RemoveAsync(Cache_AllTickets, token);
           
        }

        public async Task<PaginatedResponse<ProjectResponse>> GetAll(FilterTicketRequest FilterRequest, int page=0, CancellationToken token = default)
        {
            var q = (await repo.Where(t=>!t.IsDeleted,token)).Include(r => r.User);
            var currentuserid = GetUserId();

            var Query = q
            .AsNoTracking();
            //.Include(t => t.User)
                    //.Include(t => t.RelatedSubModuleAnswer)
            //.Include(t => t.TicketStatuses)
            //.ThenInclude(ts => ts.IssueStatus)
            //.Include(ts => ts.AssignHistories)
            //.Where(t => !t.IsDeleted);
            //if (getKPIWithdata)
            //{
            //    Query = Query
            //.Include(t => t.KPI)
            //.ThenInclude(T => T.FixedKPI);
            
            //}
            if (!User.IsInRole("ADMIN"))
            {
                //FilterRequest.GetMyOpenedTicketsOnly = true;
                throw new BusinessRuleException("Unauthorized", StatusCodes.Status403Forbidden);
            }
            //if (FilterRequest.GetMyOpenedTicketsOnly == true)
            //{
            //    Query = Query.Where(q => q.UserId == currentuserid);
            //}
            if (FilterRequest.OnlyMyTickets == true)
            {
                Query = Query.Where(t =>
                    t.UserId == currentuserid
                );
            }
            //if (FilterRequest.OnlyNonAssignedTickets == true)
            //{
            //    Query = Query.Where(q => q.AssignHistories.Count() == 0);
            //}
            if (FilterRequest.IssueStatusId != null)
            {
                Query = Query.Where(q =>
                q.CurrentStatusId == FilterRequest.IssueStatusId

                );
            }
            if (FilterRequest.SystemId != null)
            {
                Query = Query.Where(q =>
                q.SystemId == FilterRequest.SystemId

                );
            }
            ;

            var totalcount = Query.Count();
            var list = await Query.Skip(20*page).Take(20).ToListAsync(token); // materialize first



            var responseList = list.Select(s => ProjectResponse.FromModel(s)).ToList();
            PaginatedResponse<ProjectResponse> ret = new()
            {
                Data = responseList,
                FilteredCount = responseList.Count,
                Page = page,
                PageSize = 20,
                TotalRecords = totalcount
            };
            return ret;
        }

        public Task<ICollection<ProjectResponse>> GetAll(CancellationToken token = default)
        {
            throw new NotImplementedException();
        }

        public async Task<ProjectResponse> GetById(Guid id, CancellationToken token = default)
        {
            var userid = GetUserId();
            return await cache.GetOrCreateAsync(Cache_TicketById(id), async ct =>
            {
                var q = await repo.GetAllAsync(ct);

                var dto = q
                    .AsNoTracking()
                    .Include(t => t.User)
                    //.Include(t => t.TicketStatuses)

                    //.ThenInclude(sta => sta.IssueStatus)
                    .Where(t => t.Id == id && !t.IsDeleted) // adjust if no soft delete
                    .FirstOrDefault();
                    //.Select(s => ProjectResponse.FromModel(s))
                
                if (dto == null)
                    throw new BusinessRuleException("Project not found.", StatusCodes.Status404NotFound);

                await throwifnotagent(dto, userid);

                return ProjectResponse.FromModel(dto);
            }, cancellationToken: token);
        }

        //public async Task<ICollection<KPIViewDTO>> GetKPIs(Guid Id, CancellationToken token = default)
        //{
        //    var userid = GetUserId();
        //    var ticket = await(await repo.Where(t => t.Id == Id, token)).Include(T => T.KPI).ThenInclude(f => f.FixedKPI).FirstOrDefaultAsync();
        //    if (ticket == null)
        //    {
        //        throw new BusinessRuleException("Ticket was not found", StatusCodes.Status404NotFound);
        //    }
        //    return ticket.KPI.Select(t => new KPIViewDTO()
        //    {
        //        KPIId = t.Id,
        //        KPIName = t.FixedKPI.Name,
        //        //type = t.type.ToString(),
        //        ConfirmationDate=t.ConfirmationDate
        //    }).ToList();
        //}

        public async Task<ICollection<MessageResponse>> GetMessages(Guid Id,string userId, CancellationToken token = default)
        {
            var userid = userId ?? GetUserId();
            var ticket = await(await repo.GetAllAsync(token)).Include(t => t.Messages).ThenInclude(t => t.User).FirstOrDefaultAsync(t => t.Id == Id);
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }

            if ((await SystemAgents.Where(s=>s.SystemId==ticket.SystemId && userid==s.AgentId)).Count()==0)
            {
                throw new BusinessRuleException("Only authorized users can access messages for this ticket", StatusCodes.Status403Forbidden);
            }

            return ticket.Messages.OrderByDescending(t => t.Date).Take(20).Select(s=>MessageResponse.FromModel(s,userid)).OrderBy(o=>o.Date).ToList();
        }

        public async Task<ICollection<string>> GetPrivateNotes(Guid Id, CancellationToken token = default)
        {
            var userid = GetUserId();
            var ticket = await(await repo.GetAllAsync(token)).Include(T => T.ProjectPrivateNotes).FirstOrDefaultAsync(t => t.Id == Id);
            if (ticket == null)
            {
                throw new BusinessRuleException("project was not found", StatusCodes.Status404NotFound);
            }
            return ticket.ProjectPrivateNotes.Where(t => t.AppUserId == userid).Select(t => t.note).ToList();
        }

        public async Task<string> GetTicketFilePath(Guid id, string name, CancellationToken token = default)
        {
            var ticket = await(await repo.GetAllAsync(token)).Where(I => I.Id == id)
                //.Include(i => i.Replies)
                .Include(i => i.Messages)
                //.Include(t => t.AssignHistories)
                .FirstOrDefaultAsync();
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }
            if (!ticket.Attachments.Any(t => t == name) 
                //&& 
                //!ticket.Replies.SelectMany(t => t.Attachments).Any(t => t == name) 
                //&& !ticket.Replies.SelectMany(t => t.Pictures).Any(t => t == name)
                && !ticket.Messages.SelectMany(t => t.Attachments).Any(t => t == name) && !ticket.Messages.SelectMany(t => t.Pictures).Any(t => t == name))
            {
                throw new BusinessRuleException("File does not exist in that ticket", StatusCodes.Status404NotFound);
            }
            return Path.Combine(SaveImage.getdefault(), name);
        }

        //public Task<Guid> GetTicketSystemId(Guid id, CancellationToken token = default)
        //{
        //    throw new NotImplementedException();
        //}

        public async Task MarkMessagesAsSeenAsync(Guid projectId, string userId, CancellationToken token = default)
        {
            var ticket = await(await repo.Where(t=>t.Id==projectId,token)).Include(t => t.Messages).ThenInclude(m=>m.Seen).FirstOrDefaultAsync();
            if (ticket == null)
            {
                throw new BusinessRuleException("Not Found", StatusCodes.Status404NotFound);
            }
            var userid=userId ?? GetUserId();
            var user = await _userManager.FindByIdAsync(userid);
            var tobechanged = ticket.Messages.ToList();

            if(user==null)
            {
                throw new BusinessRuleException("User is not authorized or doesnt exist", StatusCodes.Status404NotFound);
            }
            foreach (var msg in tobechanged.Where(m => m.Seen.All(s => s.Id != user.Id)))
            {
                msg.Seen.Add(user);
                await ProjectMessagerepo.UpdateAsync(msg);
            }
            await repo.UpdateAsync(ticket);
            await repo.SaveChangesAsync();
        }

        public async Task<ICollection<MessangerResponse>> MyMessanger(string userId,CancellationToken token = default)
        {
            var currentUserId =userId?? GetUserId();
            if (currentUserId == null)
            {
                throw new BusinessRuleException("User not authorized", StatusCodes.Status401Unauthorized);
            }
            var systems = (await SystemAgents.Where(s => s.AgentId == currentUserId)).Select(s => s.SystemId);
            var tickets = await (await repo.GetAllAsync(token))
            .AsNoTracking()
            .Include(t => t.Messages)
            .ThenInclude(m=>m.Seen)
            //.Include(t => t.AssignHistories)
            .Where(t => t.UserId == currentUserId ||
                        (systems.Contains(t.SystemId)))
            .ToListAsync();


            var usersList = await _userManager.Users.ToListAsync();
            // Now, map the last message of each ticket
            var lastMessages = tickets
                .Where(t => t.Messages.Any()) // make sure there is at least one message
                .Select(t =>
                {
                    var lastMsg = t.Messages.OrderByDescending(m => m.Date).First(); // get last message by Date
                                                                                     // get the contacted user: for example, the other party
                    var contactedUserId = lastMsg.UserId;

                    var contactedUser = usersList.FirstOrDefault(u => u.Id == contactedUserId); // assume you have all users loaded

                    return MessangerResponse.FromModel(lastMsg, t,currentUserId);
                })
                .ToList();

            return lastMessages;
        }
        private async Task<ICollection<MessangerResponse>>  getlastmessages(string userId,CancellationToken token=default)
        {
            var currentUserId = userId ?? GetUserId();
            if (currentUserId == null)
            {
                throw new BusinessRuleException("User not authorized", StatusCodes.Status401Unauthorized);
            }
            var systems = (await SystemAgents.Where(s => s.AgentId == currentUserId)).Select(s => s.SystemId);
            var tickets = await(await repo.GetAllAsync(token))
            .AsNoTracking()
            .Include(t => t.Messages)
            .ThenInclude(m => m.Seen)
            //.Include(t => t.AssignHistories)
            .Where(t => t.UserId == currentUserId ||
                        (systems.Contains(t.SystemId)))
            .ToListAsync();


            var usersList = await _userManager.Users.ToListAsync();
            // Now, map the last message of each ticket
            var lastMessages = tickets
                .Where(t => t.Messages.Any()) // make sure there is at least one message
                .Select(t =>
                {
                    var lastMsg = t.Messages.OrderByDescending(m => m.Date).First(); // get last message by Date
                                                                                     // get the contacted user: for example, the other party
                    var contactedUserId = lastMsg.UserId;

                    var contactedUser = usersList.FirstOrDefault(u => u.Id == contactedUserId); // assume you have all users loaded

                    return MessangerResponse.FromModel(lastMsg, t, currentUserId);
                })
                .ToList();
            return lastMessages;
        }
        public async Task<int> MyCount(string userId, CancellationToken token = default)
        {
            var ret = (await getlastmessages(userId, token)).Where(m => !m.isSeen && m.UserId != userId);
            return ret.Count();
        }
        public async Task<MessageResponse> SaveMessage(Guid projectId, string userId, SendMessageRequest message, CancellationToken token = default)
        {
            var userid = userId ?? GetUserId();
            var ticket = await(await repo.GetAllAsync(token)).Include(t => t.Messages).FirstOrDefaultAsync(t => t.Id == projectId);
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }

            if ((await SystemAgents.Where(s => s.SystemId == ticket.SystemId && userid == s.AgentId)).Count() == 0)
            {
                throw new BusinessRuleException("Only authorized users can access messages for this ticket", StatusCodes.Status403Forbidden);
            }
            throwifclosed(ticket);
            
            //var pictures = message.Pictures
            //    .Select(p => SaveImage.Base64ToFormFile(p.Data, p.Name, p.ContentType))
            //    .ToList();

            //var attachments = message.Attachments
            //    .Select(a => SaveImage.Base64ToFormFile(a.Data, a.Name, a.ContentType))
            //    .ToList();

            //var voiceRecords = message.VoiceRecords
            //    .Select(v => SaveImage.Base64ToFormFile(v.Data, v.Name, v.ContentType))
            //    .ToList();
            var msg = new ProjectMessage()
            {
                UserId = userid,
                ProjectId = projectId,
                Pictures = message.Pictures.Select(p => p.Url).ToList(),
                //(await Task.WhenAll(pictures.Select(p => p.Save(new List<string>())))).ToList(),
                Attachments = message.Attachments.Select(p => p.Url).ToList(),
                VoiceRecords = message.VoiceRecords.Select(p => p.Url).ToList(),
                Text = message.Text,
                Seen=new List<AppUser>(),
                Date = DateTime.Now,
                Id = Guid.Empty,
                //User = new AppUser()
                //{
                //    UserName = GetUserName()
                //}
            };
            ticket.Messages.Add(msg);
            await repo.SaveChangesAsync();
            var user = await _userManager.FindByIdAsync(userid);
            msg.User = new()
            {
                UserName = user!.UserName,
                Picture = user!.Picture
            };
            return MessageResponse.FromModel(msg, userid);
        }

        public async Task SetIsDeleted(Guid id, CancellationToken token = default)
        {
            var q = await repo.GetAllAsync(token);
            var entity = await q.Include(t=>t.Tasks).FirstOrDefaultAsync(t => t.Id == id, token);

            if (entity == null)
                throw new BusinessRuleException("Ticket not found.", StatusCodes.Status404NotFound);

            if(entity.Tasks.Any(t=>!t.IsDeleted))
            {
                throw new BusinessRuleException("Cant delete project without finishing tasks", StatusCodes.Status405MethodNotAllowed);
            }
            entity.IsDeleted = true; // adjust if your property name differs
            await repo.SaveChangesAsync(token);

            await cache.RemoveAsync(Cache_TicketById(id), token);
            await cache.RemoveAsync(Cache_AllTickets, token);
        }

        public Task<ProjectResponse> Update(Guid id, CreateProjectRequest.UpdateProjectRequest obj, CancellationToken token = default)
        {
            throw new NotImplementedException();
        }

        Task<PaginatedResponse<ProjectResponse>> IGetAllPaginated<ProjectResponse>.GetAll(CancellationToken token)
        {
            throw new NotImplementedException();
        }

        public async Task ToggleProjectClosed(Guid projectId, CancellationToken token = default)
        {
            var prj=await PrivateGetById(projectId);
            prj.isClosed = !prj.isClosed;
            await repo.UpdateAsync(prj);
            await repo.SaveChangesAsync();
            await cache.RemoveAsync(Cache_TicketById(projectId));
            return;
        }

        public async Task AddTask(Guid id, CreateTaskRequest req, CancellationToken token)
        {
            var entity = await (await repo.Where(r => r.Id == id, token)).FirstOrDefaultAsync(token) ;
            //var entity = await q.Include(t => t.Tasks).FirstOrDefaultAsync(t => t.Id == id, token);

            if (entity == null)
                throw new BusinessRuleException("Project not found.", StatusCodes.Status404NotFound);

            throwifclosed(entity);
            var userid = GetUserId();
            if(!(await SystemAgents.AnyAsync(s=> userid==s.AgentId && s.SystemId==entity.SystemId)))
            {
                throw new BusinessRuleException("You are not a system agent.", StatusCodes.Status404NotFound);
            }
            var task =await CreateTaskRequest.ToModel(req);
            task.ResponsibleId = userid;
            task.AssignHistories = new List<TaskAssignHistory>()
            {
                new()
                {
                    UserId=req.UserId,
                    AssignDate=DateTime.Now,
                    Id=Guid.Empty
                }
            };
            task.UserId = req.UserId;

            Guid issuestatusid = await getdefaultstatusissueid();
            task.TicketStatuses ??= new List<TaskStatusDate>();
            task.TicketStatuses.Add(new TaskStatusDate()
            {
                DateTime = DateTime.Now,
                id = Guid.Empty,
                IssueStatusId = issuestatusid,
            });
            task.CurrentStatusId = issuestatusid;

            task.Id = Guid.Empty;
            entity.Tasks.Add(task);
            await repo.SaveChangesAsync(token);
            await cache.RemoveAsync(Cache_TaskByProjectId(id),token);
            await _notificationService.SaveNotification(new()
            {
                Type = notificationType.Task,
                RedirectLink = fronturl + $"/taskdetails/{task.Id}",
                Text = "A new Task in the project have been assigned to you",
                UserId = [task.UserId]
            }, token);

        }

        public async Task<ICollection<TaskResponse>> GetProjectTasks(Guid id, CancellationToken token)
        {
            return await cache.GetOrCreateAsync(Cache_TaskByProjectId(id), async ct =>
            {
                var q = await (await repo.Where(r=>r.Id==id,token)).Include(t=>t.Tasks).ThenInclude(t=>t.User).FirstOrDefaultAsync(ct);
                if(q==null)
                {
                    throw new BusinessRuleException("Project does not exist", StatusCodes.Status404NotFound);
                }
                var dto = q.Tasks
                    //.AsNoTracking()
                    //.Include(t => t.User)
                    //.Include(t => t.TicketStatuses)

                    //.ThenInclude(sta => sta.IssueStatus)
                    //.Where(t => t.Id == id && !t.IsDeleted) // adjust if no soft delete
                    .Select(s => TaskResponse.FromModel(s))
                    .ToList();

                //if (dto == null)
                //    throw new BusinessRuleException("Project not found.", StatusCodes.Status404NotFound);

                return dto;
            }, cancellationToken: token);
        }

        public async Task<ICollection<MessageResponse>> Get20More(Guid topMessageId, CancellationToken token = default)
        {
            var userId = GetUserId();

            // Get the top message to use as a cursor
            var topMessage = await ProjectMessagerepo
                .Wheree(m => m.Id == topMessageId)
                .Select(m => new { m.ProjectId, m.Date }) // only fetch what we need
                .FirstOrDefaultAsync(token);

            if (topMessage == null)
                throw new BusinessRuleException("Message was not found", StatusCodes.Status404NotFound);

            // Fetch the next 20 messages in the project older than the top message
            var nextMessages = await ProjectMessagerepo
                .Wheree(m => m.ProjectId == topMessage.ProjectId && m.Date < topMessage.Date)
                .Include(m => m.User)

                .OrderByDescending(m => m.Date)
                .Take(20)
                .OrderBy(o => o.Date)
                .ToListAsync(token);

            return nextMessages.Select(m => MessageResponse.FromModel(m, userId)).ToList();
        }
    }
}
