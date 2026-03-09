<script lang="ts">
type MemberStatus = 'active' | 'pending';
type MemberRole = 'Admin' | 'Editor' | 'Viewer';

type Member = {
	initials: string;
	name: string;
	email: string;
	role: MemberRole;
	status: MemberStatus;
	lastActive: string;
	isPending?: boolean;
	avatarBg: string;
};

type Invite = {
	email: string;
	role: string;
	sentAt: string;
	sentBy: string;
	status: 'pending' | 'accepted';
};

const members = $state<Member[]>([
	{
		initials: 'AS',
		name: 'Alice Smith',
		email: 'alice@example.com',
		role: 'Admin',
		status: 'active',
		lastActive: '2 mins ago',
		avatarBg: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
	},
	{
		initials: 'BJ',
		name: 'Bob Jones',
		email: 'bob@example.com',
		role: 'Editor',
		status: 'active',
		lastActive: '1 hour ago',
		avatarBg: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
	},
	{
		initials: 'CB',
		name: 'Charlie Brown',
		email: 'charlie@example.com',
		role: 'Viewer',
		status: 'active',
		lastActive: '2 days ago',
		avatarBg: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
	},
	{
		initials: '',
		name: 'david@example.com',
		email: 'Invitation sent',
		role: 'Viewer',
		status: 'pending',
		lastActive: '-',
		isPending: true,
		avatarBg: '',
	},
]);

const invites = $state<Invite[]>([
	{
		email: 'david@example.com',
		role: 'Viewer',
		sentAt: 'Today at 10:24 AM',
		sentBy: 'Alice Smith',
		status: 'pending',
	},
	{
		email: 'charlie@example.com',
		role: 'Viewer',
		sentAt: 'Oct 24 at 2:15 PM',
		sentBy: 'Alice Smith',
		status: 'accepted',
	},
]);

const roleStyles: Record<MemberRole, string> = {
	Admin:
		'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50',
	Editor:
		'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50',
	Viewer:
		'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
};
</script>

<div class="max-w-7xl mx-auto w-full flex flex-col gap-8">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Team Management</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage project access and roles for your team members.</p>
    </div>
    <button class="inline-flex items-center justify-center px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors shadow-sm gap-2 shrink-0">
      <span class="material-symbols-outlined text-[20px]">person_add</span>
      Invite Member
    </button>
  </div>

  <!-- Team Members Card -->
  <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
    <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
      <h2 class="text-base font-semibold text-slate-900 dark:text-white">Active Members</h2>
      <span class="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">{members.length} Members</span>
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
          {#each members as member}
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors {member.isPending ? 'bg-slate-50/30 dark:bg-slate-800/10' : ''}">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  {#if member.isPending}
                    <div class="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600 text-slate-400">
                      <span class="material-symbols-outlined text-sm">mail</span>
                    </div>
                  {:else}
                    <div class="size-8 rounded-full {member.avatarBg} flex items-center justify-center text-xs font-medium">{member.initials}</div>
                  {/if}
                  <div>
                    <div class="text-sm font-medium text-slate-900 dark:text-white">{member.name}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">{member.email}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium {roleStyles[member.role]}">{member.role}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <div class="size-1.5 rounded-full {member.status === 'active' ? 'bg-emerald-500' : 'bg-amber-400'}"></div>
                  <span class="text-sm text-slate-700 dark:text-slate-300 capitalize">{member.status}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                {member.lastActive}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                {#if member.isPending}
                  <button class="text-sm font-medium text-primary hover:text-primary/80 transition-colors">Resend</button>
                {:else}
                  <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <span class="material-symbols-outlined text-xl">more_vert</span>
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
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
        {#each invites as invite}
          <li class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <span class="material-symbols-outlined text-[18px]">history</span>
              </div>
              <div>
                <p class="text-sm font-medium text-slate-900 dark:text-white">
                  Invited <span class="font-semibold">{invite.email}</span> as {invite.role}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{invite.sentAt} by {invite.sentBy}</p>
              </div>
            </div>
            {#if invite.status === 'pending'}
              <span class="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800/50">Awaiting Reply</span>
            {:else}
              <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/50">Accepted</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
</div>
