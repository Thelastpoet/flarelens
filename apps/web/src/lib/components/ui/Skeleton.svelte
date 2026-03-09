<script lang="ts">
interface Props {
	class?: string;
	width?: string;
	height?: string;
	rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
	lines?: number;
}

let {
	class: cls = '',
	width = 'w-full',
	height = 'h-4',
	rounded = 'md',
	lines = 1,
}: Props = $props();

const roundedMap = {
	none: '',
	sm: 'rounded-sm',
	md: 'rounded-md',
	lg: 'rounded-lg',
	full: 'rounded-full',
};
</script>

{#if lines > 1}
	<div class="flex flex-col gap-2 {cls}">
		{#each Array(lines) as _, i}
			<div
				class="animate-pulse bg-slate-200 {height} {roundedMap[rounded]}
					{i === lines - 1 ? 'w-3/4' : 'w-full'}"
			></div>
		{/each}
	</div>
{:else}
	<div
		class="animate-pulse bg-slate-200 {width} {height} {roundedMap[rounded]} {cls}"
	></div>
{/if}
