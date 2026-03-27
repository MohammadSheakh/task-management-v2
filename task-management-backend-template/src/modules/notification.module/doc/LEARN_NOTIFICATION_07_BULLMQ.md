# 🟡 Chapter 7: BullMQ Async Processing

**Version**: 1.0
**Date**: 26-03-23
**Difficulty**: Intermediate
**Prerequisites**: Chapters 1-6 completed

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ Why async processing is essential
- ✅ Queue configuration (4 queues)
- ✅ Job processing workflow
- ✅ Retry logic (3 attempts, exponential backoff)
- ✅ Multi-channel delivery (in-app, email, push, SMS)
- ✅ Error handling and logging

---

## 📊 Why Async Processing?

### **The Problem With Synchronous Processing:**

```
User creates notification
     ↓ (Wait for email service)
Send email (2 seconds)
     ↓ (Wait for push service)
Send push (500ms)
     ↓ (Wait for SMS service)
Send SMS (1 second)
     ↓
Response to user: 3.5 seconds ❌
```

**Issues**:
- ❌ Slow response time (3.5+ seconds)
- ❌ User blocked waiting
- ❌ Service failures block everything
- ❌ No retry mechanism
- ❌ Poor scalability

---

### **The Solution With Async Processing:**

```
User creates notification
     ↓
Save to DB (50ms)
     ↓
Add to queue (10ms)
     ↓
Response to user: 60ms ✅
     ↓
Background worker processes:
  - Send email (async)
  - Send push (async)
  - Send SMS (async)
```

**Benefits**:
- ✅ Fast response time (60ms)
- ✅ User not blocked
- ✅ Automatic retry on failure
- ✅ Scalable (multiple workers)
- ✅ Better error handling

---

## 🏗️ Queue Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BULLMQ QUEUES                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Queue 1: notificationQueue-e-learning                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Purpose: Process in-app notifications              │    │
│  │ Concurrency: 10 jobs                               │    │
│  │ Retry: 3 attempts, exponential backoff             │    │
│  │ Avg Processing: 50ms                               │    │
│  │ Worker: startNotificationWorker()                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Queue 2: task-reminders-queue                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Purpose: Process scheduled reminders               │    │
│  │ Concurrency: 5 jobs                                │    │
│  │ Retry: 3 attempts, exponential backoff             │    │
│  │ Avg Processing: 100ms                              │    │
│  │ Worker: startTaskRemindersWorker()                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Queue 3: notify-participants-queue-suplify               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Purpose: Notify chat participants                  │    │
│  │ Concurrency: 10 jobs                               │    │
│  │ Retry: 3 attempts, exponential backoff             │    │
│  │ Avg Processing: 200ms                              │    │
│  │ Worker: startNotifyParticipantsWorker()            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Queue 4: updateConversationsLastMessageQueue-suplify     │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Purpose: Update conversation last message          │    │
│  │ Concurrency: 5 jobs                                │    │
│  │ Retry: 3 attempts, exponential backoff             │    │
│  │ Avg Processing: 50ms                               │    │
│  │ Worker: startUpdateConversationsLastMessageWorker()│    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Queue Configuration

### **Basic Queue Setup:**

```typescript
import { Queue, Worker } from 'bullmq';
import { redisPubClient } from '../redis/redis';

// Create notification queue
export const notificationQueue = new Queue(
  'notificationQueue-e-learning',
  {
    connection: redisPubClient.options,
  }
);

// Create task reminders queue
export const taskRemindersQueue = new Queue(
  'task-reminders-queue',
  {
    connection: redisPubClient.options,
  }
);
```

---

### **Queue Configuration Options:**

```typescript
const queueConfig = {
  // Redis connection
  connection: {
    host: 'localhost',
    port: 6379,
  },
  
  // Default job options
  defaultJobOptions: {
    attempts: 3,  // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 5000,  // 5 seconds base delay
    },
    removeOnComplete: {
      age: 3600,  // Remove after 1 hour
    },
    removeOnFail: {
      age: 86400,  // Remove failed jobs after 24 hours
    },
  },
};

const notificationQueue = new Queue('notifications', queueConfig);
```

---

## 🔁 Worker Configuration

### **Basic Worker:**

