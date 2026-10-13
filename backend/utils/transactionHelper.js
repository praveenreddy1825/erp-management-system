import mongoose from 'mongoose';

/**
 * Executes a callback within a MongoDB transaction if running in a ReplicaSet/Atlas cluster.
 * Gracefully falls back to direct execution if running on a local Standalone (Single) MongoDB instance.
 *
 * @param {Function} callback - Function receiving (session) as argument.
 *                              If running on standalone MongoDB, session is null.
 * @returns {Promise<any>}
 */
export const runTransaction = async (callback) => {
  const isReplicaSet = Boolean(
    mongoose.connection?.client?.topology?.description?.setName ||
      ['ReplicaSetWithPrimary', 'ReplicaSetNoPrimary', 'Sharded'].includes(
        mongoose.connection?.client?.topology?.description?.type
      )
  );

  // Standalone local MongoDB deployment: Execute callback directly without a session
  if (!isReplicaSet) {
    return await callback(null);
  }

  // ReplicaSet deployment (e.g., MongoDB Atlas / Production): Execute in ACID transaction
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};
