import { Component, OnInit, signal } from '@angular/core';
import { SubModuleService } from '../../Services/submodule.service';
import { ActivatedRoute } from '@angular/router';
import { CreateQuestionOptionRequest, CreateQuestionRequest, option, Question, TypeOfQuestion } from '../../Interfaces/question';
import { SubModule } from '../../Interfaces/submodule';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-submodulequestions',
  imports: [CommonModule,FormsModule,ReactiveFormsModule],
  templateUrl: './submodulequestions.component.html',
  styleUrl: './submodulequestions.component.css'
})
export class SubmodulequestionsComponent implements OnInit{
  subModuleId: string;
  constructor(private _SubModuleService: SubModuleService, private route: ActivatedRoute, private _subModuleService: SubModuleService) {

    this.subModuleId = this.route.snapshot.params['id'];
  }
  questions= signal<Question[]>([]);
  subModule= signal<SubModule|null>(null);
  ngOnInit(): void {
    this.loadSubModule();
    this.loadsubmodulequestions();
  }

  loadsubmodulequestions()
  {
    this._SubModuleService.getQuestions(this.subModuleId).subscribe((data) => {
      this.questions.set(data);
    });
  }

  loadSubModule()
  {
    this._subModuleService.getById(this.subModuleId).subscribe((data) => {
      this.subModule.set(data);
    });
  }
  toggleOptions(questionId: string) {
    const next = new Set(this.expandedIds());
    next.has(questionId) ? next.delete(questionId) : next.add(questionId);
    this.expandedIds.set(next);
  }
  
  isExpanded(questionId: string) {
    return this.expandedIds().has(questionId);
  }
  expandedIds = signal<Set<string>>(new Set());

  toggleRequired(question: Question)
  {
    this._SubModuleService.updateQuestion(this.subModuleId,
      question.id,
      {questionHead:question.questionHead ,isRequired:!question.isRequired}).subscribe((data) => {
      this.loadsubmodulequestions();
    });
  }
  optiontext:string='';
  addOption(questionId: string) {
    const option : CreateQuestionOptionRequest = {
      text:this.optiontext,
      questionId:questionId
    }
    this._SubModuleService.addOption(this.subModuleId,questionId,option).subscribe((data) => {
      this.loadsubmodulequestions();
    });
  }
  removeOption(option:option){
    this._SubModuleService.removeOption(this.subModuleId,option.questionId,option.id).subscribe((data) => {
      this.loadsubmodulequestions();
    });
  }
  deleteQuestion(questionid:string)
  {
    this._SubModuleService.DeleteQuestion(this.subModuleId,questionid).subscribe((data) => {
      this.loadsubmodulequestions();
    });
  }
  showaddquestion=signal<boolean>(false);
  typeOfQuestion=TypeOfQuestion;
  typeOfQuestionArray=Object.values(this.typeOfQuestion).filter(value => typeof value === 'number');
  addquestionform=new FormGroup({
    questionHead:new FormControl<string>('',[Validators.required]),
    questionType:new FormControl<TypeOfQuestion>(TypeOfQuestion.Text,[Validators.required]),
    isRequired:new FormControl(false),
    options: new FormArray<FormControl<string>>([]),
  });

  get optionsFA(): FormArray<FormControl<string>> {
    return this.addquestionform.get('options') as FormArray<FormControl<string>>;
  }
  
  addOptionToForm() {
    this.optionsFA.push(new FormControl('', { nonNullable: true, validators: [Validators.required] }));
  }
  
  removeOptionAt(i: number) {
    this.optionsFA.removeAt(i);
  }
  addQuestion(){
    console.log(this.addquestionform.value.isRequired)
    console.log(this.addquestionform.value.questionType,'b3aa')

    const options: CreateQuestionOptionRequest[] = this.optionsFA.controls.map(control => ({
      text: control.value,
      questionId: this.subModuleId,
    }));
    const question: CreateQuestionRequest = {
      QuestionHead:this.addquestionform.value.questionHead??'',
      options:options,
      SubModuleId:this.subModuleId,
    isRequired:this.addquestionform.value.isRequired??false,
    type:this.addquestionform.value.questionType??TypeOfQuestion.Text,
  }
  if(question.type != TypeOfQuestion.MultipleChoice && question.type != TypeOfQuestion.SingleChoice){
    question.options = undefined;
  }
  this._SubModuleService.addQuestions(question).subscribe((data) => {
    this.loadsubmodulequestions();
  });
  }
}
