// ✅ IMPLEMENTATION GUIDE - Collaborative Task Response Enhancement

// File: task.module/task/task.controller.ts
// Method: getTaskById()
// Replace the subtask formatting section (around line 305-345)

// ────────────────────────────────────────────────────────────────────────
// OLD CODE (Replace this):
// ────────────────────────────────────────────────────────────────────────

    // Format subtasks with progress information
    const formattedSubtasks = (result.subtasks || []).map(
      (subtask: any, index: number) => ({
        _id: subtask._id,
        title: subtask.title,
        isCompleted: subtask.isCompleted || false,
        order: subtask.order || index + 1,
        duration: subtask.duration || null,
        completedAt: subtask.completedAt || null,
      }),
    );

    // Calculate subtask progress
    const totalSubtasks = formattedSubtasks.length;
    const completedSubtasks = formattedSubtasks.filter(
      (st: any) => st.isCompleted,
    ).length;
    const subtaskProgressPercentage =
      totalSubtasks > 0
        ? Math.round((completedSubtasks / totalSubtasks) * 100)
        : 0;

    // Build response with subtask progress
    const responseData = {
      ...result.toObject(),
      subtasks: formattedSubtasks,
      subtaskProgress: {
        total: totalSubtasks,
        completed: completedSubtasks,
        percentage: subtaskProgressPercentage,
      },
    };

// ────────────────────────────────────────────────────────────────────────
// NEW CODE (Replace with this):
// ────────────────────────────────────────────────────────────────────────

    // 🆕 NEW: For collaborative tasks, get personal progress
    let myProgress = null;
    let subtaskCompletionMap = new Map();

    if (result.taskType === 'collaborative') {
      // Get my TaskProgress
      const { TaskProgress } = await import('../../taskProgress.module/taskProgress.model');
      const taskProgress = await TaskProgress.findOne({
        taskId: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      }).lean();

      if (taskProgress) {
        myProgress = {
          status: taskProgress.status,
          progressPercentage: taskProgress.progressPercentage,
          completedAt: taskProgress.completedAt,
          startedAt: taskProgress.startedAt,
          completedSubtaskCount: taskProgress.completedSubtaskIndexes?.length || 0,
        };
      }

      // Get my SubTaskProgress for all subtasks
      const { SubTaskProgress } = await import('./subTaskProgress/subTaskProgress.model');
      const subtaskProgressRecords = await SubTaskProgress.find({
        taskId: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      }).lean();

      // Create map for quick lookup
      subtaskProgressRecords.forEach(record => {
        subtaskCompletionMap.set(record.subtaskId.toString(), {
          isCompleted: record.isCompleted,
          completedAt: record.completedAt,
        });
      });
    }

    // Format subtasks with progress information
    const formattedSubtasks = (result.subtasks || []).map(
      (subtask: any, index: number) => {
        const subtaskObj = {
          _id: subtask._id,
          title: subtask.title,
          order: subtask.order || index + 1,
          duration: subtask.duration || null,
        };

        // 🆕 NEW: For collaborative tasks, add my completion status
        if (result.taskType === 'collaborative') {
          const myCompletion = subtaskCompletionMap.get(subtask._id.toString());
          subtaskObj.myCompletion = myCompletion || {
            isCompleted: false,
            completedAt: null,
          };
        } else {
          // For personal/single-assignment tasks, use global isCompleted (existing flow)
          subtaskObj.isCompleted = subtask.isCompleted || false;
          subtaskObj.completedAt = subtask.completedAt || null;
        }

        return subtaskObj;
      },
    );

    // Calculate subtask progress (for personal/single-assignment tasks)
    const totalSubtasks = formattedSubtasks.length;
    const completedSubtasks = formattedSubtasks.filter(
      (st: any) => st.isCompleted,
    ).length;
    const subtaskProgressPercentage =
      totalSubtasks > 0
        ? Math.round((completedSubtasks / totalSubtasks) * 100)
        : 0;

    // Build response
    const responseData = {
      ...result.toObject(),
      subtasks: formattedSubtasks,
      subtaskProgress: {
        total: totalSubtasks,
        completed: completedSubtasks,
        percentage: subtaskProgressPercentage,
      },
    };

    // 🆕 NEW: Add myProgress for collaborative tasks only
    if (result.taskType === 'collaborative' && myProgress) {
      responseData.myProgress = myProgress;
    }

// ────────────────────────────────────────────────────────────────────────
// END OF IMPLEMENTATION
// ────────────────────────────────────────────────────────────────────────

// Also remove the console.log statement on line 272:
// console.log('result :: ', result);  // ← DELETE THIS LINE