```typescript
import { Worker } from 'bullmq';

export const startNotificationWorker = () => {
  const worker = new Worker(
    'notificationQueue-e-learning',
    async (job) => {
      const { id, name, data } = job;
      
      logger.info(`Processing notification job ${id} ⚡ ${name}`, data);
      
      try {
        // Process the job
        await processNotification(data);
        
        logger.info(`✅ Notification job ${id} completed`);
      } catch (err: any) {
        errorLogger.error(`❌ Notification job ${id} failed:`, err);
        throw err;  // Re-throw to trigger retry
      }
    },
    {
      connection: redisPubClient.options,
      concurrency: 10,  // Process 10 jobs simultaneously
    }
  );
  
  // Event handlers
  worker.on('completed', (job) =>
    logger.info(`✅ Job ${job.id} completed`)
  );
  
  worker.on('failed', (job, err) =>
    errorLogger.error(`❌ Job ${job?.id} failed`, err)
  );
  
  worker.on('error', (err) =>
    errorLogger.error('Worker error:', err)
  );
};
```

---

### **Worker Concurrency:**

```typescript
// Low concurrency (1-5 jobs)
// Use for: Heavy operations, database writes
const worker1 = new Worker('queue1', processor, {
  concurrency: 3,
});

// Medium concurrency (5-10 jobs)
// Use for: Standard operations
const worker2 = new Worker('queue2', processor, {
  concurrency: 10,
});

// High concurrency (10-50 jobs)
// Use for: Light operations, API calls
const worker3 = new Worker('queue3', processor, {
  concurrency: 50,
});
```

---

## 📤 Adding Jobs to Queue

### **Basic Job:**

```typescript
// Add job to queue
await notificationQueue.add(
  'sendNotification',  // Job name
  {
    notificationId: '123',
    receiverId: 'user123',
    channels: ['in_app', 'email'],
    title: 'Task Assigned',
    subTitle: 'You have a new task',
  },
  {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  }
);
```

---

### **Delayed Job:**

```typescript
// Schedule for future delivery
const scheduledTime = new Date('2026-03-27T14:00:00Z');

await notificationQueue.add(
  'sendNotification',
  {
    notificationId: '123',
    receiverId: 'user123',
    title: 'Reminder',
  },
  {
    delay: scheduledTime.getTime() - Date.now(),  // milliseconds
    attempts: 3,
  }
);
```

---

### **Job with Priority:**

```typescript
// Higher priority jobs are processed first
await notificationQueue.add(
  'sendNotification',
  { notificationId: '123', priority: 'urgent' },
  {
    priority: 10,  // Higher number = higher priority
  }
);

await notificationQueue.add(
  'sendNotification',
  { notificationId: '124', priority: 'low' },
  {
    priority: 1,
  }
);
```

---

### **Job with Custom ID:**

```typescript
// Use custom job ID for idempotency
await notificationQueue.add(
  'sendNotification',
  { notificationId: '123' },
  {
    jobId: `notification-123-${Date.now()}`,  // Custom ID
  }
);
```

---

## 🔄 Job Processing Workflow

### **Complete Processing Example:**

```typescript
export const startNotificationWorker = () => {
  const worker = new Worker(
    'notificationQueue-e-learning',
    async (job) => {
      const { id, name, data } = job;
      
      logger.info(`Processing notification job ${id} ⚡ ${name}`, data);
      
      try {
        // Step 1: Translate content (i18n)
        const [titleObj] = await Promise.all([
          buildTranslatedField(data.title as string)
        ]);
        
        // Step 2: Create notification in database
        const notif = await Notification.create({
          title: titleObj,
          senderId: data.senderId,
          receiverId: data.receiverId,
          receiverRole: data.receiverRole,
          type: data.type,
          linkFor: data.linkFor,
          linkId: data.linkId,
        });
        
        logger.info(`✅ Notification created for ${data.receiverRole}`, notif);
        
        // Step 3: Emit via Socket.IO (real-time)
        let emitted;
        if (data.receiverRole === TRole.admin) {
          emitted = socketService.emitToRole(
            data.receiverRole,
            `notification::admin`,
            { title: data.title, type: data.type }
          );
        } else {
          emitted = await socketService.emitToUser(
            data.receiverId.toString(),
            `notification::${data.receiverId}`,
            { title: data.title, type: data.type }
          );
        }
        
        if (emitted) {
          logger.info(`🔔 Real-time notification sent`);
        } else {
          logger.info(`📴 User is offline, notification saved in DB only`);
        }
        
        // Step 4: Send via other channels (email, push, SMS)
        for (const channel of data.channels) {
          try {
            switch (channel) {
              case 'email':
                await sendEmail({
                  to: await getUserEmail(data.receiverId),
                  subject: data.title,
                  body: data.subTitle,
                });
                logger.debug(`✅ Email sent`);
                break;
                
              case 'push':
                await sendPush({
                  userId: data.receiverId,
                  title: data.title,
                  body: data.subTitle,
                });
                logger.debug(`✅ Push sent`);
                break;
                
              case 'sms':
                if (data.priority === 'urgent') {
                  await sendSMS({
                    userId: data.receiverId,
                    message: `${data.title}: ${data.subTitle}`,
                  });
                  logger.debug(`✅ SMS sent`);
                }
                break;
            }
          } catch (channelError) {
            errorLogger.error(`Failed to send via ${channel}:`, channelError);
            // Continue with other channels
          }
        }
        
        return { success: true, notificationId: notif._id };
        
      } catch (err: any) {
        errorLogger.error(`❌ Notification job ${id} failed:`, err);
        throw err;  // Re-throw to trigger retry
      }
    },
    { connection: redisPubClient.options }
  );
  
  // Event handlers
  worker.on('completed', (job) =>
    logger.info(`✅ Notification job ${job.id} completed`)
  );
  
  worker.on('failed', (job, err) =>
    errorLogger.error(`❌ Notification job ${job?.id} failed`, err)
  );
};
```

