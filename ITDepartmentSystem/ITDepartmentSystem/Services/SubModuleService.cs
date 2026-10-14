using DocumentFormat.OpenXml.Office2010.Excel;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Hybrid;
using System.Reflection;

namespace ITDepartmentSystem.Services
{
    public class SubModuleService(
        IGenericRepository<RelatedSubModule> repo,
        IGenericRepository<Question> Questions,
        IGenericRepository<QuestionOption> Options,
        IGenericRepository<RelatedSubModuleAnswer> Answers

        , HybridCache cache
        ) : ISubModuleService
    {
        #region SubModule
        private readonly string cachekeyword = "SubModules";

        public async Task<RelatedSubModuleResponse> Create(CreateSubModuleRequest obj, CancellationToken token = default)
        {
            if ((await (await repo.GetAllAsync(token)).AnyAsync(s => s.Name == obj.Name && obj.ModuleId == s.ModuleId, token)))
            {
                throw new BusinessRuleException("SubModule with that name already exists", StatusCodes.Status409Conflict);
            }
            var model = CreateSubModuleRequest.ToModel(obj);

            await repo.CreateAsync(model, token);
            await DeleteCache();
            return RelatedSubModuleResponse.FromModel(model);
        }

        public async Task Delete(Guid id, CancellationToken token = default)
        {
            throw new NotImplementedException();
        }

        public async Task DeleteCache(CancellationToken token = default)
        {
            await cache.RemoveAsync(cachekeyword, token);
        }

        public async Task<ICollection<RelatedSubModuleResponse>> GetAll(CancellationToken token = default)
        {
            var objects = await cache.GetOrCreateAsync(cachekeyword, async ct =>
            {
                var entities = (await repo.GetAllAsync(token)).Select(RelatedSubModuleResponse.FromModel).ToList();

                return entities;

            }, cancellationToken: token);
            return objects;
        }

        public async Task<ICollection<RelatedSubModuleResponse>> GetByParent(Guid id, CancellationToken token = default)
        {
            //var objects = await cache.GetOrCreateAsync(cachekeyword, async ct =>
            //{
            var entities = (await repo.GetAllAsync(token)).Where(p => p.ModuleId == id).Select(RelatedSubModuleResponse.FromModel).ToList();

            return entities;

            //}, cancellationToken: token);
            //return objects;
        }

        public async Task<RelatedSubModuleResponse> GetById(Guid id, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("Sub Module does not exist", StatusCodes.Status404NotFound);
            }
            var dto = RelatedSubModuleResponse.FromModel(entity);

            return dto;
        }

        public async Task SetIsDeleted(Guid id, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("Sub Module does not exist", StatusCodes.Status404NotFound);
            }
            if (entity.IsDeleted)
            {
                throw new BusinessRuleException("Sub Module is already deleted", StatusCodes.Status409Conflict);

            }
            entity.IsDeleted = true;
            await DeleteCache();

