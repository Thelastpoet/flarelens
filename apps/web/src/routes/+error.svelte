<script lang="ts">
import { page } from '$app/stores';

const messages: Record<number, { title: string; description: string; icon: string }> = {
	404: {
		title: 'Page not found',
		description: "The page you're looking for doesn't exist or has been moved.",
		icon: 'search_off',
	},
	403: {
		title: 'Access denied',
		description: "You don't have permission to view this page.",
		icon: 'lock',
	},
	500: {
		title: 'Server error',
		description: 'Something went wrong on our end. Please try again in a moment.',
		icon: 'error',
	},
};

const status = $derived($page.status);
const info = $derived(messages[status] ?? {
	title: 'Something went wrong',
	description: $page.error?.message ?? 'An unexpected error occurred.',
	icon: 'warning',
});
</script>

<svelte:head>
	<title>{status} — FlareLens</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
	<div class="max-w-md w-full text-center">
		<!-- Icon -->
		<div class="flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-sm border border-slate-200 mx-auto mb-6">
			<span class="material-symbols-outlined text-slate-400 !text-[40px]">{info.icon}</span>
		</div>

		<!-- Status code -->
		<p class="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Error {status}</p>

		<!-- Title -->
		<h1 class="text-2xl font-bold text-slate-900 mb-3">{info.title}</h1>

		<!-- Description -->
		<p class="text-slate-500 mb-8">{info.description}</p>

		<!-- Actions -->
		<div class="flex flex-col sm:flex-row gap-3 justify-center">
			<button
				onclick={() => history.back()}
				class="inline-flex items-center justify-center gap-2 rounded-lg h-10 px-5 border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
			>
				<span class="material-symbols-outlined !text-[18px]">arrow_back</span>
				Go back
			</button>
			<a
				href="/dashboard"
				class="inline-flex items-center justify-center gap-2 rounded-lg h-10 px-5 bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
			>
				<span class="material-symbols-outlined !text-[18px]">home</span>
				Dashboard
			</a>
		</div>
	</div>
</div>