---

## 🔁 Retry Logic

### **Retry Configuration:**

```typescript
const jobOptions = {
  attempts: 3,  // Retry 3 times
  backoff: {
    type: 'exponential',  // exponential, fixed, or custom
    delay: 5000,  // Base delay in milliseconds
  },
};

// Retry schedule with exponential backoff:
// Attempt 1: Immediate
// Attempt 2: After 5 seconds
// Attempt 3: After 10 seconds
// Failed: Move to failed queue
```

---

### **Backoff Types:**

```typescript
// Exponential backoff (recommended)
// Delay increases exponentially
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
}
// Schedule: 0s → 5s → 10s

// Fixed backoff
// Same delay for each retry
{
  attempts: 3,
  backoff: {
    type: 'fixed',
    delay: 5000,
  },
}
// Schedule: 0s → 5s → 5s

// Custom backoff
// Custom delay function
{
  attempts: 3,
  backoff: {
    type: 'custom',
  },
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      return attemptsMade * 1000;  // 1s, 2s, 3s
    },
  },
}
```

---

### **Retry with Custom Logic:**

```typescript
await notificationQueue.add(
  'sendNotification',
  { notificationId: '123', retryable: true },
  {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    // Custom retry condition
    settings: {
      backoffStrategy: (attemptsMade: number, type: string, error: any) => {
        // Don't retry if it's a validation error
        if (error.name === 'ValidationError') {
          return -1;  // Skip retry
        }
        // Retry with increasing delay
        return Math.pow(2, attemptsMade) * 1000;
      },
    },
  }
);
```

---

## 📊 Multi-Channel Delivery

### **Channel Processing:**

```typescript
async function processMultiChannel(
  notification: INotification
): Promise<void> {
  const channels = notification.channels || ['in_app'];
  
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'in_app':
          await sendInApp(notification);
          break;
          
        case 'email':
          await sendEmail(notification);
          break;
          
        case 'push':
          await sendPush(notification);
          break;
          
        case 'sms':
          await sendSMS(notification);
          break;
      }
      
      logger.info(`✅ Channel ${channel} sent successfully`);
    } catch (error) {
      errorLogger.error(`❌ Channel ${channel} failed:`, error);
      // Continue with other channels
    }
  }
}
```

---

### **Channel-Specific Logic:**

```typescript
// In-App (instant, via Socket.IO)
async function sendInApp(notification: INotification) {
  const isOnline = await socketService.isUserOnline(notification.receiverId);
  
  if (isOnline) {
    await socketService.emitToUser(
      notification.receiverId.toString(),
      `notification::${notification.receiverId}`,
      notification
    );
  }
  // If offline, notification is already in DB
}

// Email (async, via email service)
async function sendEmail(notification: INotification) {
  const user = await User.findById(notification.receiverId);
  
  await emailService.send({
    to: user.email,
    subject: notification.title,
    body: notification.subTitle,
    template: 'notification',
  });
}

// Push (async, via FCM/APNS)
async function sendPush(notification: INotification) {
  const deviceToken = await getUserDeviceToken(notification.receiverId);
  
  if (deviceToken) {
    await fcm.send({
      token: deviceToken,
      title: notification.title,
      body: notification.subTitle,
      data: { notificationId: notification._id },
    });
  }
}

// SMS (async, via Twilio)
async function sendSMS(notification: INotification) {
  // Only for urgent priority
  if (notification.priority !== 'urgent') {
    return;
  }
  
  const user = await User.findById(notification.receiverId);
  
  if (user.phone) {
    await twilio.messages.create({
      to: user.phone,
      from: '+1234567890',
      body: `${notification.title}: ${notification.subTitle}`,
    });
  }
}
```

