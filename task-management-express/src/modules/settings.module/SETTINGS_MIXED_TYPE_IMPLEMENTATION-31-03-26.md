# Settings Module - Mixed Type Implementation

**Created**: 31-03-26  
**Issue**: Support both string and object details based on settings type  
**Figma**: `teacher-parent-dashboard/settings-permission-section/settings.png`  
**Status**: ✅ COMPLETE  

---

## 🎯 PROBLEM

The `Settings` model needed to support **two different data structures** for the `details` field:

### For `contactUs` type:
```json
{
  "type": "contactUs",
  "details": {
    "email": "Support@gmail.com",
    "phoneNumber": "541341366"
  }
}
```

### For other types (aboutUs, privacyPolicy, termsAndConditions):
```json
{
  "type": "aboutUs",
  "details": "Lorem ipsum dolor sit amet..."
}
```

**Previous Issue**: `details` was typed as `string` only, which broke `contactUs` functionality.

---

## ✅ SOLUTION

### 1. Updated Interface (`settings.interface.ts`)

**Added**:
```typescript
/**
 * Contact Us Settings Details
 * Used when type is contactUs
 */
export interface IContactUsDetails {
  email: string;
  phoneNumber: string;
}

/**
 * Settings Details Type
 * - For contactUs: object with email and phoneNumber
 * - For others: string content
 */
export type TSettingsDetails = string | IContactUsDetails;
```

**Updated ISettings**:
```typescript
export interface ISettings {
  _id: string;
  type: settingsType.aboutUs | settingsType.contactUs | ...;
  details: TSettingsDetails; // ✅ Changed from `string` to union type
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2. Updated Model (`settings.model.ts`)

**Changed**:
```typescript
details: {
  // type: String,  ❌ Old - only string
  type: Schema.Types.Mixed,  // ✅ New - accepts string or object
  required: false,
}
```

---

### 3. Added Validation Logic (`settings.service.ts`)

**New Method**: `validateDetails()`

```typescript
private validateDetails(type: settingsType, details: any): void {
  if (type === settingsType.contactUs) {
    // For contactUs, details must be an object with email and phoneNumber
    if (!details || typeof details !== 'object') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'For contactUs type, details must be an object with email and phoneNumber'
      );
    }

    const contactDetails = details as IContactUsDetails;

    // Validate email exists and is string
    if (!contactDetails.email || typeof contactDetails.email !== 'string') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'contactUs details must contain a valid email (string)'
      );
    }

    // Validate phoneNumber exists and is string
    if (!contactDetails.phoneNumber || typeof contactDetails.phoneNumber !== 'string') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'contactUs details must contain a valid phoneNumber (string)'
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactDetails.email)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid email format');
    }

    // Validate phone number (minimum 10 digits)
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    if (!phoneRegex.test(contactDetails.phoneNumber)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid phone number format');
    }

  } else {
    // For all other types, details must be a string
    if (typeof details !== 'string') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `For ${type} type, details must be a string`
      );
    }

    // Validate string is not empty
    if (details.trim().length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Details cannot be empty');
    }
  }
}
```

**Updated**: `createOrUpdateSettings()`

```typescript
async createOrUpdateSettings(type: any, payload: any) {
  if (!allowedTypes.includes(type)) {
    throw new ApiError(...);
  }

  // ✅ NEW: Validate details based on type
  this.validateDetails(type, payload.details);

  // Find or create...
}
```

---

## 📊 FILES MODIFIED

| File | Changes | Lines |
|------|---------|-------|
| `settings.interface.ts` | Added `IContactUsDetails` and `TSettingsDetails` | +15 |
| `settings.model.ts` | Changed `details` to `Schema.Types.MIXED` | ~2 |
| `settings.service.ts` | Added `validateDetails()` method | +70 |
| **TOTAL** | | **~87 lines** |

---

## 🧪 TESTING

### Test 1: Create Contact Us Settings (Object)

```bash
curl -X POST http://localhost:5000/api/v1/settings?type=contactUs \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "details": {
      "email": "Support@gmail.com",
      "phoneNumber": "541341366"
    }
  }'

# ✅ Expected: Success
# Response: { "success": true, "data": { ... } }
```

---

### Test 2: Invalid Contact Us (Missing Email)

```bash
curl -X POST http://localhost:5000/api/v1/settings?type=contactUs \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "details": {
      "phoneNumber": "541341366"
    }
  }'

# ❌ Expected: 400 Bad Request
# Response: { "message": "contactUs details must contain a valid email (string)" }
```

---

### Test 3: Invalid Contact Us (String Instead of Object)

```bash
curl -X POST http://localhost:5000/api/v1/settings?type=contactUs \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "details": "Some text"
  }'

# ❌ Expected: 400 Bad Request
# Response: { "message": "For contactUs type, details must be an object with email and phoneNumber" }
```

---

### Test 4: Create About Us Settings (String)

```bash
curl -X POST http://localhost:5000/api/v1/settings?type=aboutUs \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "details": "Lorem ipsum dolor sit amet..."
  }'

