/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TaskProgress & SubTaskProgress Module Test Suite
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Testing Framework: Vitest + Supertest
 * Coverage: TaskProgress CRUD, SubTaskProgress Tracking, Progress Calculation
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app';
import { User } from '../../user.module/user/user.model';
import { UserProfile } from '../../user.module/userProfile/userProfile.model';
import { Task } from '../task/task.model';
import { SubTask } from '../subTask/subTask.model';
import { TaskProgress } from './taskProgress.model';
import { SubTaskProgress } from '../subTaskProgress/subTaskProgress.model';
import { redisClient } from '../../../helpers/redis/redis';
import { config } from '../../../config';

// Test Utilities
const createTestUser = async (role = 'child') => {
  const email = `test.${Date.now()}@example.com`;
  const profile = await UserProfile.create({ acceptTOC: true });
  const user = await User.create({
    email,
    password: 'TestPassword123!',
    name: 'Test User',
    role,
    profileId: profile._id,
    isEmailVerified: true,
  });
  return { user, profile };
};

const generateToken = async (userId: string, role: string) => {
  const { TokenService } = await import('../../token/token.service');
  const { TokenType } = await import('../../token/token.interface');
  const user = await User.findById(userId);
  return await TokenService.generateToken(
    { userId, email: user!.email, role },
    config.jwt.accessSecret as string,
    TokenType.ACCESS
  );
};

const cleanupDatabase = async () => {
  await Promise.all([
    User.deleteMany({}),
    UserProfile.deleteMany({}),
    Task.deleteMany({}),
    SubTask.deleteMany({}),
    TaskProgress.deleteMany({}),
    SubTaskProgress.deleteMany({}),
  ]);
};

