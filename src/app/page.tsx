import Link from "next/link";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import {
  ArrowRightIcon,
  BookIcon,
  CalendarIcon,
  CartIcon,
  CheckIcon,
  LinkIcon,
  SparklesIcon,
  StoreIcon
} from "@/components/ui/Icons";
import { cn } from "@/lib/cn";

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "Typed in",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  WEB: "Web"
};

const mealLabel: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack"
};

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const userId = await getCurrentUserId();
  if (!userId) return <LandingPage />;
  return <Dashboard userId={userId} />;
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

async function Dashboard({ userId }: { userId: string }) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekOut = new Date(startOfToday);
  weekOut.setDate(weekOut.getDate() + 7);

  const [recipeCount, activePlanCount, shoppingListCount, recentRecipes, upcomingEntries, user] = await Promise.all([
    prisma.recipe.count({ where: { userId } }),
    prisma.mealPlan.count({ where: { userId, endDate: { gte: startOfToday } } }),
    prisma.shoppingList.count({ where: { userId } }),
    prisma.recipe.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { ingredients: true }
    }),
    prisma.mealPlanEntry.findMany({
      where: { mealPlan: { userId }, date: { gte: startOfToday, lte: weekOut } },
      include: { recipe: true },
      orderBy: { date: "asc" },
      take: 7
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId } })
  ]);

  const krogerConnected = Boolean(user.krogerAccessToken);
  const firstName = user.name?.split(" ")[0];
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <PageHeader
        eyebrow={dateLabel}
        title={firstName ? `${greeting(today)}, ${firstName}.` : `${greeting(today)}.`}
        subtitle="Here's a look at what's simmering — your recipes, the week ahead, and your cart."
        actions={
          <Link
            href="/settings/kroger"
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-300 hover:-translate-y-px",
              krogerConnected
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-amber/30 bg-amber-soft text-amber hover:bg-amber/20"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", krogerConnected ? "bg-accent" : "bg-amber")} />
            {krogerConnected ? "Kroger connected" : "Connect Kroger"}
          </Link>
        }
      />

      <div className="stagger mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={<BookIcon size={18} />} value={recipeCount} label="recipes in your box" href="/recipes" tone="sage" />
        <StatTile icon={<CalendarIcon size={18} />} value={activePlanCount} label="plans on the go" href="/meal-plan" tone="honey" />
        <StatTile icon={<CartIcon size={18} />} value={shoppingListCount} label="shopping lists" href="/shopping-list" tone="sage" />
      </div>

      <div className="stagger mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickAction
          href="/recipes"
          icon={<LinkIcon size={20} />}
          title="Save a recipe"
          description="Paste a TikTok, Reel, YouTube, or recipe link — or jot it down."
        />
        <QuickAction
          href="/meal-plan"
          icon={<CalendarIcon size={20} />}
          title="Plan some meals"
          description="A day, a week, a whole month — whatever suits."
        />
        <QuickAction
          href="/settings/kroger"
          icon={<StoreIcon size={20} />}
          title="Your Kroger store"
          description={user.krogerLocationId ? "Store picked — you're all set." : "Pick the store you usually shop at."}
        />
      </div>

      <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionHead title="Coming up this week" href="/meal-plan" linkLabel="Open meal plan" />
          {upcomingEntries.length === 0 ? (
            <EmptyState icon={<CalendarIcon size={22} />}>Nothing on the calendar for the next 7 days yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {upcomingEntries.map((e) => (
                <li key={e.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-amber-soft text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber">
                      {e.date.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="font-display text-base leading-none text-fg">{e.date.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg">{e.recipe.title}</p>
                    <p className="text-xs text-fg-muted">
                      {mealLabel[e.mealType]}
                      {e.servingsMultiplier !== 1 && ` · ×${e.servingsMultiplier}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <SectionHead title="Recently saved" href="/recipes" linkLabel="All recipes" />
          {recentRecipes.length === 0 ? (
            <EmptyState icon={<BookIcon size={22} />}>Your recipe box is empty — let&apos;s add the first one.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {recentRecipes.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">{r.title}</p>
                    <p className="text-xs text-fg-muted">
                      {r.ingredients.length} ingredients · serves {r.servings ?? 1}
                    </p>
                  </div>
                  <Badge variant="muted">{SOURCE_LABEL[r.sourceType] ?? r.sourceType.toLowerCase()}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function SectionHead({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-[22px] text-fg">{title}</h2>
      <Link
        href={href}
        className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-accent-strong"
      >
        {linkLabel}
        <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  href,
  tone
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  href: string;
  tone: "sage" | "honey";
}) {
  return (
    <Link href={href} className="group block">
      <Card interactive dense className="h-full">
        <div className="flex items-start justify-between">
          <p className="font-display text-[44px] leading-none text-fg">{value}</p>
          <span
            className={cn(
              "blob flex h-10 w-10 items-center justify-center transition-transform duration-500 group-hover:rotate-[-10deg] group-hover:scale-110",
              tone === "sage" ? "bg-accent-soft text-accent" : "bg-amber-soft text-amber"
            )}
          >
            {icon}
          </span>
        </div>
        <p className="mt-3 font-display text-[15px] italic text-fg-muted">{label}</p>
      </Card>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card interactive className="h-full">
        <span className="blob mb-4 flex h-12 w-12 items-center justify-center bg-accent-soft text-accent transition-all duration-500 group-hover:bg-accent group-hover:text-accent-fg group-hover:shadow-glow">
          {icon}
        </span>
        <h3 className="font-display text-xl text-fg">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-accent opacity-0 transition-all duration-300 group-hover:opacity-100">
          Let&apos;s go <ArrowRightIcon size={12} />
        </span>
      </Card>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Landing (logged out)                                                */
/* ------------------------------------------------------------------ */

function LandingPage() {
  return (
    <>
      <section className="relative pt-4 pb-16 text-center sm:pt-12">
        <div className="bg-dots pointer-events-none absolute inset-x-0 -top-10 h-[460px]" aria-hidden />
        <div className="stagger relative">
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-surface-solid px-4 py-1.5 text-xs font-bold text-fg-muted shadow-card">
            <SparklesIcon size={14} className="text-amber" />
            Recipes → a week of meals → a full Kroger cart
          </div>
          <h1 className="mx-auto max-w-3xl font-display text-[42px] leading-[1.05] text-fg sm:text-[68px]">
            Cook what you love.
            <br />
            We&apos;ll handle the <span className="text-accent-serif underline-wavy">groceries</span>.
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-[17px] leading-relaxed text-fg-muted sm:text-lg">
            Save recipes from any link, TikTok, or Reel. Plan the meals you actually want to eat. We add up every
            ingredient and fill your Kroger cart — you just confirm and pay.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" size="lg">
              Start cooking — it&apos;s free
              <ArrowRightIcon size={18} />
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="lg">
              I have an account
            </ButtonLink>
          </div>
        </div>

        <FlowPreview />
      </section>

      <section className="stagger grid gap-4 sm:grid-cols-3">
        <StepCard
          n="1"
          icon={<LinkIcon size={20} />}
          title="Save your recipes"
          description="Paste a recipe page, TikTok, Reel, or YouTube link — or type the ingredients yourself. We pull out just the ingredients, even from messy captions."
        />
        <StepCard
          n="2"
          icon={<CalendarIcon size={20} />}
          title="Plan your meals"
          description="Drop recipes onto any day, week, or month. Every ingredient gets combined into one tidy list, with units sorted out for you."
        />
        <StepCard
          n="3"
          icon={<CartIcon size={20} />}
          title="Shop in one tap"
          description="We match each item to a real Kroger product, work out how many packages you actually need, and put them in your cart."
        />
      </section>

      <section className="paper animate-fade-up mt-8 border border-line bg-surface-solid p-7 text-center shadow-card sm:p-9">
        <div className="blob mx-auto mb-3 flex h-12 w-12 items-center justify-center bg-accent-soft text-accent">
          <CheckIcon size={22} />
        </div>
        <h2 className="font-display text-2xl text-fg">Your card stays in your pocket</h2>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-fg-muted">
          We build and fill your cart, but no app is allowed to pay on your behalf — you always look it over and
          check out yourself in the Kroger app.
        </p>
      </section>
    </>
  );
}

/** Decorative, static "product" panel: three little notes showing the flow. */
function FlowPreview() {
  return (
    <div className="animate-fade-up relative mx-auto mt-16 max-w-4xl [animation-delay:300ms]">
      <div
        className="animate-blob pointer-events-none absolute -inset-x-10 -top-12 h-48 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--glow-b), transparent 72%)" }}
        aria-hidden
      />
      <div className="relative grid gap-4 sm:grid-cols-3">
        <PreviewPane label="Recipe" icon={<BookIcon size={14} />} tilt="-1.2deg">
          <PreviewRow strong>Creamy tomato pasta</PreviewRow>
          <PreviewRow>200 g dried pasta</PreviewRow>
          <PreviewRow>2 big tomatoes</PreviewRow>
          <PreviewRow>½ cup cooking cream</PreviewRow>
          <PreviewRow muted>+ 9 more</PreviewRow>
        </PreviewPane>
        <PreviewPane label="This week" icon={<CalendarIcon size={14} />} tilt="0.8deg">
          <PreviewRow>
            <span className="w-8 text-fg-faint">Mon</span> Tomato pasta
          </PreviewRow>
          <PreviewRow>
            <span className="w-8 text-fg-faint">Tue</span> Burrito bowls
          </PreviewRow>
          <PreviewRow>
            <span className="w-8 text-fg-faint">Wed</span> French toast
          </PreviewRow>
          <PreviewRow>
            <span className="w-8 text-fg-faint">Thu</span> Tomato pasta <span className="text-amber">×2</span>
          </PreviewRow>
          <PreviewRow muted>4 recipes · 12 meals</PreviewRow>
        </PreviewPane>
        <PreviewPane label="Kroger cart" icon={<CartIcon size={14} />} accent tilt="-0.6deg">
          <PreviewRow check>Kroger® Penne Rigate · 1</PreviewRow>
          <PreviewRow check>Roma tomatoes · 4</PreviewRow>
          <PreviewRow check>Heavy cream 16 fl oz · 1</PreviewRow>
          <PreviewRow check>Grade A eggs 12 ct · 1</PreviewRow>
          <PreviewRow muted>Ready to check out →</PreviewRow>
        </PreviewPane>
      </div>
    </div>
  );
}

function PreviewPane({
  label,
  icon,
  accent = false,
  tilt,
  children
}: {
  label: string;
  icon: React.ReactNode;
  accent?: boolean;
  tilt: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "paper border p-5 text-left shadow-card transition-transform duration-500 hover:rotate-0! hover:-translate-y-1",
        accent ? "border-accent/30 bg-accent-soft" : "border-line bg-surface-solid"
      )}
      style={{ rotate: tilt }}
    >
      <p className="mb-3 flex items-center gap-1.5 font-display text-sm italic text-fg-faint">
        <span className={accent ? "text-accent" : ""}>{icon}</span>
        {label}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function PreviewRow({
  children,
  strong = false,
  muted = false,
  check = false
}: {
  children: React.ReactNode;
  strong?: boolean;
  muted?: boolean;
  check?: boolean;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-[13px]",
        strong && "font-display text-[15px] text-fg",
        muted && "pt-1 text-xs text-fg-faint",
        !strong && !muted && "text-fg-muted"
      )}
    >
      {check && (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
          <CheckIcon size={10} strokeWidth={3} />
        </span>
      )}
      {children}
    </p>
  );
}

function StepCard({
  n,
  icon,
  title,
  description
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card interactive className="group">
      <div className="mb-5 flex items-center justify-between">
        <span className="blob flex h-12 w-12 items-center justify-center bg-accent-soft text-accent transition-all duration-500 group-hover:bg-accent group-hover:text-accent-fg group-hover:shadow-glow">
          {icon}
        </span>
        <span className="font-display text-3xl italic text-fg-faint/70">{n}</span>
      </div>
      <h3 className="font-display text-xl text-fg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{description}</p>
    </Card>
  );
}