---

## ⚠️ Error Handling

### **Try-Catch Pattern:**

```typescript
worker.on('failed', async (job, err) => {
  errorLogger.error(`Job ${job?.id} failed:`, err);
  
  // Log job data for debugging
  if (job) {
    errorLogger.error('Job data:', job.data);
    errorLogger.error('Attempts:', job.attemptsMade);
    errorLogger.error('Failed reason:', job.failedReason);
  }
  
  // Send alert for critical failures
  if (job?.data.priority === 'urgent') {
    await sendAlertToAdmin(`Critical notification failed: ${job.id}`);
  }
});
```

---

### **Graceful Degradation:**

```typescript
async function processNotification(data: any) {
  try {
    // Try to create notification
    const notif = await Notification.create(data);
    
    // Try to send via channels (non-blocking)
    for (const channel of data.channels) {
      try {
        await sendViaChannel(channel, notif);
      } catch (channelError) {
        // Log but continue with other channels
        errorLogger.error(`Channel ${channel} failed:`, channelError);
      }
    }
    
    return notif;
  } catch (error) {
    // Critical error - re-throw to trigger retry
    errorLogger.error('Notification creation failed:', error);
    throw error;
  }
}
```

---

### **Dead Letter Queue:**

```typescript
// Move permanently failed jobs to dead letter queue
worker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= 3) {
    // Move to dead letter queue
    await deadLetterQueue.add('failedNotification', {
      originalJobId: job.id,
      data: job.data,
      error: err.message,
      failedAt: new Date(),
    });
    
    logger.warn(`Job ${job.id} moved to dead letter queue`);
  }
});

// Process dead letter queue manually
const deadLetterQueue = new Queue('dead-letter-notifications', {
  connection: redisPubClient.options,
});
```

---

## 🔍 Monitoring Queues

### **Queue Statistics:**

```typescript
// Get job counts
const jobCounts = await notificationQueue.getJobCounts();
console.log('Job counts:', jobCounts);
// { waiting: 5, active: 2, completed: 100, failed: 1, delayed: 3 }

// Get specific job state counts
const waitingCount = await notificationQueue.getWaitingCount();
const activeCount = await notificationQueue.getActiveCount();
const completedCount = await notificationQueue.getCompletedCount();
const failedCount = await notificationQueue.getFailedCount();
const delayedCount = await notificationQueue.getDelayedCount();
```

---

### **Get Jobs by State:**

```typescript
// Get waiting jobs
const waitingJobs = await notificationQueue.getWaiting(0, 10);
console.log('Waiting jobs:', waitingJobs);

// Get active jobs
const activeJobs = await notificationQueue.getActive(0, 10);
console.log('Active jobs:', activeJobs);

// Get completed jobs
const completedJobs = await notificationQueue.getCompleted(0, 10);
console.log('Completed jobs:', completedJobs);

// Get failed jobs
const failedJobs = await notificationQueue.getFailed(0, 10);
console.log('Failed jobs:', failedJobs);
```

---

### **Get Specific Job:**

```typescript
// Get job by ID
const job = await notificationQueue.getJob('job123');

if (job) {
  console.log('Job state:', await job.getState());
  console.log('Job data:', job.data);
  console.log('Attempts:', job.attemptsMade);
  console.log('Failed reason:', job.failedReason);
  console.log('Finished on:', job.finishedOn);
}
```

---

### **Remove Jobs:**

```typescript
// Remove completed jobs older than 1 hour
const removed = await notificationQueue.clean(
  3600000,  // 1 hour in milliseconds
  'completed'
);
console.log(`Removed ${removed.length} completed jobs`);

// Remove all failed jobs
await notificationQueue.clean(0, 'failed');

// Remove specific job
const job = await notificationQueue.getJob('job123');
if (job) {
  await job.remove();
}
```

---

## 🧪 Testing BullMQ

### **Test 1: Add Job to Queue**

```typescript
// Add a test job
const job = await notificationQueue.add(
  'sendNotification',
  {
    notificationId: 'test123',
    receiverId: 'user123',
    title: 'Test Notification',
    channels: ['in_app'],
  },
  {
    attempts: 3,
  }
);

console.log('Job added:', job.id);
console.log('Job state:', await job.getState());
// Expected: 'waiting'
```

