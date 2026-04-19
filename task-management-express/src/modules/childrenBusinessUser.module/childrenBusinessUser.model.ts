//@ts-ignore
import { model, Schema, Types } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import {
  IChildrenBusinessUser,
  IChildrenBusinessUserDocument,
  IChildrenBusinessUserModel,
} from './childrenBusinessUser.interface';
import { CHILDREN_BUSINESS_USER_STATUS } from './childrenBusinessUser.constant';

/**
 * Children Business User Schema
 * Tracks the relationship between business users (parents) and child accounts
 */
const childrenBusinessUserSchema = new Schema<IChildrenBusinessUser>(
  {
    parentBusinessUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Parent business user ID is required'],
      index: true,
    },
    childUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Child user ID is required'],
      unique: true, // One user can only be child of one business user
      index: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Added by user ID is required'],
    },
    status: {
      type: String,
      enum: [
        CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
        CHILDREN_BUSINESS_USER_STATUS.INACTIVE,
        CHILDREN_BUSINESS_USER_STATUS.REMOVED,
      ],
      default: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
    },

    /*-─────────────────────────────────
    |  Secondary User Flag
    |  Figma: dashboard-flow-03.png (Permissions section)
    |  Only ONE child per business user can be Secondary User
    |  Secondary User can:
    |    - Create tasks for family
    |    - Assign tasks to parent/teacher/other children
    |    - Act as "Task Manager"
    └──────────────────────────────────*/
    isSecondaryUser: {
      type: Boolean,
      default: false,  // Default: Not secondary user
    },

    note: {
      type: String,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/*-─────────────────────────────────
|  Compound indexes for efficient queries
└──────────────────────────────────*/
// Primary query pattern: Get all active children of a business user
childrenBusinessUserSchema.index({ parentBusinessUserId: 1, status: 1, isDeleted: 1 });

// Get parent business user for a child
childrenBusinessUserSchema.index({ childUserId: 1, status: 1, isDeleted: 1 });

// Get children by status
childrenBusinessUserSchema.index({ status: 1, isDeleted: 1 });

// Text search for notes (optional feature)
childrenBusinessUserSchema.index({ note: 'text' });

/*-─────────────────────────────────
|  Static method: Check if user is already a child of this business user
└──────────────────────────────────*/
childrenBusinessUserSchema.statics.isChildOfBusinessUser = async function (
  parentBusinessUserId: Types.ObjectId,
  childUserId: Types.ObjectId
): Promise<boolean> {
  const existing = await this.exists({
    parentBusinessUserId,
    childUserId,
    isDeleted: false,
  });
  return !!existing;
};

/*-─────────────────────────────────
|  Static method: Get children count for a business user
└──────────────────────────────────*/
childrenBusinessUserSchema.statics.getChildrenCount = async function (
  parentBusinessUserId: Types.ObjectId
): Promise<number> {
  const result = await this.countDocuments({
    parentBusinessUserId,
    status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
    isDeleted: false,
  });
  return result;
};

/*-─────────────────────────────────
|  Static method: Get all active children for a business user
└──────────────────────────────────*/
childrenBusinessUserSchema.statics.getActiveChildren = async function (
  parentBusinessUserId: Types.ObjectId
): Promise<Types.ObjectId[]> {
  const results = await this.find({
    parentBusinessUserId,
    status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
    isDeleted: false,
  }).select('childUserId');

  return results.map((doc) => doc.childUserId);
};

/*-─────────────────────────────────
|  Instance method: Check if this child account is active
└──────────────────────────────────*/
childrenBusinessUserSchema.methods.isActive = function (): boolean {
  return this.status === CHILDREN_BUSINESS_USER_STATUS.ACTIVE && !this.isDeleted;
};

/*-─────────────────────────────────
|  Apply paginate plugin
└──────────────────────────────────*/
childrenBusinessUserSchema.plugin(paginate);

/*-─────────────────────────────────
|  toJSON transformation
└──────────────────────────────────*/
childrenBusinessUserSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._relationshipId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

/*-─────────────────────────────────
|  Pre-save hook: Ensure only ONE secondary user per business user
└──────────────────────────────────*/
childrenBusinessUserSchema.pre('save', async function (next) {
  // Prevent self-reference (business user cannot be their own child)
  if (this.parentBusinessUserId.equals(this.childUserId)) {
    throw new Error('Parent business user cannot be the same as child user');
  }

  // If this child is being set as secondary user
  if (this.isSecondaryUser && this.isModified('isSecondaryUser')) {
    // Check if another child is already the secondary user
    const existingSecondary = await (this.constructor as any).findOne({
      parentBusinessUserId: this.parentBusinessUserId,
      isSecondaryUser: true,
      childUserId: { $ne: this.childUserId }, // Exclude current document
      isDeleted: false,
    });

    if (existingSecondary) {
      throw new Error('Only one child can be the Secondary User per business user. Please remove the existing secondary user first.');
    }
  }

  next();
});

/*-─────────────────────────────────
|  Post-remove hook: Clean up related data (optional)
└──────────────────────────────────*/
childrenBusinessUserSchema.post('findOneAndUpdate', async function (doc) {
  if (doc && doc.status === CHILDREN_BUSINESS_USER_STATUS.REMOVED) {
    // Could trigger cleanup or notification here
    console.log(`Child ${doc.childUserId} removed from business user ${doc.parentBusinessUserId}`);
  }
});

/**
 * Export the model
 */
export const ChildrenBusinessUser = model<IChildrenBusinessUser, IChildrenBusinessUserModel>(
  'ChildrenBusinessUser',
  childrenBusinessUserSchema
);
