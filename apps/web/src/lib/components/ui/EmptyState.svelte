<script lang="ts">
interface Props {
	icon?: string;
	title: string;
	description?: string;
	action?: { label: string; href?: string; onclick?: () => void };
}

let { icon = 'inbox', title, description, action }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-16 px-4 text-center">
	<div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
		<span class="material-symbols-outlined text-slate-400 !text-[32px]">{icon}</span>
	</div>
	<h3 class="text-base font-semibold text-slate-900 mb-1">{title}</h3>
	{#if description}
		<p class="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
	{/if}
	{#if action}
		{#if action.href}
			<a
				href={action.href}
				class="inline-flex items-center justify-center rounded-lg h-9 px-4 bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
			>
				{action.label}
			</a>
		{:else if action.onclick}
			<button
				onclick={action.onclick}
				class="inline-flex items-center justify-center rounded-lg h-9 px-4 bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
			>
				{action.label}
			</button>
		{/if}
	{/if}
</div>
