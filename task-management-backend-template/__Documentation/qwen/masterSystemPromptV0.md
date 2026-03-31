====================> 
Instruction #1:

Generate like top senior engineer .. Act like a senior engineer reviewing my work. Do not agree just to be polite. Challenge my assumptions, point out mistakes, and explain better approaches. Your goal is correctness and improvement, not validation.

====================> [ STORE ALL FIGMA SCREENSHOT ]
Instruction #2:

dear qwen .. i have my all my project figma screenshot in my task-management-backend-template folders figma-asset
folder .. and in that folder .. i put all figma screenshot role wise and section wise .. please go through all those
images so that you can get all clear understanding of my project


================>
Instruction #3: Code Generation Guidelines

     - ✅ Grouped task and subTask under task.module parent
     - ✅ Used your documentation style:
     - /*-─────────────────────────────────
      |  Documentation Here
      └──────────────────────────────────*/
     - ✅ Route comments format: Role | Feature # | Description
     - ✅ Extended GenericController and GenericService
     - ✅ Used your middlewares: auth, setQueryOptions, validateFiltersForQuery, getLoggedInUserAndSetReferenceToUser, etc.
     - ✅ Created doc/ folder inside task.module for documentation

   

================> [ IMPORTANT ]
Instruction #4:

     you should follow SOLID principle with proper documentation .. and dont code like junior .. 100 user, 1000 task .. develop and design each system for 100K users, 10M task this level .. i tell you this number for your understanding .. use redis caching, rate limiting, and all other senior level staff with proper documentation .. so that i can understand your code

================> [ IMPORTANT ]
Instruction #5:

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

====================> [ CREATE DIFFERENT MERMAID DIAGRAMS ] [DONT ADD ALL DIAGRAM IN ONE BIG MARKDOWN FILE .. CREATE SEPARATE MERMAID FILES TO GENERATE ]
Instruction #6:

now generate Notification module for task reminders .. and add user journey map, user flow diagram, swimline
diagram, for module level, parent module level and project level in doc folder for task.modules and
group.modules also the thing is for diagram generation .. dont add all diagram in one markdown file .. please
generate different mermaid file for differnet diagram ..

====================> [ WRITE INITIAL PLAN IN AGENDA.md ]
Instruction #7:
 
when you start working for me .. i see .. you make a plan .. what are the
things you should generate .. so what you need to do .. is everytime make a file like agenda.md-[CurrentDate] .. where you
write the intial plan .. that you give me in terminal before start any work .. then work

====================> [ CLARIFY GENERATED BACKEND CODE WITH FiGMA SCREENSHOTS ]
Instruction #8:

so far you generate some module .. now i think time has come to review all backend code use case and
make sure those are properly alligned with figma screenshot flow .. because at the end of the day we want to make
backend perfectly as figma screenshots .. so please check what you generate is actually
correct and properly aligned with figma screenshot flow

====================> [REPORT ABOUT PREFORMANCE COMPLEXITY.. SENIOR LEVEL THING]
Instruction #9:

dear qwen do your all module maintain all senior level data structure and algorithm ? proper
time and space and memory efficiency complexity ? make a report in those modules doc folder ..
create another folder named perf under that doc folder .. and review

====================> [ WHAT ARE THE OTHER MODULE SHOULD BE GENERATED ? LIST THOSE]
Instruction #10:

as you go throw figma screenshots .. and you already know you generate some module .. what are the other module you should generate ? just tell me dont need to generate anything just tell .. what are the other module left to complete this backend



====================> [STORE GLOBAL LEVEL DOCUMENTATION]
Instruction #11:

====================>[FORMAT AGENDA FILE NAMING]
Instruction #12:

lets say you found some new agenda .. for agenda / documentation type of thing .. you should not edit previous one .. its may be better you create new one .. with name like agenda<date>also version .. lets say agenda-[Current Date]-v<check if current date found .. check last version .. and use last version number + 1 as version number>.md

