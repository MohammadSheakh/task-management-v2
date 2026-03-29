//===============  9/3/26

this task management app has individual user and business user (parent, teacher) .. individual user can create account from app .. but he must purchase "individual user" subscription .. then teacher or parent can create account from admin dashboard.. but they need to purchase business subscription .. if they purchase business subscription .. then they can create 4 childreans account .. if business level one subscription .. then 40 childreans account , if business level two, then 40+ childrean account. 


//===============  9/3/26

dear qwen.. your understanding is wrong .. admin dont create business .. business user register himself ..
  then purchase any subscription like business_starter / business_level1 / business_level2 .. then what you
  develop is user needs to create group or family .. but the fact is may be in figma Ui i dont think there
  are any group or family concept .. just children concept .. like business user can create childrean
  account .. may be we can create childrenBusinessUser Table .. which means one business user can have many
  children .. or if i consider your family / group concept .. make sure one business user can have only one
  group .. can not have multiple group .. and when a business user create a children .. its automatically
  check if any group/ family exist or not .. if exist .. then assign that childrean to that group/family ..
  otherwise create a group/family then assign ..

//===============  9/3/26

now i tell you my usecases .. parent can create a task .. and create multiple subTask for that
  task .. now as that task is collaborative .. then parent add their some children to that task
  .. lets say child1 and child2 .. so parent assign a children that task level not subTask level
  ..  and once a child1 complete that tasks all subTask .. that task will be completed by child1
  .. and child2 can see that child1 is completed that task .. or it showing in-progress or
  not-started .. parent can see which child start ,,, which child complete that task .. this is
  my projects situation .. also for individual task .. normal flow