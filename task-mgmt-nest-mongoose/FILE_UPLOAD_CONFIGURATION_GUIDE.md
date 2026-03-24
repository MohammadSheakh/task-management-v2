# 📝 **FILE UPLOAD CONFIGURATION GUIDE**

**Date**: 17-03-26  
**Status**: ✅ **COMPLETE**

---

## 🚀 **QUICK START:**

### **Step 1: Choose Your Upload Strategy**

Edit `.env` file:

```bash
# Choose one: cloudinary, s3, or digitalocean
FILE_UPLOAD_STRATEGY=cloudinary
```

### **Step 2: Configure Credentials**

#### **Option A: Cloudinary (Default)**

```bash
FILE_UPLOAD_STRATEGY=cloudinary

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Get credentials**: https://cloudinary.com/users/register/free

---

#### **Option B: AWS S3**

```bash
FILE_UPLOAD_STRATEGY=s3

AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
```

**Get credentials**: https://aws.amazon.com/s3/

---

#### **Option C: DigitalOcean Spaces**

```bash
FILE_UPLOAD_STRATEGY=digitalocean

AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
```

**Get credentials**: https://www.digitaloceans.com/products/spaces/

**Note**: For DigitalOcean, you may need to uncomment the endpoint in `s3.strategy.ts`:

```typescript
// In s3.strategy.ts constructor
this.s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: { ... },
  endpoint: `https://${process.env.AWS_REGION}.digitaloceanspaces.com`, // ← Uncomment this
});
```

---

## 📊 **COMPARISON:**

| Provider | Best For | Pricing | Ease of Use |
|----------|----------|---------|-------------|
| **Cloudinary** | Images, videos, transformations | Free tier: 25GB/month | ⭐⭐⭐⭐⭐ |
| **AWS S3** | General file storage, large files | $0.023/GB/month | ⭐⭐⭐⭐ |
| **DigitalOcean** | Simple S3 alternative | $5/month for 250GB | ⭐⭐⭐⭐⭐ |

---

## 🔧 **CONFIGURATION OPTIONS:**

### **File Upload Settings**

```bash
# Maximum file size (bytes)
MAX_FILE_SIZE=10485760  # 10MB

# Temporary upload path (for disk storage)
UPLOAD_PATH=./uploads/temp

# Allowed MIME types (in controller)
allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4']
```

---

## 🎯 **TESTING:**

### **Test Cloudinary Upload:**

```bash
# 1. Set strategy to cloudinary
FILE_UPLOAD_STRATEGY=cloudinary

# 2. Restart server
npm run start:dev

# 3. Upload file
curl -X POST http://localhost:6733/api/v1/attachments/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "attachments=@/path/to/file.jpg"
```

### **Test S3 Upload:**

```bash
# 1. Set strategy to s3
FILE_UPLOAD_STRATEGY=s3

# 2. Restart server
npm run start:dev

# 3. Upload file
curl -X POST http://localhost:6733/api/v1/attachments/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "attachments=@/path/to/file.jpg"
```

---

## 🔐 **SECURITY BEST PRACTICES:**

1. ✅ **Never commit `.env`** with real credentials
2. ✅ **Use `.env.example`** as template
3. ✅ **Rotate credentials** regularly
4. ✅ **Use IAM roles** in production (AWS)
5. ✅ **Set CORS rules** on bucket/space
6. ✅ **Enable HTTPS** for all uploads
7. ✅ **Validate file types** (MIME type check)
8. ✅ **Set file size limits** (prevent DoS)

---

## 📝 **TROUBLESHOOTING:**

### **Issue: Upload fails with "Missing credentials"**

**Solution**: Check `.env` file has correct credentials:
```bash
# Verify credentials are set
echo $CLOUDINARY_CLOUD_NAME
echo $AWS_ACCESS_KEY_ID
```

### **Issue: Wrong strategy loaded**

**Solution**: Check `FILE_UPLOAD_STRATEGY` in `.env`:
```bash
# Should be: cloudinary, s3, or digitalocean
FILE_UPLOAD_STRATEGY=cloudinary
```

### **Issue: DigitalOcean upload fails**

**Solution**: Uncomment endpoint in `s3.strategy.ts`:
```typescript
endpoint: `https://${process.env.AWS_REGION}.digitaloceanspaces.com`,
```

---

## 🎯 **PRODUCTION SETUP:**

### **Environment Variables (Production)**

```bash
# Production strategy
FILE_UPLOAD_STRATEGY=s3

# Use IAM roles or secrets manager
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_BUCKET_NAME=${AWS_BUCKET_NAME}

# Or use Cloudinary
FILE_UPLOAD_STRATEGY=cloudinary
CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
```

### **Best Practices:**

1. ✅ Use **environment-specific** buckets/spaces
2. ✅ Enable **versioning** for important files
3. ✅ Set up **lifecycle policies** (delete old files)
4. ✅ Use **CDN** for faster delivery
5. ✅ Enable **server-side encryption**
6. ✅ Set up **monitoring** (upload failures, costs)

---

## 📊 **CURRENT CONFIGURATION:**

```bash
# Current strategy
FILE_UPLOAD_STRATEGY=cloudinary

# Cloudinary credentials (from your config)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# S3 backup credentials (from your config)
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
```

---

## ✅ **READY TO USE!**

Your file upload configuration is complete. Just:

1. ✅ Choose strategy in `.env`
2. ✅ Verify credentials
3. ✅ Restart server
4. ✅ Start uploading!

---

**Status**: ✅ **CONFIGURATION COMPLETE**  
**Strategy**: **Cloudinary (default)**  
**Backup**: **S3/DigitalOcean ready**  
**Ready**: **YES**

---
-17-03-26
