//@ts-ignore
import { model, Schema } from 'mongoose';
import { IDemo, IDemoModel } from './demo.interface';
import paginate from '../../common/plugins/paginate';


const demoSchema = new Schema<IDemo>(
  {
    userId: { //🔗
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    message: {
      type: String,
      required: [true, 'dateOfBirth is required'],
    },
    isDeleted: {
      type: Boolean,
      required: [false, 'isDeleted is not required'],
      default: false,
    },
  },
  { timestamps: true }
);

demoSchema.plugin(paginate);

// Use transform to rename _id to _projectId
demoSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._demoId = ret._id; // Rename _id to _subscriptionId
    delete ret._id; // Remove the original _id field
    return ret;
  },
});

export const Demo = model<
  IDemo,
  IDemoModel
>('Demo', demoSchema);
