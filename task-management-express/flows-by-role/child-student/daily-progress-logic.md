The user wants me to explain the business logic of the /tasks/daily-progress/v2?date=2026-03-17 endpoint. Let me read  
    the implementation to understand the logic.

  ✦ Daily Progress V2 - Business Logic

    🎯 Purpose
    Shows a daily snapshot of the user's task progress on the home screen (Figma shows "1/5" progress bar).

    ---

    📋 Input
     - userId - from authenticated user
     - date - query param (default: today)

    ---

    ⚙️ Logic Flow

     1. Fetch all tasks for the user on that specific date
        - Filters by startTime within the day (00:00 - 23:59)
        - Includes tasks where user is ownerUserId OR in assignedUserIds
        - Excludes deleted tasks

     2. Calculate statistics

     1    total = all tasks for that day
     2    completed = tasks with status === "completed"
     3    inProgress = tasks with status === "inProgress"
     4    pending = tasks with status === "pending"
     5    remaining = total - completed

     3. Build task list with subtask info
       For each task:
        - Task basic info (title, status, startTime, taskType)
        - Subtask progress: { total, completed } (if task has subtasks)
        - Progress percentage:
          - If has subtasks: (completedSubtasks / totalSubtasks) * 100
          - If no subtasks: 100% if completed, else 0%

     4. Generate encouragement message

     1    if completed === 0:
     2      "No tasks completed yet. Let's get started!"
     3    else if completed === total:
     4      "All tasks completed! Amazing work! 🎉"
     5    else:
     6      "{remaining} task(s) remaining. You've got this!"

     5. Return response

      1    {
      2      "date": "2026-03-17",
      3      "progress": {
      4        "completed": 1,
      5        "total": 5,
      6        "display": "1/5",
      7        "percentage": 20
      8      },
      9      "statistics": {
     10        "total": 5,
     11        "completed": 1,
     12        "pending": 3,
     13        "inProgress": 1,
     14        "remaining": 4
     15      },
     16      "encouragementMessage": "4 tasks remaining. You've got this!",
     17      "tasks": [...]
     18    }

     6. Cache for 2 minutes

    ---

    🔍 Key Observations

     - Uses task-level status (not subtask-level) to determine completed/pending
     - Progress bar shows completed/total at task level
     - Subtask progress is tracked per-task but doesn't affect overall daily progress
     - Cached heavily (2 min) since it's a home screen widget
