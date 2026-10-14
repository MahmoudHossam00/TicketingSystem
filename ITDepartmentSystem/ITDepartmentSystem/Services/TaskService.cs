using DocumentFormat.OpenXml.Office2010.Excel;
using DocumentFormat.OpenXml.Spreadsheet;
using ITDepartmentSystem.General;
//using ITDepartmentSystem.Migrations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using OfficeOpenXml.FormulaParsing.LexicalAnalysis;
using OpenTelemetry.Trace;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace ITDepartmentSystem.Services
{
    public class TaskService
        (
        IGenericRepository<ProjectTask> repo,
        IGenericRepository<ProjectTaskSubTask> ProjectTaskSubTaskrepo,
        IGenericRepository<IssueStatus> Statuses,
        IGenericRepository<IssueType> IssueTypes,
        IGenericRepository<SystemAgent> SystemsAgents,
        IGenericRepository<TaskMessage> TaskMessageRepo,
        IHttpContextAccessor httpContextAccessor,
        UserManager<AppUser> userManager,
        IConfiguration configuration,
        INotificationService _notificationService,
        IBackgroundQueue _backgroundQueue,
        //HubConnectionContext connection,
        HybridCache cache

        )
        :ITaskService
    {
        private string fronturl => configuration["FrontEnd:BaseUrl"] ?? "";

        private ClaimsPrincipal User =>
       httpContextAccessor.HttpContext?.User
       ?? throw new BusinessRuleException("Unauthorized", StatusCodes.Status401Unauthorized);

        private const string Cache_AllTasks = "tasks:all";
        private const string DefaultStatusName = "Not Assigned Yet";
        private static string Cache_NotesByTaskId(Guid id) => $"TaskNotes:{id}";
        private static string Cache_StatusesById(Guid id) => $"TaskStatusess:{id}";
        private static string Cache_HistoriesById(Guid id) => $"TaskHistories:{id}";
        private static string Cache_MessagesById(Guid id) => $"TaskMessages:{id}";
        private static string Cache_ById(Guid id) => $"Task:{id}";
        private static string Cache_TaskByProjectId(Guid id) => $"ProjectTasks:{id}";
        private static string ChatCacheKeyword = "TaskChat";
        private string GetCacheKey(Guid TaskId) => $"{ChatCacheKeyword}_{TaskId}";

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

        private void throwifclosed(ProjectTask prj)
        {
            if (prj.isClosed)
            {
                throw new BusinessRuleException("Project is closed", StatusCodes.Status405MethodNotAllowed);
            }
        }
        private async Task throwifnotAssigned(ProjectTask prj)
        {
            var userid = GetUserId();
            if (prj.UserId!=userid)
            {
                throw new BusinessRuleException("You are not a system agent.", StatusCodes.Status404NotFound);
            }

        }
        private async Task throwifnotAssignedOrAssigner(ProjectTask prj,string userId=null)
        {
            var userid = userId??GetUserId();
            if (prj.UserId!=userid && prj.ResponsibleId!=userid)
            {
                throw new BusinessRuleException("You have to be either the task creator or assigner to access the task.", StatusCodes.Status404NotFound);
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
            var ticket = await(await repo.GetAllAsync(token))
                .Include(T => T.TaskPrivateNotes)
                .FirstOrDefaultAsync(t => t.Id == Id);
            if (ticket == null)
            {
                throw new BusinessRuleException("Project was not found", StatusCodes.Status404NotFound);
            }
            ticket.TaskPrivateNotes.Add(new()
            {
                AppUserId = userid,
                note = note.Name,
                TaskId = ticket.Id
            });
            await repo.SaveChangesAsync(token);
            await cache.RemoveAsync(Cache_NotesByTaskId(Id), token);
        }

        public async Task<ICollection<string>> GetPrivateNotes(Guid Id, CancellationToken token = default)
        {
            return await cache.GetOrCreateAsync(Cache_NotesByTaskId(Id), async ct =>
            {
                var q = await repo.FirstOrDefaultWithIncludes(I=>I.Id==Id,ct,i=>i.TaskPrivateNotes);

                //var list = await q
                //.AsNoTracking()

                //.Include(t => t.User)
                //    //.Include(t => t.TicketStatuses)
                //    //.ThenInclude(ts => ts.IssueStatus)
                //    .Include(t => t.RelatedSubModuleAnswer)
                //.Where(t => !t.IsDeleted)
                //.ToListAsync(ct); // materialize first
                if(q==null)
                {
                    throw new BusinessRuleException("Task does not exist", StatusCodes.Status404NotFound);
                }
                var responseList = q.TaskPrivateNotes.Select(s =>s.note).ToList();

                return responseList;
            }, cancellationToken: token);

        }

        public async Task ChangeStatus(Guid Id, Guid StatusId, CancellationToken token = default)
        {
            var userid = GetUserId();
            var ticket = await repo.FirstOrDefaultWithIncludes(I => I.Id == Id, token, i => i.TicketStatuses);

            if (ticket == null)
            {
                throw new BusinessRuleException("Project was not found", StatusCodes.Status404NotFound);
            }
            if(!(await Statuses.AnyAsync(a=>a.Id== StatusId)))
            {
                throw new BusinessRuleException("Status was not found", StatusCodes.Status404NotFound);
            }
            await throwifnotAssignedOrAssigner(ticket);
            ticket.TicketStatuses.Add(new()
            {
                DateTime=DateTime.Now,
                IssueStatusId= StatusId,
                id=Guid.Empty 
            });
            ticket.CurrentStatusId= StatusId;
            await repo.SaveChangesAsync(token);
            await cache.RemoveAsync(Cache_StatusesById(Id), token);
        }
        public async Task<ICollection<IssueStatusHistoryResponse>> GetStatuses(Guid Id, CancellationToken token = default)
        {
            return await cache.GetOrCreateAsync(Cache_StatusesById(Id), async ct =>
            {
                var q = await repo.FirstOrDefaultWithIncludes(I => I.Id == Id, 
                    query=>query.Include(q=>q.TicketStatuses).ThenInclude(s=>s.IssueStatus)
                    ,ct
                    );

                //var list = await q
                //.AsNoTracking()

                //.Include(t => t.User)
                //    //.Include(t => t.TicketStatuses)
                //    //.ThenInclude(ts => ts.IssueStatus)
                //    .Include(t => t.RelatedSubModuleAnswer)
                //.Where(t => !t.IsDeleted)
                //.ToListAsync(ct); // materialize first
                if (q == null)
                {
                    throw new BusinessRuleException("Task does not exist", StatusCodes.Status404NotFound);
                }
                var responseList = q.TicketStatuses.Select(IssueStatusHistoryResponse.FromModel).ToList();

                return responseList;
            }, cancellationToken: token);
        }
        public async Task Delete(Guid id, CancellationToken token = default)
        {
            //var q = await repo.GetAllAsync(token);
            var entity = (await repo.FirstOrDefaultWithIncludes(t => t.Id == id &&!t.IsDeleted &&!t.isClosed, token));

            if (entity == null)
                throw new BusinessRuleException("Task not found.", StatusCodes.Status404NotFound);

            await repo.DeleteAsync(entity, token); // or DeleteAsync(id)
            await repo.SaveChangesAsync(token);

            await cache.RemoveAsync(Cache_ById(id), token);
            await cache.RemoveAsync(Cache_AllTasks, token);
            await cache.RemoveAsync(Cache_TaskByProjectId(entity.ProjectId), token);
        }

        public async Task<PaginatedResponse<ProjectTaskSubTaskRespone>> GetKPIs(FilterTicketTaskRequest req, CancellationToken token = default)
        {
            var userid = GetUserId();
            var query = await ProjectTaskSubTaskrepo.GetAllAsync(token);
                        if (!User.IsInRole("MASTER") )
            {
                var systems = await SystemsAgents.Wheree(s => s.AgentId == userid).Select(s => s.SystemId).ToListAsync(token);
                if (req.systemIds != null)
                {
                    systems = systems.Intersect(req.systemIds).ToList();
                }
                query = query.Where(t => systems.Contains(t.ProjectTask.Project.SystemId));
            }
            else
            {
                //var systems = await SystemAgents.Wheree(s => s.AgentId == userid).Select(s => s.SystemId).ToListAsync(token);
                if (req.systemIds != null)
                {
                    //systems = systems.Intersect(req.systemIds).ToList();
                    query = query.Where(t => req.systemIds.Contains(t.ProjectTask.Project.SystemId));
                }
            }
            if(req.userIds!=null)
            {
                query = query.Where(t => req.userIds.Contains(t.UserId));
            }
            if (req.hasKpi.HasValue)
            {
                query = req.hasKpi.Value
                    ? query.Where(t => t.KPI != null)   // has KPI
                    : query.Where(t => t.KPI == null);  // no KPI
            }
            var initialcount = await query.CountAsync(token);
            var data = await query.Include(t => t.KPI).ThenInclude(t => t.FixedKPI).Skip((req.page-1) * 50).Take(50).Select(
                t=> ProjectTaskSubTaskRespone.ToModel(t,true)
                ).ToListAsync(token);
            PaginatedResponse<ProjectTaskSubTaskRespone> ret = new PaginatedResponse<ProjectTaskSubTaskRespone>()
            {
                Data = data,
                Page = req.page,
                TotalRecords = initialcount,
                PageSize = 50,
                FilteredCount = data.Count()
            };
            return ret;
        }
        public async Task DeleteCache(CancellationToken token = default)
        {
            await cache.RemoveAsync(Cache_AllTasks, token);
        }

        public async Task<ICollection<AssignHistoryResponse>> GetAssignHistory(Guid Id, CancellationToken token = default)
        {
            return await cache.GetOrCreateAsync(Cache_HistoriesById(Id), async ct =>
            {
                var q = await repo.FirstOrDefaultWithIncludes(I => I.Id == Id,
                    query => query.Include(q => q.AssignHistories).ThenInclude(h=>h.User)
                    , ct
                    );

                if (q == null)
                {
                    throw new BusinessRuleException("Task does not exist", StatusCodes.Status404NotFound);
                }
                var responseList = q.AssignHistories.Select(AssignHistoryResponse.FromModel).ToList();

                return responseList;
            }, cancellationToken: token);
        }

        public async Task Reassign(Guid Id, string AgentId, CancellationToken token = default)
        {
            var userid = GetUserId();
            var ticket = await repo.FirstOrDefaultWithIncludes(I => I.Id == Id, token,
                i => i.AssignHistories,

                i=>i.Project
                
                );

            if (ticket == null)
            {
                throw new BusinessRuleException("Project was not found", StatusCodes.Status404NotFound);
            }
            
            if ((await SystemsAgents.AnyAsync(s=>s.Id==ticket.Project.SystemId && s.AgentId==AgentId)))
            {
                throw new BusinessRuleException("User is not agent in the project's system", StatusCodes.Status405MethodNotAllowed);
            }
            await throwifnotAssignedOrAssigner(ticket);

            ticket.AssignHistories.Add(new()
            {
                AssignDate = DateTime.Now,
                
                UserId = AgentId,
                
                Id = Guid.Empty
            });
            ticket.UserId = AgentId;
            await repo.SaveChangesAsync(token);
            await cache.RemoveAsync(Cache_HistoriesById(Id), token);
            await cache.RemoveAsync(GetCacheKey(Id), token);
            await cache.RemoveAsync(Cache_ById(Id), token);
            await _notificationService.SaveNotification(new()
            {
                Type = notificationType.Task,
                RedirectLink = fronturl + $"/taskdetails/{ticket.Id}",
                Text = "A new Task in the project have been assigned to you",
                UserId = [ticket.UserId]
            }, token);
            var user = await userManager.FindByIdAsync(AgentId);
            if(user!=null && user.Email!=null)
            {
                var sendemailjob = new SendEmailJob()
                {
                    HtmlBody = $"A task has been assigned to you on the following link {fronturl + $"/taskdetails/{ticket.Id}"}",
                    Subject = "New User",
                    ToEmail = user.Email,
                    ToName = user.UserName??"RANDOMUSERNAME"
                };
                await _backgroundQueue.EnqueueAsync(sendemailjob);
            }
        }

        public async Task<TaskResponse> GetById(Guid id, CancellationToken token = default)
        {
            return await cache.GetOrCreateAsync(Cache_ById(id), async ct =>
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

                //await throwifnotagent(dto);

                return TaskResponse.FromModel(dto);
            }, cancellationToken: token);
        }

        public async Task<ICollection<MessageResponse>> GetMessages(Guid Id,string userId, CancellationToken token = default)
        {
            var userid =userId?? GetUserId();
            var ticket = await(await repo.GetAllAsync(token)).Include(t => t.Messages).ThenInclude(t => t.User).FirstOrDefaultAsync(t => t.Id == Id);
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }
            await throwifnotAssignedOrAssigner(ticket, userid);
            //if ((await SystemAgents.Where(s => s.SystemId == ticket.SystemId && userid == s.AgentId)).Count() == 0)
            //{
            //    throw new BusinessRuleException("Only authorized users can access messages for this ticket", StatusCodes.Status403Forbidden);
            //}

            return ticket.Messages.OrderByDescending(t => t.Date).Take(20).Select(MessageResponse.FromModel).OrderBy(o => o.Date).ToList();
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
                &&
                !ticket.AssignedAttachments.Any(t => t == name)
                //&& 
                //!ticket.Replies.SelectMany(t => t.Attachments).Any(t => t == name) 
                //&& !ticket.Replies.SelectMany(t => t.Pictures).Any(t => t == name)
                && !ticket.Messages.SelectMany(t => t.Attachments).Any(t => t == name) && !ticket.Messages.SelectMany(t => t.Pictures).Any(t => t == name))
            {
                throw new BusinessRuleException("File does not exist in that ticket", StatusCodes.Status404NotFound);
            }
            return Path.Combine(SaveImage.getdefault(), name);
        }

        public async Task MarkMessagesAsSeenAsync(Guid ticketId, string userId, CancellationToken token = default)
        {
            var ticket = await repo.FirstOrDefaultWithIncludes(t=>t.Id==ticketId,token,i=>i.Messages);
            if (ticket == null)
            {
                throw new BusinessRuleException("Not Found", StatusCodes.Status404NotFound);
            }
            var tobechanged = ticket.Messages.Where(T => T.UserId != userId).ToList();
            foreach (var msg in tobechanged)
            {
                msg.isSeen = true;
            }
            await repo.SaveChangesAsync();
        }

        public async Task<ICollection<MessangerResponse>> MyMessanger(string userId,CancellationToken token = default)
        {
            var currentUserId = userId?? GetUserId();
            if (currentUserId == null)
            {
                throw new BusinessRuleException("User not authorized", StatusCodes.Status401Unauthorized);
            }

            var tickets = 
                
                await(await repo.GetAllAsync(token))
            .AsNoTracking()
            .Include(t => t.Messages)
            .Include(t => t.AssignHistories)
            .Where(t => t.UserId == currentUserId ||
                        (t.ResponsibleId == currentUserId))
            .ToListAsync();


            var usersList = await userManager.Users.ToListAsync();
            // Now, map the last message of each ticket
            var lastMessages = tickets
                .Where(t => t.Messages.Any()) // make sure there is at least one message
                .Select(t =>
                {
                    var lastMsg = t.Messages.OrderByDescending(m => m.Date).First(); // get last message by Date
                                                                                     // get the contacted user: for example, the other party
                    var contactedUserId = t.UserId == currentUserId ?
                                          (t.CreatedBy)
                                          : t.UserId;

                    var contactedUser = usersList.FirstOrDefault(u => u.Id == contactedUserId); // assume you have all users loaded

                    return MessangerResponse.FromModel(lastMsg, contactedUser);
                })
                .ToList();

            return lastMessages;
        }
        private async Task<List<MessangerResponse>> getlastmessages(string userId,CancellationToken token=default)
        {
            var currentUserId = userId ?? GetUserId();
            if (currentUserId == null)
            {
                throw new BusinessRuleException("User not authorized", StatusCodes.Status401Unauthorized);
            }

            var tickets =

                await(await repo.GetAllAsync(token))
            .AsNoTracking()
            .Include(t => t.Messages)
            .Include(t => t.AssignHistories)
            .Where(t => t.UserId == currentUserId ||
                        (t.ResponsibleId == currentUserId))
            .ToListAsync();


            var usersList = await userManager.Users.ToListAsync();
            // Now, map the last message of each ticket
            var lastMessages = tickets
                .Where(t => t.Messages.Any()) // make sure there is at least one message
                .Select(t =>
                {
                    var lastMsg = t.Messages.OrderByDescending(m => m.Date).First(); // get last message by Date
                                                                                     // get the contacted user: for example, the other party
                    var contactedUserId = t.UserId == currentUserId ?
                                          (t.CreatedBy)
                                          : t.UserId;

                    var contactedUser = usersList.FirstOrDefault(u => u.Id == contactedUserId); // assume you have all users loaded

                    return MessangerResponse.FromModel(lastMsg, contactedUser);
                })
                .ToList();
            return lastMessages;
        }

        public async Task<int> MyCount(string userId, CancellationToken token = default)
        {
           var ret= (await getlastmessages(userId, token)).Where(m=>!m.isSeen && m.UserId!=userId) ;
            return ret.Count();
        }




        public async Task<MessageResponse> SaveMessage(Guid ticketId, string userId, SendMessageRequest message, CancellationToken token = default)
        {
            var userid = userId ?? GetUserId();
            var ticket = await(await repo.GetAllAsync(token)).Include(t => t.Messages).FirstOrDefaultAsync(t => t.Id == ticketId);
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }
            await throwifnotAssignedOrAssigner(ticket,userid);
            //var pictures = message.Pictures
            //    .Select(p => SaveImage.Base64ToFormFile(p.Data, p.Name, p.ContentType))
            //    .ToList();

            //var attachments = message.Attachments
            //    .Select(a => SaveImage.Base64ToFormFile(a.Data, a.Name, a.ContentType))
            //    .ToList();

            //var voiceRecords = message.VoiceRecords
            //    .Select(v => SaveImage.Base64ToFormFile(v.Data, v.Name, v.ContentType))
            //    .ToList();
            var msg = new TaskMessage()
            {
                UserId = userid,
                TaskId = ticketId,
                Pictures = message.Pictures.Select(p => p.Url).ToList(),
                //(await Task.WhenAll(pictures.Select(p => p.Save(new List<string>())))).ToList(),
                Attachments = message.Attachments.Select(p => p.Url).ToList(),
                VoiceRecords = message.VoiceRecords.Select(p => p.Url).ToList(),
                Text = message.Text,
                isSeen = false,
                Date = DateTime.Now,
                Id = Guid.Empty,
                //User = new AppUser()
                //{
                //    UserName = GetUserName()
                //}
            };
            ticket.Messages.Add(msg);
            await repo.SaveChangesAsync();
            var user = await userManager.FindByIdAsync(userid);
            msg.User = new()
            {
                UserName = user!.UserName,
                Picture = user!.Picture
            };
            return MessageResponse.FromModel(msg);
        }

        public async Task SetIsDeleted(Guid id, CancellationToken token = default)
        {
            var q = await repo.GetAllAsync(token);
            var entity = await q.FirstOrDefaultAsync(t => t.Id == id, token);

            if (entity == null)
                throw new BusinessRuleException("Ticket not found.", StatusCodes.Status404NotFound);

            //if (entity.Tasks.Any(t => !t.IsDeleted))
            //{
            //    throw new BusinessRuleException("Cant delete project without finishing tasks", StatusCodes.Status405MethodNotAllowed);
            //}
            entity.IsDeleted = true; // adjust if your property name differs
            await repo.SaveChangesAsync(token);

            await cache.RemoveAsync(Cache_ById(id), token);
            await cache.RemoveAsync(Cache_TaskByProjectId(entity.ProjectId), token);
        }

        public Task<TaskResponse> Update(Guid id, UpdateTaskRequest obj, CancellationToken token = default)
        {
            throw new NotImplementedException();
        }

        public async Task UploadAssignedAttachments(Guid TaskId, List<IFormFile> files, CancellationToken token = default)
        {
            var ticket=await repo.FirstOrDefaultWithIncludes(t => t.Id == TaskId, token);
            if(ticket==null)
            {
                throw new BusinessRuleException("Task was not found", StatusCodes.Status404NotFound);
            }
            if(ticket.Attachments==null)
            {
                ticket.Attachments = new();
            }
            await throwifnotAssignedOrAssigner(ticket);
            var savedFiles = await Task.WhenAll(
                    files.Select(f => f.Save(new List<string>()))
                );
            ticket.AssignedAttachments.AddRange(savedFiles);
            await repo.UpdateAsync(ticket);
            await repo.SaveChangesAsync();
            await cache.RemoveAsync(Cache_ById(TaskId), token);

        }

        public async Task<PaginatedResponse<TaskResponse>> GetAllFiltered(FilterTaskRequest req,bool getKPIWithdata=false, CancellationToken token=default)
        {
            // Cache the list (optional pattern)
            //return await cache.GetOrCreateAsync(Cache_AllTickets, async ct =>
            //{
            var q = await repo.GetAllAsync(token);
            var currentuserid = GetUserId();

            var Query = q
            .AsNoTracking()
            .Include(t => t.User)
            .Include(t => t.Project)
            .Where(t => !t.IsDeleted);
            //if (getKPIWithdata)
            //{
            //    Query = Query
            //.Include(t => t.kpi)
            //.ThenInclude(T => T.FixedKPI);

            //}
            if (!User.IsInRole("ADMIN"))
            {
                throw new BusinessRuleException("Not Authorized", StatusCodes.Status403Forbidden);
            }
            if (req.OnlyAssignedTasks == true)
            {
                Query = Query.Where(q => q.UserId == currentuserid);
            }
            if (req.OnlyResponsibleTasks == true)
            {
                Query = Query.Where(q => q.ResponsibleId == currentuserid);
            }
            
            if (req.IssueStatusId != null)
            {
                Query = Query.Where(q => q.CurrentStatusId== req.IssueStatusId);
            }
            if (req.SystemId != null)
            {
                Query = Query.Where(t => t.Project.SystemId == req.SystemId);
            }

            var list = await Query.Skip((req.pagenum-1)*50).Take(50).ToListAsync(token); // materialize first



            var responseList = list.Select(k=>TaskResponse.FromModel(k));

            PaginatedResponse<TaskResponse> pageddata = new PaginatedResponse<TaskResponse>()
            {
                Data = responseList.ToList(),
                Page = req.pagenum,
                FilteredCount = responseList.Count(),
                PageSize = 50,
                TotalRecords = Query.Count()
            };

            return pageddata;
        }

        public async Task<ICollection<MessageResponse>> Get20More(Guid topMessageId, CancellationToken token = default)
        {
            var userId = GetUserId();

            // Get the top message to use as a cursor
            var topMessage = await TaskMessageRepo
                .Wheree(m => m.Id == topMessageId)

                .Select(m => new { m.TaskId, m.Date }) // only fetch what we need
                .FirstOrDefaultAsync(token);

            if (topMessage == null)
                throw new BusinessRuleException("Message was not found", StatusCodes.Status404NotFound);

            // Fetch the next 20 messages in the project older than the top message
            var nextMessages = await TaskMessageRepo
                .Wheree(m => m.TaskId == topMessage.TaskId && m.Date < topMessage.Date)
                                .Include(m => m.User)

                .OrderByDescending(m => m.Date)
                .Take(20)
                .OrderBy(o => o.Date)

                .ToListAsync(token);

            return nextMessages.Select(m => MessageResponse.FromModel(m)).ToList();
        }

        //public async Task<ICollection<KPIViewDTO>> GetKPIs(Guid Id, CancellationToken token = default)
        //{
        //    var userid = GetUserId();
        //    var ticket = await (await repo.Where(t => t.Id == Id, token))
        //        .Include(T => T.KPIs).ThenInclude(f => f.FixedKPI).FirstOrDefaultAsync();
        //    if (ticket == null)
        //    {
        //        throw new BusinessRuleException("Ticket was not found", StatusCodes.Status404NotFound);
        //    }
        //    return ticket.KPIs.Select(t => new KPIViewDTO()
        //    {
        //        KPIId = t.Id,
        //        KPIName = t.FixedKPI.Name,
        //        ConfirmationDate=t.conf
        //    }).ToList();
        //}

        public async Task AddTicketTasks(Guid TicketId, CreateTicketTaskRequest changeModuleDTO, CancellationToken token)
        {
            var userid = GetUserId();
            var Task = await repo.FirstOrDefaultWithIncludes(T => T.Id == TicketId, t => t.Include(t => t.AccomplishedTasks).Include(t=>t.Project), token);
            if (Task == null)
            {
                throw new BusinessRuleException(" Task does not exist", StatusCodes.Status404NotFound);
            }
            //var sysid = await GetTicketSystemId(TicketId, token);
            if (!(await SystemsAgents.AnyAsync(s => s.SystemId == Task.Project.SystemId && userid == s.AgentId)))
            {
                throw new BusinessRuleException(" ur not agent in the ticket's system to add tasks", StatusCodes.Status403Forbidden);
            }
            if(Task.UserId != userid)
            {
                throw new BusinessRuleException("Only assigned user can add tasks", StatusCodes.Status403Forbidden);
            }
            var ticket = await repo.FirstOrDefaultWithIncludes(T => T.Id == TicketId, t => t.Include(t => t.AccomplishedTasks), token);
            if (ticket == null)
            {
                throw new BusinessRuleException(" Ticket does not exist", StatusCodes.Status404NotFound);
            }
            ticket.AccomplishedTasks.Add(new()
            {
                Id = Guid.Empty,
                Date = changeModuleDTO.Date,
                Description = changeModuleDTO.Description,
                UserId = userid
            });
            await repo.SaveChangesAsync(token);

        }

        public async Task<List<ProjectTaskSubTaskRespone>> MyTicketTasks(Guid TicketId, CancellationToken token)
        {
            var userid = GetUserId();

            var ticket = await repo.FirstOrDefaultWithIncludes(T => T.Id == TicketId
            , t => t.Include(t => t.AccomplishedTasks).ThenInclude(t=>t.KPI).ThenInclude(t=>t.FixedKPI), token);
            if (ticket == null)
            {
                throw new BusinessRuleException(" Ticket does not exist", StatusCodes.Status404NotFound);
            }
          
            return ticket.AccomplishedTasks.Where(t => t.UserId == userid).Select(t=>ProjectTaskSubTaskRespone.ToModel(t,true)).ToList();
        }
    }
}
