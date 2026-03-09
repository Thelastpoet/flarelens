export interface LiveMessage {
	type: 'metrics' | 'anomaly' | 'ping';
	resource_id?: string;
	requests?: number;
	anomaly_id?: string;
	severity?: string;
}

class WebSocketStore {
	connected = $state(false);
	lastMessage = $state<LiveMessage | null>(null);
	metrics = $state<Record<string, { requests: number; timestamp: number }>>({});

	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private destroyed = false;

	connect() {
		if (this.ws?.readyState === WebSocket.OPEN) return;

		const proto = location.protocol === 'https:' ? 'wss' : 'ws';
		const url = `${proto}://${location.host}/api/ws`;

		try {
			this.ws = new WebSocket(url);

			this.ws.onopen = () => {
				this.connected = true;
				if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
			};

			this.ws.onmessage = (event) => {
				try {
					const msg = JSON.parse(event.data as string) as LiveMessage;
					this.lastMessage = msg;
					if (msg.type === 'metrics' && msg.resource_id && msg.requests != null) {
						this.metrics = {
							...this.metrics,
							[msg.resource_id]: { requests: msg.requests, timestamp: Date.now() },
						};
					}
				} catch {
					// ignore malformed messages
				}
			};

			this.ws.onclose = () => {
				this.connected = false;
				this.ws = null;
				if (!this.destroyed) {
					this.reconnectTimer = setTimeout(() => this.connect(), 5000);
				}
			};

			this.ws.onerror = () => {
				this.ws?.close();
			};
		} catch {
			// WebSocket not available (SSR)
		}
	}

	disconnect() {
		this.destroyed = true;
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.ws?.close();
		this.ws = null;
		this.connected = false;
	}
}

export const liveStore = new WebSocketStore();
