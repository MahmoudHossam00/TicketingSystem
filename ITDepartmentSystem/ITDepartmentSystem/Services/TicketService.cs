using DocumentFormat.OpenXml.InkML;
using DocumentFormat.OpenXml.Office2010.Excel;
using DocumentFormat.OpenXml.Spreadsheet;
using ITDepartmentSystem.General;
//using ITDepartmentSystem.Migrations;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Hybrid;
using OpenTelemetry.Trace;
using System.ComponentModel.DataAnnotations.Schema;
using System.IdentityModel.Tokens.Jwt;
using System.Reflection.Metadata.Ecma335;
using System.Security.Claims;
using static Microsoft.IO.RecyclableMemoryStreamManager;

namespace ITDepartmentSystem.Services
{
    public class TicketService
        (
        IGenericRepository<Ticket> repo,
        IGenericRepository<TicketTask> TicketTaskrepo,
        //IGenericRepository<Company> repo,
        //IGenericRepository<Ticket> repo,
        //IGenericRepository<Ticket> repo,
        IGenericRepository<RelatedSubModule> Modules,
        IGenericRepository<Message> MessageRepo,
        ISubModuleService subModuleService,
        IGenericRepository<Question> Questions,
        IGenericRepository<IssueStatus> Statuses,
        IGenericRepository<Reply> Replies,
        IGenericRepository<SystemAgent> SystemAgents,
        IGenericRepository<IssueType> IssueTypes,
        IGenericRepository<Company> Companies,
        IHttpContextAccessor httpContextAccessor,
        INotificationService _notificationService,
        IBackgroundQueue _backgroundQueue,
        IConfiguration configuration,
         UserManager<AppUser> userManager,
        HybridCache cache
        
        )
        : ITicketService
    {
        private readonly UserManager<AppUser> _userManager = userManager;

        private ClaimsPrincipal User =>
        httpContextAccessor.HttpContext?.User
        ?? throw new BusinessRuleException("Unauthorized", StatusCodes.Status401Unauthorized);
        private const string Cache_AllTickets = "tickets:all";
        private const string DefaultStatusName = "Not Assigned Yet";
        private static string Cache_TicketById(Guid id) => $"tickets:{id}";

        private string fronturl => configuration["FrontEnd:BaseUrl"] ?? "";

        private string GetCacheChatKey(Guid ticketId) => $"TicketChat_{ticketId}";

        async Task<TicketResponse> ICreate<CreateTicketRequest, TicketResponse>.Create(
            CreateTicketRequest obj, CancellationToken token)
        {
            if(!(await Modules.GetAllAsync(token)).Any(a=>a.Id==obj.RelatedSubModuleAnswer.RelatedSubModuleId))
            {
              throw new BusinessRuleException("Invalid module id was sent", StatusCodes.Status400BadRequest);
            }
            var questionids =
                obj.RelatedSubModuleAnswer.multipleChoiceAnswers.Select(a => a.QuestionId)
                .Concat(obj.RelatedSubModuleAnswer.textAnswers.Select(a => a.QuestionId))
                .Concat(obj.RelatedSubModuleAnswer.singleChoiceAnswers.Select(a => a.QuestionId))
                .Concat(obj.RelatedSubModuleAnswer.dateAnswers.Select(a => a.QuestionId));
            var allquestionids = (await Questions.GetAllAsync(token)).Select(a => a.Id);
            if (questionids.Any(id=> !allquestionids.Contains(id)))
            {
              throw new BusinessRuleException("One of questions does not exist", StatusCodes.Status400BadRequest);
            }





            
            var entity = await CreateTicketRequest.ToModel(obj);

            entity.IpAddress = GetIpAddress()??"not found";
            entity.UserId = (GetUserId());
            entity.To ??= new List<AppUser>();
            entity.CCs ??= new List<AppUser>();
            entity.Attachments ??= new List<string>();

            Guid issuestatusid=await getdefaultstatusissueid();
            entity.TicketStatuses ??= new List<TicketStatusDate>();
            entity.TicketStatuses.Add(new TicketStatusDate()
            {
                DateTime =DateTime.Now,
                id=Guid.Empty,
                Ticket=entity,
                IssueStatusId = issuestatusid
            });
            entity.CurrentStatusId = issuestatusid;
            if(User.IsInRole("ADMIN")&& (obj.EmployeeId !=null))
            {

                if(obj.userId != null)
                {
                    entity.UserId = obj.userId;
                }
                else if(obj.EmployeeId != null)
                {
                    var emp = await _userManager.Users.Where(U => U.EmployeeNumber == obj.EmployeeId).FirstOrDefaultAsync(token);
                    if(emp==null)
                    {
                        throw new BusinessRuleException("Emp doesnt exist", StatusCodes.Status404NotFound);
                    }
                    entity.UserId = emp.Id;
                }
                    entity.IpAddress = "Created By Agent";
            }
            foreach(var To in obj.To)
            {
                Console.WriteLine(To.ToString());
                if(_userManager == null)
                {

                }
                var user = await _userManager.FindByIdAsync(To.ToString());
                if(user==null)
                {
                    throw new BusinessRuleException($"User with id {To} does not exist", StatusCodes.Status404NotFound);
                }
                entity.To.Add(user);
            }
            foreach(var To in obj.CCs)
            {
                var user = await _userManager.FindByIdAsync(To.ToString());
                if(user==null)
                {
                    throw new BusinessRuleException($"User with id {To} does not exist", StatusCodes.Status404NotFound);
                }
                entity.CCs.Add(user);
            }
            //foreach(var att in obj.Attachments)
            //{
            //    entity.Attachments.Add(await att.Save(new List<string>()));
            //}
            //var CCs = users.FindByIdAsync(obj.CCs);
            if (!obj.NotifyUser.HasValue || obj.NotifyUser.Value == true || !User.IsInRole("ADMIN"))
            {
                entity.NotifyUser = true;
            }
            else 
            {
                entity.NotifyUser = false;
            }
            //entity.To=obj.To
            await repo.AddAsync(entity, token);
            await repo.SaveChangesAsync(token); // <-- rename if your repo uses SaveChangesAsync()

            // 5) Clear caches
            await ((IRemoveCache)this).DeleteCache(token);

            var sysid = await GetTicketSystemId(entity.Id, token);
            var agents = await SystemAgents.Wheree(s => s.SystemId == sysid).Select(s => s.AgentId).ToListAsync(token);
            if(!obj.NotifyUser.HasValue || obj.NotifyUser.Value==true)
            {

            await _notificationService.SaveNotification(new()
            {
                Type = notificationType.Ticket,
                RedirectLink = fronturl + $"/ticketdetails/{entity.Id}",
                Text = "A new Ticket has been opened for a system u are assigned to",
                UserId = [.. agents]
            }, token);
            await _notificationService.SaveNotification(new()
            {
                Type = notificationType.Ticket,
                RedirectLink = fronturl + $"/ticketdetails/{entity.Id}",
                Text = "You have been mentioned in a ticket",
                UserId = obj.CCs.Select(o => o.ToString()).Union(obj.To.Select(o => o.ToString())).ToList()
            }, token);
            var TOs = await _userManager.Users.Where(u => obj.To.Select(t => t.ToString()).Contains(u.Id)).Select(u => u.Email).ToListAsync();
            var CCs = await _userManager.Users.Where(u => obj.CCs.Select(t => t.ToString()).Contains(u.Id)).Select(u => u.Email??"").ToListAsync();
            if(TOs.Any(t=>t!=null))
            {
            var sendemailjob = new SendEmailJob()
            {
                HtmlBody = $"A Ticket has been created that you have been mentioned at in the following link {fronturl + $"/ticketdetails/{entity.Id}"}",
                Subject = "Ticket Created",
                ToEmail = TOs.FirstOrDefault()??"",
                To=TOs !,
                CC=CCs,
                
                ToName = "CreationTicket"
            };

            await _backgroundQueue.EnqueueAsync(sendemailjob);
            }
          
            }
            return TicketResponse.FromModel(entity);
        }
        private async Task<Guid> getdefaultstatusissueid()
        {
            var status=await (await Statuses.GetAllAsync()).FirstOrDefaultAsync(a => a.StatusName == "Not Assigned Yet");
            if(status==null)
            {
                throw new BusinessRuleException("Default status Not found",StatusCodes.Status404NotFound);
            }
            return status.Id;
        }


        public async Task<PaginatedResponse<TicketTaskRespone>> GetKPIs(FilterTicketTaskRequest req, CancellationToken token = default)
        {
            var userid = GetUserId();
            var query = (await TicketTaskrepo.GetAllAsync(token));
            if (!User.IsInRole("MASTER") )
            {
                var systems = await SystemAgents.Wheree(s => s.AgentId == userid).Select(s => s.SystemId).ToListAsync(token);
                if (req.systemIds != null)
                {
                    systems = systems.Intersect(req.systemIds).ToList();
                }
                query = query.Where(t => systems.Contains(t.Ticket.RelatedSubModuleAnswer.RelatedSubModule.Module.SystemId));
            }
            else
            {
                //var systems = await SystemAgents.Wheree(s => s.AgentId == userid).Select(s => s.SystemId).ToListAsync(token);
                if (req.systemIds != null)
                {
                    //systems = systems.Intersect(req.systemIds).ToList();
                    query = query.Where(t => req.systemIds.Contains(t.Ticket.RelatedSubModuleAnswer.RelatedSubModule.Module.SystemId));
                }
            }
            if (req.userIds != null)
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
            var data = await query.Include(t => t.KPI).ThenInclude(t => t.FixedKPI).Skip((req.page - 1) * 50).Take(50).Select(
                t => TicketTaskRespone.ToModel(t, true)
                ).ToListAsync(token);
            PaginatedResponse<TicketTaskRespone> ret = new PaginatedResponse<TicketTaskRespone>()
            {
                Data = data,
                Page = req.page,
                TotalRecords = initialcount,
                PageSize = 50,
                FilteredCount = data.Count()
            };
            return ret;
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

        async Task<ICollection<TicketResponse>> IGetAll<TicketResponse>.GetAll(CancellationToken token)
        {
            // Cache the list (optional pattern)
            return await cache.GetOrCreateAsync(Cache_AllTickets, async ct =>
            {
                var q = await repo.GetAllAsync(ct);

                var list = await q
                .AsNoTracking()

                .Include(t => t.User)
                //.Include(t => t.TicketStatuses)
                    //.ThenInclude(ts => ts.IssueStatus)
                    .Include(t=>t.RelatedSubModuleAnswer)
                .Where(t => !t.IsDeleted)
                .ToListAsync(ct); // materialize first

                var responseList = list.Select(s => TicketResponse.FromModel(s,false)).ToList();

                return responseList;
            }, cancellationToken: token);
        }
        public async Task<ICollection<TicketResponse>> GetAll(FilterTicketRequest FilterRequest, bool getKPIWithdata = false, CancellationToken token=default)
        {
            // Cache the list (optional pattern)
            //return await cache.GetOrCreateAsync(Cache_AllTickets, async ct =>
            //{
                var q = await repo.GetAllAsync(token);
                var currentuserid = GetUserId();

            var Query = q
            .AsNoTracking()
            .Include(t => t.User)
                    .Include(t => t.RelatedSubModuleAnswer)
            //.Include(t => t.TicketStatuses)
            //.ThenInclude(ts => ts.IssueStatus)
            //.Include(ts => ts.AssignHistories)
            .Where(t => !t.IsDeleted) ;
            if(getKPIWithdata)
            {
                Query = Query
            .Include(t => t.KPI)
            .ThenInclude(T => T.FixedKPI);

            }
            if (!User.IsInRole("ADMIN"))
            {
                FilterRequest.GetMyOpenedTicketsOnly = true;
            }
            if(FilterRequest.GetMyOpenedTicketsOnly == true)
            {
                Query = Query.Where(q => q.UserId == currentuserid);
            }
            if(FilterRequest.OnlyMyTickets == true)
            {
                Query = Query.Where(t => 
                    t.CurrentAssignedId==currentuserid
                );
            }
            if(FilterRequest.OnlyNonAssignedTickets == true)
            {
                Query = Query.Where(q => q.AssignHistories.Count() == 0);
            }
            if(FilterRequest.IssueStatusId !=null)
            {
                Query = Query.Where(q =>
                q.CurrentStatusId== FilterRequest.IssueStatusId
                );
            }
            if (FilterRequest.SystemId != null)
            {
                Query = Query.Where(q =>
                q.RelatedSubModuleAnswer.RelatedSubModule.Module.SystemId== FilterRequest.SystemId

                );
            };

                
                var list = await Query.ToListAsync(token); // materialize first



                var responseList = list.Select(s=>TicketResponse.FromModel(s, getKPIWithdata)).ToList();

                return responseList;
            //}, cancellationToken: token);
        }

        async Task<TicketResponse> IGetById<TicketResponse, Guid>.GetById(Guid id, CancellationToken token)
        {
            return await cache.GetOrCreateAsync(Cache_TicketById(id), async ct =>
            {
                var q = await repo.GetAllAsync(ct);

                var dto = q
                    .AsNoTracking()
                    .Include(t => t.User)
                    .Include(t=> t.OriginalReply)
                    //.ThenInclude(t=> t.Ticket)
                    //.Include(t => t.TicketStatuses)

                    //.ThenInclude(sta => sta.IssueStatus)
                    .Where(t => t.Id == id && !t.IsDeleted) // adjust if no soft delete
                    .Select(s => TicketResponse.FromModel(s, false))
                    .FirstOrDefault();

                if (dto == null)
                    throw new BusinessRuleException("Ticket not found.", StatusCodes.Status404NotFound);

                return dto;
            }, cancellationToken: token);
        }

        async Task IDelete<Guid>.Delete(Guid id, CancellationToken token)
        {
            var q = await repo.GetAllAsync(token);
            var entity = await q.FirstOrDefaultAsync(t => t.Id == id, token);

            if (entity == null)
                throw new BusinessRuleException("Ticket not found.", StatusCodes.Status404NotFound);

            await repo.DeleteAsync(entity, token); // or DeleteAsync(id)
            await repo.SaveChangesAsync(token);

            await cache.RemoveAsync(Cache_TicketById(id), token);
            await cache.RemoveAsync(Cache_AllTickets, token);
        }

        async Task IIsDeleted<Guid>.SetIsDeleted(Guid id, CancellationToken token)
        {
            var q = await repo.GetAllAsync(token);
            var entity = await q.FirstOrDefaultAsync(t => t.Id == id, token);

            if (entity == null)
                throw new BusinessRuleException("Ticket not found.", StatusCodes.Status404NotFound);

            entity.IsDeleted = true; // adjust if your property name differs
            await repo.SaveChangesAsync(token);

            await cache.RemoveAsync(Cache_TicketById(id), token);
            await cache.RemoveAsync(Cache_AllTickets, token);
        }

        async Task<TicketResponse> IUpdate<UpdateTicketRequest, Guid, TicketResponse>.Update(
            Guid id, UpdateTicketRequest obj, CancellationToken token)
        {
            throw new NotImplementedException();
            //var v = await updateValidator.ValidateAsync(obj, token);
            //if (!v.IsValid)
            //    throw new BusinessRuleException(v.ToString(), StatusCodes.Status400BadRequest);

            //var q = await repo.GetAllAsync(token);
            //var entity = await q.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, token);

            //if (entity == null)
            //    throw new BusinessRuleException("Ticket not found.", StatusCodes.Status404NotFound);

            //// TODO: map fields from UpdateTicketRequest into entity
            //// entity.Subject = obj.Subject; etc...

            //repo.Update(entity);
            //await repo.SaveAsync(token);

            //await cache.RemoveAsync(Cache_TicketById(id), token);
            //await cache.RemoveAsync(Cache_AllTickets, token);

            //return TicketResponse.FromModel(entity);
        }

        async Task IRemoveCache.DeleteCache(CancellationToken token)
        {
            await cache.RemoveAsync(Cache_AllTickets, token);
            // you can also remove per-ticket keys if you track them, but usually not needed
        }

        public async Task<ICollection<string>> GetPrivateNotes(Guid Id, CancellationToken token = default)
        {
            var userid = GetUserId();
            var ticket=await (await repo.GetAllAsync(token)).Include(T=>T.Notes).FirstOrDefaultAsync(t=>t.Id==Id);
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket was not found", StatusCodes.Status404NotFound);
            }
            return ticket.Notes.Where(t => t.AppUserId == userid).Select(t => t.note).ToList();
        }
        
        public async Task<ICollection<UserResponseViewDTO>> GetTOs(Guid Id, CancellationToken token = default)
        {
            var userid = GetUserId();
            var ticket = await(await repo.GetAllAsync(token))
                .Include(T => T.To)
                .ThenInclude(T=>T.Employee)
                .FirstOrDefaultAsync(t => t.Id == Id);
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket was not found", StatusCodes.Status404NotFound);
            }
            return ticket.To.Select(UserResponseViewDTO.FromModel).ToList();
        }

