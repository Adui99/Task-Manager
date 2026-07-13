require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Message = mongoose.models.Message || mongoose.model('Message', new mongoose.Schema({
    sender_id: String,
    receiver_id: String,
    content: String,
    read: Boolean
  }));
  const unreadMessages = await Message.find({ read: false });
  console.log('Unread messages:', unreadMessages);
  process.exit(0);
}
check();
