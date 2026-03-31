import { cn } from "./ui/utils";
import { AnimatePresence, motion } from "motion/react";

// ─── Page Transition Wrapper ───────────────────────────────────────────────────

/**
 * Wraps the skeleton → content switch with AnimatePresence mode="wait"
 * so the skeleton fades out before the content fades in.
 */
export function PageTransition({
  isLoading,
  skeleton,
  children,
}: {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {skeleton}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Base Skeleton Primitives ──────────────────────────────────────────────────

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-lg shimmer", className)}
    />
  );
}

function CardBone({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-border/40 bg-card/50 p-5", className)}>
      {children}
    </div>
  );
}

// ─── Dashboard Skeleton ────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="w-full flex flex-col font-sans pb-20 gap-8">
      {/* Greeting */}
      <div className="mb-2">
        <Bone className="h-8 w-72 mb-3" />
        <Bone className="h-4 w-[520px] mb-1.5" />
        <Bone className="h-3 w-40 mt-3" />
      </div>

      {/* Tilt Tracker placeholder */}
      <CardBone className="h-16" />

      {/* Goals Summary placeholder */}
      <CardBone className="h-20" />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <CardBone key={i} className="h-[130px]">
            <div className="flex justify-between items-start mb-4">
              <Bone className="w-10 h-10 rounded-full" />
              <Bone className="w-16 h-6 rounded" />
            </div>
            <Bone className="h-7 w-20 mb-2" />
            <Bone className="h-4 w-32" />
          </CardBone>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardBone className="lg:col-span-2 h-[320px]">
          <Bone className="h-5 w-44 mb-1" />
          <Bone className="h-3 w-32 mb-8" />
          <Bone className="h-[200px] w-full rounded-xl" />
        </CardBone>
        <CardBone className="h-[320px]">
          <Bone className="h-5 w-32 mb-1" />
          <Bone className="h-3 w-24 mb-6" />
          <Bone className="h-[200px] w-full rounded-full mx-auto max-w-[200px]" />
        </CardBone>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardBone className="lg:col-span-2 h-[320px]">
          <Bone className="h-5 w-40 mb-1" />
          <Bone className="h-3 w-28 mb-8" />
          <div className="flex flex-col gap-4">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Bone className="h-4 w-10" />
                <Bone className="h-6 flex-1 rounded" />
              </div>
            ))}
          </div>
        </CardBone>
        <div className="flex flex-col gap-4">
          <Bone className="h-4 w-24" />
          {[0, 1, 2, 3].map(i => (
            <CardBone key={i} className="h-[72px] !p-3">
              <div className="flex gap-3">
                <Bone className="w-4 h-4 rounded-full mt-0.5 shrink-0" />
                <div className="flex-1">
                  <Bone className="h-4 w-40 mb-1.5" />
                  <Bone className="h-3 w-full" />
                </div>
              </div>
            </CardBone>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Skeleton ──────────────────────────────────────────────────────────

export function ProfileSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col font-sans gap-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-32" />
        <Bone className="h-9 w-36 rounded-lg" />
      </div>

      {/* Profile Card */}
      <CardBone className="flex items-center justify-between !p-6">
        <div className="flex items-center gap-5">
          <Bone className="w-20 h-20 rounded-2xl" />
          <div>
            <Bone className="h-6 w-40 mb-2" />
            <Bone className="h-4 w-28 mb-1.5" />
            <Bone className="h-3 w-48" />
          </div>
        </div>
        <div className="flex gap-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="text-center">
              <Bone className="h-7 w-14 mx-auto mb-1" />
              <Bone className="h-3 w-10 mx-auto" />
            </div>
          ))}
        </div>
      </CardBone>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <CardBone key={i} className="h-[90px]">
            <Bone className="h-4 w-20 mb-3" />
            <Bone className="h-6 w-16" />
          </CardBone>
        ))}
      </div>

      {/* Chart */}
      <CardBone className="h-[260px]">
        <Bone className="h-5 w-36 mb-1" />
        <Bone className="h-3 w-48 mb-6" />
        <Bone className="h-[170px] w-full rounded-xl" />
      </CardBone>

      {/* Champions */}
      <div>
        <Bone className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <CardBone key={i} className="flex items-center gap-4 !p-4">
              <Bone className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1">
                <Bone className="h-4 w-24 mb-1.5" />
                <Bone className="h-3 w-32" />
              </div>
            </CardBone>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Matches Skeleton ──────────────────────────────────────────────────────────

