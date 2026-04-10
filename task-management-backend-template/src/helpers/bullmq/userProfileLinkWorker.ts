//@ts-ignore
import { Queue, Worker, Job } from "bullmq";
import { redisPubClient } from "../redis/redis";
import { errorLogger, logger } from "../../shared/logger";
import { UserProfile } from "../../modules/user.module/userProfile/userProfile.model";

/*-─────────────────────────────────
|  👤 User Profile Link Queue
|
|  PURPOSE:
|  - Link userId to userProfile after User creation
|  - Used by /register/v2 and createChildAccountV3
|  - Replaces event emitter with reliable BullMQ queue
|
|  ADVANTAGES over EventEmitter:
|  ✅ Persistent jobs (survives restarts)
|  ✅ Automatic retries with backoff
|  ✅ Job monitoring & status tracking
|  ✅ Dead letter queue for failed jobs
|  ✅ Concurrency control
|  ✅ Better error handling
|
|  Flow: Create User → Queue Job → Worker updates UserProfile.userId
└──────────────────────────────────*/

export const userProfileLinkQueue = new Queue("userProfileLinkQueue", {
  connection: redisPubClient.options,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

/*-─────────────────────────────────
|  Job Data Interface
└──────────────────────────────────*/
interface IUserProfileLinkJobData {
  userProfileId: string;
  userId: string;
  source?: 'register' | 'createChild' | 'oauth'; // Track job source for debugging
}

/*-─────────────────────────────────
|  Helper: Enqueue User Profile Link Job
|
|  USAGE:
|  await enqueueUserProfileLinkJob(userProfileId, userId, 'createChild');
└──────────────────────────────────*/
export const enqueueUserProfileLinkJob = async (
  userProfileId: string,
  userId: string,
  source: string = 'register'
): Promise<void> => {
  try {
    await userProfileLinkQueue.add('linkUserProfile', {
      userProfileId,
      userId,
      source,
    }, {
      jobId: `link-${userProfileId}-${userId}-${Date.now()}`,
      removeOnComplete: true,
    });

    logger.info(`📊 [UserProfileLink] Job queued: ${userProfileId} <- ${userId} (source: ${source})`);
  } catch (error) {
    errorLogger.error(`❌ [UserProfileLink] Failed to queue job for ${userProfileId}:`, error);
    // Fallback: Directly update if queue fails
    logger.warn(`⚠️ [UserProfileLink] Queue failed, falling back to direct update for ${userProfileId}`);
    await UserProfile.findByIdAndUpdate(userProfileId, { userId });
  }
};

/*-─────────────────────────────────
|  User Profile Link Worker
|
|  RESPONSIBILITIES:
|  1. Receive job with userProfileId and userId
|  2. Update UserProfile document with userId
|  3. Log success/failure for monitoring
|
|  DOES NOT:
|  - Create users or profiles (already done)
|  - Handle user creation logic
└──────────────────────────────────*/
export const startUserProfileLinkWorker = () => {
  const worker = new Worker<IUserProfileLinkJobData>(
    'userProfileLinkQueue',
    async (job: Job<IUserProfileLinkJobData>) => {
      const { userProfileId, userId, source } = job.data;

      logger.info(`🔄 [UserProfileLink Worker] Processing job ${job.id}: ${userProfileId} <- ${userId} (source: ${source})`);

      try {
        // ✅ Update UserProfile with userId
        const updatedProfile = await UserProfile.findByIdAndUpdate(
          userProfileId,
          { userId },
          { new: true, runValidators: true }
        );

        if (!updatedProfile) {
          logger.warn(`⚠️ [UserProfileLink Worker] UserProfile not found: ${userProfileId}`);
          return { success: false, reason: 'UserProfile not found' };
        }

        logger.info(`✅ [UserProfileLink Worker] Linked userId ${userId} to userProfile ${userProfileId} (source: ${source})`);

        return {
          success: true,
          userProfileId,
          userId,
          source,
          updatedAt: new Date()
        };

      } catch (err: any) {
        errorLogger.error(`❌ [UserProfileLink Worker] Job ${job.id} failed:`, {
          error: err.message,
          stack: err.stack,
          userProfileId,
          userId,
          source,
          attempt: job.attemptsMade,
        });
        throw err; // Ensures retry/backoff
      }
    },
    {
      connection: redisPubClient.options,
      concurrency: 5, // Max 5 concurrent jobs (conservative for DB updates)
    }
  );

  // ✅ Event Listeners
  worker.on('completed', (job, result) =>
    logger.info(`✅ [UserProfileLink Worker] Job ${job.id} completed`, result)
  );

  worker.on('failed', (job, err) =>
    errorLogger.error(`❌ [UserProfileLink Worker] Job ${job?.id} failed`, {
      error: err.message,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      data: job?.data,
    })
  );

  worker.on('progress', (job, progress) =>
    logger.info(`🔄 [UserProfileLink Worker] Job ${job.id} progress:`, progress)
  );

  logger.info('🚀 [UserProfileLink Worker] Started and listening for jobs');

  return worker;
};

/*-─────────────────────────────────
|  Queue Status Helper
└──────────────────────────────────*/
export const getUserProfileLinkQueueStatus = async () => {
  try {
    const waitingCount = await userProfileLinkQueue.getWaitingCount();
    const activeCount = await userProfileLinkQueue.getActiveCount();
    const failedCount = await userProfileLinkQueue.getFailedCount();
    const delayedCount = await userProfileLinkQueue.getDelayedCount();

    return {
      queue: 'userProfileLinkQueue',
      waiting: waitingCount,
      active: activeCount,
      failed: failedCount,
      delayed: delayedCount,
      timestamp: new Date(),
    };
  } catch (err: any) {
    errorLogger.error(`❌ Failed to get UserProfileLink queue status:`, err);
    throw err;
  }
};
