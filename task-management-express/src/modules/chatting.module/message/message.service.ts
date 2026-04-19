import { notifyParticipantsQueue } from "../../../helpers/bullmq/bullmq";
import { RedisStateManager } from "../../../helpers/redis/redisStateManagerForSocketV2";
import { emitError, getConversationById, IUserProfile, MessageData, SocketAck, socketService } from "../../../helpers/socket/socketForChatV3";
import { enqueueLastMessageToUpdateConversation, enqueueParticipantsToNotify } from "../../../services/conversation.service";
import { GenericService } from "../../_generic-module/generic.services";
import { User } from "../../user.module/user/user.model";

import { Conversation } from "../conversation/conversation.model";
import { IConversationParticipents } from "../conversationParticipents/conversationParticipents.interface";
import { ConversationParticipents } from "../conversationParticipents/conversationParticipents.model";
import { IMessage } from "./message.interface";
import { Message } from "./message.model";
//@ts-ignore
import mongoose from 'mongoose';
// import { RedisStateManager } from '../redis/redisStateManagerForSocketV2';

export class MessagerService extends GenericService<typeof Message, IMessage>{ /**typeof Message */
    constructor(){
        super(Message)
    }

    /***
     * ⭕ not needed may be 
     * *** */
    async getAllByConversationId(conversationId: string) {
      const object = await this.model.find({ conversationId});
      
      if (!object) {
        // throw new ApiError(StatusCodes.BAD_REQUEST, 'No file uploaded');
        return null;
      }
      return object;
    }

