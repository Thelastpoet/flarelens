<script lang="ts">
import { toast } from '$lib/stores/toast.svelte.js';

const typeConfig = {
	success: { icon: 'check_circle', bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon_cls: 'text-green-500' },
	error:   { icon: 'error', bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon_cls: 'text-red-500' },
	warning: { icon: 'warning', bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', icon_cls: 'text-yellow-500' },
	info:    { icon: 'info', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon_cls: 'text-blue-500' },
};
</script>

<div class="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
	{#each toast.toasts as t (t.id)}
		{@const cfg = typeConfig[t.type]}
		<div
			class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg
				{cfg.bg} animate-in slide-in-from-bottom-2 duration-200"
		>
			<span class="material-symbols-outlined !text-[20px] mt-0.5 shrink-0 {cfg.icon_cls}">{cfg.icon}</span>
			<p class="flex-1 text-sm font-medium {cfg.text}">{t.message}</p>
			<button
				onclick={() => toast.remove(t.id)}
				class="shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
				aria-label="Dismiss"
			>
				<span class="material-symbols-outlined !text-[16px]">close</span>
			</button>
		</div>
	{/each}
</div>
