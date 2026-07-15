const Ticket = require('../models/Ticket');

// فرم تماس عمومی → ثبت به‌صورت تیکت تا در پنل ادمین (تیکت‌ها) دیده شود
const createContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'نام، ایمیل و پیام الزامی است' });
    }
    const ticketData = {
      name,
      email,
      phone: phone || '',
      subject: subject || 'پیام از فرم تماس',
      status: 'open',
      priority: 'medium',
      messages: [{ from: 'customer', text: message }],
    };
    // اگر کاربر لاگین کرده باشد، تیکت به حساب او وصل می‌شود تا در پنل کاربری ببیند
    if (req.user) {
      ticketData.user = req.user._id;
      ticketData.phone = phone || req.user.phone || '';
    }
    const ticket = await Ticket.create(ticketData);
    res.status(201).json({ success: true, message: 'پیام شما با موفقیت ثبت شد', ticketId: ticket._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createContactMessage };