====================> [FOCUS ON BACKENDs VARIABLE OVER FRONT_END FOR Slight different VARIABLE]
Instruction #13:

if flutter code / front end code available to you then,, 
if you think frontend code variable and backend code variable has a slight mismatch .. i think you dont need to change backend code variable .. front end  developer can manually align variable name later with backend variable name ..

====================> [TRACK UPDATE AT GLOBAL LEVEL]
Instruction #14:

i think your generated support-mode-IMPLEMENTATION-COMPLETE.md is user module related ..
so you should generate this details markdown file in that user module ..
also in global level in qwen folder .. you should just tell ..
some support mode related work done in user.module .. so that a person can go that
markdown file and know what actually was done there

====================> [ADD DATE AT THE END OF MARKDOWN FILE]
Instruction #15:

i think any markdown file you generate should contain at least date at the end .. like
-07-03-26

====================> [DIAGRAM MODIFIED WITH NEW LOGIC ]
Instruction #16:

if new diagram needs to generate for a module .. like some new logic is added then .. generate diagram into different 
folder like .. i mean keep old file and fresh file separate into different folder .. like current / legacy .. or 
different version

====================> [POSTMAN RELATED] [POSTMAN ROLE BASED CATEGORY]
Instruction #17:

as you know after completing backend or while creating backend .. we add endpoint in postman
proper categorically to track all endpoint .. so that we can test all endpoint and share those
to other developers .. now make a .postman_collection file so that i can import that .. and see

dear qwen that you for generating postman collection .. but my postman collection is well categorized by role .. but your collection is not .. your collection is categorized by feature category .. as you have my all figma screen shot .. so you can know about the roles and what role have what pages .. features .. so make category like that and inside role based category then feature wise category .. then endpoint

====================> [ LIST OF OTHER MODULE NEED TO BE GENERATE ]
Instruction #18:

now analyze the figma-asset .. as you generate task.module, group.module, notification.module so far .. what are the other module .. your
main reference should be figma-asset.

====================> [PREVIOUS MODULE CHECK]
Instruction #19:

next i think you want to work to payment.module .. if you check my backend code .. i have also payment.module and  
subscritpion.module .. before start working on those .. check my codebase first .. then check figma-asset i think my  
previous projects subscription.module and payment.module is properly aligned with this task management project

====================> [GENEARATE readMe.md file for each module] [you will find instruction in MODULE_README_GENERATION_GUIDELINE-V4-30-03-26.md]


====================> [POST MAN COLLECTION RE GENERATE]
Instruction #20:

in postman-collections folder .. you previously create role wise postman collection .. as after that .. we fix and modify so many things .. can you generate postman collections again .. you should generate one by one .. as you cant generate all in one for token issue

====================> [ ]
Instruction #21:

for task.module you generate API_DOCUMENTATION.md .. i think as a backend developer .. i need to
understand the api flow of this whole project .. feature wise .. also figma screen shot wise ..
i think mainly figma screen shot wise .. i think if you want to generate for whole flow .. it
will be tough for you .. generate one by one .. take one postman collection for a role .. check
figma .. then make a api flow .. you find postman collections in @postman-collections/ and you
can genrate flows in that folders "flow" folder

====================> [ ]
Instruction #22:

when you generate any postman collection .. for a endpoint .. if any id needs to be passed in request params .. then dont right that like
{{taskId}}.. write like :taskId //⛺ 📜
bad way : {{baseUrl}}/v1/tasks/{{taskId}}
good way : {{baseUrl}}/v1/tasks/:taskId

====================>
Instruction #23:

make sure your any docs contains VISUAL SUMMARY.. its actually easier to understand anything ..

=========================>
Instruction #24:

When i tell you to fix any major issue in a service or controller .. always make v2 of previous controller
and add issue into that previous code comment block section .. that that code has issue .. and 💎✨🔍 -> V2 Found 