    /*-───────────────────────────────── 💎✨🔍 -> V2 Found
    |  we call this service from 'send-new-message' socket event emit
    └──────────────────────────────────*/
    async sendMessage(socket:any , redisStateManager:RedisStateManager , messageData: MessageData, callback: SocketAck){
      const userId = socket.data.user._id;
      // const userProfile : IUserProfile = socket.data.userProfile; //⚠️ not sure .. do we need to pull profileInformation by userId 
      const userProfile : IUserProfile = await this.getUserProfile(userId) as IUserProfile

      console.log("1️⃣")

      if (!messageData.conversationId || !messageData.text?.trim()) {
        const error = 'Chat ID and message content are required';
        callback?.({ success: false, message: error });
        return emitError(socket, error);
      }

      // Get chat details  //⚠️ we dont need conversationData here ... need to write another function .. which only return conversationparticipants.. 
      const {conversationData, conversationParticipants} = await getConversationById(messageData.conversationId);
      
      console.log("1️⃣ 2")

      //---------------------------------
      // here we will check if the sender is a participant in the conversation or not
      // if not then we will send an error message
      //---------------------------------
      let isExist = false;

      conversationParticipants.forEach((participant: IConversationParticipents) => {
        const participantId:string = participant.userId?.toString();
        
        if (participantId == userId.toString()) {
            isExist = true;
            return;
        }
      });
    
      // for(const participant of conversationParticipants){
      //   const participantId:string = participant.userId?.toString();
        
      //   if (participantId == userId.toString()) {
      //       isExist = true;
      //       return;
      //   }
      // }

      console.log("1️⃣ 3")

      if(!isExist){
        // 🟪☑️🟣
        return emitError(socket, `You are not a participant in this conversation`);
      }

      // Create message
      const newMessage = await Message.create({
        ...messageData,
        timestamp: new Date(),
        senderId: userId,
      });

      console.log("1️⃣4")

      /*---------------------------- we do the same thing by redis bullmq
      
      const updatedConversation = await Conversation.findByIdAndUpdate(messageData.conversationId, {
        lastMessageId: newMessage._id,
        lastMessage: messageData.text,
      });

      ------------------------------*/

      enqueueLastMessageToUpdateConversation(
        messageData.conversationId,
        newMessage._id,
        messageData.text,
      )

      console.log("1️⃣5")

      // Prepare message data for emission
      const messageToEmit = {
        ...messageData,
        _id: newMessage._id,
        senderId: {  // populated as per nirob vais request
          name: userProfile?.name,
          profileImage: userProfile?.profileImage,
          _userId: userId,
        },

        name: userProfile?.name,
        image: userProfile?.profileImage,
        createdAt: newMessage.createdAt || new Date()
      };

      console.log("1️⃣6")

      // Emit to chat room
      const eventName = `new-message-received::${messageData.conversationId}`; // ${messageData.conversationId}
      
      // when you send everyone exclude the sender
      socket.to(messageData.conversationId).emit(eventName, messageToEmit);

      console.log("1️⃣7")
      
      // socket.emit(eventName, messageToEmit);

      // 🟢 NEW: Notify all conversation participants about conversation list update
    
      // Notify each participant (except the sender if excludeUserId is provided)
      conversationParticipants.forEach(async(participant: IConversationParticipents) => {
        const participantId = participant.userId?.toString();
        
        console.log(`1️⃣ .forEach Participant ID: ${participantId}, User ID: ${userId}`);

        const isOnline = await socketService.isUserOnline(participantId);
        
        // Check if participant is online
        //if (Array.from(onlineUsers).some(id => id.toString() === participantId)) {

        const isInConversationRoom = await redisStateManager.isUserInRoom(participantId.toString(), messageData.conversationId.toString())
        
        
        /*──────────────────────────────────
        |  DECISION TREE FOR NOTIFICATIONS   
        └────────────────────────────────────*/
        
        if (isInConversationRoom) {
          console.log(`${participantId} 🟢isInConversationRoom.. `)
          

          if(participantId !== userId.toString()){  // 🧪🧪🧪🧪🧪🧪🧪
            // which means userId is receiverId

            // const userPro = await this.getUserProfile(userId) as IUserProfile; //🎯 need to check from which file this interface came from 

            await socketService.emitToUser(
                participantId,
                `conversation-list-updated::${participantId}`,
                {
                  userId: {
                    "_userId": userId,
                    "name": userProfile.name,
                    "profileImage": userProfile.profileImage,
                    "role": userProfile.role,
                  },
                  conversations:[
                    {
                      // _conversationId: updatedConversation?._id,
                      _conversationId : messageData.conversationId,
                      lastMessage : messageData.text,
                      updatedAt : newMessage.createdAt
                    },
                  ],
                }
            );
          }

          
          
        } else if (isOnline && !isInConversationRoom) {
          
          if(participantId !== userId.toString()){ 
            // which means userId is receiverId

            //🛠️🎯⭐⚒️  update unreadCount for participants
            const updatedConversationParticipant:IConversationParticipents = await ConversationParticipents.findByIdAndUpdate(
              participant._id,
              {
                $set: {
                  isThisConversationUnseen: 1 // 1 means unseen .. 0 means seen
                },
                $inc: {
                  unreadCount: 1 // increases unreadCount by 1
                }
              },
              {
                new : true
              }
            )

            // calculate total unseenConversationCount for every participant .. and send them via socket 
            const allConversation = await ConversationParticipents.aggregate([
              {
                $match: {
                  userId: new mongoose.Types.ObjectId(participantId) // ensure proper ObjectId if 'id' is string
                }
              },
              {
                $group: {
                  _id: null,
                  totalUnseen: { $sum: "$isThisConversationUnseen" }
                }
              }
            ]);

            const unreadConversationCount = allConversation.length > 0 ? allConversation[0].totalUnseen : 1;


            await socketService.emitToUser(
                participantId,
                `unseen-count::${participantId}`,
                {
                  unreadConversationCount: unreadConversationCount
                }
            );

            // const userPro = await this.getUserProfile(userId) as IUserProfile;

            await socketService.emitToUser(
                participantId,
                `conversation-list-updated::${participantId}`,
                {
                  userId: {
                    "_userId": userId,
                    "name": userProfile.name,
                    "profileImage": userProfile.profileImage,
                    "role": userProfile.role,
                  },
                  conversations:[
                    {
                      // _conversationId: updatedConversation?._id,
                      _conversationId : messageData.conversationId,
                      lastMessage : messageData.text,
                      updatedAt : newMessage.createdAt
                    },
                  ],
                }
            );

          }

        } else{
          console.log(`${participantId}offline ⭕`)
          // TODO : MUST Push notification
          // .... THIS PROJECT IS NOT AN APP .. so we dont need push notification here
        } 

      });  
      
      console.log("1️⃣8")

      return newMessage;
    }

