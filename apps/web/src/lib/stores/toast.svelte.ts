export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration?: number;
}

class ToastStore {
	toasts = $state<Toast[]>([]);

	add(type: ToastType, message: string, duration = 4000): void {
		const id = crypto.randomUUID();
		this.toasts = [...this.toasts, { id, type, message, duration }];
		if (duration > 0) {
			setTimeout(() => this.remove(id), duration);
		}
	}

	remove(id: string): void {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	success(message: string, duration?: number) {
		this.add('success', message, duration);
	}
	error(message: string, duration?: number) {
		this.add('error', message, duration);
	}
	info(message: string, duration?: number) {
		this.add('info', message, duration);
	}
	warning(message: string, duration?: number) {
		this.add('warning', message, duration);
	}
}

export const toast = new ToastStore();
