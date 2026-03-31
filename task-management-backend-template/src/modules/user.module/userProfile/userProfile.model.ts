//@ts-ignore
import { model, Schema } from 'mongoose';
import { IUserProfile, IUserProfileModel } from './userProfile.interface';
import { SupportMode, NotificationStyle } from './userProfile.constant';
import paginate from '../../../common/plugins/paginate';

const userProfileSchema = new Schema<IUserProfile>({

    acceptTOC:{ // for mentor and student
        type: Boolean,
        required: [false, 'acceptTOC is not required'],
    },

    userId: { //🔗 for back reference ..
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },

    location: {
        type: String,
        trim: true,
    },

    age: {
        type: Number,
        trim: true,
    },

    dob: {
        type: Date,
    },

    gender: {
        type: Schema.Types.Mixed,
    },

    // ─── Support Mode & Notification Preferences ───────────────────────────
    /**
     * Support Mode: How the app communicates with the user
     * Figma: response-based-on-mode.png, profile-permission-account-interface.png
     */
    supportMode: {
        type: String,
        enum: Object.values(SupportMode),
        // default: SupportMode.CALM,
    },

    /**
     * Notification Style: How reminders should feel
     * Figma: profile-permission-account-interface.png (Notification Style section)
     */
    notificationStyle: {
        type: String,
        enum: Object.values(NotificationStyle),
        default: NotificationStyle.GENTLE,
    },
});

// Indexes for performance
userProfileSchema.index({ userId: 1, isDeleted: 1 });
userProfileSchema.index({ supportMode: 1 });
userProfileSchema.index({ notificationStyle: 1 });

// Apply the paginate plugin
userProfileSchema.plugin(paginate);

// userProfileSchema.index({ locationV2: "2dsphere" });

export const UserProfile = model<IUserProfile, IUserProfileModel>('UserProfile', userProfileSchema);