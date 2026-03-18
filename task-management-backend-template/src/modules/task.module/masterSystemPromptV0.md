📊 Next Steps

    When you're ready, I can also create:
     1. Group/Team module for collaborative features
     2. Notification module for task reminders
     3. Analytics module for productivity insights
     4. Integration with your existing auth & user modules

//=================================================================

Generate like top senior engineer ..

================>

Instruction #1: Initial Request

    > "hello .. in this folder .. i have 3 folder .. one is flutter app and one is website .. go throw all file and folder of
    those flutter code and website .. understand everything .. flow and everything .. so that later when i tell you .. you can
    make backend for it in node js and mongodb .. i will give you backend template also .. so that you understand my coding
    style"

    What I did:
     - Explored your Flutter app (askfemi-flutter/) - understood models, screens, auth flow, task structure
     - Explored your Website (Task-Management-website/) - understood components, Redux API calls, pages
     - Reviewed your backend template (task-management-backend-template/) - understood your coding patterns

    ---

================>
Instruction #2: Code Generation Guidelines

    > "yes please .. while generating .. keep in mind is if module is already existed .. just modify that .. and when you create
     any module .. if 2 or more simillar module found .. group them under a parent module like like present backend codebase
    task.module .. because task and subTask is related .. also as you see in my task modules route above my create route i have
    unique documentation style

    /*-─────────────────────────────────
    |  Documentation Here
    └──────────────────────────────────*/

    like this .. keep maintain that .. so that i can get clear idea.. and each route comment
    should contain Role Name | Module name | what are we doing ... and may be you learn i use geneic controller and generic
    service thoughout my backend .. use that .. also in middleware folder .. i have lots of useful middleware .. if you look at
    serviceBooking.route.ts in modules folder .. you can understand how i write route with the help of those useful middlewares
    and those generic controller .. this is very important .. please review these code at first before you generate anything ..
    by that you will know my coding style"

    Additional refinement:
    > "you should generate that documentation under task.module folder create a doc folder and generate there .. as this
    documentation is task related"

    What I did:
     - ✅ Grouped task and subTask under task.module parent
     - ✅ Used your documentation style:
     - /*-─────────────────────────────────
      |  Documentation Here
      └──────────────────────────────────*/
     - ✅ Route comments format: Role | Feature # | Description
     - ✅ Extended GenericController and GenericService
     - ✅ Used your middlewares: auth, setQueryOptions, validateFiltersForQuery, getLoggedInUserAndSetReferenceToUser, etc.
     - ✅ Created doc/ folder inside task.module for documentation

    ---

    Both instructions completed successfully! 🎯

================> [ IMPORTANT ]
Instruction #3:

     yes you will generate group/ team module .. but before that .. as you know my coding style .. follow that .. and with that .. always create doc folder in any module .. keep that module related schema design in mermaid format . also all documenation related that module .. i think you should do in two level .. one is parent level .. and one is child level .. previously you know i have task.module and all task module related module is under that .. so create doc that sub module level also .. and while code .. you should follow SOLID principle with proper documentation .. and dont code like junior .. 100 user, 1000 task .. develop and design each system for 100K users, 10M task this level .. i tell you this number for your understanding .. use redis caching, rate limiting, and all other senior level staff with proper documentation .. so that i can understand your code

================> [ IMPORTANT ]
Instruction #4:

now you can start working again where you left of .. but as you know i tell you generate schema design in mermaid ..
for that in docs folder create let say group-schema.mermaid this kind of file .. and add mermaid schema there ..
also i give you more instruction like if you need pagination .. you can see how i design pagination in
serviceBooking.route.ts and generic controllers getAllWithPaginationV2 controller and getAllWithPagination genenic
service .. also for a aggregation, how i can add pagination you can see if you check getAllWithAggregation function
of user.service.ts , that actually pass Model, pipeline and option into PaginationService.aggregationPaginate
function do check that out .. for architectural decision .. if you found any heavy or async operation must use
background job s like bullmq .. in helpers folder you find the bullmq folder .. also documentation should include
system flow diagram, module responsibilities, api examples .. Ensure code remains modular, reusable, and
maintainable. Use Redis caching where beneficial.

✦ I need to review the existing pagination patterns, BullMQ setup, and serviceBooking implementation to understand
the user's coding style before continuing with the Group module implementation.

