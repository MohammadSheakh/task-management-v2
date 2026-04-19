//@ts-ignore
import { model, Schema } from 'mongoose';
import paginate from '../../../common/plugins/paginate';
import { IConversation, IConversationModel } from './conversation.interface';
import { ConversationType } from './conversation.constant';

const conversationSchema = new Schema<IConversation>(
  {
    creatorId: { //🔗
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User Id is required'],
    },
    type: {
      type: String,
      enum: [
        ConversationType.direct,
        ConversationType.group,
      ],
      required: [
        true,
        `ConversationType is required it can be ${Object.values(
          ConversationType
        ).join(', ')}`,
      ],
    },
  
    groupName: {
      type: String,
      default: null, // Optional group name
    },
    groupProfilePicture: {
      type: String,
      default: null, // Optional group profile picture
    },
    lastMessageId : { //🔗
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null, // Optional last message reference
    },
    lastMessage : {
      type: String,
      default: null, 
    },
    lastMessageCreatedAt: {
      type: Date,
      required: [false, 'lastMessageCreatedAt is required'],
    },
  
    isDeleted: {
      type: Boolean,
      required: [false, 'isDeleted is not required'],
      default: false,
    },
  },
  { timestamps: true }
);

conversationSchema.plugin(paginate);

// Use transform to rename _id to _projectId
conversationSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._conversationId = ret._id;  // Rename _id to _subscriptionId
    delete ret._id;  // Remove the original _id field
    return ret;
  }
});


export const Conversation = model<IConversation, IConversationModel>(
  'Conversation',
  conversationSchema
);
