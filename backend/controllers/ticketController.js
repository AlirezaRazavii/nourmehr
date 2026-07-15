const Ticket = require('../models/Ticket');

// ساخت تیکت جدید توسط کاربر لاگین‌کرده
const createTicket = async (req, res) => {
  try {
    const { subject, message, priority } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'موضوع و متن پیام الزامی است' });
    }
    const ticket = await Ticket.create({
      user: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || '',
      subject,
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      status: 'open',
      messages: [{ from: 'customer', text: message }],
    });

    // ایجاد اعلان برای ادمین
    const Notification = require('../models/Notification');
    await Notification.create({
      type: 'ticket',
      title: 'تیکت جدید',
      message: `تیکت جدید از طرف ${req.user.name} با موضوع "${subject}" ثبت شد.`,
      link: '/admin/tickets'
    });

    res.status(201).json({ success: true, message: 'تیکت با موفقیت ثبت شد', data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// دریافت همه تیکت‌های کاربر جاری
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// دریافت یک تیکت مشخص (فقط اگر متعلق به همین کاربر باشد)
const getMyTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'تیکت یافت نشد' });
    if (!ticket.user || ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'دسترسی مجاز نیست' });
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// پاسخ کاربر به تیکت خودش
const replyToMyTicket = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'متن پاسخ الزامی است' });
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'تیکت یافت نشد' });
    if (!ticket.user || ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'دسترسی مجاز نیست' });
    }
    if (ticket.status === 'closed') {
      return res.status(400).json({ success: false, message: 'این تیکت بسته شده است' });
    }
    ticket.messages.push({ from: 'customer', text, date: new Date() });
    // وقتی کاربر پاسخ می‌دهد، تیکت دوباره باز می‌شود تا ادمین متوجه شود
    ticket.status = 'open';
    await ticket.save();
    res.json({ success: true, message: 'پاسخ ارسال شد', data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// بستن تیکت توسط کاربر
const closeMyTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'تیکت یافت نشد' });
    if (!ticket.user || ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'دسترسی مجاز نیست' });
    }
    ticket.status = 'closed';
    await ticket.save();
    res.json({ success: true, message: 'تیکت بسته شد', data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createTicket, getMyTickets, getMyTicketById, replyToMyTicket, closeMyTicket };
