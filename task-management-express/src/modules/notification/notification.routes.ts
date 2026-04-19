import { Router } from 'express';
import auth from '../../middlewares/auth';
import { NotificationController } from './notification.controllers';
import { TRole } from '../../middlewares/roles';

const router = Router();

router
  .route('/clear-all-notifications')
  .delete(auth(TRole.common), NotificationController.clearAllNotification);
router
  .route('/admin-notifications')
  .get(auth(TRole.common), NotificationController.getAdminNotifications);
router
  .route('/')
  .get(auth(TRole.common), NotificationController.getALLNotification);

router
  .route('/:id')
  .get(auth(TRole.common), NotificationController.getSingleNotification)
  .patch(auth(TRole.common), NotificationController.viewNotification)
  .delete(auth(TRole.common), NotificationController.deleteNotification);

export const NotificationRoutes = router;
