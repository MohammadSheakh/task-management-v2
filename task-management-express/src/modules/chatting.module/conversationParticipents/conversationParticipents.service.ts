import { GenericService } from '../../_generic-module/generic.services';
import { IConversationParticipents } from './conversationParticipents.interface';
import { ConversationParticipents } from './conversationParticipents.model';
import { PaginateOptionsForConversations } from '../../../types/paginate';
import { socketService } from '../../../helpers/socket/socketForChatV3';
//@ts-ignore
import mongoose from 'mongoose'
import { Message } from '../message/message.model';

export class ConversationParticipentsService extends GenericService<
  typeof ConversationParticipents, IConversationParticipents
> {
  constructor() {
    super(ConversationParticipents);
  }

  async getByUserIdAndConversationId(userId: string, conversationId: string) {
    const object = await this.model.find({ userId , conversationId});
    
    if (!object) {
      // throw new ApiError(StatusCodes.BAD_REQUEST, 'No file uploaded');
      return null;
    }
    return object;
  }

  async getByConversationId(conversationId: any) {
    const object = await this.model.find({ conversationId }).select('userId').populate({
      path: 'userId',
      select:'name profileImage'
    });
    if (!object) {
      // throw new ApiError(StatusCodes.BAD_REQUEST, 'No file uploaded');
      return null;
    }
    return object;
  }

  //---------------------------------
  // ( Dashboard ) | Admin :: getAllConversationAndItsParticipantsBySiteId
  //---------------------------------
  async getByConversationIdForAdminDashboard(conversationId: any) {
    const object = await this.model.find({ conversationId }).select('-joinedAt -createdAt -updatedAt -__v')
    .populate({
      path: 'userId',
      select:'name role'
    });
    if (!object) {
      // throw new ApiError(StatusCodes.BAD_REQUEST, 'No file uploaded');
      return null;
    }
    return object;
  }

  /**********
   * 
   * Socket Helper Function
   * 
   * we need logged in users conversationsParticipents where we want to show only another person not logged in user  
   * For App ... 
   * 
   * ********** */
  async getAllConversationByUserId(userId: any) {
    let loggedInUserId = userId;
    // Step 1: Find all conversations the logged-in user participates in
    const userConversations = await ConversationParticipents.find({
      userId: loggedInUserId,
      isDeleted: false
    }).select('conversationId');

    const conversationIds = userConversations.map(conv => conv.conversationId);

    // Step 2: Find all participants in those conversations (excluding the logged-in user)
    const relatedParticipants = await ConversationParticipents.find({
      conversationId: { $in: conversationIds },
      userId: { $ne: loggedInUserId },
      isDeleted: false
    })
    .populate({
      path: 'userId',
      select: 'name profileImage role'
    })
    .populate({
      path: 'conversationId',
      select: 'lastMessage updatedAt',
      populate: {
        path: 'lastMessage',
      }
    });

    // Step 3: Remove duplicates and format data
    const uniqueUsers = {};
    
    relatedParticipants.forEach(participant => {
      const userId = participant.userId._id.toString();
      
      if (!uniqueUsers[userId]) {
        uniqueUsers[userId] = {
          userId: {
            _userId: participant.userId._id,
            name: participant.userId.name,
            profileImage: participant.userId.profileImage,
            role: participant.userId.role
          },
          conversations: [],
          // isOnline: global.socketUtils.isUserOnline(userId), // 😄😄😄😄😄😄😄 Not Working .. 
          // participantInfo: {
          //   joinedAt: participant.joinedAt,
          //   isDeleted: participant.isDeleted,
          //   _conversationParticipentsId: participant._id
          // }
        };
      }
      
      // Add conversation if not already added
      const conversationExists = uniqueUsers[userId].conversations.some(
        conv => conv._conversationId.toString() === participant.conversationId._id.toString()
      );
      
      if (!conversationExists) {
        uniqueUsers[userId].conversations.push({
          _conversationId: participant.conversationId._id,
          lastMessage: participant.conversationId.lastMessage,
          updatedAt: participant.conversationId.updatedAt
        });
      }
    });

    return Object.values(uniqueUsers);
  }

  ///// just add pagination functionality with above functionality ..  
  async getAllConversationByUserIdWithPagination(userId: any, options: PaginateOptionsForConversations = { limit: 10, page: 1 , search: '' }) {
    let loggedInUserId = userId;

    const search = options?.search?.trim();

    // Step 1: Find all conversations the logged-in user participates in
    const userConversations = await ConversationParticipents.find({
      userId: loggedInUserId,
      isDeleted: false
    }).select('conversationId');

    const conversationIds = userConversations.map(conv => conv.conversationId);

    // Step 2: Use pagination on ConversationParticipents
    const filter = {
      conversationId: { $in: conversationIds },
      userId: { $ne: loggedInUserId },
      isDeleted: false,
      // name :  { $regex: search, $options: 'i' } // 👉 Add search directly here
    };

    // ✅ Only add name filter if search is non-empty
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const populateOptions = [
      {
        path: 'userId',
        select: 'name profileImage role'
      },
      {
        path: 'conversationId',
        select: 'lastMessage updatedAt',
        // populate: {
        //   path: 'lastMessageId',
        //   select: "text"
        // }
      }
    ];

    // 👉 Add search directly here
    // if (search) {
    //   filter.name = { $regex: search, $options: 'i' };
    // }
    
    let dontWantToInclude: string | string[] = '';

    // Use your pagination function
    const paginatedResults = await ConversationParticipents.paginate(
      filter,
      {
        ...options, 
        sortBy: options.sortBy ?? 'updatedAt', // Sort by most recent conversations
      },
      populateOptions,
      dontWantToInclude
    );

    // Step 3: Remove duplicates and format data
    const uniqueUsers = {};
    
    paginatedResults.results.forEach(participant => {
    const userId = participant.userId._id.toString();
    
    if (!uniqueUsers[userId]) {
      uniqueUsers[userId] = {
        userId: {
          _userId: participant.userId._id,
          name: participant.userId.name,
          profileImage: participant.userId.profileImage,
          role: participant.userId.role
        },
        conversations: [],
        // isOnline: global.socketUtils.isUserOnline(userId), // 😄😄😄😄😄😄😄
      };
    }
    
    // Add conversation if not already added
    const conversationExists = uniqueUsers[userId].conversations.some(
      conv => conv._conversationId.toString() === participant.conversationId._id.toString()
    );
    
    if (!conversationExists) {
      uniqueUsers[userId].conversations.push({
        _conversationId: participant.conversationId._id,
        lastMessage: participant.conversationId.lastMessage,
        updatedAt: participant.conversationId.updatedAt
      });
    }
  });


    // return Object.values(uniqueUsers);
    // Return paginated response with processed data
  return {
    results: Object.values(uniqueUsers),
    page: paginatedResults.page,
    limit: paginatedResults.limit,
    totalPages: paginatedResults.totalPages,
    totalResults: paginatedResults.totalResults
  };
  }

  /*-─────────────────────────────────
    |  With Read Unread Logic ..  
    └──────────────────────────────────*/
  async getAllConversationByUserIdWithPaginationV2(
    userId: any,
    options: PaginateOptionsForConversations = { limit: 10, page: 1, search: '' }
  ) {
    const loggedInUserId = new mongoose.Types.ObjectId(userId);
    const search = options?.search?.trim();

    // Step 1: Get all conversations the user is in
    const userOwnParts = await ConversationParticipents.find({
      userId: loggedInUserId,
      isDeleted: false
    }).select('conversationId lastMessageReadAt');

    const conversationIds = userOwnParts.map(p => p.conversationId);
    const lastReadMap = new Map();
    userOwnParts.forEach(p => {
      lastReadMap.set(p.conversationId.toString(), p.lastMessageReadAt);
    });

    if (conversationIds.length === 0) {
      return { results: [], page: 1, limit: 10, totalPages: 0, totalResults: 0 };
    }

    // Step 2: Find other participants (for display)
    const filter = {
      conversationId: { $in: conversationIds },
      userId: { $ne: loggedInUserId },
      isDeleted: false,
    };

    if (search) {
      filter.userName = { $regex: search, $options: 'i' };
    }

    const populateOptions = [
      { path: 'userId', select: 'name profileImage role' },
      { path: 'conversationId', select: 'lastMessage updatedAt' }
    ];

    const paginatedResults = await ConversationParticipents.paginate(
      filter,
      { ...options, sortBy: 'conversationId.updatedAt:desc' },
      populateOptions,
      ''
    );

    // Step 3: For each conversation in results, compute unread count simply
    const enrichedConversations = [];

  
    /*──────────────────────────────────
    |  TODO : jodi jono conversation e join thake .. taile shetar unread count 0 hobe 
    └────────────────────────────────────*/

    for (const participant of paginatedResults.results) {
      const convoId = participant.conversationId._id.toString();
      const lastReadAt = lastReadMap.get(convoId) || null;

      // Count unread messages: from others, sent after last read
      let unreadCount = 0;
      if (lastReadAt) {
        unreadCount = await Message.countDocuments({
          conversationId: participant.conversationId._id,
          senderId: { $ne: loggedInUserId },
          createdAt: { $gt: lastReadAt }
        });
      } else {
        // If never read, count all messages from others
        unreadCount = await Message.countDocuments({
          conversationId: participant.conversationId._id,
          senderId: { $ne: loggedInUserId }
        });
      }

      enrichedConversations.push({
        participant,
        unreadCount
      });
    }

    // Step 4: Group by other user (same as before)
    const uniqueUsers: Record<string, any> = {};

    for (const { participant, unreadCount } of enrichedConversations) {
      const otherUserId = participant.userId._id.toString();
      const convoId = participant.conversationId._id.toString();

      if (!uniqueUsers[otherUserId]) {
        uniqueUsers[otherUserId] = {
          userId: {
            _userId: participant.userId._id,
            name: participant.userId.name,
            profileImage: participant.userId.profileImage,
            role: participant.userId.role
          },
          conversations: [],
        };
      }

      // Avoid duplicates (shouldn't happen, but safe)
      const exists = uniqueUsers[otherUserId].conversations.some(
        (c: any) => c._conversationId.toString() === convoId
      );

      if (!exists) {
        uniqueUsers[otherUserId].conversations.push({
          _conversationId: participant.conversationId._id,
          lastMessage: participant.conversationId.lastMessage,
          updatedAt: participant.conversationId.updatedAt,
          unreadCount,
        });
      }
    }

    return {
      results: Object.values(uniqueUsers),
      page: paginatedResults.page,
      limit: paginatedResults.limit,
      totalPages: paginatedResults.totalPages,
      totalResults: paginatedResults.totalResults
    };
  }


  


  /**********
   * 
   * Socket Helper Function
   * 
   * we need logged in users conversationsParticipents where we want to show only another person not logged in user  
   * For App ... 
   * 
   * ********** */
  async getAllConversationsOnlyPersonInformationByUserId(userId: any) {
    
    let loggedInUserId = userId;
    // Step 1: Find all conversations the logged-in user participates in
    const userConversations = await ConversationParticipents.find({
      userId: loggedInUserId,
      isDeleted: false
    }).select('conversationId');

    const conversationIds = userConversations.map(conv => conv.conversationId);

    // Step 2: Find all participants in those conversations (excluding the logged-in user)
    const relatedParticipants = await ConversationParticipents.find({
      conversationId: { $in: conversationIds },
      userId: { $ne: loggedInUserId },
      isDeleted: false
    }).select('userId')

    // .populate({
    //   path: 'userId',
    //   select: 'name profileImage role'
    // })
    // .populate({
    //   path: 'conversationId',
    //   select: 'lastMessage updatedAt'
    // })
    ;

    // Step 3: Remove duplicates and format data
    const uniqueUsers = {};
    
    relatedParticipants.forEach(participant => {
      const userId = participant.userId._id.toString();
      /**************
      if (!uniqueUsers[userId]) {
        uniqueUsers[userId] = {
          userId: participant.userId._id 
          // {
          //   _userId: participant.userId._id,
          //   // name: participant.userId.name,
          //   // profileImage: participant.userId.profileImage,
          //   // role: participant.userId.role
          // },
          // conversations: [],
          // isOnline: global.socketUtils.isUserOnline(userId),
          // participantInfo: {
          //   joinedAt: participant.joinedAt,
          //   isDeleted: participant.isDeleted,
          //   _conversationParticipentsId: participant._id
          // }
        };
      }

      ******** */

      if (!uniqueUsers[userId]) {
        uniqueUsers[userId] = 
          participant.userId._id 
      }

      /********
      
      // Add conversation if not already added
      const conversationExists = uniqueUsers[userId].conversations.some(
        conv => conv._conversationId.toString() === participant.conversationId._id.toString()
      );
      
      if (!conversationExists) {
        uniqueUsers[userId].conversations.push({
          _conversationId: participant.conversationId._id,
          lastMessage: participant.conversationId.lastMessage,
          updatedAt: participant.conversationId.updatedAt
        });
      }

      ******* */

    });

    /********** Response Structure ... 
    
    [
        {
            "userId": "685a211bcb3b476c53324c1b"
        },
    ]

    ************ */

    return Object.values(uniqueUsers);
  }


  // async getByUserId(userId: any) {
  //   const object = await this.model.find({ userId });
  //   if (!object) {
  //     // throw new ApiError(StatusCodes.BAD_REQUEST, 'No file uploaded');
  //     return null;
  //   }
  //   return object;
  // }
}

interface UniqueUser {
  userId: {
    _userId: string;
    name: string;
    profileImage: string;
    role: string;
  };
  conversations: {
    _conversationId: string;
    lastMessage: string;
    updatedAt: Date;
  }[];
  isOnline: boolean;
}