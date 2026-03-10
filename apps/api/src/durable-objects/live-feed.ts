import type { Env } from '../env.js';

/**
 * AccountLiveFeed — Durable Object for real-time dashboard updates.
 * One instance per account, identified by account_id.
 * Manages WebSocket connections and broadcasts metric updates.
 * Full implementation in Phase 18.
 */
export class AccountLiveFeed implements DurableObject {
	private sessions: Set<WebSocket> = new Set();
	private state: DurableObjectState;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/ws') {
			const upgradeHeader = request.headers.get('Upgrade');
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				return new Response('Expected WebSocket upgrade', { status: 426 });
			}

			const { 0: client, 1: server } = new WebSocketPair();
			this.state.acceptWebSocket(server);
			this.sessions.add(server);

			server.addEventListener('close', () => {
				this.sessions.delete(server);
			});

			return new Response(null, { status: 101, webSocket: client });
		}

		if (url.pathname === '/push' && request.method === 'POST') {
			const payload = await request.json();
			this.broadcast(payload);
			return new Response('ok');
		}

		return new Response('Not found', { status: 404 });
	}

	webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): void {
		// Handle client messages (ping/pong, subscription filters)
	}

	webSocketClose(ws: WebSocket): void {
		this.sessions.delete(ws);
	}

	private broadcast(payload: unknown): void {
		const message = JSON.stringify(payload);
		for (const session of this.sessions) {
			try {
				session.send(message);
			} catch {
				this.sessions.delete(session);
			}
		}
	}
}
