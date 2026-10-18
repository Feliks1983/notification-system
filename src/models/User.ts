import mongoose, { Document, ObjectId, Schema, model } from 'mongoose';

export type TokenType = 'access' | 'refresh';

export interface Profile {
  firstName: string;
  lastName: string;
  bio?: string;
}

export interface IUser extends Document {
  id: ObjectId;
  email: string;
  passwordHash: string;
  username: string;
  isEmailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  profile: Profile;
  createdAt: Date;
  updatedAt?: Date;
  loginAttempts: number;
  lockUntil?: Date | null;
  lastSeen: Date | null;
}

export interface JwtProps {
  sub: string;
  iat: number;
  exp: number;
  type: TokenType;
  jti: string;
}

const profileSchema = new mongoose.Schema<Profile>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 280,
      default: '',
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    isEmailVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date },
    profile: {
      type: profileSchema,
      required: true,
    },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    loginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Date },
    lastSeen: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        if (ret._id) {
          ret.id = ret._id.toString();
        }
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.password;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

export const User = mongoose.model<IUser>('User', userSchema);

const refreshSchema = new Schema({
  jti: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  revoked: { type: Boolean, default: false, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});
export const RefreshToken = model('RefreshToken', refreshSchema);
