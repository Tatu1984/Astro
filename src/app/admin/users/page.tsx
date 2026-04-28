import { TopBar } from "@/frontend/components/portal/TopBar";
import { CardLight } from "@/frontend/components/ui/CardLight";
import { listUsers } from "@/backend/services/admin.service";
import { AddAstrologerDialog } from "./add-astrologer-dialog";
import { RoleControl } from "./role-control";

export const dynamic = "force-dynamic";

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-[var(--color-brand-violet)]/10 text-[var(--color-brand-violet)] border-[var(--color-brand-violet)]/30",
  ASTROLOGER: "bg-[var(--color-brand-gold)]/15 text-[#a17800] border-[var(--color-brand-gold)]/40",
  MODERATOR: "bg-[var(--color-brand-aqua)]/15 text-[#0a8273] border-[var(--color-brand-aqua)]/40",
  USER: "bg-[var(--color-surface-2-light)] text-[var(--color-ink-muted-light)] border-[var(--color-border-light)]",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

export default async function Page() {
  const users = await listUsers();

  const counts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <TopBar
        title="Admin · users"
        subtitle={`${users.length} accounts`}
        light
        initials="A"
      />
      <div className="p-6 space-y-5 max-w-5xl">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {(["USER", "ASTROLOGER", "ADMIN", "MODERATOR"] as const).map((r) => (
            <div
              key={r}
              className={`rounded-md border px-3 py-1.5 ${ROLE_BADGE[r]}`}
            >
              {r}: <strong>{counts[r] ?? 0}</strong>
            </div>
          ))}
          <div className="ml-auto">
            <AddAstrologerDialog />
          </div>
        </div>

        <CardLight className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2-light)] text-left text-xs uppercase tracking-wider text-[var(--color-ink-muted-light)]">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-[var(--color-border-light)] align-middle"
                >
                  <td className="px-4 py-3 font-medium">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted-light)]">{u.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-xs ${ROLE_BADGE[u.role]}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted-light)]">
                    {fmtDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RoleControl userId={u.id} role={u.role} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardLight>
      </div>
    </>
  );
}
