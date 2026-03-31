# Task Status Update V2 - Support Mode Based Creative Responses

**Created**: 31-03-26  
**Version**: 2.0  
**Feature**: Creative responses based on child's support mode and task completion percentage  

---

## 🎯 OVERVIEW

The V2 task status endpoint provides **personalized, creative responses** based on:
1. **Child's support mode** (calm, encouraging, logical)
2. **Task completion percentage** (50%, 100%)
3. **Task type** (single assignment vs collaborative)

This creates an emotionally intelligent UX that matches each child's communication preferences.

---

## 🎨 SUPPORT MODES

Based on Figma: `response-based-on-mode.png`

### 1. **Logical Mode** 🧠
**Style**: Direct, factual, progress-focused

**50% Complete:**
```
{
  title: "Progress update",
  message: "50% of the assigned work has been completed.",
  icon: "📋",
  color: "#4ADE80" // Green
}
```

**100% Complete:**
```
{
  title: "Task completed",
  message: "All scheduled tasks have been completed. Today's productivity goal has been achieved.",
  icon: "🐧", // Penguin mascot
  buttonText: "Well done",
  color: "#4ADE80"
}
```

---

### 2. **Calm Mode** 
**Style**: Gentle, reassuring, mindfulness-focused

**50% Complete:**
```
{
  title: "Good job! 🌸",
  message: "You're halfway there. Take it step by step — you're doing just fine.",
  icon: "📊",
  color: "#93C5FD" // Light blue
}
```

**100% Complete:**
```
{
  title: "Task completed",
  message: "You've completed all your tasks for today. Take a moment to breathe — you did well.",
  icon: "🐧",
  color: "#93C5FD",
  buttonText: "Continue"
}
```

---

### 3. **Encouraging Mode** 🎉
**Style**: Enthusiastic, celebratory, motivational

**50% Complete:**
```
{
  title: "Great job! 🌟",
  message: "You've completed 50% of your work — keep going!",
  icon: "📝",
  color: "#C4B5FD" // Purple
}
```

**100% Complete:**
```
{
  title: "Amazing work! 🎊",
  message: "You completed all your tasks today. Keep the momentum going — you're on fire! 🔥",
  icon: "🐧",
  color: "#C4B5FD",
  buttonText: "Awesome!"
}
```

---

## 📋 API ENDPOINT

### Route
```
PUT /api/v1/tasks/:id/status/v2
```

### Request
```json
{
  "status": "completed"
}
```

### Response Structure

```typescript
interface TaskStatusV2Response {
  success: boolean;
  code: number;
  message: string;
  data: {
    task: ITask;
    creativeResponse: {
      mode: TSupportMode;
      milestone: '50_percent' | '100_percent' | 'started';
      popup: {
        title: string;
        message: string;
        icon?: string;
        color?: string;
        buttonText?: string;
      };
      showPopup: boolean;
    };
    progressStats?: {
      completedPercentage: number;
      totalSubtasks: number;
      completedSubtasks: number;
    };
  };
}
```

---

## 🔧 IMPLEMENTATION

### Service Method: `updateTaskStatusV2`

```typescript
async updateTaskStatusV2(
  taskId: string,
  status: TTaskStatus,
  userId: Types.ObjectId,
): Promise<{
  task: ITask;
  creativeResponse: ICreativeResponse;
  progressStats?: IProgressStats;
}> {
  // 1. Update task status
  const task = await this.updateTaskStatus(taskId, status, userId);
  
  // 2. Get user's support mode
  const userProfile = await UserProfile.findOne({ userId }).lean();
  const supportMode = userProfile?.supportMode || SupportMode.LOGICAL;
  
  // 3. Calculate completion percentage
  const completionPercentage = task.completedSubtasks / task.totalSubtasks * 100;
  
  // 4. Generate creative response
  const creativeResponse = this.generateCreativeResponse(
    supportMode,
    status,
    completionPercentage
  );
  
  return {
    task,
    creativeResponse,
    progressStats: {
      completedPercentage: Math.round(completionPercentage),
      totalSubtasks: task.totalSubtasks,
      completedSubtasks: task.completedSubtasks,
    }
  };
}
```