            await repo.SaveChangesAsync(token);
        }

        public async Task<RelatedSubModuleResponse> Update(Guid id, CreateSubModuleRequest obj, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("Sub Module does not exist", StatusCodes.Status404NotFound);
            }
            if (entity.IsDeleted)
            {
                throw new BusinessRuleException("Sub Module is already deleted", StatusCodes.Status409Conflict);

            }
            if ((await repo.GetAllAsync()).Any(a => a.Id != entity.Id && a.Name == obj.Name))
            {
                throw new BusinessRuleException("Sub Module with that name already exists", StatusCodes.Status404NotFound);

            }
            entity.Name = obj.Name;
            await DeleteCache();

            await repo.SaveChangesAsync(token);
            return await GetById(id);
        }


        #endregion
        public async Task AddQuestion( CreateQuestionRequest request, CancellationToken token)
        {
            await Questions.AddAsync(CreateQuestionRequest.ToModel(request));
            await Questions.SaveChangesAsync();
        }

        public async Task<ICollection<QuestionResponse>> GetQuestions(Guid id, CancellationToken token)
        {
            //var questions= (await Questions.GetAllAsync()).Where(q=>q.SubModuleId==id).Include(q=>q.).Select()

            var baseQuery = (await Questions.GetAllAsync(token))
            .Where(q => q.SubModuleId == id);

            var textQs = await baseQuery.OfType<TextQuestion>().ToListAsync(token);
            var dateQs = await baseQuery.OfType<DateTimeQuestion>().ToListAsync(token);

            var choiceQs = await baseQuery
            .OfType<ChoiceQuestion>()
            .Include(q => q.Options)
            .ToListAsync(token);



            var questions = textQs.Cast<Question>()
            .Concat(dateQs)
            .Concat(choiceQs)
            .ToList();
            return questions.Select(QuestionResponse.FromModel).ToList();
        }

        public async Task RemoveQuestion(Guid id, Guid questionId, CancellationToken token)
        {
            var question = await (await Questions.GetAllAsync(token)).FirstOrDefaultAsync(q => q.Id == questionId);
            if(question==null || question.SubModuleId != id)
            {
                throw new BusinessRuleException("Question does not exist in the current submodule", StatusCodes.Status409Conflict);
            }
            if(question is ChoiceQuestion choice)
            {
                var opts=(await Options.GetAllAsync(token)).Where(o => o.QuestionId == choice.Id);
                foreach(var opt in opts)
                {
                    opt.IsDeleted = true;
                }
            }

            await Questions.DeleteAsync(question);
        }

        public async Task UpdateQuestion(Guid subModuleId, Guid questionId, UpdateQuestionRequest req, CancellationToken token)
        {
            var question = await(await Questions.GetAllAsync(token)).FirstOrDefaultAsync(q => q.Id == questionId);
            if (question == null || question.SubModuleId != subModuleId)
            {
                throw new BusinessRuleException("Question does not exist in the current submodule", StatusCodes.Status409Conflict);
            }
            //question.QuestionHead = req.QuestionHead;
            question.isRequired = req.isRequired;
            await Questions.SaveChangesAsync();
        }

        public async Task AddOption(Guid subModuleId, Guid questionId, CreateQuestionOptionRequest req, CancellationToken token)
        {
            var question = await (await Questions.GetAllAsync(token)).FirstOrDefaultAsync(q => q.Id == questionId);
            if (question == null || question.SubModuleId != subModuleId)
            {
                throw new BusinessRuleException("Question does not exist in the current submodule", StatusCodes.Status409Conflict);
            }
            if(question is ChoiceQuestion choicequestion)
            {
                choicequestion.Options.Add(new QuestionOption()
                {
                    Text = req.Text,
                    QuestionId = questionId,
                    Id=Guid.Empty
                });
                await Questions.SaveChangesAsync();
            }
            else
            {
                throw new BusinessRuleException("Invalid type of questions", StatusCodes.Status409Conflict);
            }
        }

        public async Task RemoveOption(Guid subModuleId, Guid questionId, Guid optionId, CancellationToken token)
        {
            var option = await (await Options.GetAllAsync(token)).FirstOrDefaultAsync(q => q.Id == optionId);
            if (option == null || option.QuestionId != questionId)
            {
                throw new BusinessRuleException("Question does not exist in the current submodule", StatusCodes.Status409Conflict);
            }

            await Options.DeleteAsync(option);
        }

        public async Task<RelatedSubModuleAnswerResponse> GetByAnswerId(Guid id, CancellationToken token)
        {
            var baseQuery =await (await Answers.GetAllAsync(token))
                .Include(r=>r.Answers)
                 .ThenInclude(a => (a as MultipleChoiceQuestionAnswer).SelectedOptions)
                 .ThenInclude(s=>s.Option)
                .Include(r => r.Answers)
                 .ThenInclude(a => (a as SingleChoiceQuestionAnswer).SelectedOption)
                 //.ThenInclude(s => s)

                .Include(a=>a.Answers)
                .ThenInclude(a=>a.Question)
                .Include(r=>r.RelatedSubModule)
                .ThenInclude(r=>r.Module)
                .ThenInclude(r=>r.System)
            .FirstOrDefaultAsync(q => q.Id == id);

            if(baseQuery==null)
            {
                throw new BusinessRuleException("SubModule answer doesnt exist",StatusCodes.Status404NotFound);
            }

           
            var ans = RelatedSubModuleAnswerResponse.FromModel(baseQuery);
            return ans;
            //var textQs = await baseQuery.OfType<TextQuestion>().ToListAsync(token);
            //var dateQs = await baseQuery.OfType<DateTimeQuestion>().ToListAsync(token);

            //var choiceQs = await baseQuery
            //.OfType<ChoiceQuestion>()
            //.Include(q => q.Options)
            //.ToListAsync(token);



            //var questions = textQs.Cast<Question>()
            //.Concat(dateQs)
            //.Concat(choiceQs)
            //.ToList();
            //return questions.Select(QuestionResponse.FromModel).ToList();
        }
    }
}
