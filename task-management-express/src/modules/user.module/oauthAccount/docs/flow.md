### 2. The Full Flow

Google Login Request
       │
       ▼
[Controller] googleAuthCallback
       │
       ├─► Extract: { providerId, email, name, picture } from Google token
       │
       ├─► OAuthAccount.findOne({ authProvider: 'google', providerId })
       │         │
       │    ┌────┴────────────────────────────────────────┐
       │    │ Found                                        │ Not Found
       │    ▼                                              ▼
       │  User.findById(oAuth.userId)         User.findOne({ email })
       │    │                                      │
       │    │                              ┌───────┴───────────┐
       │    │                              │ Found (local acct) │ Not Found
       │    │                              ▼                    ▼
       │    │                         Link OAuth          Create new User
       │    │                         to existing         + UserProfile
       │    │                         user                + OAuthAccount
       │    │
       │    └──► Update lastUsedAt, accessToken
       │
       ▼
Generate JWT → return tokens