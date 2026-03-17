import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { GenericService } from '../../../common/generic/generic.service';
import { ChildrenBusinessUser, ChildrenBusinessUserDocument, ChildrenBusinessUserStatus } from './childrenBusinessUser.schema';

/**
 * ChildrenBusinessUser Service
 * 
 * Manages parent-child relationships
 * Extends GenericService for CRUD operations
 */
@Injectable()
export class ChildrenBusinessUserService extends GenericService<typeof ChildrenBusinessUser, ChildrenBusinessUserDocument> {
  constructor(
    @InjectModel(ChildrenBusinessUser.name) childrenModel: Model<ChildrenBusinessUserDocument>,
  ) {
    super(childrenModel);
  }

  /**
   * Create child account and add to family
   */
  async createChildAccount(
    parentBusinessUserId: string,
    childUserId: string,
  ): Promise<ChildrenBusinessUserDocument> {
    // Check if relationship already exists
    const existing = await this.model.findOne({
      parentBusinessUserId: new Types.ObjectId(parentBusinessUserId),
      childUserId: new Types.ObjectId(childUserId),
      isDeleted: false,
    }).exec();

    if (existing) {
      throw new BadRequestException('Child already added to family');
    }

    // Create relationship
    return this.model.create({
      parentBusinessUserId: new Types.ObjectId(parentBusinessUserId),
      childUserId: new Types.ObjectId(childUserId),
      addedBy: new Types.ObjectId(parentBusinessUserId),
      status: ChildrenBusinessUserStatus.ACTIVE,
    });
  }

  /**
   * Get all children of business user
   */
  async getChildrenOfBusinessUser(
    parentBusinessUserId: string,
    status?: ChildrenBusinessUserStatus,
  ): Promise<ChildrenBusinessUserDocument[]> {
    const filters: any = {
      parentBusinessUserId: new Types.ObjectId(parentBusinessUserId),
      status: status || ChildrenBusinessUserStatus.ACTIVE,
      isDeleted: false,
    };

    return this.model.find(filters)
      .populate('childUser', 'name email profileImage')
      .sort({ addedAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Get parent business user for child
   */
  async getParentBusinessUser(childUserId: string): Promise<ChildrenBusinessUserDocument | null> {
    return this.model.findOne({
      childUserId: new Types.ObjectId(childUserId),
      status: ChildrenBusinessUserStatus.ACTIVE,
      isDeleted: false,
    })
    .populate('parentBusinessUserId', 'name email profileImage')
    .lean()
    .exec();
  }

  /**
   * Remove child from family (soft delete)
   */
  async removeChildFromFamily(
    parentBusinessUserId: string,
    childUserId: string,
    note?: string,
  ): Promise<ChildrenBusinessUserDocument | null> {
    const result = await this.model.findOneAndUpdate(
      {
        parentBusinessUserId: new Types.ObjectId(parentBusinessUserId),
        childUserId: new Types.ObjectId(childUserId),
        isDeleted: false,
      },
      {
        status: ChildrenBusinessUserStatus.REMOVED,
        isDeleted: true,
        note,
        deletedAt: new Date(),
      },
      { new: true },
    ).lean().exec();

    if (!result) {
      throw new NotFoundException('Relationship not found');
    }

    return result;
  }

  /**
   * Reactivate child account
   */
  async reactivateChild(
    parentBusinessUserId: string,
    childUserId: string,
  ): Promise<ChildrenBusinessUserDocument | null> {
    return this.model.findOneAndUpdate(
      {
        parentBusinessUserId: new Types.ObjectId(parentBusinessUserId),
        childUserId: new Types.ObjectId(childUserId),
        isDeleted: true,
      },
      {
        status: ChildrenBusinessUserStatus.ACTIVE,
        isDeleted: false,
        note: 'Reactivated',
      },
      { new: true },
    ).lean().exec();
  }

  /**
   * Set/unset child as Secondary User
   */
  async setSecondaryUser(
    parentBusinessUserId: string,
    childUserId: string,
    isSecondaryUser: boolean,
  ): Promise<ChildrenBusinessUserDocument | null> {
    // If setting as secondary, ensure no other child is already secondary
    if (isSecondaryUser) {
      const existingSecondary = await this.model.findOne({
        parentBusinessUserId: new Types.ObjectId(parentBusinessUserId),
        isSecondaryUser: true,
        childUserId: { $ne: new Types.ObjectId(childUserId) },
        isDeleted: false,
      }).exec();

      if (existingSecondary) {
        throw new BadRequestException('Another child is already the Secondary User');
      }
    }

    return this.model.findOneAndUpdate(
      {
        parentBusinessUserId: new Types.ObjectId(parentBusinessUserId),
        childUserId: new Types.ObjectId(childUserId),
        isDeleted: false,
      },
      { isSecondaryUser },
      { new: true },
    ).lean().exec();
  }

  /**
   * Get Secondary User for business user
   */
  async getSecondaryUser(parentBusinessUserId: string): Promise<ChildrenBusinessUserDocument | null> {
    return this.model.findOne({
      parentBusinessUserId: new Types.ObjectId(parentBusinessUserId),
      isSecondaryUser: true,
      status: ChildrenBusinessUserStatus.ACTIVE,
      isDeleted: false,
    }).lean().exec();
  }

  /**
   * Check if child is Secondary User
   */
  async isChildSecondaryUser(childUserId: string): Promise<boolean> {
    const relationship = await this.model.exists({
      childUserId: new Types.ObjectId(childUserId),
      isSecondaryUser: true,
      status: ChildrenBusinessUserStatus.ACTIVE,
      isDeleted: false,
    });

    return !!relationship;
  }

  /**
   * Get children count for business user
   */
  async getChildrenCount(parentBusinessUserId: string): Promise<number> {
    return this.count({
      parentBusinessUserId: new Types.ObjectId(parentBusinessUserId),
      status: ChildrenBusinessUserStatus.ACTIVE,
      isDeleted: false,
    });
  }
}