    /*-─────────────────────────────────  V2
    | What we update in this v2 is ..
    | Move all .. Notify all conversation participants about conversation list update
    | Logic to BullMQ
    └──────────────────────────────────*/
    async sendMessageV2(socket:any , redisStateManager:RedisStateManager , messageData: MessageData, callback: SocketAck){
      const userId = socket.data.user._id;
      // const userProfile : IUserProfile = socket.data.userProfile; //⚠️ not sure .. do we need to pull profileInformation by userId 
      const userProfile : IUserProfile = await this.getUserProfile(userId) as IUserProfile

      if (!messageData.conversationId || !messageData.text?.trim()) {
        const error = 'Chat ID and message content are required';
        callback?.({ success: false, message: error });
        return emitError(socket, error);
      }

      // Get chat details  //⚠️ we dont need conversationData here ... need to write another function .. which only return conversationparticipants.. 
      const {conversationData, conversationParticipants} = await getConversationById(messageData.conversationId);
      
      //---------------------------------
      // here we will check if the sender is a participant in the conversation or not
      // if not then we will send an error message
      //---------------------------------
      let isExist = false;

      conversationParticipants.forEach((participant: IConversationParticipents) => {
        const participantId:string = participant.userId?.toString();
        
        if (participantId == userId.toString()) {
            isExist = true;
            return;
        }
      });
    
      // for(const participant of conversationParticipants){
      //   const participantId:string = participant.userId?.toString();
        
      //   if (participantId == userId.toString()) {
      //       isExist = true;
      //       return;
      //   }
      // }

      if(!isExist){
        // ☑️🟣
        return emitError(socket, `You are not a participant in this conversation`);
      }

      // Create message
      const newMessage = await Message.create({
        ...messageData,
        timestamp: new Date(),
        senderId: userId,
      });

      // ☑️🟣
      enqueueLastMessageToUpdateConversation(
        messageData.conversationId,
        newMessage._id,
        messageData.text,
      )

      // Prepare message data for emission
      const messageToEmit = {
        ...messageData,
        _id: newMessage._id,
        senderId: {  // populated as per nirob vais request
          name: userProfile?.name,
          profileImage: userProfile?.profileImage,
          _userId: userId,
        },

        name: userProfile?.name,
        image: userProfile?.profileImage,
        createdAt: newMessage.createdAt || new Date()
      };

      // Emit to chat room
      const eventName = `new-message-received::${messageData.conversationId}`; // ${messageData.conversationId}
      
      // when you send everyone exclude the sender
      socket.to(messageData.conversationId).emit(eventName, messageToEmit);

      
      // socket.emit(eventName, messageToEmit);

      // 🟢 NEW: Notify all conversation participants about conversation list update
      // ✅ Enqueue participant notification job

      enqueueParticipantsToNotify(
        messageData.conversationId,
        newMessage._id.toString(),
        messageData.text,
        userId.toString(),
        {
          name: userProfile.name,
          profileImage : userProfile.profileImage,
          role : userProfile.role,
        },
        conversationParticipants.map(p => p.userId.toString()),
      )

      return newMessage;
    }

    private async getUserProfile(userId: string) : Promise<IUserProfile | null> {
      return await User.findById(userId, 'id name email profileImage subscriptionType role fcmToken').lean();
    }
}