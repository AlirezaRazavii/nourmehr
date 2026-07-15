import { defineStore } from 'pinia';
import api from '../services/api';

export const useNotifications = defineStore('notifications', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null
  }),
  actions: {
    async fetchNotifications() {
      this.isLoading = true;
      try {
        const { data } = await api.get('/admin/notifications');
        if (data.success) {
          this.notifications = data.data;
          this.unreadCount = data.unreadCount;
        }
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
      } finally {
        this.isLoading = false;
      }
    },
    async markAsRead(id) {
      try {
        const { data } = await api.put(`/admin/notifications/${id}/read`);
        if (data.success) {
          const notif = this.notifications.find(n => n._id === id);
          if (notif && !notif.isRead) {
            notif.isRead = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
          }
        }
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    },
    async markAllAsRead() {
      try {
        const { data } = await api.put('/admin/notifications/read-all');
        if (data.success) {
          this.notifications.forEach(n => n.isRead = true);
          this.unreadCount = 0;
        }
      } catch (err) {
        console.error('Error marking all as read:', err);
      }
    }
  }
});
