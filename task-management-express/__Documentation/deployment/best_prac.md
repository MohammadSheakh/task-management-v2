## 🔥 SENIOR JS TRAINING — DAY 9
## Security, Auth, and Real Backend Threats
## Day 9 homework
1. how to prevent mass assignment in Nodejs
```ts

    const allowed = [ "name", "email" ]
    const data = {};
    for (const key of allowed){
        if(req.body[key] !== undefined){
            data[key] = req.body[key]
        }
    }

    await User.update(id, data);

``` 

> 2. Design a secure password reset flow.
```ts

```

> 10 < Senior Rules
```ts
    1. always validate input
    2. use short lived token + refresh
    3. design api assuming hostile clients
```

> 9 < Payment API example
```ts
    1. verify JWT
    2. check user role / ownership
    3. check rate limit
    4. start DB transaction (atomic)
    5. deduct balance
    6. enqueue notification
    7. commit transaction 
```

> 8 < Logging and monitoring
```ts
    1.
```

> 7 < Rate Limiting /  DDOS
```ts
    1. Redis backed counter ( sliding window / token bucket )
    2. per IP + per - user
    3. protect critical endpoints
```

> 6 < SESSION / COOKIE BEST PRACTICES

> 4 < Common attack vectors

> 3 < Authorization
```ts
    ✅ Senior optimization:
        Cache permissions in Redis
        Use Set for O(1) lookup
```

> 2 < Authentication pattern

## 🚀 Day 10 → Staff-level backend: scaling, cluster, multi-region, advanced Node patterns true senior engineer territory 💪
1. 
```ts

``` 

##
1. 
```ts

``` 