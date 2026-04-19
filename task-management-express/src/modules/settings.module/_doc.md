┌─────────────────────────────────┐
│  findOneAndUpdate({}, payload)  │
│  options: { upsert: true }      │
└──────────────┬──────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Document exists?     │
    └───────┬──────┬───────┘
            │      │
         YES│      │NO
            │      │
            ▼      ▼
    ┌─────────┐  ┌─────────┐
    │ UPDATE  │  │ CREATE  │
    │ existing│  │  new    │
    │ document│  │ document│
    └─────────┘  └─────────┘
            │      │
            └──┬───┘
               ▼
    ┌──────────────────────┐
    │ Return document      │
    │ (with new: true)     │
    └──────────────────────┘