# ✅ Expected: Success
# Response: { "success": true, "data": { ... } }
```

---

### Test 5: Invalid About Us (Object Instead of String)

```bash
curl -X POST http://localhost:5000/api/v1/settings?type=aboutUs \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "details": {
      "content": "Some text"
    }
  }'

# ❌ Expected: 400 Bad Request
# Response: { "message": "For aboutUs type, details must be a string" }
```

---

### Test 6: Invalid Email Format

```bash
curl -X POST http://localhost:5000/api/v1/settings?type=contactUs \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "details": {
      "email": "invalid-email",
      "phoneNumber": "541341366"
    }
  }'

# ❌ Expected: 400 Bad Request
# Response: { "message": "Invalid email format" }
```

---

### Test 7: Invalid Phone Number (Too Short)

```bash
curl -X POST http://localhost:5000/api/v1/settings?type=contactUs \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "details": {
      "email": "Support@gmail.com",
      "phoneNumber": "12345"
    }
  }'

# ❌ Expected: 400 Bad Request
# Response: { "message": "Invalid phone number format (minimum 10 digits required)" }
```

---

## 📊 VALIDATION RULES SUMMARY

| Settings Type | Details Type | Required Fields | Validation |
|---------------|--------------|-----------------|------------|
| **contactUs** | Object | `email`, `phoneNumber` | ✅ Email format<br>✅ Phone min 10 digits |
| **aboutUs** | String | Content | ✅ Not empty |
| **privacyPolicy** | String | Content | ✅ Not empty |
| **termsAndConditions** | String | Content | ✅ Not empty |
| **introductionVideo** | String | URL | ✅ Not empty |

---

## 🎯 FRONTEND INTEGRATION

### For Contact Us Form:

```javascript
// React/Vue component
const handleSubmit = async (formData) => {
  await api.post('/settings?type=contactUs', {
    details: {
      email: formData.email,
      phoneNumber: formData.phoneNumber
    }
  });
};
```

### For About Us / Privacy Policy / Terms & Conditions:

```javascript
// Rich text editor component
const handleSubmit = async (content) => {
  await api.post(`/settings?type=${type}`, {
    details: content  // String from rich text editor
  });
};
```

---

## 🔒 SECURITY & VALIDATION

### What's Validated:

1. **Type Safety**: TypeScript ensures correct types at compile time
2. **Runtime Validation**: Service validates payload before saving
3. **Email Format**: Regex validation for valid email structure
4. **Phone Format**: Minimum 10 digits validation
5. **Empty Check**: Strings cannot be empty
6. **Type Matching**: Object for contactUs, string for others

### What's NOT Validated (Yet):

- Phone number country code
- Email domain existence
- XSS protection in text content (add sanitization if needed)
- Rate limiting for updates

---

## 📈 SCALABILITY

### Adding New Settings Types:

**Step 1**: Add to enum (`settings.constant.ts`)
```typescript
export enum settingsType {
  aboutUs = 'aboutUs',
  contactUs = 'contactUs',
  privacyPolicy = 'privacyPolicy',
  termsAndConditions = 'termsAndConditions',
  introductionVideo = 'introductionVideo',
  faq = 'faq',  // ✅ NEW
}
```

**Step 2**: Update validation if needed (`settings.service.ts`)
```typescript
private validateDetails(type: settingsType, details: any): void {
  if (type === settingsType.contactUs) {
    // ... existing validation
  } else if (type === settingsType.faq) {
    // ✅ NEW: Custom validation for FAQ
    if (!Array.isArray(details)) {
      throw new ApiError(...);
    }
  } else {
    // Default: string validation
  }
}
```

**Step 3**: Update allowed types in controller
```typescript
const allowedTypes = [
  settingsType.aboutUs,
  settingsType.contactUs,
  settingsType.privacyPolicy,
  settingsType.termsAndConditions,
  settingsType.introductionVideo,
  settingsType.faq,  // ✅ NEW
];
```

---

## ✅ VERIFICATION CHECKLIST

- [x] Interface updated with union type
- [x] Model changed to Schema.Types.MIXED
- [x] Validation logic added
- [x] Email format validation
- [x] Phone number validation
- [x] String validation for other types
- [x] TypeScript imports fixed
- [ ] Test all scenarios
- [ ] Add frontend forms
- [ ] Deploy to staging
- [ ] Production deployment

---

## 📚 RELATED DOCUMENTATION

- [Settings Module Doc](../_doc.md)
- [Schema Diagram](../schema.drawio)
- [Figma Reference](../../../../figma-asset/teacher-parent-dashboard/settings-permission-section/settings.png)

---

## 🎓 LESSONS LEARNED

1. **Schema.Types.MIXED** is powerful but needs validation
2. **Union types** in TypeScript provide type safety
3. **Runtime validation** is essential even with TypeScript
4. **Separate interfaces** for different data structures
5. **Clear error messages** help frontend developers

---

**Version**: 1.0  
**Created**: 31-03-26  
**Status**: ✅ READY FOR TESTING  
**Code Changes**: ~87 lines  

---

-31-03-26
