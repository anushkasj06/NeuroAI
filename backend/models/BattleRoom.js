const mongoose = require('mongoose');

/**
 * BattleRoom — Phase 2 schema.
 * Adds subject, topic, difficulty, playersReady map.
 * Phase 1 fields (roomCode, hostId, participantIds, status, metadata) preserved.
 */

const playerReadySchema = new mongoose.Schema(
  {
    userId:    { type: String, required: true },
    name:      { type: String, required: true },
    isReady:   { type: Boolean, default: false },
    joinedAt:  { type: Date, default: Date.now },
    avatarInitial: { type: String, default: '' },
  },
  { _id: false }
);

const battleRoomSchema = new mongoose.Schema(
  {
    // ── Phase 1 fields (unchanged) ──────────────────────────────────────────
    roomCode: {
      type:      String,
      required:  true,
      unique:    true,
      uppercase: true,
      trim:      true,
      index:     true,
    },
    hostId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    participantIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ],
    status: {
      type:    String,
      enum:    ['waiting', 'starting', 'active', 'finished', 'cancelled'],
      default: 'waiting',
      index:   true,
    },
    metadata: {
      type:    mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Phase 2 fields ──────────────────────────────────────────────────────
    subject:    { type: String, default: '' },
    subjectSlug:{ type: String, default: '' },
    topic:      { type: String, default: '' },
    difficulty: {
      type:    String,
      enum:    ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    maxPlayers: { type: Number, default: 2, min: 2, max: 8 },

    // Embedded player state for real-time lobby sync
    players: [playerReadySchema],
  },
  { timestamps: true }
);

// Auto-expire waiting rooms after 30 minutes
battleRoomSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 1800, partialFilterExpression: { status: 'waiting' } }
);

// Helper: build the lobby snapshot sent to all clients
battleRoomSchema.methods.toLobbySnapshot = function () {
  return {
    roomId:     this._id.toString(),
    roomCode:   this.roomCode,
    hostId:     this.hostId.toString(),
    subject:    this.subject,
    subjectSlug:this.subjectSlug,
    topic:      this.topic,
    difficulty: this.difficulty,
    maxPlayers: this.maxPlayers,
    status:     this.status,
    players:    this.players,
    allReady:   this.players.length >= 2 && this.players.every((p) => p.isReady),
    playerCount:this.players.length,
    createdAt:  this.createdAt,
  };
};

module.exports = mongoose.model('BattleRoom', battleRoomSchema);