### Creative Response Generator

```typescript
private generateCreativeResponse(
  supportMode: TSupportMode,
  taskStatus: TTaskStatus,
  completionPercentage: number
): ICreativeResponse {
  // Determine milestone
  let milestone: '50_percent' | '100_percent' | 'started' = 'started';
  
  if (taskStatus === TaskStatus.COMPLETED || completionPercentage >= 100) {
    milestone = '100_percent';
  } else if (completionPercentage >= 50) {
    milestone = '50_percent';
  }
  
  // Get mode-specific messages
  const messages = this.getCreativeMessages(supportMode, milestone);
  
  return {
    mode: supportMode,
    milestone,
    popup: {
      title: messages.title,
      message: messages.message,
      icon: messages.icon,
      color: this.getModeColor(supportMode),
      buttonText: messages.buttonText,
    },
    showPopup: milestone !== 'started',
  };
}

private getCreativeMessages(
  supportMode: TSupportMode,
  milestone: string
): ICreativeMessage {
  const messages = {
    [SupportMode.LOGICAL]: {
      '50_percent': {
        title: 'Progress update',
        message: '50% of the assigned work has been completed.',
        icon: '📋',
        buttonText: 'Continue',
      },
      '100_percent': {
        title: 'Task completed',
        message: 'All scheduled tasks have been completed. Today\'s productivity goal has been achieved.',
        icon: '🐧',
        buttonText: 'Well done',
      },
    },
    [SupportMode.CALM]: {
      '50_percent': {
        title: 'Good job! 🌸',
        message: 'You\'re halfway there. Take it step by step — you\'re doing just fine.',
        icon: '📊',
        buttonText: 'Continue',
      },
      '100_percent': {
        title: 'Task completed',
        message: 'You\'ve completed all your tasks for today. Take a moment to breathe — you did well.',
        icon: '🐧',
        buttonText: 'Continue',
      },
    },
    [SupportMode.ENCOURAGING]: {
      '50_percent': {
        title: 'Great job! 🌟',
        message: 'You\'ve completed 50% of your work — keep going!',
        icon: '📝',
        buttonText: 'Keep it up!',
      },
      '100_percent': {
        title: 'Amazing work! 🎊',
        message: 'You completed all your tasks today. Keep the momentum going — you\'re on fire! 🔥',
        icon: '🐧',
        buttonText: 'Awesome!',
      },
    },
  };
  
  return messages[supportMode][milestone];
}

private getModeColor(supportMode: TSupportMode): string {
  const colors = {
    [SupportMode.LOGICAL]: '#4ADE80',    // Green
    [SupportMode.CALM]: '#93C5FD',       // Light blue
    [SupportMode.ENCOURAGING]: '#C4B5FD', // Purple
  };
  
  return colors[supportMode];
}
```

---

## 🧪 TESTING

### Test Case 1: Logical Mode - 100% Complete

```bash
curl -X PUT http://localhost:5000/api/v1/tasks/:taskId/status/v2 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Expected Response (Logical mode user):
{
  "success": true,
  "code": 200,
  "message": "Task status updated successfully",
  "data": {
    "task": { ... },
    "creativeResponse": {
      "mode": "logical",
      "milestone": "100_percent",
      "popup": {
        "title": "Task completed",
        "message": "All scheduled tasks have been completed. Today's productivity goal has been achieved.",
        "icon": "🐧",
        "color": "#4ADE80",
        "buttonText": "Well done"
      },
      "showPopup": true
    },
    "progressStats": {
      "completedPercentage": 100,
      "totalSubtasks": 5,
      "completedSubtasks": 5
    }
  }
}
```

### Test Case 2: Calm Mode - 50% Complete

```bash
# User with calm support mode, 3/6 subtasks completed
curl -X PUT http://localhost:5000/api/v1/tasks/:taskId/status/v2 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "inProgress"}'

# Expected Response (Calm mode user):
{
  "creativeResponse": {
    "mode": "calm",
    "milestone": "50_percent",
    "popup": {
      "title": "Good job! 🌸",
      "message": "You're halfway there. Take it step by step — you're doing just fine.",
      "icon": "📊",
      "color": "#93C5FD"
    },
    "showPopup": true
  }
}
```

