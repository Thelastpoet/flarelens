<script lang="ts">
import AppShell from '$lib/components/layout/AppShell.svelte';

let { children }: { children: import('svelte').Snippet } = $props();
</script>

<AppShell>{@render children()}</AppShell>
