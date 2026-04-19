comment structure of backend 

if comment is one line .. and its normal

// comment here... 

if comment is one or two line .. but its special

/*-─────────────────────────────────
|  comment here...
└──────────────────────────────────*/

if exact two line comment 

/*-─────────────────────────────────
|  comment here...
└──────────────────────────────────*/

if comment is more then two line  and comment is inside a function

/**
 *
 * comment here...
 * 
 */

before any function, controller service .. use traditional JSDoc standard style




dear qwen i see you have @src/modules/task.module/doc/API_DOCUMENTATION.md  .. i see in group.module you   
    dont have any this kind of API_DOCUMENTATION .. make a documentation also here and if you found any        
    description or relation with figma screenshots @figma-asset/  .. then add those in that documentation

/*-─────────────────────────────────
|  Notification Related
└──────────────────────────────────*/


please check @src/helpers/socket/socketForChatV3.ts  and @src/helpers/redis/redisStateManagerForSocketV2.ts ...        
    previously a person receive notification in real time by socket .. and admin end .. if any admin listen
    notificaiton::admin .. then he can notification in real time .. and notification::loggedInUserId ,.. then a person also

    get real time notification red dot .. this kind of thing .. what does your @src/modules/notification.module/  actually 
    does .. does that use socket or someting . or just rest api