export function MatchesSkeleton() {
  return (
    <div className="w-full flex flex-col font-sans pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Bone className="h-8 w-48 mb-2" />
          <Bone className="h-4 w-64" />
        </div>
        <Bone className="h-9 w-44 rounded-lg" />
      </div>

      {/* Match Rows */}
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <CardBone key={i} className="flex items-center gap-4 !p-4 h-[80px]">
            <Bone className="w-12 h-12 rounded-xl shrink-0" />
            <div className="flex-1 flex items-center gap-6">
              <div className="flex-1 min-w-0">
                <Bone className="h-4 w-28 mb-1.5" />
                <Bone className="h-3 w-44" />
              </div>
              <Bone className="h-5 w-20" />
              <Bone className="h-5 w-24" />
              <Bone className="h-5 w-16" />
            </div>
          </CardBone>
        ))}
      </div>
    </div>
  );
}

// ─── Learning Skeleton ─────────────────────────────────────────────────────────

export function LearningSkeleton() {
  return (
    <div className="w-full flex flex-col font-sans h-full pt-4 pb-20">
      {/* Header */}
      <div className="mb-8">
        <Bone className="h-9 w-52 mb-2" />
        <Bone className="h-4 w-64" />
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {[0, 1, 2].map(col => (
          <div key={col} className="flex-1 min-w-[300px] flex flex-col gap-4">
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-1">
              <Bone className="w-4 h-4 rounded-full" />
              <Bone className="h-4 w-24" />
              <Bone className="h-5 w-6 rounded-md" />
            </div>
            {/* Cards */}
            {Array.from({ length: col === 0 ? 3 : col === 1 ? 2 : 1 }).map((_, i) => (
              <CardBone key={i} className="!p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Bone className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <Bone className="h-4 w-40 mb-1.5" />
                    <Bone className="h-3 w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bone className="h-5 w-14 rounded-full" />
                  <Bone className="h-5 w-14 rounded-full" />
                </div>
              </CardBone>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ChampionPool Skeleton ─────────────────────────────────────────────────────

export function ChampionPoolSkeleton() {
  return (
    <div className="w-full flex flex-col font-sans pb-20">
      {/* Header */}
      <div className="mb-8">
        <Bone className="h-8 w-44 mb-2" />
        <Bone className="h-4 w-72" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <CardBone key={i} className="h-[72px] !p-4">
            <Bone className="h-3 w-20 mb-2" />
            <Bone className="h-6 w-12" />
          </CardBone>
        ))}
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 mb-6">
        {[0, 1, 2, 3, 4].map(i => (
          <Bone key={i} className="h-9 w-20 rounded-lg" />
        ))}
      </div>

      {/* Champion Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <CardBone key={i} className="flex items-center gap-4 !p-4">
            <Bone className="w-14 h-14 rounded-xl shrink-0" />
            <div className="flex-1">
              <Bone className="h-4 w-24 mb-1.5" />
              <Bone className="h-3 w-36 mb-1" />
              <Bone className="h-3 w-20" />
            </div>
            <Bone className="w-8 h-8 rounded-lg shrink-0" />
          </CardBone>
        ))}
      </div>
    </div>
  );
}

// ─── Goals Skeleton ────────────────────────────────────────────────────────────

export function GoalsSkeleton() {
  return (
    <div className="w-full flex flex-col font-sans pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Bone className="h-8 w-40 mb-2" />
          <Bone className="h-4 w-56" />
        </div>
        <Bone className="h-9 w-28 rounded-lg" />
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map(i => (
          <CardBone key={i} className="h-[90px]">
            <Bone className="h-3 w-24 mb-3" />
            <Bone className="h-6 w-16 mb-2" />
            <Bone className="h-2 w-full rounded-full" />
          </CardBone>
        ))}
      </div>

      {/* Goal Cards */}
      <div className="flex flex-col gap-4">
        {[0, 1, 2, 3].map(i => (
          <CardBone key={i} className="!p-5">
            <div className="flex items-start gap-4">
              <Bone className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1">
                <Bone className="h-5 w-48 mb-2" />
                <Bone className="h-3 w-full max-w-md mb-3" />
                <Bone className="h-2 w-full rounded-full" />
              </div>
              <Bone className="h-8 w-16 rounded-lg shrink-0" />
            </div>
          </CardBone>
        ))}
      </div>
    </div>
  );
}

// ─── LiveGame Skeleton ─────────────────────────────────────────────────────────

function PlayerRowBone() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Bone className="w-9 h-9 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <Bone className="h-3 w-24 mb-1.5" />
        <div className="flex gap-1.5">
          <Bone className="w-5 h-5 rounded" />
          <Bone className="w-5 h-5 rounded" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Bone className="h-3 w-16" />
        <Bone className="h-3 w-10" />
      </div>
    </div>
  );
}

export function LiveGameSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
    >
      {/* My stats bar bone */}
      <CardBone className="flex items-center gap-4 !p-4 h-[72px]">
        <Bone className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 flex gap-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex flex-col gap-1">
              <Bone className="h-3 w-12" />
              <Bone className="h-5 w-10" />
            </div>
          ))}
        </div>
      </CardBone>

      {/* Two team panels */}
      <div className="flex items-start gap-0">
        {/* Blue team */}
        <CardBone className="flex-1 !p-0 overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-border/30">
            <Bone className="h-4 w-20" />
          </div>
          <div className="flex flex-col divide-y divide-border/20">
            {[0, 1, 2, 3, 4].map(i => <PlayerRowBone key={i} />)}
          </div>
        </CardBone>

        {/* VS divider */}
        <div className="w-16 shrink-0 flex flex-col items-center justify-center py-8 gap-3 self-stretch">
          <Bone className="w-10 h-10 rounded-full" />
          <Bone className="w-8 h-3" />
        </div>

        {/* Red team */}
        <CardBone className="flex-1 !p-0 overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-border/30">
            <Bone className="h-4 w-20 ml-auto" />
          </div>
          <div className="flex flex-col divide-y divide-border/20">
            {[0, 1, 2, 3, 4].map(i => <PlayerRowBone key={i} />)}
          </div>
        </CardBone>
      </div>
    </motion.div>
  );
}

// ─── PostGame Skeleton ─────────────────────────────────────────────────────────

export function PostGameSkeleton() {
  return (
    <div className="w-full flex flex-col font-sans pb-20">
      <div className="mb-8">
        <Bone className="h-8 w-56 mb-2" />
        <Bone className="h-4 w-72" />
      </div>

      <CardBone className="h-[200px] mb-6">
        <Bone className="h-5 w-36 mb-4" />
        <Bone className="h-3 w-full mb-2" />
        <Bone className="h-3 w-4/5 mb-2" />
        <Bone className="h-3 w-3/5" />
      </CardBone>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardBone className="h-[260px]">
          <Bone className="h-5 w-32 mb-4" />
          <Bone className="h-[190px] w-full rounded-xl" />
        </CardBone>
        <CardBone className="h-[260px]">
          <Bone className="h-5 w-40 mb-4" />
          <Bone className="h-[190px] w-full rounded-xl" />
        </CardBone>
      </div>
    </div>
  );
}