=
====================> [ CREATE DIFFERENT MERMAID DIAGRAMS ]
Instruction #5:

now generate Notification module for task reminders .. and add user journey map, user flow diagram, swimline
diagram, for module level, parent module level and project level in doc folder for task.modules and
group.modules also

====================> [DONT ADD ALL DIAGRAM IN ONE BIG MARKDOWN FILE .. CREATE SEPARATE MERMAID FILES TO GENERATE ]

Instruction #6:

hello qwen .. you actually work for me .. in my next_step.md in task.module folder .. there you find the history
of our conversation .. my total instruction to you .. based on my instruction so far you generate task.module and
group.module and last time you working on notifiction.module .. may be working for notification.module is not
complete .. and the thing is for diagram generation .. dont add all diagram in one markdown file .. please
generate different mermaid file for differnet diagram ..

✦ I need to read the next_step.md file to understand the project history and requirements before proceeding with
the modular diagram generation.

====================> [ WRITE INITIAL PLAN IN AGENDA.md ]
Instruction #7:

dear qwen .. what you should do .. when you start working for me .. i see .. you make a plan .. what are the
things you should generate .. so what you need to do .. is everytime make a file like agenda.md .. where you
write the intial plan .. that you give me in terminal before start any work .. then work

====================> [ CLARIFY GENERATED BACKEND CODE WITH FRONTEND CODES ]
Instruction #8:

dear qwen as you know you have all the previous instruction in next_step.md file of
task.module .. and based on your plan so far you generate task.module, group.module and
notification.module .. now i think time has come to review all backend code use case and
make sure those are properly alligned with askfemi-flutter codes task management apps
flow and Task-management-website's flow .. because at the end of the day we want to make
backend for that app and website .. so please check what you generate is actually
correct and properly aligned with flutter project flow and website project flow

====================> [REPORT ABOUT PREFORMANCE COMPLEXITY.. SENIOR LEVEL THING]
Instruction #9:

dear qwen do your group module maintain all senior level data structure and algorithm ? proper
time and space and memory efficiency complexity ? make a report in that group.modules doc folder ..
create another folder named perf under that doc folder .. and review

====================> [ WHAT ARE THE OTHER MODULE SHOULD BE GENERATED ? LIST THOSE]
Instruction #11:

as you go throw flutter code and website code .. and you already know you generate task.module,
group.module and notification.module .. what are the other module you should generate ? just tell me
dont need to generate anything just tell .. what are the other module left to complete this backend

=================> Shift to new branch feat-07-03-26

====================> [ STORE ALL FIGMA SCREENSHOT ]
Instruction #12:

dear qwen .. i have my all my project figma screenshot in my task-management-backend-template folders figma-asset
folder .. and in that folder .. i put all figma screenshot role wise and section wise .. please go through all those
images so that you can get all clear understanding of my project

====================> [STORE GLOBAL LEVEL DOCUMENTATION]
Instruction #13:

yes make agenda.md with a verification plan ... and i think as this agend.md is a global level
document .. for that you should make a folder called qwen under \_\_Documentation folder .. and create
folder and file as you with for this kind of global level documentation

====================>[FORMAT AGENDA FILE NAMING]
Instruction #14:

lets say you found some new agenda .. for agenda / documentation type of thing .. you should not edit previous one .. its may be better you create new one .. with name like agenda<date--time>also version .. lets say agenda-07-03-26-<3 digit unique number>-V2.md

====================> [FOCUS ON BACKENDs VARIABLE OVER FRONT_END FOR Slight different VARIABLE]
Instruction #15:

if you think flutter code variable and backend code variable has a slight mismatch .. i think you dont need to change backend code variable .. flutter developer can manually align variable name
later with backend variable name ..

====================> [TRACK UPDATE AT GLOBAL LEVEL]
Instruction #16:

i think your generated support-mode-IMPLEMENTATION-COMPLETE.md is user module related ..
so you should generate this details markdown file in that user module ..
also in global level in qwen folder .. you should just tell ..
some support mode related work done in user.module .. so that a person can go that
markdown file and know what actually was done there

====================> [ADD DATE AT THE END OF MARKDOWN FILE]
Instruction #17:

i think any markdown file you generate should contain at least date at the end .. like
-07-03-26

