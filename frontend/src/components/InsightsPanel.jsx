import { BarChart3, FileText, Archive, TrendingUp } from 'lucide-react';

export default function InsightsPanel({ insights, onClose }) {
  if (!insights) return null;

  return (
    <div className="border-l border-[var(--color-border)] bg-[var(--color-surface-elevated)] w-72 flex flex-col shrink-0">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4 text-indigo-400" />
          Insights
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={FileText} label="Total" value={insights.total_notes} />
          <StatCard icon={Archive} label="Archived" value={insights.archived_notes} />
        </div>

        <div className="rounded-lg border border-[var(--color-border)] p-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            This week
          </div>
          <p className="text-2xl font-semibold">{insights.notes_this_week}</p>
          <p className="text-xs text-zinc-500">notes created</p>
        </div>

        {insights.top_tags?.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Top tags
            </h3>
            <div className="space-y-1.5">
              {insights.top_tags.map(({ tag, count }) => (
                <div key={tag} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">#{tag}</span>
                  <span className="text-zinc-500">{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {insights.notes_by_category?.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Categories
            </h3>
            <div className="space-y-1.5">
              {insights.notes_by_category.map(({ category, count }) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300 capitalize">{category}</span>
                  <span className="text-zinc-500">{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {insights.recent_activity?.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Recent
            </h3>
            <div className="space-y-2">
              {insights.recent_activity.map((a) => (
                <div key={a.note_id} className="text-sm">
                  <p className="truncate text-zinc-300">{a.title}</p>
                  <p className="text-xs text-zinc-600">
                    {new Date(a.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <Icon className="mb-1 h-4 w-4 text-indigo-400" />
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
