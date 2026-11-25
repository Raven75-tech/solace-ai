const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

const authSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const checkInSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mood: {
      type: String,
      enum: ['very-low', 'low', 'okay', 'good', 'great'],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true },
);

checkInSchema.index({ createdAt: -1 });

const chatTurnSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: String, required: true, maxlength: 100 },
    userMessage: { type: String, required: true, maxlength: 2000 },
    assistantMessage: { type: String, required: true, maxlength: 8000 },
  },
  { timestamps: true },
);

chatTurnSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = {
  AuthSession: mongoose.model('AuthSession', authSessionSchema),
  CheckIn: mongoose.model('CheckIn', checkInSchema),
  ChatTurn: mongoose.model('ChatTurn', chatTurnSchema),
  User: mongoose.model('User', userSchema),
};