        public async Task<ICollection<UserResponseViewDTO>> GetCCs(Guid Id, CancellationToken token = default)
        {
            var userid = GetUserId();
            var ticket = await(await repo.GetAllAsync(token))
                .Include(T => T.CCs)
                .ThenInclude(T => T.Employee)
                .FirstOrDefaultAsync(t => t.Id == Id);
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket was not found", StatusCodes.Status404NotFound);
            }
            return ticket.CCs.Select(UserResponseViewDTO.FromModel).ToList();
        }

        private async Task<Ticket> PrivateGetById(Guid id, CancellationToken token=default)
        {
            var ticket=await repo.GetByIdAsync(id,token);
            if(ticket==null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }
            return ticket;
        }
        private async Task<IssueStatus?> PrivateGetStatusById(Guid id, CancellationToken token=default)
        {
            var IssueStatus = await Statuses.GetByIdAsync(id, token);
            
            return IssueStatus;
        }
        
        public async Task<ICollection<IssueStatusHistoryResponse>> GetStatuses(Guid Id, CancellationToken token = default)
        {
            var ticket = await (await repo.GetAllAsync(token)).AsNoTracking().Where(I=>I.Id==Id).Include(i=>i.TicketStatuses).ThenInclude(s=>s.IssueStatus).FirstOrDefaultAsync();
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }

            return ticket.TicketStatuses.Select(IssueStatusHistoryResponse.FromModel).ToList();

        }
        public async Task ChangeStatus(Guid Id,Guid statusId, CancellationToken token = default)
        {
            var ticket=await PrivateGetById(Id);
            var status = await PrivateGetStatusById(statusId);
            if(status==null)
            {
                throw new BusinessRuleException("status does not exist", StatusCodes.Status404NotFound);
            }
            var userid = GetUserId();
            var systemid=await GetTicketSystemId(Id);
            
            if (!(await SystemAgents.AnyAsync(s=>s.SystemId== systemid && s.AgentId== userid)))
            {
                throw new BusinessRuleException("status does not exist", StatusCodes.Status403Forbidden);
            }
            ticket.TicketStatuses.Add(new()
            {
                TicketId = ticket.Id,
                IssueStatusId = statusId,
                DateTime = DateTime.Now
            });
            ticket.CurrentStatusId = statusId;
            await repo.UpdateAsync(ticket);

            await repo.SaveChangesAsync();
        }
        private async Task ThrowIfnotagent(Guid Id,string userid)
        {
            if (!(await SystemAgents.AnyAsync(s => s.SystemId == Id && s.AgentId == userid)))
            {
                throw new BusinessRuleException("You are not an agent", StatusCodes.Status403Forbidden);
            }
        }

        public async Task<ICollection<AssignHistoryResponse>> GetAssignHistory(Guid Id, CancellationToken token = default)
        {
            var ticket = await (await repo.GetAllAsync(token)).AsNoTracking().Where(I => I.Id == Id).Include(i => i.AssignHistories).ThenInclude(s => s.User).FirstOrDefaultAsync();
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }

            return ticket.AssignHistories.Select(AssignHistoryResponse.FromModel).ToList();
        }
        private async Task<Guid?> GetNotAssignedStatus()
        {
            var status=await Statuses.FirstOrDefaultWithIncludes(t => t.StatusName == "Not Assigned Yet");
            return status?.Id;
        }
        private async Task<Guid?> GetInProgressStatus()
        {
            var status=await Statuses.FirstOrDefaultWithIncludes(t => t.StatusName == "In Progress");
            return status?.Id;
        }
        public async Task Reassign(Guid Id, string AgentId, CancellationToken token = default)
        {
            var currentuser = GetUserId();

            var TicketSystemId = await GetTicketSystemId(Id);
            if((await userManager.FindByIdAsync(AgentId.ToString()))==null)
            {
                throw new BusinessRuleException("User Does not exist", StatusCodes.Status409Conflict);
            }
            if(!(await SystemAgents.GetAllAsync()).Any(a => a.AgentId == currentuser && a.SystemId == TicketSystemId))
            {
                throw new BusinessRuleException("You are not an agent in the system", StatusCodes.Status409Conflict);
            }
            if (!(await SystemAgents.GetAllAsync()).Any(a => a.AgentId == AgentId && a.SystemId == TicketSystemId))
            {
                throw new BusinessRuleException("User is not a part of the system", StatusCodes.Status409Conflict);
            }
            var ticket = await repo.FirstOrDefaultWithIncludes(t=>t.Id== Id, t=>t.Include(t=>t.CurrentStatus),token);
            //var status = await PrivateGetStatusById(statusId);
            if (ticket == null)
            {
                throw new BusinessRuleException("ticket does not exist", StatusCodes.Status404NotFound);
            }

            ticket.AssignHistories.Add(new()
            {
                TicketId = ticket.Id,
                
                UserId = AgentId,
                AssignDate = DateTime.Now
            });
            if(ticket.CurrentStatusId==(await GetNotAssignedStatus()))
            {
                ticket.CurrentStatusId = await GetInProgressStatus();
                ticket.TicketStatuses.Add(new()
                {
                    TicketId = ticket.Id,
                    IssueStatusId = ticket.CurrentStatusId!.Value,
                    DateTime = DateTime.Now
                });
            }
            if(ticket.CurrentStatus!.isFinished)
            {
                ticket.CurrentStatusId = await GetInProgressStatus();
                ticket.TicketStatuses.Add(new()
                {
                    TicketId = ticket.Id,
                    IssueStatusId = ticket.CurrentStatusId!.Value,
                    DateTime = DateTime.Now
                });
            }
            ticket.CurrentAssignedId = AgentId;
            await repo.UpdateAsync(ticket);
            await cache.RemoveAsync(GetCacheChatKey(ticket.Id));
            //await cache.RemoveAsync(GetCacheChatKey(ticket.Id));
            await repo.SaveChangesAsync();

            //var sysid = await GetTicketSystemId(entity.Id, token);
            //var agents = await SystemAgents.Wheree(s => s.SystemId == sysid).Select(s => s.AgentId).ToListAsync(token);
            await _notificationService.SaveNotification(new()
            {
                Type = notificationType.Ticket,
                RedirectLink = fronturl + $"/ticketdetails/{ticket.Id}",
                Text = "You have been assigned to a task",
                UserId = [ticket.CurrentAssignedId]
            }, token);
            await _notificationService.SaveNotification(new()
            {
                Type = notificationType.Ticket,
                RedirectLink = fronturl + $"/ticketdetails/{ticket.Id}",
                Text = "An agent has been assigned to your task and u may start communication",
                UserId = [ticket.UserId]
            }, token);
            var Agent = await _userManager.FindByIdAsync(AgentId);
            //var TOs = await _userManager.Users.Where(u => obj.To.Select(t => t.ToString()).Contains(u.Id)).Select(u => u.Email).ToListAsync();
            //var CCs = await _userManager.Users.Where(u => obj.CCs.Select(t => t.ToString()).Contains(u.Id)).Select(u => u.Email ?? "").ToListAsync();
            if (Agent!=null && Agent.Email!=null)
            {
                var sendemailjob = new SendEmailJob()
                {
                    HtmlBody = $" you have been assigned to a ticket in the following link {fronturl + $"/ticketdetails/{ticket.Id}"}",
                    Subject = "Ticket Created",
                    ToEmail = Agent.Email,
                    //To = TOs!,
                    //CC = CCs,
                    ToName = "CreationTicket"
                };

                await _backgroundQueue.EnqueueAsync(sendemailjob);
            }

        }
        public async Task<Guid> GetTicketSystemId(Guid id, CancellationToken token = default)
        {
            return await(await repo.GetAllAsync()).Where(t => t.Id == id).Select(t => t.RelatedSubModuleAnswer.RelatedSubModule.Module.SystemId).FirstOrDefaultAsync(); 
        }
        public async Task<ICollection<ReplyResponse>> GetReplies(Guid Id, CancellationToken token = default)
        {
           var replies =await (await Replies.GetAllAsync(token))
                .Where(R => R.TicketId == Id)
                .Include(r => r.User)
                .Include(r => r.To).Include(r => r.CCs)
                .OrderBy(t => t.Date)

                .ToListAsync();
            return replies.Select(ReplyResponse.FromModel).ToList();
        }

        public async Task<RelatedSubModuleAnswerResponse> GetRelatedAnswer(Guid Id, CancellationToken token = default)
        {
            var userid = GetUserId();
            var ticket = await(await repo.GetAllAsync(token))
                .Include(T => T.CCs)
                .ThenInclude(T => T.Employee)
                .FirstOrDefaultAsync(t => t.Id == Id);
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket was not found", StatusCodes.Status404NotFound);
            }
            return await subModuleService.GetByAnswerId(ticket.RelatedSubModuleAnswerId,token);
        }

        public async Task AddPrivateNote(Guid Id, StringDTO note, CancellationToken token = default)
        {
            var userid = GetUserId();
            var ticket = await(await repo.GetAllAsync(token))
                .Include(T => T.Notes)
                .FirstOrDefaultAsync(t => t.Id == Id);
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket was not found", StatusCodes.Status404NotFound);
            }
            ticket.Notes.Add(new()
            {
                AppUserId = userid,
                note = note.Name,
                TicketId = ticket.Id
            });
            await repo.SaveChangesAsync();
        }

        public async Task CreateReply(Guid id, CreateReplyRequest Request, CancellationToken token = default)
        {
            var userid = GetUserId();
            var ticket = await(await repo.GetAllAsync(token)).Where(I => I.Id == id).Include(i => i.Replies).Include(t=>t.CurrentStatus)
                //.Include(t=>t.AssignHistories)
                .FirstOrDefaultAsync();
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }
            if(ticket.UserId!=userid && ticket.CurrentAssignedId != userid)
            {
                throw new BusinessRuleException("You are not authorized to reply to this ticket", StatusCodes.Status403Forbidden);

            }
            var reply=new Reply()
            {
                UserId= userid,
                TicketId=ticket.Id,
                Date=DateTime.Now,
                Subject= ticket.Subject,
                Description= Request.Description,
                ParentReplyId=null,
                Id=Guid.Empty
                
            };
            reply.To ??= new List<AppUser>();
            reply.CCs ??= new List<AppUser>();
            foreach (var To in Request.To)
            {
                Console.WriteLine(To.ToString());
                if (_userManager == null)
                {

                }
                var user = await _userManager.FindByIdAsync(To.ToString());
                if (user == null)
                {
                    throw new BusinessRuleException($"User with id {To} does not exist", StatusCodes.Status404NotFound);
                }
                reply.To.Add(user);
            }
            foreach (var To in Request.CCs)
            {
                var user = await _userManager.FindByIdAsync(To.ToString());
                if (user == null)
                {
                    throw new BusinessRuleException($"User with id {To} does not exist", StatusCodes.Status404NotFound);
                }
                reply.CCs.Add(user);
            }
            if (ticket.CurrentStatus!.isFinished)
            {
                ticket.CurrentStatusId = await GetInProgressStatus();
                ticket.TicketStatuses.Add(new()
                {
                    TicketId = ticket.Id,
                    IssueStatusId = ticket.CurrentStatusId!.Value,
                    DateTime = DateTime.Now
                });
            }
            foreach (var att in Request.Attachments)
            {
                reply.Attachments.Add(await att.Save(new List<string>()));
            }
            foreach (var att in Request.Pictures)
            {
                reply.Pictures.Add(await att.Save(new List<string>()));
            }
            ticket.Replies.Add(reply);
            await repo.SaveChangesAsync(token);
            var sysid = await GetTicketSystemId(ticket.Id, token);
            var agents = await SystemAgents.Wheree(s => s.SystemId == sysid).Select(s => s.AgentId).ToListAsync(token);
            
            await _notificationService.SaveNotification(new()
            {
                Type = notificationType.Reply,
                RedirectLink = fronturl + $"/ticketdetails/{reply.TicketId}",
                Text = "A new Ticket has been opened for a system u are assigned to",
                UserId = ticket.CurrentAssignedId != null
                 ? new List<string> { ticket.CurrentAssignedId }
                 : agents
            }, token);
            await _notificationService.SaveNotification(new()
            {
                Type = notificationType.Reply,
                RedirectLink = fronturl + $"/ticketdetails/{reply.TicketId}",
                Text = "You have been mentioned in a ticket",
                UserId = Request.CCs.Select(o => o.ToString()).Union(Request.To.Select(o => o.ToString())).ToList()
            }, token);


            var TOs = await _userManager.Users.Where(u => Request.To.Select(t => t.ToString()).Contains(u.Id)).Select(u => u.Email).ToListAsync();
            var CCs = await _userManager.Users.Where(u => Request.CCs.Select(t => t.ToString()).Contains(u.Id)).Select(u => u.Email ?? "").ToListAsync();
            if (TOs.Any(t => t != null))
            {
                var sendemailjob = new SendEmailJob()
                {
                    HtmlBody = $"A Reply has been created on a ticket that you have been mentioned at in the following link {fronturl + $"/ticketdetails/{reply.TicketId}"}",
                    Subject = "Ticket Created",
                    ToEmail = TOs.FirstOrDefault() ?? "",
                    To = TOs!,
                    CC = CCs,

                    ToName = "CreationTicket"
                };

                await _backgroundQueue.EnqueueAsync(sendemailjob);
            }
        }

        public async Task<string> GetTicketFilePath(Guid id, string name, CancellationToken token = default)
        {
            var ticket = await (await repo.GetAllAsync(token)).Where(I => I.Id == id)
                .Include(i => i.Replies)
                .Include(i => i.Messages)
                .Include(t => t.AssignHistories).FirstOrDefaultAsync();
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }
            if(!ticket.Attachments.Any(t=>t == name)&& !ticket.Replies.SelectMany(t=>t.Attachments).Any(t => t == name)&& !ticket.Replies.SelectMany(t => t.Pictures).Any(t => t == name)
                &&  !ticket.Messages.SelectMany(t => t.Attachments).Any(t => t == name) && !ticket.Messages.SelectMany(t => t.Pictures).Any(t => t == name))
            {
                throw new BusinessRuleException("File does not exist in that ticket", StatusCodes.Status404NotFound);
            }
            return Path.Combine(SaveImage.getdefault(), name);
        }

        public async Task ChangeBasicDataRequest(Guid id, BasicDataRequest req, CancellationToken token = default)
        {
            var ticket=await PrivateGetById(id,token);
            var systemid=await GetTicketSystemId(id);
            await ThrowIfnotagent(systemid, GetUserId());
            if (req.IssueTypeId!= null)
            {
                if((await IssueTypes.GetByIdAsync(req.IssueTypeId.Value,token)==null))
                {
                    throw new BusinessRuleException("Issue Type Does not exist", StatusCodes.Status404NotFound);

                }
                await cache.RemoveAsync(Cache_TicketById(id));
                ticket.IssueTypeId = req.IssueTypeId;
            }
            if(req.CompanyId!= null)
            {
                if((await Companies.GetByIdAsync(req.CompanyId.Value,token)==null))
                {
                    throw new BusinessRuleException("Company Does not exist", StatusCodes.Status404NotFound);

                }
                await cache.RemoveAsync(Cache_TicketById(id));

                ticket.CompanyId = req.CompanyId;
            }
            if(req.priority !=null)
            {
                ticket.priority = req.priority;
            }
            await repo.SaveChangesAsync();
        }

        public async Task<ICollection<MessageResponse>> GetMessages(Guid Id,string userId, CancellationToken token = default)
        {
            var userid=  userId ?? GetUserId();
            var ticket=await (await repo.GetAllAsync(token)).Include(t=>t.Messages).ThenInclude(t=>t.User).FirstOrDefaultAsync(t=>t.Id==Id);
            if(ticket==null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }
            if (userid!= (ticket.CurrentAssignedId) && userid != ticket.UserId)
            {
                throw new BusinessRuleException("Only authorized users can access messages for this ticket", StatusCodes.Status403Forbidden);
            }

            return ticket.Messages.OrderByDescending(t=>t.Date).Take(20).Select(MessageResponse.FromModel).OrderBy(o => o.Date).ToList();
        }

        public async Task<MessageResponse> SaveMessage(Guid ticketId, string userId, SendMessageRequest message, CancellationToken token = default)
        {
            var userid = userId ?? GetUserId();
            var ticket = await(await repo.GetAllAsync(token)).Include(t => t.Messages).FirstOrDefaultAsync(t => t.Id == ticketId);
            if (ticket == null)
            {
                throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);
            }
            if (userid != await getLastAssignee(ticketId) && userid != ticket.UserId)
            {
                throw new BusinessRuleException("Only authorized users can access messages for this ticket", StatusCodes.Status403Forbidden);
            }
            //var pictures = message.Pictures
            //    .Select(p => SaveImage.Base64ToFormFile(p.Data, p.Name, p.ContentType))
            //    .ToList();

            //var attachments = message.Attachments
            //    .Select(a => SaveImage.Base64ToFormFile(a.Data, a.Name, a.ContentType))
            //    .ToList();

            //var voiceRecords = message.VoiceRecords
            //    .Select(v => SaveImage.Base64ToFormFile(v.Data, v.Name, v.ContentType))
            //    .ToList();
            var msg = new Message()
            {
                UserId = userid,
                TicketId = ticketId,
                Pictures = message.Pictures.Select(p=>p.Url).ToList(),
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
            var user= await _userManager.FindByIdAsync(userId ?? GetUserId());
            msg.User = new()
            {
                UserName = user!.UserName,
                Picture = user!.Picture
            };
            return MessageResponse.FromModel(msg);
        }

        private async Task<string?> getLastAssignee(Guid TicketId,CancellationToken token=default)
        {
            var ticket = await (await repo.GetAllAsync(token))
                .FirstOrDefaultAsync(t => t.Id == TicketId);
            if( ticket ==null )
            {
                return null;
            }
            return ticket.CurrentAssignedId;
        }

        public async Task<ICollection<MessangerResponse>> MyMessanger( string userId, CancellationToken token = default)
        {
          var currentUserId = userId ?? GetUserId();
            if(currentUserId == null)
            {
                throw new BusinessRuleException("User not authorized", StatusCodes.Status401Unauthorized);
            }

            var tickets = await (await repo.GetAllAsync(token))
            .AsNoTracking()
            .Include(t => t.Messages)
            .Include(t => t.AssignHistories)
            .Where(t => t.UserId == currentUserId ||
                        (t.CurrentAssignedId== currentUserId))
            .ToListAsync();


            var usersList = await _userManager.Users.ToListAsync();
            // Now, map the last message of each ticket
            var lastMessages = tickets
                .Where(t => t.Messages.Any()) // make sure there is at least one message
                .Select(t =>
                {
                    var lastMsg = t.Messages.OrderByDescending(m => m.Date).First(); // get last message by Date
                                                                                     // get the contacted user: for example, the other party
                    var contactedUserId = t.UserId == currentUserId ?
                                          (t.CurrentAssignedId)
                                          : t.UserId;

                    var contactedUser = usersList.FirstOrDefault(u => u.Id == contactedUserId); // assume you have all users loaded

                    return MessangerResponse.FromModel(lastMsg, contactedUser);
                })
                .ToList();

            return lastMessages;
        }
        private async Task<ICollection<MessangerResponse>> getlastmessages(string userId, CancellationToken token = default)
        {
            var currentUserId = userId ?? GetUserId();
            if (currentUserId == null)
            {
                throw new BusinessRuleException("User not authorized", StatusCodes.Status401Unauthorized);
            }

            var tickets = await (await repo.GetAllAsync(token))
            .AsNoTracking()
            .Include(t => t.Messages)
            .Include(t => t.AssignHistories)
            .Where(t => t.UserId == currentUserId ||
                        (t.CurrentAssignedId == currentUserId))
            .ToListAsync();


            var usersList = await _userManager.Users.ToListAsync();
            // Now, map the last message of each ticket
            var lastMessages = tickets
                .Where(t => t.Messages.Any()) // make sure there is at least one message
                .Select(t =>
                {
                    var lastMsg = t.Messages.OrderByDescending(m => m.Date).First(); // get last message by Date
                                                                                     // get the contacted user: for example, the other party
                    var contactedUserId = t.UserId == currentUserId ?
                                          (t.CurrentAssignedId)
                                          : t.UserId;

                    var contactedUser = usersList.FirstOrDefault(u => u.Id == contactedUserId); // assume you have all users loaded

                    return MessangerResponse.FromModel(lastMsg, contactedUser);
                })
                .ToList();

            return lastMessages;
        }
        public async Task<int> MyCount(string userId, CancellationToken token = default)
        {
            var ret = (await getlastmessages(userId, token)).Where(m => !m.isSeen && m.UserId != userId);
            return ret.Count();
        }
        public async Task MarkMessagesAsSeenAsync(Guid ticketId, string userId, CancellationToken token = default)
        {
            var ticket= await (await repo.GetAllAsync(token)).Include(t => t.Messages).Where(T => T.Id == ticketId).FirstOrDefaultAsync();
            if(ticket==null)
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

        public async Task<Guid> SplitTicket(SplitTicketRequest obj, CancellationToken token)
        {
            if (!(await Modules.GetAllAsync(token)).Any(a => a.Id == obj.RelatedSubModuleAnswer.RelatedSubModuleId))
            {
                throw new BusinessRuleException("Invalid module id was sent", StatusCodes.Status400BadRequest);
            }
            var questionids =
                obj.RelatedSubModuleAnswer.multipleChoiceAnswers.Select(a => a.QuestionId)
                .Concat(obj.RelatedSubModuleAnswer.textAnswers.Select(a => a.QuestionId))
                .Concat(obj.RelatedSubModuleAnswer.singleChoiceAnswers.Select(a => a.QuestionId))
                .Concat(obj.RelatedSubModuleAnswer.dateAnswers.Select(a => a.QuestionId));
            var allquestionids = (await Questions.GetAllAsync(token)).Select(a => a.Id);
            if (questionids.Any(id => !allquestionids.Contains(id)))
            {
                throw new BusinessRuleException("One of questions does not exist", StatusCodes.Status400BadRequest);
            }
            

            var reply = await (await Replies.GetAllAsync( token)).Include(r=>r.Ticket).FirstOrDefaultAsync(r=>r.Id==obj.ReplyId);

            if(reply==null)
            {
                throw new BusinessRuleException("Reply does not exist", StatusCodes.Status404NotFound);
            }

            var entity = await SplitTicketRequest.ToModel(obj);

            entity.IpAddress = GetIpAddress() ?? "not found";
            entity.IpAddress = reply.Ticket.IpAddress;
            entity.UserId = reply.UserId;
            Guid issuestatusid = await getdefaultstatusissueid();
            entity.TicketStatuses ??= new List<TicketStatusDate>();
            entity.To ??= new List<AppUser>();
            entity.CCs ??= new List<AppUser>();
            entity.Attachments ??= new List<string>();
            
            //entity.Subject = reply.Subject;
            //entity.Subject = reply.Subject;
            foreach(var att in reply.Attachments)
            {
                entity.Attachments.Add(att);
            }
            foreach (var att in reply.Pictures)
            {
                entity.Attachments.Add(att);
            }
            entity.TicketStatuses.Add(new TicketStatusDate()
            {
                DateTime = DateTime.Now,
                id = Guid.Empty,
                Ticket = entity,
                IssueStatusId = issuestatusid
            });
            foreach (var To in obj.To)
            {
                Console.WriteLine(To.ToString());
                if (_userManager == null)
                {

                }
                var user = await _userManager.FindByIdAsync(To.ToString());
                if (user == null)
                {
                    throw new BusinessRuleException($"User with id {To} does not exist", StatusCodes.Status404NotFound);
                }
                entity.To.Add(user);
            }
            foreach (var To in obj.CCs)
            {
                var user = await _userManager.FindByIdAsync(To.ToString());
                if (user == null)
                {
                    throw new BusinessRuleException($"User with id {To} does not exist", StatusCodes.Status404NotFound);
                }
                entity.CCs.Add(user);
            }
            //foreach(var att in obj.Attachments)
            //{
            //    entity.Attachments.Add(await att.Save(new List<string>()));
            //}
            //var CCs = users.FindByIdAsync(obj.CCs);

            //entity.To=obj.To
            reply.SplitTicket = entity;
            await repo.AddAsync(entity, token);
            await repo.SaveChangesAsync(token); // <-- rename if your repo uses SaveChangesAsync()
            await repo.SaveChangesAsync(token); // <-- rename if your repo uses SaveChangesAsync()

            // 5) Clear caches
            await ((IRemoveCache)this).DeleteCache(token);
            return entity.Id;
            //return TicketResponse.FromModel(entity);
        }
        public async Task<ICollection<MessageResponse>> Get20More(Guid topMessageId, CancellationToken token = default)
        {
            var userId = GetUserId();

            // Get the top message to use as a cursor
            var topMessage = await MessageRepo
                .Wheree(m => m.Id == topMessageId)

                .Select(m => new { m.TicketId, m.Date }) // only fetch what we need
                .FirstOrDefaultAsync(token);

            if (topMessage == null)
                throw new BusinessRuleException("Message was not found", StatusCodes.Status404NotFound);

            // Fetch the next 20 messages in the project older than the top message
            var nextMessages = await MessageRepo
                .Wheree(m => m.TicketId == topMessage.TicketId && m.Date < topMessage.Date)
                                .Include(m => m.User)

                .OrderByDescending(m => m.Date)
                .Take(20)
                .OrderBy(o => o.Date)

                .ToListAsync(token);

            return nextMessages.Select(m => MessageResponse.FromModel(m)).ToList();
        }

        public async Task ChangeModule(Guid TicketId,CreateRelatedSubModuleAnswerRequest changeModuleDTO, CancellationToken token)
        {
            var userId = GetUserId();
            var Ticket = await repo.FirstOrDefaultWithIncludes(t => t.Id == TicketId, t => t.Include(t => t.RelatedSubModuleAnswer).Include(t=>t.AnswerHistory));
            if(Ticket==null)
            {
                throw new BusinessRuleException("Does not exist", StatusCodes.Status404NotFound);
            }
            if(Ticket.CurrentAssignedId != userId)
            {
                throw new BusinessRuleException("Only Assigned user can change that", StatusCodes.Status403Forbidden);
            }
            var oldAnswer = Ticket.RelatedSubModuleAnswer;

            if (oldAnswer != null)
            {
                // remove it from current-answer relation
                oldAnswer.Ticket = null;
                //oldAnswer.TicketId = null;

                // move it to history relation
                oldAnswer.TicketHistory = Ticket;
                oldAnswer.TicketHistoryId = Ticket.Id;

                Ticket.AnswerHistory.Add(oldAnswer);
            }

            var newAnswer = CreateRelatedSubModuleAnswerRequest.ToModel(changeModuleDTO);
            newAnswer.Id = Guid.Empty;

            // important: make sure EF treats this as a new entity
            Ticket.RelatedSubModuleAnswer = newAnswer;

            try
            {
                await repo.SaveChangesAsync(token);
            }
            catch (Exception ex)
            {
                throw;
            }
            return ;
        }

        public async Task AddTicketTasks(Guid TicketId, CreateTicketTaskRequest changeModuleDTO, CancellationToken token)
        {
            var userid = GetUserId();
            var sysid = await GetTicketSystemId(TicketId, token);
            if(!(await SystemAgents.AnyAsync(s=>s.SystemId==sysid&&userid==s.AgentId)))
            {
                throw new BusinessRuleException(" ur not agent in the ticket's system to add tasks", StatusCodes.Status403Forbidden);
            }
            var ticket = await repo.FirstOrDefaultWithIncludes(T => T.Id == TicketId, t => t.Include(t => t.AccomplishedTasks),token);
            if (ticket==null)
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

        public async Task<List<TicketTaskRespone>> MyTicketTasks(Guid TicketId, CancellationToken token)
        {
            var userid = GetUserId();

            var ticket = await repo.FirstOrDefaultWithIncludes(T => T.Id == TicketId, t => 
            t.Include(t => t.AccomplishedTasks).ThenInclude(t=>t.KPI).ThenInclude(k=>k.FixedKPI), token);
            if (ticket == null)
            {
                throw new BusinessRuleException(" Ticket does not exist", StatusCodes.Status404NotFound);
            }
            return ticket.AccomplishedTasks.Where(t => t.UserId == userid).Select(t=>TicketTaskRespone.ToModel(t,true)).ToList();
        }
    }
}
