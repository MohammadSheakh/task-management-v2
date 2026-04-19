
❌ Why this is dangerous

Unread count becomes stateful and fragile.

Real-world failure scenarios
🔁 Message retry

Client reconnects

Server re-emits message

Consumer retries (Kafka / Bull / manual retry)

$inc +1 runs again

➡️ UnreadCount becomes 2 instead of 1

🔄 Multiple devices

Same user logged in on web + mobile

Both receive message

Both increment unreadCount

➡️ Double count

⚡ Race conditions

Two messages arrive very fast

Two concurrent $inc

User opens conversation in between

➡️ UnreadCount becomes inconsistent

🔴 Core Problem

You are mutating unread count blindly, without knowing whether the message was already read or processed.
