import { notifyParticipantsQueue, updateConversationsLastMessageQueue } from "../helpers/bullmq/bullmq";

//---------------------------------
//  global method to update conversation's last message when a person send new message through bull queue
//---------------------------------
export async function enqueueLastMessageToUpdateConversation(
  conversationId: string,
  lastMessageId: string,
  lastMessage: string,
) {

  const conversationUpdated = await updateConversationsLastMessageQueue.add(
    'updateConversationsLastMessageQueue-suplify',
    {
      conversationId,
      lastMessageId,
      lastMessage
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s
      },
      removeOnComplete: true,
      removeOnFail: 1000, // keep failed jobs for debugging
    }
  );

  // console.log("🔔 enqueueLastMessageToUpdateConversation hit :: conversationUpdated -> ")
}


export async function enqueueParticipantsToNotify(
  conversationId: string,
  messageId: string,
  messageText: string,
  senderId : string,
  senderProfile : {
    name : string,
    profileImage : string,
    role : string,
  },
  participantIds : string[],
) {

  await notifyParticipantsQueue.add('notify-participants', {
        conversationId,
        messageId,
        messageText,
        senderId,
        senderProfile: {
          name: senderProfile.name,
          profileImage: senderProfile.profileImage,
          role: senderProfile.role,
        },
        participantIds,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });

  // console.log("🔔 enqueueParticipantsToNotify hit :: -> ")
}