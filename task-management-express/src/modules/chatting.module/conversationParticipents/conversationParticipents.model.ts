//@ts-ignore
import { model, Schema } from 'mongoose';
import paginate from '../../../common/plugins/paginate';
import { IConversationParticipents, IConversationParticipentsModel } from './conversationParticipents.interface';
import { Roles } from '../../../middlewares/roles';
import { TParticipants } from '../conversation/conversation.constant';


const conversationParticipentsSchema = new Schema<IConversationParticipents>(
  {
    userId: { //🔗
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User Id is required'],
    },
    userName : {
      type: String,
      required: [true, 'userName is required'],
    },
    conversationId: { //🔗
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation Id is required'],
    },
    
    joinedAt :{
      type: Date,
      required: [true, 'joinedAt is required'],
      default: Date.now,
    },

    role: {
      type : String,
      enum : [ TParticipants.member, TParticipants.admin ],
      required: [true, 'Role is required'],
    },

    //🆕 we need to use this field .. 
    lastMessageReadAt: {
      type: Date,
      required: [false, 'lastMessageReadAt is not required'],
    },

    //🆕 may be we dont need this field right now 
    lastMessageReadId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: [false, 'lastMessageReadId is not required'],
    },

    //🆕 ❌ Unread count becomes stateful and fragile.
    // we have this only for show value .. 
    unreadCount: {
      type: Number,
      required: [false, 'unreadCount is not required']
    },

    //🆕  --- value could be 0 or 1 .. 0 means ... no unseen message found
    // ------------------------------- 1 means unseen message found
    isThisConversationUnseen: {
      type: Number,
      required: [false, 'unreadCount is not required']
    },

    isDeleted: {
      type: Boolean,
      required: [false, 'isDeleted is not required'],
      default: false,
    },
  },
  { timestamps: true }
);

conversationParticipentsSchema.plugin(paginate);


// Use transform to rename _id to _projectId
conversationParticipentsSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._conversationParticipentsId = ret._id;  // Rename _id to _subscriptionId
    delete ret._id;  // Remove the original _id field
    return ret;
  }
});


export const ConversationParticipents = model<IConversationParticipents, IConversationParticipentsModel>(
  'ConversationParticipents',
  conversationParticipentsSchema
);
