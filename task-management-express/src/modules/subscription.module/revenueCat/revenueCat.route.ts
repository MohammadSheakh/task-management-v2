//@ts-ignore
import express from 'express';
import { RevenueCatController } from './revenueCat.controller';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';

const router = express.Router();

const revenueCatController = new RevenueCatController();

/**
 * RevenueCat Routes
 * 
 * Base: /api/v1/revenuecat
 */

// Create manual subscription (Admin only)
router.post(
  '/manual-subscription',
  auth(TRole.admin),
  revenueCatController.createManualSubscription
);

// Get user's RevenueCat subscriptions (Admin only)
router.get(
  '/user/:userId',
  auth(TRole.admin),
  revenueCatController.getUserSubscriptions
);

// Sync RevenueCat user ID (Admin only)
router.post(
  '/sync-user-id',
  auth(TRole.admin),
  revenueCatController.syncUserId
);

// Cancel RevenueCat subscription (Admin only)
router.post(
  '/cancel/:subscriptionId',
  auth(TRole.admin),
  revenueCatController.cancelSubscription
);

// Get all RevenueCat subscriptions with pagination (Admin only)
router.get(
  '/subscriptions',
  auth(TRole.admin),
  revenueCatController.getAllSubscriptions
);

export default router;
