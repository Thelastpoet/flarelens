<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api, ApiRequestError } from '$lib/api.js';
	import type { PageData } from './$types.js';

	type MemberStatus = 'active' | 'pending';
	type MemberRole = 'admin' | 'editor' | 'viewer';

	interface TeamMemberRow {
		id: string;
		user_id: string | null;
		email: string;
		role: MemberRole;
		status: MemberStatus;
		invited_at: string;
		accepted_at: string | null;
		last_active_at: string | null;
	}

	interface InviteFormState {
		email: string;
		role: 'editor' | 'viewer';
	}

	let { data }: { data: PageData } = $props();

	let showInviteModal = $state(false);
	let openMenuId = $state<string | null>(null);
	let busyAction = $state<string | null>(null);
	let formError = $state<string | null>(null);
	let inviteForm = $state<InviteFormState>({ email: '', role: 'viewer' });

	const members = $derived((data.members ?? []) as TeamMemberRow[]);

	const roleStyles: Record<'Admin' | 'Editor' | 'Viewer', string> = {
	Admin:
		'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50',
	Editor:
		'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50',
	Viewer:
		'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
};

	const activeMembers = $derived(members.filter((member) => member.status === 'active'));
	const recentInvites = $derived.by(() =>
		[...members]
			.filter((member) => member.status === 'pending' || member.accepted_at !== null)
			.sort(
				(left, right) =>
					new Date(right.invited_at).getTime() - new Date(left.invited_at).getTime(),
			)
			.slice(0, 5),
	);

	function roleLabel(role: MemberRole): 'Admin' | 'Editor' | 'Viewer' {
		return role === 'admin' ? 'Admin' : role === 'editor' ? 'Editor' : 'Viewer';
	}

	function initials(email: string): string {
		const localPart = email.split('@')[0] ?? '';
		const parts = localPart.split(/[._-]+/).filter(Boolean);
		if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
		return localPart.slice(0, 2).toUpperCase();
	}

	function relativeTime(iso: string | null): string {
		if (!iso) return '-';
		const diff = Date.now() - new Date(iso).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
		const days = Math.floor(hours / 24);
		return `${days} day${days === 1 ? '' : 's'} ago`;
	}

	function invitedLabel(iso: string): string {
		return new Date(iso).toLocaleString();
	}

	async function refreshTeam() {
		openMenuId = null;
		await invalidateAll();
	}

	async function inviteMember() {
		formError = null;
		busyAction = 'invite';
		try {
			await api.post('/team/invites', inviteForm);
			inviteForm = { email: '', role: 'viewer' };
			showInviteModal = false;
			await refreshTeam();
		} catch (error) {
			formError = error instanceof ApiRequestError ? error.message : 'Unable to send invite.';
		} finally {
			busyAction = null;
		}
	}

	async function resendInvite(memberId: string) {
		busyAction = `resend-${memberId}`;
		try {
			await api.post(`/team/invites/${memberId}/resend`);
			await refreshTeam();
		} finally {
			busyAction = null;
		}
	}

	async function updateRole(memberId: string, role: MemberRole) {
		busyAction = `role-${memberId}`;
		try {
			await api.patch(`/team/members/${memberId}/role`, { role });
			await refreshTeam();
		} finally {
			busyAction = null;
		}
	}

	async function removeMember(memberId: string) {
		busyAction = `remove-${memberId}`;
		try {
			await api.delete(`/team/members/${memberId}`);
			await refreshTeam();
		} finally {
			busyAction = null;
		}
	}
</script>

