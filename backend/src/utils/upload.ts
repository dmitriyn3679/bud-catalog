import multer from 'multer';
import { Readable } from 'stream';
import { cloudinary } from '../config/cloudinary';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    Readable.from(buffer).pipe(stream);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
