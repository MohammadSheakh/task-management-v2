/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SubTask Module Test Suite
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Testing Framework: Vitest + Supertest
 * Coverage: SubTask CRUD, Completion, Validation, Permissions
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
import { SubTask } from './subTask.model';
import { redisClient } from '../../../helpers/redis/redis';
import { config } from '../../../config';
import { SubTaskStatus } from './subTask.constant';

// Test Utilities
const generateUniqueTitle = () => `SubTask ${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createTestUser = async () => {
  const email = `test.${Date.now()}@example.com`;
  const profile = await UserProfile.create({ acceptTOC: true });
  const user = await User.create({
    email,
    password: 'TestPassword123!',
    name: 'Test User',
    role: 'child',
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
  ]);
};

describe('SubTask Module Integration Tests', () => {
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
  // SubTask Creation Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('POST /subtasks - Create SubTask', () => {
    it('should create a subtask successfully', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task = await Task.create({
        title: 'Parent Task',
        ownerUserId: user._id,
        createdById: user._id,
      });

      const subtaskData = {
        taskId: task._id.toString(),
        title: generateUniqueTitle(),
        duration: 30,
        order: 1,
      };

      // Act
      const response = await request(app)
        .post('/api/v1/subtasks')
        .set('Authorization', `Bearer ${token}`)
        .send(subtaskData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.subtask.title).toBe(subtaskData.title);
      expect(response.body.data.subtask.taskId).toBe(task._id.toString());
    });

    it('should reject subtask creation for non-existent task', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const subtaskData = {
        taskId: new mongoose.Types.ObjectId().toString(),
        title: generateUniqueTitle(),
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/subtasks')
        .set('Authorization', `Bearer ${token}`)
        .send(subtaskData)
        .expect(404);

      expect(response.body.message).toContain('Task not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SubTask Completion Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('PATCH /subtasks/:id/complete - Complete SubTask', () => {
    it('should mark subtask as complete', async () => {
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
        title: generateUniqueTitle(),
        createdById: user._id,
      });

      // Act
      const response = await request(app)
        .patch(`/api/v1/subtasks/${subtask._id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data.isCompleted).toBe(true);
      expect(response.body.data.completedAt).toBeDefined();
    });

    it('should update parent task completion percentage', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task = await Task.create({
        title: 'Parent Task',
        ownerUserId: user._id,
        createdById: user._id,
        totalSubtasks: 2,
        completedSubtasks: 0,
      });

      const subtask1 = await SubTask.create({
        taskId: task._id,
        title: 'Subtask 1',
        createdById: user._id,
      });

      const subtask2 = await SubTask.create({
        taskId: task._id,
        title: 'Subtask 2',
        createdById: user._id,
        isCompleted: true,
      });

      // Act: Complete remaining subtask
      await request(app)
        .patch(`/api/v1/subtasks/${subtask1._id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      // Assert: Parent task should be 100% complete
      const updatedTask = await Task.findById(task._id);
      expect(updatedTask?.completedSubtasks).toBe(2);
      expect(updatedTask?.completionPercentage).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SubTask Update Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('PATCH /subtasks/:id - Update SubTask', () => {
    it('should update subtask title and duration', async () => {
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
        title: generateUniqueTitle(),
        duration: 30,
        createdById: user._id,
      });

      const updateData = {
        title: 'Updated Subtask',
        duration: 45,
      };

      // Act
      const response = await request(app)
        .patch(`/api/v1/subtasks/${subtask._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.duration).toBe(updateData.duration);
    });

    it('should update subtask order', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task = await Task.create({
        title: 'Parent Task',
        ownerUserId: user._id,
        createdById: user._id,
      });

      const subtask1 = await SubTask.create({
        taskId: task._id,
        title: 'Subtask 1',
        order: 1,
        createdById: user._id,
      });

      const subtask2 = await SubTask.create({
        taskId: task._id,
        title: 'Subtask 2',
        order: 2,
        createdById: user._id,
      });

      // Act: Swap order
      const response = await request(app)
        .patch(`/api/v1/subtasks/${subtask1._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ order: 3 })
        .expect(200);

      // Assert
      expect(response.body.data.order).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SubTask Delete Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('DELETE /subtasks/:id - Delete SubTask', () => {
    it('should soft delete subtask', async () => {
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
        title: generateUniqueTitle(),
        createdById: user._id,
      });

      // Act
      const response = await request(app)
        .delete(`/api/v1/subtasks/${subtask._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);

      // Assert: Verify soft delete
      const subtaskInDb = await SubTask.findById(subtask._id);
      expect(subtaskInDb?.isDeleted).toBe(true);
    });

    it('should update parent task after subtask deletion', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task = await Task.create({
        title: 'Parent Task',
        ownerUserId: user._id,
        createdById: user._id,
        totalSubtasks: 2,
        completedSubtasks: 1,
      });

      const subtask = await SubTask.create({
        taskId: task._id,
        title: 'Subtask to Delete',
        createdById: user._id,
      });

      // Act
      await request(app)
        .delete(`/api/v1/subtasks/${subtask._id}`)
        .set('Authorization', `Bearer ${token}`);

      // Assert: Parent task subtask count should be updated
      const updatedTask = await Task.findById(task._id);
      expect(updatedTask?.totalSubtasks).toBeLessThan(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SubTask Retrieval Tests
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('GET /subtasks/task/:taskId - Get SubTasks for Task', () => {
    it('should get all subtasks for a task', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task = await Task.create({
        title: 'Parent Task',
        ownerUserId: user._id,
        createdById: user._id,
      });

      await SubTask.create([
        { taskId: task._id, title: 'Subtask 1', createdById: user._id },
        { taskId: task._id, title: 'Subtask 2', createdById: user._id },
        { taskId: task._id, title: 'Subtask 3', createdById: user._id },
      ]);

      // Act
      const response = await request(app)
        .get(`/api/v1/subtasks/task/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(3);
    });

    it('should return empty array for task with no subtasks', async () => {
      // Arrange
      const { user } = await createTestUser();
      const token = await generateToken(user._id.toString(), user.role);
      
      const task = await Task.create({
        title: 'Parent Task',
        ownerUserId: user._id,
        createdById: user._id,
      });

      // Act
      const response = await request(app)
        .get(`/api/v1/subtasks/task/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data).toEqual([]);
    });
  });
});
