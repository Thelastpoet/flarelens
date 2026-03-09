<script lang="ts">
interface Props {
	page: number;
	total_pages: number;
	onchange: (page: number) => void;
}

let { page, total_pages, onchange }: Props = $props();

const pages = $derived(() => {
	if (total_pages <= 7) return Array.from({ length: total_pages }, (_, i) => i + 1);
	const result: (number | '...')[] = [1];
	if (page > 3) result.push('...');
	for (let i = Math.max(2, page - 1); i <= Math.min(total_pages - 1, page + 1); i++) {
		result.push(i);
	}
	if (page < total_pages - 2) result.push('...');
	result.push(total_pages);
	return result;
});
</script>

{#if total_pages > 1}
<nav class="flex items-center justify-center gap-1" aria-label="Pagination">
	<button
		onclick={() => onchange(page - 1)}
		disabled={page <= 1}
		class="flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
		aria-label="Previous page"
	>
		<span class="material-symbols-outlined !text-[18px]">chevron_left</span>
	</button>

	{#each pages() as p}
		{#if p === '...'}
			<span class="flex items-center justify-center w-9 h-9 text-slate-400 text-sm">…</span>
		{:else}
			<button
				onclick={() => onchange(p as number)}
				class="flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors
					{p === page
						? 'bg-primary text-white'
						: 'text-slate-700 hover:bg-slate-100'}"
				aria-current={p === page ? 'page' : undefined}
			>
				{p}
			</button>
		{/if}
	{/each}

	<button
		onclick={() => onchange(page + 1)}
		disabled={page >= total_pages}
		class="flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
		aria-label="Next page"
	>
		<span class="material-symbols-outlined !text-[18px]">chevron_right</span>
	</button>
</nav>
{/if}
