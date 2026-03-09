<script lang="ts">
interface TrafficPoint {
	datetime: string;
	requests: number;
	cachedRequests: number;
	uncachedRequests: number;
	bytes: number;
}

interface Props {
	points: TrafficPoint[];
	height?: number;
}

let { points = [], height = 220 }: Props = $props();

const WIDTH = 800;

const maxValue = $derived(points.length > 0 ? Math.max(...points.map((p) => p.requests), 1) : 1);

const requestsPath = $derived(() => {
	if (points.length === 0) return '';
	return points
		.map((p, i) => {
			const x = points.length === 1 ? WIDTH / 2 : (i / (points.length - 1)) * WIDTH;
			const y = height - (p.requests / maxValue) * (height - 20);
			return `${x},${y}`;
		})
		.join(' ');
});

const cachedPath = $derived(() => {
	if (points.length === 0) return '';
	return points
		.map((p, i) => {
			const x = points.length === 1 ? WIDTH / 2 : (i / (points.length - 1)) * WIDTH;
			const y = height - (p.cachedRequests / maxValue) * (height - 20);
			return `${x},${y}`;
		})
		.join(' ');
});

const fillPath = $derived(() => {
	if (points.length === 0) return '';
	const pts = points
		.map((p, i) => {
			const x = points.length === 1 ? WIDTH / 2 : (i / (points.length - 1)) * WIDTH;
			const y = height - (p.requests / maxValue) * (height - 20);
			return `${x},${y}`;
		})
		.join(' ');
	return `${pts} ${WIDTH},${height} 0,${height}`;
});

const firstLabel = $derived(() => {
	if (points.length === 0) return '';
	const d = new Date(points[0].datetime);
	return Number.isNaN(d.getTime())
		? points[0].datetime
		: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
});

const lastLabel = $derived(() => {
	if (points.length === 0) return '';
	const d = new Date(points[points.length - 1].datetime);
	return Number.isNaN(d.getTime())
		? points[points.length - 1].datetime
		: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
});
</script>

{#if points.length === 0}
	<div
		class="flex items-center justify-center w-full border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm"
		style="height: {height}px"
	>
		No traffic data available
	</div>
{:else}
	<div class="w-full flex flex-col gap-1">
		<svg
			width="100%"
			{height}
			viewBox="0 0 {WIDTH} {height}"
			preserveAspectRatio="none"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				<linearGradient id="traffic-gradient" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stop-color="#f38020" stop-opacity="0.15" />
					<stop offset="100%" stop-color="#f38020" stop-opacity="0" />
				</linearGradient>
			</defs>

			<!-- Fill under requests line -->
			<polygon points={fillPath()} fill="url(#traffic-gradient)" />

			<!-- Cached requests line (dashed gray) -->
			<polyline
				points={cachedPath()}
				stroke="#cbd5e1"
				stroke-width="2"
				stroke-dasharray="6 4"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>

			<!-- Actual requests line (orange) -->
			<polyline
				points={requestsPath()}
				stroke="#f38020"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>

		<!-- X-axis labels -->
		<div class="flex justify-between text-xs text-slate-400 font-medium px-1">
			<span>{firstLabel()}</span>
			<span>{lastLabel()}</span>
		</div>
	</div>
{/if}
