import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../shared/validateRequest';
import { AttachmentController } from './attachment.controller';
import { TRole } from '../../middlewares/roles';

const multer = require('multer');
// import fileUploadHandler from '../../shared/fileUploadHandler';
// import convertHeicToPngMiddleware from '../../shared/convertHeicToPngMiddleware';
// const UPLOADS_FOLDER = 'uploads/users';
// const upload = fileUploadHandler(UPLOADS_FOLDER);

const router = express.Router();

//
router.route('/paginate').get(
  auth(TRole.common),
  AttachmentController.getAllAttachmentWithPagination
);

router.route('/:attachmentId').get(
  auth(TRole.common),
  AttachmentController.getAAttachment
);

router.route('/update/:attachmentId').put(
  auth(TRole.common),
  // validateRequest(validation.createHelpMessageValidationSchema),
  AttachmentController.updateById
);


router.route('/').get(
  auth(TRole.common),
  AttachmentController.getAllAttachment
);

// router.route('/create').post(
//   auth('projectManager'),
//   // validateRequest(validation.createHelpMessageValidationSchema),
//   AttachmentController.createAttachment
// );

//[🚧][🧑‍💻✅][🧪🆗] 
router.route('/:attachmentId').delete(
  auth(TRole.common),
  AttachmentController.deleteById
);


export const AttachmentRoutes = router;
