function createNotificationsStore() {
	let unreadCount = $state(0);

	return {
		get unreadCount() {
			return unreadCount;
		},
		setUnreadCount(n: number) {
			unreadCount = n;
		},
		increment() {
			unreadCount++;
		},
		decrement() {
			if (unreadCount > 0) unreadCount--;
		},
		reset() {
			unreadCount = 0;
		},
	};
}

export const notificationsStore = createNotificationsStore();
