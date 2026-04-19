generate one readme file per module .. which contains 

1. module overview
2. key features
3. module structure
4. architecture design [ design principle ]
5. redis cache key with proper description usecase
6. different service visual flow 
7. key service methods with each service steps / Key business logic flow for better understanding
    also that service is related to which figma screenshot or flow that note .. so that we understand that service is realted with which figma flow .. if any section also have socket real time implementation
    then keep them together like for a feature rest api and socket thing together .. so that we understand real time feature available for which section  and also redis cache key + endpoint + middleware needed also  .. like all thing together

🔹 Events (if you use queue/socket)
emits: [].created
listens: [].completed


🔹 Dependencies
uses: [] module
uses: [] module

-- target : new dev can: understand a module in 15 minutes

//=======================

for example .. lets say  one service is 
"create child account flow"

so your documentation should not be three different section
dataflow, api endpoint, service ..  because i see for a service
you create 3 separate section in those categories .. but i want 
everything in one place .. like for example 

Service :
===========
Create Child account flow 

**Endpoint**: `POST /children-business-users/children`  
**Figma-Flow-ScreenShot-File Name if found** : "figma-asset\app-user\group-children-user\home-flow.png"
**Role**: Business User (Parent/Teacher)  
**Auth**: Required  
**Rate Limit**: 3 requests/hour (strict)  
**Middleware**: `auth(TRole.business)`, `rateLimiter('strict')`, `validateRequest(createChildValidationSchema)`

Parent (Business User)
    ↓
POST /children-business-users/children
    ↓
Controller: createChild()
    ↓
Service: createChildAccount()
    ├─→ Verify business user exists
    ├─→ Check email uniqueness
    ├─→ Hash password (bcrypt 12 rounds)
    ├─→ Create UserProfile (supportMode, location, dob, gender)
    ├─→ Create User account (role: child)
    ├─→ Create relationship record
    ├─→ Send credentials email (async)
    ├─→ Invalidate Redis cache
    └─→ Return { childUser, relationship }
    ↓
Response: 201 Created

above flow should be in collapsible section



**Redis Cache Keys Invalidated**: (also where in which service or function we should invalidate these)
- `children:business:{userId}:children` (TTL: 10 min)

### related Socket Events with usecase description 



then in collapsible section inside table .. 
left side request .. right side response
first row is for header like request response..
second row is for full request or response .. not multiple row ..  for example


<details>
<summary>📦 <b>Click to view Request/Response</b></summary>

<table>
<tr>
<th>Request</th>
<th>Response</th>
</tr>
<tr>
<td>

**Method:** `GET`  
**Path:** `/team-members/list/v3`  
**Query:** `?page=1&limit=10`  
**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

</td>
<td>

**Status:** `200 OK`  
**Body:**
```json
{
  
}
```

</td>
</tr>
</table>

</details>

=================> add change log 
## 📜 Changelog
| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 30-03-26 | Added invitation flow, Redis caching v2 |
| 1.1 | 15-03-26 | Fixed cache invalidation bug |
| 1.0 | 01-03-26 | Initial release |

=================>
 Add "Security Notes" Callout
 Shows you've thought about compliance