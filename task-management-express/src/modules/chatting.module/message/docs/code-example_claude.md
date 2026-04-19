```ts
// ========================================
// 1. MESSAGE HANDLER (Socket Layer)
// ========================================

socket.on('send-new-message', async (messageData: MessageData, callback) => {
  try {
    console.log('New message received:', messageData);

    // 1. Early validation
    const validationError = validateMessageData(messageData);
    if (validationError) {
      callback?.({ success: false, message: validationError });
      return emitError(socket, validationError);
    }

    // 2. Verify sender is participant (FIXED: early return on failure)
    const isParticipant = await verifyParticipantAccess(
      messageData.conversationId, 
      userId
    );
    
    if (!isParticipant) {
      const error = 'You are not a participant in this conversation';
      callback?.({ success: false, message: error });
      return emitError(socket, error);
    }

    // 3. Create message in DB
    const newMessage = await Message.create({
      ...messageData,
      timestamp: new Date(),
      senderId: userId,
    });

    // 4. Publish to Kafka (async, non-blocking)
    await kafkaProducer.send({
      topic: 'chat.message.created',
      messages: [{
        key: messageData.conversationId.toString(),
        value: JSON.stringify({
          messageId: newMessage._id,
          conversationId: messageData.conversationId,
          senderId: userId,
          text: messageData.text,
          timestamp: newMessage.createdAt,
        }),
      }],
    });

    // 5. Immediate socket emission (for real-time UX)
    const messageToEmit = {
      ...messageData,
      _id: newMessage._id,
      senderId: {
        name: userProfile?.name,
        profileImage: userProfile?.profileImage,
        _userId: userId,
      },
      createdAt: newMessage.createdAt || new Date()
    };

    socket.to(messageData.conversationId).emit(
      `new-message-received::${messageData.conversationId}`, 
      messageToEmit
    );

    // 6. Success callback
    callback?.({
      success: true,
      message: "Message sent successfully",
      messageDetails: {
        messageId: newMessage._id,
        conversationId: messageData.conversationId,
        senderId: userId,
        text: messageData.text,
        timestamp: newMessage.createdAt || new Date(),
      },
    });

  } catch (error) {
    console.error('Error sending message:', error);
    const errorMessage = 'Failed to send message';
    callback?.({ success: false, message: errorMessage });
    emitError(socket, errorMessage);
  }
});

// ========================================
// 2. KAFKA CONSUMER (Background Worker)
// ========================================

// Consumer handles heavy operations asynchronously
const messageCreatedConsumer = kafka.consumer({ 
  groupId: 'message-processor-group' 
});

await messageCreatedConsumer.subscribe({ 
  topic: 'chat.message.created' 
});

await messageCreatedConsumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const messageData = JSON.parse(message.value.toString());
    
    try {
      // 1. Update conversation lastMessage
      await updateConversationLastMessage(
        messageData.conversationId,
        messageData.messageId,
        messageData.text
      );

      // 2. Get all participants
      const participants = await getConversationParticipants(
        messageData.conversationId
      );

      // 3. Process each participant
      await Promise.all(
        participants.map(participant => 
          processParticipantNotification(participant, messageData)
        )
      );

    } catch (error) {
      console.error('Error processing message event:', error);
      // Kafka will retry automatically based on your config
    }
  },
});

// ========================================
// 3. HELPER FUNCTIONS (Clean & Reusable)
// ========================================

function validateMessageData(data: MessageData): string | null {
  if (!data.conversationId) return 'Conversation ID is required';
  if (!data.text?.trim()) return 'Message content is required';
  return null;
}

async function verifyParticipantAccess(
  conversationId: string, 
  userId: string
): Promise<boolean> {
  const participant = await ConversationParticipants.findOne({
    conversationId,
    userId
  });
  return !!participant;
}

async function updateConversationLastMessage(
  conversationId: string,
  messageId: string,
  text: string
): Promise<void> {
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessageId: messageId,
    lastMessage: text,
    updatedAt: new Date()
  });
}

async function getConversationParticipants(
  conversationId: string
): Promise<IConversationParticipants[]> {
  return await ConversationParticipants.find({ conversationId })
    .populate('userId')
    .lean();
}

async function processParticipantNotification(
  participant: IConversationParticipants,
  messageData: any
): Promise<void> {
  const participantId = participant.userId.toString();
  
  // Skip sender
  if (participantId === messageData.senderId.toString()) {
    return;
  }

  const isOnline = await socketService.isUserOnline(participantId);
  const isInRoom = await redisStateManager.isUserInRoom(
    participantId, 
    messageData.conversationId
  );

  if (isInRoom) {
    // User is actively viewing conversation - just update list
    await emitConversationListUpdate(participantId, messageData, false);
  } else if (isOnline) {
    // User is online but not in room - increment unread + update list
    await incrementUnreadCount(participant._id, participantId);
    await emitConversationListUpdate(participantId, messageData, true);
  } else {
    // User is offline - send push notification
    await sendPushNotification(participantId, messageData);
  }
}

async function incrementUnreadCount(
  participantRecordId: string,
  userId: string
): Promise<void> {
  // Update unread count
  await ConversationParticipants.findByIdAndUpdate(participantRecordId, {
    $set: { isThisConversationUnseen: 1 },
    $inc: { unreadCount: 1 }
  });

  // Calculate total unseen conversations
  const unseenAgg = await ConversationParticipants.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId) 
      } 
    },
    { 
      $group: { 
        _id: null, 
        totalUnseen: { $sum: "$isThisConversationUnseen" } 
      } 
    }
  ]);

  const unreadConversationCount = unseenAgg[0]?.totalUnseen || 0;

  // Emit unseen count
  await socketService.emitToUser(
    userId,
    `unseen-count::${userId}`,
    { unreadConversationCount }
  );
}

async function emitConversationListUpdate(
  participantId: string,
  messageData: any,
  includeUnreadCount: boolean
): Promise<void> {
  const senderProfile = await getUserProfile(messageData.senderId);

  await socketService.emitToUser(
    participantId,
    `conversation-list-updated::${participantId}`,
    {
      userId: {
        _userId: messageData.senderId,
        name: senderProfile.name,
        profileImage: senderProfile.profileImage,
        role: senderProfile.role,
      },
      conversations: [{
        _conversationId: messageData.conversationId,
        lastMessage: messageData.text,
        updatedAt: messageData.timestamp
      }]
    }
  );
}

async function sendPushNotification(
  userId: string,
  messageData: any
): Promise<void> {
  // Publish to push notification topic
  await kafkaProducer.send({
    topic: 'notifications.push',
    messages: [{
      key: userId,
      value: JSON.stringify({
        userId,
        type: 'new_message',
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        text: messageData.text,
      }),
    }],
  });
}

// ========================================
// 4. KAFKA SETUP (Initialize once)
// ========================================

import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'chat-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const kafkaProducer = kafka.producer();
await kafkaProducer.connect();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await kafkaProducer.disconnect();
  await messageCreatedConsumer.disconnect();
});

```