import mongoose from 'mongoose';

const idempotencySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
    },
    requestHash: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED'],
      default: 'IN_PROGRESS',
      index: true,
    },
    responseCode: {
      type: Number,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesOrder',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24 hours TTL
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index prevents race conditions for concurrent identical idempotency keys per user
idempotencySchema.index({ key: 1, user: 1 }, { unique: true });

const Idempotency = mongoose.model('Idempotency', idempotencySchema);
export default Idempotency;