---

### **Test 2: Check Queue Status**

```typescript
const jobCounts = await notificationQueue.getJobCounts();
console.log('Queue status:', jobCounts);
// Expected: { waiting: 1, active: 0, completed: 100, failed: 0 }
```

---

### **Test 3: Monitor Job Processing**

```typescript
// Listen to job events
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed in ${job.processedOn! - job.processedOn!}ms`);
});

worker.on('failed', (job, err) => {
  console.log(`❌ Job ${job?.id} failed: ${err.message}`);
});

worker.on('progress', (job, progress) => {
  console.log(`Job ${job?.id} progress: ${progress}%`);
});
```

---

### **Test 4: Retry Failed Job**

```typescript
// Get failed job
const failedJob = await notificationQueue.getJob('failedJob123');

if (failedJob) {
  // Retry the job
  await failedJob.retry();
  console.log('Job retried');
  
  // Check new state
  const newState = await failedJob.getState();
  console.log('New state:', newState);
  // Expected: 'waiting'
}
```

---

## 🔍 Common Issues & Solutions

### **Issue 1: Jobs Not Processing**

**Problem**: Jobs stay in 'waiting' state

**Solution**:
```typescript
// Check if worker is running
console.log('Worker status:', worker.isRunning());

// Check Redis connection
const ping = await redisClient.ping();
console.log('Redis ping:', ping);  // Should be 'PONG'

// Restart worker
await worker.close();
startNotificationWorker();
```

---

### **Issue 2: Jobs Failing Repeatedly**

**Problem**: Same job fails 3 times and moves to failed

**Solution**:
```typescript
// Check error reason
const job = await notificationQueue.getJob('job123');
console.log('Failed reason:', job?.failedReason);

// Fix the issue and retry
if (job) {
  await job.retry();
}

// Or increase retry attempts
await notificationQueue.add('task', data, {
  attempts: 5,  // Increase from 3 to 5
  backoff: {
    type: 'exponential',
    delay: 10000,  // Increase delay
  },
});
```

---

### **Issue 3: Queue Memory Full**

**Problem**: Redis memory full due to too many jobs

**Solution**:
```typescript
// Clean old completed jobs
await notificationQueue.clean(3600000, 'completed');  // Older than 1 hour

// Clean old failed jobs
await notificationQueue.clean(86400000, 'failed');  // Older than 24 hours

// Configure auto-cleanup
const queue = new Queue('notifications', {
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600,  // Remove after 1 hour
    },
    removeOnFail: {
      age: 86400,  // Remove after 24 hours
    },
  },
});
```

---

### **Issue 4: Slow Job Processing**

**Problem**: Jobs take too long to process

**Solution**:
```typescript
// Increase concurrency
const worker = new Worker('queue', processor, {
  concurrency: 20,  // Increase from 10 to 20
});

// Optimize job processing
async function processJob(data: any) {
  // Use Promise.all for parallel operations
  await Promise.all([
    sendEmail(data),
    sendPush(data),
  ]);
  
  // Instead of sequential
  // await sendEmail(data);
  // await sendPush(data);
}
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **Why Async**: Fast response, scalability, reliability
2. ✅ **4 Queues**: notifications, reminders, participants, conversations
3. ✅ **Worker Setup**: Concurrency, event handlers
4. ✅ **Job Options**: Delay, priority, custom ID
5. ✅ **Retry Logic**: 3 attempts, exponential backoff
6. ✅ **Multi-Channel**: In-app, email, push, SMS
7. ✅ **Error Handling**: Try-catch, graceful degradation
8. ✅ **Monitoring**: Job counts, states, cleanup

### **Quick Reference:**

```typescript
// Create queue
const queue = new Queue('name', { connection: redisOptions });

// Create worker
const worker = new Worker('name', processor, {
  concurrency: 10,
  connection: redisOptions,
});

// Add job
await queue.add('jobName', data, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  delay: 10000,
});

// Monitor
const counts = await queue.getJobCounts();
const job = await queue.getJob('jobId');
await queue.clean(3600000, 'completed');
```

### **Next Chapter:**

→ [Chapter 8: Notification Management](./LEARN_NOTIFICATION_08_MANAGEMENT.md)

---

**Created**: 26-03-23
**Author**: Qwen Code Assistant
**Status**: 📚 Educational Guide
