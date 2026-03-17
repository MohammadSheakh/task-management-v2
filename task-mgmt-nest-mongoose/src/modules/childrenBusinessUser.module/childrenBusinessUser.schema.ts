import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IBaseEntity } from '../../../common/base/base.entity';

/**
 * Children Business User Status Enum
 */
export enum ChildrenBusinessUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REMOVED = 'removed',
}

/**
 * Children Business User Schema
 * 
 * Manages parent-child relationships for task assignment
 */
@Schema({ 
  timestamps: true, 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})
export class ChildrenBusinessUser extends IBaseEntity {
  /**
   * Parent/Teacher business user ID
   */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  parentBusinessUserId: Types.ObjectId;

  /**
   * Child user ID
   */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  childUserId: Types.ObjectId;

  /**
   * User who added this child (usually the parent)
   */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  addedBy: Types.ObjectId;

  /**
   * Relationship status
   */
  @Prop({ 
    enum: ChildrenBusinessUserStatus, 
    default: ChildrenBusinessUserStatus.ACTIVE 
  })
  status: ChildrenBusinessUserStatus;

  /**
   * Is Secondary User (can create tasks for family)
   */
  @Prop({ default: false })
  isSecondaryUser: boolean;

  /**
   * Note (for removal reason, etc.)
   */
  @Prop({ trim: true })
  note?: string;

  /**
   * Soft delete flag
   */
  @Prop({ default: false })
  isDeleted: boolean;

  /**
   * Deletion timestamp
   */
  @Prop({ type: Date, default: null })
  deletedAt?: Date;
}

export const ChildrenBusinessUserSchema = SchemaFactory.createForClass(ChildrenBusinessUser);

// ─── Indexes for Performance ───────────────────────────────────────────────
/**
 * Compound indexes for common query patterns
 */
ChildrenBusinessUserSchema.index({ parentBusinessUserId: 1, status: 1, isDeleted: 1 });
ChildrenBusinessUserSchema.index({ childUserId: 1, status: 1, isDeleted: 1 });
ChildrenBusinessUserSchema.index({ parentBusinessUserId: 1, isSecondaryUser: 1, isDeleted: 1 });
ChildrenBusinessUserSchema.index({ addedAt: -1, isDeleted: 1 });

// ─── Virtuals ───────────────────────────────────────────────────────
/**
 * Virtual: Get child user details
 */
ChildrenBusinessUserSchema.virtual('childUser', {
  ref: 'User',
  localField: 'childUserId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual: Get parent user details
 */
ChildrenBusinessUserSchema.virtual('parentUser', {
  ref: 'User',
  localField: 'parentBusinessUserId',
  foreignField: '_id',
  justOne: true,
});

// ─── Transform ───────────────────────────────────────────────────────
/**
 * Transform schema output for API responses
 */
ChildrenBusinessUserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export type ChildrenBusinessUserDocument = ChildrenBusinessUser & Document;
