
//@ts-ignore
import multer from "multer";
import { processUploadedFilesForCreate, processUploadedFilesForUpdate } from "../../../middlewares/processUploadedFiles";
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import { TFolderName } from "../../../enums/folderNames";
import ApiError from "../../../errors/ApiError";
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//---------------------------
// 🥇 we move image upload thing to controller to middleware level
//---------------------------
export const imageUploadPipelineForUpdateUserProfile = [
  [
    upload.fields([
      { name: 'profileImage', maxCount: 1 }, // Allow up to 1
    ]),
  ],
  processUploadedFilesForUpdate([
    {
      name: 'profileImage',
      folder: TFolderName.user,
      required: false, // optional
      allowedMimeTypes: ['image/jpeg', 'image/png'], // optional
    },
  ]),
];

/**
 * Middleware: Verify Child Belongs To Business User
 * Ensures the business user can only update support mode for their own children
 * 
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 * @throws ApiError if user is not business role or child doesn't belong to them
 * @see Figma: task-details-flow-apis.png
 */
export const verifyChildBelongsToBusinessUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const businessUserId = (req.user as any).userId;
    const { childUserId } = req.body;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    if (!childUserId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Child user ID is required');
    }

    const { User } = await import('../user/user.model');
    const businessUser = await User.findById(businessUserId).select('role').lean();

    if (!businessUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Business user not found');
    }

    // Only business users can update child's support mode
    if (businessUser.role !== 'business') {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Only business users can update child support mode'
      );
    }

    // Verify the child belongs to this business user
    const { ChildrenBusinessUser } = await import(
      '../../childrenBusinessUser.module/childrenBusinessUser.model'
    );

    const relationship = await ChildrenBusinessUser.findOne({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      childUserId: new Types.ObjectId(childUserId),
      status: 'active',
      isDeleted: false,
    });

    if (!relationship) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'This child does not belong to your family'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