<div class="max-w-7xl mx-auto w-full flex flex-col gap-8">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Team Management</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage project access and roles for your team members.</p>
    </div>
    <button
      type="button"
      onclick={() => { formError = null; showInviteModal = true; }}
      class="inline-flex items-center justify-center px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors shadow-sm gap-2 shrink-0"
    >
      <span class="material-symbols-outlined text-[20px]">person_add</span>
      Invite Member
    </button>
  </div>

  <!-- Team Members Card -->
  <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
    <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">Active Members</h2>
      <span class="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">{activeMembers.length} Members</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th class="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
            <th class="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
            <th class="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Active</th>
            <th class="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          {#if members.length === 0}
            <tr>
              <td colspan="5" class="px-6 py-10 text-center text-sm text-slate-500">
                No team members yet.
              </td>
            </tr>
          {:else}
          {#each members as member}
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors {member.status === 'pending' ? 'bg-slate-50/30 dark:bg-slate-800/10' : ''}">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  {#if member.status === 'pending'}
                    <div class="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600 text-slate-400">
                      <span class="material-symbols-outlined text-sm">mail</span>
                    </div>
                  {:else}
                    <div class="size-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-medium">{initials(member.email)}</div>
                  {/if}
                  <div>
                    <div class="text-sm font-medium text-slate-900 dark:text-white">{member.email}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">
                      {member.status === 'pending' ? 'Invitation sent' : 'Team member'}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium {roleStyles[roleLabel(member.role)]}">{roleLabel(member.role)}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <div class="size-1.5 rounded-full {member.status === 'active' ? 'bg-emerald-500' : 'bg-amber-400'}"></div>
                  <span class="text-sm text-slate-700 dark:text-slate-300 capitalize">{member.status}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                {member.status === 'active' ? relativeTime(member.last_active_at) : '-'}
              </td>
              <td class="relative px-6 py-4 whitespace-nowrap text-right">
                {#if member.status === 'pending'}
                  <button
                    type="button"
                    class="text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    onclick={() => resendInvite(member.id)}
                    disabled={busyAction !== null}
                  >
                    Resend
                  </button>
                {:else}
                  <button
                    type="button"
                    class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    aria-expanded={openMenuId === member.id}
                    onclick={() => openMenuId = openMenuId === member.id ? null : member.id}
                    disabled={busyAction !== null}
                  >
                    <span class="material-symbols-outlined text-xl">more_vert</span>
                  </button>
                  {#if openMenuId === member.id}
                    <div class="absolute right-6 z-10 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg">
                      {#if member.role !== 'admin'}
                        <button
                          type="button"
                          class="block w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onclick={() => updateRole(member.id, 'admin')}
                        >
                          Make Admin
                        </button>
                      {/if}
                      {#if member.role !== 'editor'}
                        <button
                          type="button"
                          class="block w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onclick={() => updateRole(member.id, 'editor')}
                        >
                          Make Editor
                        </button>
                      {/if}
                      {#if member.role !== 'viewer'}
                        <button
                          type="button"
                          class="block w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onclick={() => updateRole(member.id, 'viewer')}
                        >
                          Make Viewer
                        </button>
                      {/if}
                      <button
                        type="button"
                        class="block w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        onclick={() => removeMember(member.id)}
                      >
                        Remove Member
                      </button>
                    </div>
                  {/if}
                {/if}
              </td>
            </tr>
          {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Recent Invites Card -->
  <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
    <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">Recent Invites</h2>
    </div>
    <div class="p-6">
      <ul class="space-y-4">
        {#if recentInvites.length === 0}
          <li class="text-sm text-slate-500">No invite activity yet.</li>
        {:else}
        {#each recentInvites as invite}
          <li class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <span class="material-symbols-outlined text-[18px]">history</span>
              </div>
              <div>
                <p class="text-sm font-medium text-slate-900 dark:text-white">
                  Invited <span class="font-semibold">{invite.email}</span> as {roleLabel(invite.role)}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{invitedLabel(invite.invited_at)} by account admin</p>
              </div>
            </div>
            {#if invite.status === 'pending'}
              <span class="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800/50">Awaiting Reply</span>
            {:else}
              <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/50">Accepted</span>
            {/if}
          </li>
        {/each}
        {/if}
      </ul>
    </div>
  </div>
</div>

{#if showInviteModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      aria-label="Close invite modal"
      class="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
      onclick={() => showInviteModal = false}
    ></button>
    <div role="dialog" aria-modal="true" aria-labelledby="team-invite-title" class="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <div class="mb-6 flex items-center justify-between">
        <h2 id="team-invite-title" class="text-xl font-bold text-slate-900">Invite Member</h2>
        <button
          type="button"
          class="rounded p-1 text-slate-400 hover:text-slate-600"
          aria-label="Close invite modal"
          onclick={() => showInviteModal = false}
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="space-y-5">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-800" for="invite-email">Email</label>
          <input
            id="invite-email"
            bind:value={inviteForm.email}
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            type="email"
            placeholder="name@example.com"
          />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-800" for="invite-role">Role</label>
          <select
            id="invite-role"
            bind:value={inviteForm.role}
            class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
        </div>
        {#if formError}
          <p class="text-sm text-red-600">{formError}</p>
        {/if}
      </div>

      <div class="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onclick={() => showInviteModal = false}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          onclick={inviteMember}
          disabled={busyAction !== null || inviteForm.email.trim().length === 0}
        >
          Send Invite
        </button>
      </div>
    </div>
  </div>
{/if}
