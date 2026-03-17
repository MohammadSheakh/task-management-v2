import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

/**
 * SubTask Document
 *
 * 📚 SUBTASK SCHEMA (SEPARATE COLLECTION)
 *
 * According to SUBTASK_MIGRATION_TO_SEPARATE_TABLE-17-03-26.md:
 * - SubTask is now a separate collection (not embedded)
 * - Improves performance for tasks with many subtasks
 * - Allows independent querying and updates
 * - Better scalability for mobile apps
 *
 * Compatible with Express.js subTask.model.ts
 */
@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class SubTask extends Document {
  @ApiProperty({ description: 'Parent task ID' })
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true,
  })
  taskId: Types.ObjectId;

  @ApiProperty({ description: 'Creator user ID' })
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdById: Types.ObjectId;

  @ApiProperty({ description: 'Subtask title' })
  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  })
  title: string;

  @ApiProperty({ description: 'Is completed flag' })
  @Prop({ type: Boolean, default: false })
  isCompleted: boolean;

  @ApiProperty({ description: 'Completed at timestamp' })
  @Prop({ type: Date })
  completedAt: Date;

  @ApiProperty({ description: 'Order for sorting' })
  @Prop({ type: Number, default: 0 })
  order: number;

  @ApiProperty({ description: 'Is deleted flag' })
  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  /**
   * Virtual property for subtask ID
   */
  @ApiProperty({ description: 'SubTask ID' })
  get _subTaskId(): string {
    return this._id.toString();
  }
}

export const SubTaskSchema = SchemaFactory.createForClass(SubTask);

// Indexes for performance
SubTaskSchema.index({ taskId: 1, isCompleted: 1, isDeleted: 1 });
SubTaskSchema.index({ taskId: 1, order: 1, isDeleted: 1 });

// Transform to JSON (Flutter compatible)
SubTaskSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    const flutterModel: any = {
      _subTaskId: ret._id,
      title: ret.title,
      isCompleted: ret.isCompleted,
    };

    // Include completedAt only if completed
    if (ret.isCompleted && ret.completedAt) {
      flutterModel.completedAt = ret.completedAt;
    }

    delete ret._id;
    delete ret.__v;
    delete ret.taskId;
    delete ret.createdById;
    delete ret.isDeleted;
    delete ret.createdAt;
    delete ret.updatedAt;
    delete ret.order;

    return flutterModel;
  },
});

export type SubTaskDocument = SubTask & {
  _id: Types.ObjectId;
};
