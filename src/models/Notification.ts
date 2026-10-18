import mongoose, { Schema, model, type InferSchemaType } from 'mongoose';

export const NotificationTypes = ['INFO', 'WARNING', 'ORDER', 'SYSTEM'] as const;
export type NotificationType = (typeof NotificationTypes)[number];

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NotificationTypes, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    read: { type: Boolean, default: false, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export const Notification = mongoose.model('Notification', notificationSchema);

  