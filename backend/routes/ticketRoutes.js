const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createTicket,
  getMyTickets,
  getMyTicketById,
  replyToMyTicket,
  closeMyTicket,
} = require('../controllers/ticketController');

const router = express.Router();

// همه مسیرها نیازمند احراز هویت هستند
router.use(protect);

router.post('/', createTicket);
router.get('/', getMyTickets);
router.get('/:id', getMyTicketById);
router.post('/:id/reply', replyToMyTicket);
router.put('/:id/close', closeMyTicket);

module.exports = router;
