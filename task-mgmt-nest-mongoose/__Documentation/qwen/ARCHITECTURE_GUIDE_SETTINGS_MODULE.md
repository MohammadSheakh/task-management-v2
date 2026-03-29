# 🏗️ SETTINGS MODULE - COMPREHENSIVE ARCHITECTURE GUIDE

**Version**: 1.0.0 (NestJS)  
**Last Updated**: 26-03-29  
**Level**: Senior/Mastery  
**Estimated Study Time**: 45 minutes

---

## 📋 **TABLE OF CONTENTS**

1. [Module Overview](#1-module-overview)
2. [Module Structure](#2-module-structure)
3. [Database Schema](#3-database-schema)
4. [Settings Types](#4-settings-types)
5. [API Endpoints](#5-api-endpoints)
6. [Business Logic](#6-business-logic)
7. [Caching Strategy](#7-caching-strategy)
8. [Security](#8-security)
9. [Integration Points](#9-integration-points)

---

## 1. **MODULE OVERVIEW**

### **1.1 Purpose & Scope**

The Settings module manages **static content and application settings**:
- **About Us**: Company/organization information
- **Contact Us**: Contact details
- **Privacy Policy**: Privacy policy content
- **Terms & Conditions**: Terms of service
- **Introduction Video**: Welcome/onboarding video

### **1.2 Key Characteristics**

1. **Simple CRUD**: Basic create, read, update, delete operations
2. **Admin-Managed**: Only admins can modify settings
3. **Public Read**: Most settings are publicly accessible
4. **Heavily Cached**: Static content cached for performance
5. **Versioned**: Track changes over time

### **1.3 Module Statistics**

| Metric | Value |
|--------|-------|
| **Total Files** | 7 files |
| **Lines of Code** | ~400 lines |
| **API Endpoints** | 4 endpoints |
| **Settings Types** | 5 types |
| **Cache TTL** | 15 minutes |

---

## 2. **MODULE STRUCTURE**

```
src/modules/settings.module/
├── settings.module.ts                      # Module definition
├── settings.controller.ts                  # CRUD endpoints (4)
├── settings.service.ts                     # Settings business logic
├── settings.schema.ts                      # Settings schema
├── settings.constants.ts                   # Settings types enum
└── dto/
    ├── create-settings.dto.ts              # Create/update DTO
    └── query-settings.dto.ts               # Query DTO
```

---

## 3. **DATABASE SCHEMA**

### **3.1 Settings Schema**

```typescript
@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class Settings {
  /**
   * Settings type (unique)
   */
  @Prop({
    type: String,
    enum: Object.values(SettingsType),
    required: [true, 'Settings type is required'],
    unique: true,
    index: true,
  })
  type: SettingsType;

  /**
   * Settings content/details
   */
  @Prop({
    type: String,
    required: [false, 'Details is not required'],
    default: '',
  })
  details: string;

  /**
   * Introduction video metadata (for introductionVideo type)
   */
  @Prop({
    type: {
      url: String,
      title: String,
      description: String,
      thumbnailUrl: String,
      duration: Number,
    },
  })
  introductionVideo?: {
    url: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    duration: number;
  };

  /**
   * Is this setting active?
   */
  @Prop({ default: true })
  isActive: boolean;

  /**
   * Version number (for change tracking)
   */
  @Prop({ default: 1 })
  version: number;

  /**
   * Last updated by (admin user)
   */
  @Prop({
    type: Schema.Types.ObjectId,
    ref: 'User',
  })
  updatedBy?: Types.ObjectId;

  /**
   * Creation timestamp (auto-managed by Mongoose)
   */
  createdAt?: Date;

  /**
   * Last update timestamp (auto-managed by Mongoose)
   */
  updatedAt?: Date;
}

// Indexes
SettingsSchema.index({ type: 1, isActive: 1 });

// toJSON transformation
SettingsSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    ret.settingsId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
```

---

## 4. **SETTINGS TYPES**

### **4.1 Settings Type Enum**

```typescript
export enum SettingsType {
  /** About Us page content */
  ABOUT_US = 'aboutUs',

  /** Contact Us information */
  CONTACT_US = 'contactUs',

  /** Privacy Policy content */
  PRIVACY_POLICY = 'privacyPolicy',

  /** Terms and Conditions content */
  TERMS_AND_CONDITIONS = 'termsAndConditions',

  /** Introduction Video metadata */
  INTRODUCTION_VIDEO = 'introductionVideo',
}

export const SETTINGS_LABELS: Record<SettingsType, string> = {
  [SettingsType.ABOUT_US]: 'About Us',
  [SettingsType.CONTACT_US]: 'Contact Us',
  [SettingsType.PRIVACY_POLICY]: 'Privacy Policy',
  [SettingsType.TERMS_AND_CONDITIONS]: 'Terms and Conditions',
  [SettingsType.INTRODUCTION_VIDEO]: 'Introduction Video',
};
```

### **4.2 Example Content**

```typescript
// About Us
{
  type: 'aboutUs',
  details: `
    <h1>About Our Platform</h1>
    <p>We are a task management platform designed for families...</p>
    <h2>Our Mission</h2>
    <p>To help families organize and collaborate effectively...</p>
  `,
  isActive: true,
  version: 3,
}

// Contact Us
{
  type: 'contactUs',
  details: `
    <div class="contact-info">
      <h2>Contact Information</h2>
      <p>Email: support@example.com</p>
      <p>Phone: +1-234-567-8900</p>
      <p>Address: 123 Main St, City, Country</p>
    </div>
  `,
  isActive: true,
  version: 2,
}

// Introduction Video
{
  type: 'introductionVideo',
  introductionVideo: {
    url: 'https://cdn.example.com/videos/intro.mp4',
    title: 'Welcome to Our Platform',
    description: 'Learn how to use our platform in 2 minutes',
    thumbnailUrl: 'https://cdn.example.com/thumbnails/intro.jpg',
    duration: 120, // seconds
  },
  isActive: true,
  version: 1,
}
```

---

## 5. **API ENDPOINTS**

### **5.1 Complete Reference**

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/settings/:type` | ❌ | Public | Get settings by type |
| `GET` | `/settings` | ❌ | Public | Get all active settings |
| `POST` | `/settings` | ✅ | Admin | Create/update settings |
| `DELETE` | `/settings/:type` | ✅ | Admin | Delete settings |

### **5.2 Request/Response Examples**

**Get Settings by Type (Public)**
```http
GET /settings/aboutUs

Response 200:
{
  "success": true,
  "data": {
    "settingsId": "507f1f77bcf86cd799439011",
    "type": "aboutUs",
    "details": "<h1>About Our Platform</h1>...",
    "isActive": true,
    "version": 3,
    "updatedAt": "2024-03-29T10:00:00Z"
  }
}
```

**Update Settings (Admin)**
```http
POST /settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "privacyPolicy",
  "details": "<h1>Privacy Policy</h1>...updated content...",
  "isActive": true
}

Response 200:
{
  "success": true,
  "data": {
    "settingsId": "507f1f77bcf86cd799439012",
    "type": "privacyPolicy",
    "details": "<h1>Privacy Policy</h1>...",
    "version": 5,
    "updatedBy": "507f1f77bcf86cd799439013",
    "updatedAt": "2024-03-29T10:00:00Z"
  },
  "message": "Settings updated successfully"
}
```

---

## 6. **BUSINESS LOGIC**

### **6.1 Service Implementation**

```typescript
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectModel(Settings.name)
    private settingsModel: Model<SettingsDocument>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Get settings by type (with caching)
   */
  async getSettingsByType(type: SettingsType): Promise<SettingsDocument | null> {
    const cacheKey = `settings:${type}`;

    // Try cache first
    const cached = await this.cacheManager.get<SettingsDocument>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const settings = await this.settingsModel.findOne({
      type,
      isActive: true,
    }).lean();

    // Cache the result
    if (settings) {
      await this.cacheManager.set(cacheKey, settings, CACHE_TTL.SETTINGS);
    }

    return settings;
  }

  /**
   * Get all active settings (with caching)
   */
  async getAllActiveSettings(): Promise<SettingsDocument[]> {
    const cacheKey = 'settings:all:active';

    const cached = await this.cacheManager.get<SettingsDocument[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const settings = await this.settingsModel.find({
      isActive: true,
    }).lean();

    await this.cacheManager.set(cacheKey, settings, CACHE_TTL.SETTINGS);

    return settings;
  }

  /**
   * Create or update settings
   */
  async createOrUpdateSettings(
    dto: CreateSettingsDto,
    updatedBy: string,
  ): Promise<SettingsDocument> {
    const { type, details, introductionVideo } = dto;

    // Find existing or create new
    let settings = await this.settingsModel.findOne({ type });

    if (settings) {
      // Update existing
      settings.details = details || settings.details;
      if (introductionVideo) {
        settings.introductionVideo = introductionVideo;
      }
      settings.version += 1;
      settings.updatedBy = new Types.ObjectId(updatedBy);
      await settings.save();

      this.logger.log(`Updated settings: ${type} (version ${settings.version})`);
    } else {
      // Create new
      settings = await this.settingsModel.create({
        type,
        details,
        introductionVideo,
        updatedBy,
        version: 1,
      });

      this.logger.log(`Created settings: ${type}`);
    }

    // Invalidate cache
    await this.invalidateCache(type);

    return settings;
  }

  /**
   * Delete settings (soft delete)
   */
  async deleteSettings(type: SettingsType): Promise<void> {
    await this.settingsModel.updateOne(
      { type },
      { $set: { isActive: false } },
    );

    await this.invalidateCache(type);

    this.logger.log(`Deleted settings: ${type}`);
  }

  /**
   * Invalidate cache
   */
  private async invalidateCache(type: SettingsType): Promise<void> {
    await Promise.all([
      this.cacheManager.del(`settings:${type}`),
      this.cacheManager.del('settings:all:active'),
    ]);

    this.logger.debug(`Invalidated cache for settings: ${type}`);
  }
}
```

---

## 7. **CACHING STRATEGY**

### **7.1 Cache Configuration**

```typescript
const CACHE_KEYS = {
  byType: (type: SettingsType) => `settings:${type}`,
  allActive: () => 'settings:all:active',
};

const CACHE_TTL = {
  SETTINGS: 900, // 15 minutes
};
```

### **7.2 Cache Invalidation**

```typescript
// Invalidate on any update
async updateSettings(type: SettingsType, details: string): Promise<void> {
  await this.settingsModel.updateOne({ type }, { details });
  
  // Invalidate both specific and list cache
  await this.cacheManager.delete(CACHE_KEYS.byType(type));
  await this.cacheManager.delete(CACHE_KEYS.allActive());
}
```

---

## 8. **SECURITY**

### **8.1 Authorization**

```typescript
// Read: Public (no auth required)
@Get(':type')
async getSettings(@Param('type') type: SettingsType) {
  const settings = await this.settingsService.getSettingsByType(type);
  
  if (!settings) {
    throw new NotFoundException('Settings not found');
  }
  
  return { success: true, data: settings };
}

// Write: Admin only
@Post()
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
async updateSettings(
  @Body() dto: CreateSettingsDto,
  @User() user: any,
) {
  const settings = await this.settingsService.createOrUpdateSettings(dto, user.userId);
  return { success: true, data: settings };
}
```

### **8.2 Input Sanitization**

```typescript
// Sanitize HTML content
async createOrUpdateSettings(dto: CreateSettingsDto): Promise<SettingsDocument> {
  // Sanitize HTML to prevent XSS
  const sanitizedDetails = dto.details 
    ? sanitizeHtml(dto.details, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'img']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ['src', 'alt', 'class'],
        },
      })
    : dto.details;

  return this.settingsModel.findOneAndUpdate(
    { type: dto.type },
    { details: sanitizedDetails },
    { upsert: true, new: true },
  );
}
```

---

## 9. **INTEGRATION POINTS**

### **9.1 With Frontend**

```typescript
// Frontend fetches settings on app load
async function loadAppSettings() {
  const response = await fetch('/api/settings');
  const { data } = await response.json();
  
  // Store in state management
  store.dispatch({ type: 'SET_SETTINGS', payload: data });
  
  // Cache in localStorage for offline support
  localStorage.setItem('appSettings', JSON.stringify(data));
}
```

### **9.2 With Notification Module**

```typescript
// When settings change, notify admins
async updateSettings(dto: CreateSettingsDto, updatedBy: string) {
  const settings = await this.settingsService.createOrUpdateSettings(dto, updatedBy);
  
  // Send notification to other admins
  const admins = await this.userModel.find({ role: 'admin' });
  
  for (const admin of admins) {
    if (admin._id.toString() !== updatedBy) {
      await this.notificationService.sendNotification({
        title: 'Settings Updated',
        message: `${SettingsType[dto.type]} was updated by admin`,
        receiverId: admin._id,
        senderId: updatedBy,
        type: NotificationType.SYSTEM,
        entityType: 'settings',
        entityId: settings._id,
      });
    }
  }
  
  return settings;
}
```

---

## 📚 **KEY TAKEAWAYS**

1. **Simple CRUD** - Basic create, read, update, delete
2. **Public Read** - Settings accessible without authentication
3. **Admin Write** - Only admins can modify settings
4. **Heavy Caching** - 15 minute TTL for performance
5. **Version Tracking** - Track changes over time
6. **HTML Sanitization** - Prevent XSS attacks
7. **Type-Safe** - Enum-based settings types

---

**Next Module**: Analytics Module (platform-wide analytics)

---
-26-03-29
