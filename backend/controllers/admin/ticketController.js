const Ticket = require('../../models/Ticket');

const getTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    const skip = (page - 1) * limit;
    const tickets = await Ticket.find(filter).populate('user', 'name email').sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await Ticket.countDocuments(filter);
    res.json({ success: true, data: tickets, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('user', 'name email');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const replyToTicket = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Reply text is required' });
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    ticket.messages.push({ from: 'admin', text, date: new Date() });
    ticket.adminResponse = true;
    ticket.status = 'in_progress';
    await ticket.save();
    res.json({ success: true, message: 'Reply sent', data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'in_progress', 'resolved', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, message: 'Ticket status updated', data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getTickets, getTicketById, replyToTicket, updateTicketStatus };