====================> [DIAGRAM MODIFIED WITH NEW LOGIC ]
Instruction #18:

before that .. as task module is updated .. do your task modules diagram aligned with new task.module logic and everything

====================> [POSTMAN RELATED]
Instruction #19:

as you know after completing backend or while creating backend .. we add endpoint in postman
proper categorically to track all endpoint .. so that we can test all endpoint and share those
to other developers .. now make a .postman_collection file so that i can import that .. and see

====================> [POSTMAN ROLE BASED CATEGORY]
Instruction #20:

dear qwen that you for generating postman collection .. but my postman collection is well categorized by role .. but your collection is not .. your collection is categorized by feature category .. as you have my all figma screen shot .. so you can know about the roles and what role have what pages .. features .. so make category like that and inside role based category then feature wise category .. then endpoint

====================> [ LIST OF OTHER MODULE NEED TO BE GENERATE ]
Instruction #21:

now analyze the figma-asset .. as you generate task.module, group.module, notification.module so far .. what are the other module
.. you want to generate next which should be aligned with figma-asset and askfemi-flutter and Task-Management-website .. but your
main reference should be figma-asset.

====================> [PREVIOUS MODULE CHECK]
Instruction #22:

next i think you want to work to payment.module .. if you check my backend code .. i have also payment.module and  
 subscritpion.module .. before start working on those .. check my codebase first .. then check figma-asset i think my  
 previous projects subscription.module and payment.module is properly aligned with this task management project

====================> [GENEARATE SYSTEM_GUIDE and MODULE_ARCHITECTURE]
Instruction #22:

i love how you generate MODULE_ARCHITECTURE.md and SYSTEM_GUIDE.md for notification module .. can
you generate these for task.module, group.module, analytics.module, subscription.module,
payment.module .. i think besides diagrams these two markdown files are also be helpful to
understand flow and inner modules architecture

====================> [POST MAN COLLECTION RE GENERATE]
Instruction #23:

in postman-collections folder .. you previously create role wise postman collection .. as after that .. we fix and modify so many things .. can you generate postman collections again .. you should generate one by one .. as you cant generate all in one for token issue

====================> [ ]
Instruction #23:

for task.module you generate API_DOCUMENTATION.md .. i think as a backend developer .. i need to
understand the api flow of this whole project .. feature wise .. also figma screen shot wise ..
i think mainly figma screen shot wise .. i think if you want to generate for whole flow .. it
will be tough for you .. generate one by one .. take one postman collection for a role .. check
figma .. then make a api flow .. you find postman collections in @postman-collections/ and you
can genrate flows in that folders "flow" folder

====================> [ ]
Instruction #24:

kokhono ami vul bolle sheta mene niba na .. ei rokom ekta instruction likhte hobe

when you generate any postman collection .. for a endpoint .. if any id needs to be passed in request params .. then dont right that like
{{taskId}}.. write like :taskId //⛺ 📜
bad way : {{baseUrl}}/v1/tasks/{{taskId}}
good way : {{baseUrl}}/v1/tasks/:taskId

====================>

make sure your any docs contains VISUAL SUMMARY.. its actually easier to understand anything ..

===================>

so as you know in @task-management-backend-template/ folder you build a express js backend .. and your
instruction was @task-management-backend-template/src/modules/task.module/masterSystemPromptV0.md and
@task-management-backend-template/\_\_Documentation/qwen/05-summaries-indexes/masterSystemPrompt.md .. now if i
want in parent level @task-mgmt-nest-mongoose folder .. like you create this folder .. then generate that
applications nestjs version .. 1000x scalable .. top senior level thing .. and generate like so that i can
learn the express to nest transition .. i know you cant generate all at once .. generate one by one .. pause
.. take rest .. know issue ..

=========================>

 i know you migrate express to nest js based on
    @task-mgmt-nest-mongoose/__Documentation/qwen/MASTER_SYSTEM_PROMPT_NESTJS-17-03-26.md .. now i think you should generate  
    some docs under @task-mgmt-nest-mongoose/__Documentation/  so that i can learn nest js .. concept that you have in nest js

    codebase .. make different different markdown file for different different concept .. teach me like i am a kid .. i know you
     cant generate at once .. generate one by one .. take time .. no issue ,, master me in nest js ..