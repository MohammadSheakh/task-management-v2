// may be we just set and get OTP in redis .. 
// dont need to store OTP in Mongo Db Database ..

> key format

otp:verify-email:{userId}
otp:reset-pass:{userId}
otp:login:{email}

login:attempt:{email}      TTL 15m
lock:user:{userId}         TTL 15m

> value

{
    code : "32323",
    attempts : 0
}

TTL : 5 minutes

// Add Auth Audit Log
AuthAuditLog{
    userId,
    type : LOGIN_SUCCESS | LOGIN_FAIL | PASSWORD_CHANGE | LOCKED
    ip,
    device,
    createdAt
}