### Test Case 3: Encouraging Mode - 100% Complete

```bash
# User with encouraging support mode completes task
curl -X PUT http://localhost:5000/api/v1/tasks/:taskId/status/v2 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Expected Response (Encouraging mode user):
{
  "creativeResponse": {
    "mode": "encouraging",
    "milestone": "100_percent",
    "popup": {
      "title": "Amazing work! 🎊",
      "message": "You completed all your tasks today. Keep the momentum going — you're on fire! 🔥",
      "icon": "🐧",
      "color": "#C4B5FD",
      "buttonText": "Awesome!"
    },
    "showPopup": true
  }
}
```

---

## 📊 MILESTONE DETECTION

| Completion % | Task Status | Milestone | Show Popup |
|--------------|-------------|-----------|------------|
| 0-49% | inProgress | `started` | ❌ No |
| 50-99% | inProgress | `50_percent` | ✅ Yes |
| 100% | completed | `100_percent` | ✅ Yes |

---

## 🎯 FEATURES

### ✅ What It Does

1. **Detects User's Support Mode** from UserProfile
2. **Calculates Completion Percentage** from subtasks
3. **Generates Creative Response** based on mode + milestone
4. **Returns Mode-Specific Colors** for UI theming
5. **Includes Progress Stats** for dashboard updates
6. **Backward Compatible** - V1 endpoint still works

### ❌ What It Doesn't Do

- Doesn't change task logic (still uses existing `updateTaskStatus`)
- Doesn't modify database schema
- Doesn't affect non-child users (falls back to logical mode)

---

## 🔗 INTEGRATION POINTS

### Frontend Integration

```typescript
// Flutter/React receives response
const response = await updateTaskStatus(taskId, 'completed');

if (response.data.creativeResponse.showPopup) {
  // Show popup with mode-specific styling
  showCelebrationPopup({
    title: response.data.creativeResponse.popup.title,
    message: response.data.creativeResponse.popup.message,
    icon: response.data.creativeResponse.popup.icon,
    color: response.data.creativeResponse.popup.color,
    buttonText: response.data.creativeResponse.popup.buttonText,
  });
}

// Update progress stats
updateProgressStats(response.data.progressStats);
```

### Real-time Updates

```typescript
// Socket event emitted
socket.emit('task:status-updated-v2', {
  taskId,
  userId,
  status: 'completed',
  creativeResponse: response.data.creativeResponse,
  progressStats: response.data.progressStats,
});
```

---

## 📝 FILES TO CREATE/MODIFY

### New Files
- `task.service.ts` - Add `updateTaskStatusV2()` method
- `task.controller.ts` - Add `updateStatusV2` controller
- `task.validation.ts` - Add validation schema (reuse existing)
- `task.route.ts` - Add `/status/v2` route

### Documentation
- `doc/TASK_STATUS_V2_CREATIVE_RESPONSES-31-03-26.md`
- `doc/dia/task-status-v2-sequence.mermaid`
- `doc/dia/task-status-v2-user-flow.mermaid`

---

## 🎨 UI IMPLEMENTATION GUIDE

### Popup Component Props

```typescript
interface CreativePopupProps {
  title: string;
  message: string;
  icon?: string;
  color: string; // Background color
  buttonText?: string;
  onClose: () => void;
}
```

### Example Usage (Flutter)

```dart
showDialog(
  context: context,
  builder: (context) => CreativePopup(
    title: response.popup.title,
    message: response.popup.message,
    icon: response.popup.icon,
    backgroundColor: HexColor(response.popup.color),
    buttonText: response.popup.buttonText,
    onButtonPressed: () => Navigator.pop(context),
  ),
);
```

---

## ✅ BENEFITS

1. **Personalized UX** - Each child gets communication style they prefer
2. **Emotional Intelligence** - Celebrates milestones appropriately
3. **Gamification** - Progress popups motivate continued engagement
4. **Parent Satisfaction** - Professional, thoughtful design
5. **Flexible** - Easy to add new modes or messages

---

**Version**: 1.0  
**Created**: 31-03-26  
**Status**: Ready for Implementation

---

-31-03-26