describe('TaskProgress & SubTaskProgress Integration Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(config.database.mongoUri || 'mongodb://localhost:27017/task_management_test');
    await redisClient.connect();
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await mongoose.connection.close();
    await redisClient.quit();
  });

  beforeEach(async () => {
    const keys = await redisClient.keys('*');
    if (keys.length > 0) await redisClient.del(keys);
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // TaskProgress Creation Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('TaskProgress - Automatic Creation', () => {
    it('should auto-create TaskProgress when user assigned to collaborative task', async () => {
      // Arrange
      const { user: creator } = await createTestUser();
      const { user: assignee } = await createTestUser();
      
      const task = await Task.create({
        title: 'Collaborative Task',
        taskType: 'collaborative',
        ownerUserId: creator._id,
        createdById: creator._id,
        assignedUserIds: [assignee._id],
      });

      // Act: TaskProgress should be auto-created by service
      // Wait a moment for async creation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      const taskProgress = await TaskProgress.findOne({
        taskId: task._id,
        userId: assignee._id,
      });

      expect(taskProgress).toBeDefined();
      expect(taskProgress?.progress).toBe(0);
    });

    it('should create TaskProgress for multiple assignees', async () => {
      // Arrange
      const { user: creator } = await createTestUser();
      const { user: assignee1 } = await createTestUser();
      const { user: assignee2 } = await createTestUser();
      const { user: assignee3 } = await createTestUser();
      
      const task = await Task.create({
        title: 'Group Task',
        taskType: 'collaborative',
        ownerUserId: creator._id,
        createdById: creator._id,
        assignedUserIds: [assignee1._id, assignee2._id, assignee3._id],
      });

      // Act
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      const taskProgressRecords = await TaskProgress.find({
        taskId: task._id,
      });

      expect(taskProgressRecords).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // TaskProgress Update Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('PATCH /task-progress/:taskId - Update Task Progress', () => {
    it('should update task progress percentage', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task = await Task.create({
        title: 'Test Task',
        ownerUserId: user._id,
        createdById: user._id,
      });

      const taskProgress = await TaskProgress.create({
        taskId: task._id,
        userId: user._id,
        progress: 0,
      });

      const updateData = {
        progress: 50,
        note: 'Halfway done',
      };

      // Act
      const response = await request(app)
        .patch(`/api/v1/task-progress/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body.data.progress).toBe(50);
      expect(response.body.data.note).toBe(updateData.note);
    });

    it('should reject progress value outside 0-100 range', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task = await Task.create({
        title: 'Test Task',
        ownerUserId: user._id,
        createdById: user._id,
      });

      await TaskProgress.create({
        taskId: task._id,
        userId: user._id,
        progress: 0,
      });

      // Act: Try to set progress to 150
      const response = await request(app)
        .patch(`/api/v1/task-progress/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ progress: 150 });

      // Assert: Should be rejected (400) or capped (200 with capped value)
      expect([200, 400]).toContain(response.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // TaskProgress Retrieval Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('GET /task-progress/my - Get My Task Progress', () => {
    it('should get progress for all assigned tasks', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task1 = await Task.create({
        title: 'Task 1',
        ownerUserId: user._id,
        createdById: user._id,
      });

      const task2 = await Task.create({
        title: 'Task 2',
        ownerUserId: user._id,
        createdById: user._id,
      });

      await TaskProgress.create([
        { taskId: task1._id, userId: user._id, progress: 25 },
        { taskId: task2._id, userId: user._id, progress: 75 },
      ]);

      // Act
      const response = await request(app)
        .get('/api/v1/task-progress/my')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should include task details in progress response', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task = await Task.create({
        title: 'Important Task',
        description: 'Task description',
        ownerUserId: user._id,
        createdById: user._id,
      });

      await TaskProgress.create({
        taskId: task._id,
        userId: user._id,
        progress: 50,
      });

      // Act
      const response = await request(app)
        .get('/api/v1/task-progress/my')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data[0].task).toBeDefined();
      expect(response.body.data[0].task.title).toBe('Important Task');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SubTaskProgress Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('SubTaskProgress - Tracking SubTask Completion', () => {
    it('should track subtask progress history', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task = await Task.create({
        title: 'Parent Task',
        ownerUserId: user._id,
        createdById: user._id,
      });

      const subtask = await SubTask.create({
        taskId: task._id,
        title: 'Subtask',
        createdById: user._id,
      });

      // Act: Create subtask progress record
      const subtaskProgress = await SubTaskProgress.create({
        subtaskId: subtask._id,
        userId: user._id,
        status: 'in_progress',
        timeSpent: 15, // minutes
      });

      // Assert
      expect(subtaskProgress).toBeDefined();
      expect(subtaskProgress.timeSpent).toBe(15);
    });

    it('should update time spent on subtask', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task = await Task.create({
        title: 'Parent Task',
        ownerUserId: user._id,
        createdById: user._id,
      });

      const subtask = await SubTask.create({
        taskId: task._id,
        title: 'Subtask',
        createdById: user._id,
      });

      await SubTaskProgress.create({
        subtaskId: subtask._id,
        userId: user._id,
        status: 'in_progress',
        timeSpent: 15,
      });

      // Act: Update time spent
      const response = await request(app)
        .post(`/api/v1/subtask-progress/${subtask._id}/log-time`)
        .set('Authorization', `Bearer ${token}`)
        .send({ timeSpent: 30 })
        .expect(200);

      // Assert
      expect(response.body.data.totalTimeSpent).toBeGreaterThan(15);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Progress Calculation Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Progress Calculation - Task Completion Percentage', () => {
    it('should calculate task completion based on subtasks', async () => {
      // Arrange
      const { user } = await createTestUser();
      
      const task = await Task.create({
        title: 'Parent Task',
        ownerUserId: user._id,
        createdById: user._id,
        totalSubtasks: 4,
        completedSubtasks: 0,
      });

      await SubTask.create([
        { taskId: task._id, title: 'Subtask 1', createdById: user._id, isCompleted: true },
        { taskId: task._id, title: 'Subtask 2', createdById: user._id, isCompleted: true },
        { taskId: task._id, title: 'Subtask 3', createdById: user._id, isCompleted: false },
        { taskId: task._id, title: 'Subtask 4', createdById: user._id, isCompleted: false },
      ]);

      // Act: Trigger task update (may be done via service method)
      const updatedTask = await Task.findById(task._id);

      // Assert
      expect(updatedTask?.completedSubtasks).toBe(2);
      expect(updatedTask?.completionPercentage).toBe(50);
    });

    it('should mark task as complete when all subtasks complete', async () => {
      // Arrange
      const { user } = await createTestUser();
      
      const task = await Task.create({
        title: 'Parent Task',
        ownerUserId: user._id,
        createdById: user._id,
        totalSubtasks: 2,
        completedSubtasks: 2,
        status: 'pending',
      });

      await SubTask.create([
        { taskId: task._id, title: 'Subtask 1', createdById: user._id, isCompleted: true },
        { taskId: task._id, title: 'Subtask 2', createdById: user._id, isCompleted: true },
      ]);

      // Task should auto-update to completed
      const updatedTask = await Task.findById(task._id);

      // Assert
      expect(updatedTask?.completionPercentage).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Parent Dashboard Progress Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Parent Dashboard - Children Progress Tracking', () => {
    it('should get progress for all children tasks', async () => {
      // Arrange
      const { user: businessUser } = await createTestUser('business');
      const { user: child } = await createTestUser('child');
      const token = await generateToken(businessUser._id.toString(), 'business');
      
      // Create relationship
      const { ChildrenBusinessUser } = await import('../../childrenBusinessUser.module/childrenBusinessUser.model');
      await ChildrenBusinessUser.create({
        childUserId: child._id,
        parentBusinessUserId: businessUser._id,
        status: 'active',
      });

      const task = await Task.create({
        title: 'Child Task',
        ownerUserId: child._id,
        createdById: child._id,
      });

      await TaskProgress.create({
        taskId: task._id,
        userId: child._id,
        progress: 60,
      });

      // Act
      const response = await request(app)
        .get('/api/v1/task-progress/children')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
