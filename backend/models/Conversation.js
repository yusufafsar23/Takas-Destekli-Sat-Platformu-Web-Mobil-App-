const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  relatedProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  relatedTradeOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradeOffer'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Validate that there are exactly 2 participants
conversationSchema.path('participants').validate(function(participants) {
  return participants.length === 2;
}, 'A conversation must have exactly 2 participants');

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation; 