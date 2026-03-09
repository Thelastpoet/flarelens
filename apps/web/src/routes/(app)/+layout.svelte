<script lang="ts">
import AppShell from '$lib/components/layout/AppShell.svelte';
import Toast from '$lib/components/ui/Toast.svelte';

let { children }: { children: import('svelte').Snippet } = $props();
</script>

<AppShell>{@render children()}</AppShell>
<Toast />
