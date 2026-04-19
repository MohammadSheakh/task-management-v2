import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload file to Cloudinary
 * @param file - Multer file object
 * @param folder - Folder name in Cloudinary
 * @returns Cloudinary response with URL
 */
export const uploadFileToCloudinary = async (
  file: Express.Multer.File,
  folder: string
) => {
  try {


    // PERF: Sanitize filename (remove special chars, spaces)
    const originalName = file.originalname.replace(/\.[^/.]+$/, ''); // Remove extension
    const sanitizedFileName = originalName
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9-_]/g, '') // Remove special characters
      .toLowerCase()
      .substring(0, 100)+
        '-' +
        Date.now(); // Append a timestamp
        
    // Convert buffer to stream for Cloudinary
    const streamUpload = (buffer: Buffer) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder, // Cloudinary folder
            resource_type: 'auto', // Auto-detect image/video/raw
            use_filename: true,
            unique_filename: false, // previously it was false
            filename_override: sanitizedFileName, // ✅ Override filename
            public_id: `${folder}/${sanitizedFileName}`, // ✅ Custom public ID
            overwrite: false,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        
        // Create stream from buffer
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        
        readableStream.pipe(uploadStream);
      });
    };

    // Upload file
    const result: any = await streamUpload(file.buffer);

    return {
      url: result.secure_url, // HTTPS URL
      publicId: result.public_id,
      originalFilename: result.original_filename,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
};

/*-─────────────────────────────────
|  SimpliFiedVersion - Using Buffer Directly
└──────────────────────────────────*/
export const uploadFileToCloudinarySimpliFiedVersion = async (
  file: Express.Multer.File,
  folder: string
) => {
  try {
    // Upload directly from buffer
    const result = await cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      },
      (error, uploadResult) => {
        if (error) throw error;
        return uploadResult;
      }
    ).end(file.buffer);

    // Alternative: Use upload() with base64
    // const base64 = file.buffer.toString('base64');
    // const dataUri = `data:${file.mimetype};base64,${base64}`;
    // const result = await cloudinary.uploader.upload(dataUri, { folder });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file');
  }
};

