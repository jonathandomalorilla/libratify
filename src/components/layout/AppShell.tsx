import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight, BarChart3, Bell, BookOpen, LayoutDashboard, LogOut, Search, Settings, Users,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLibrary } from "@/hooks/use-library";
import { isOpen, todayISO } from "@/lib/library-stats";

const NAV = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Books", url: "/books", icon: BookOpen },
  { title: "Members", url: "/members", icon: Users },
  { title: "Borrow & Return", url: "/loans", icon: ArrowLeftRight },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Link to="/" className="rounded-md" aria-label="Libratify home">
          {collapsed ? <LogoMark className="size-7" /> : <Logo light />}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV.map((item) => {
                const active = path.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-10 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                    >
                      <Link to={item.url}>
                        <item.icon className="size-[18px]" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent p-3 text-xs text-sidebar-foreground/80">
            <p className="font-semibold text-sidebar-accent-foreground">Demo workspace</p>
            <p className="mt-1">Changes are saved in this browser only.</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function GlobalSearch() {
  const { books, members } = useLibrary();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return [
      ...books.filter((b) => b.title.toLowerCase().includes(s) || b.author.toLowerCase().includes(s)).slice(0, 5)
        .map((b) => ({ id: b.id, label: b.title, sub: b.author, to: "/books" as const })),
      ...members.filter((m) => m.name.toLowerCase().includes(s) || m.email.includes(s)).slice(0, 4)
        .map((m) => ({ id: m.id, label: m.name, sub: m.email, to: "/members" as const })),
    ];
  }, [q, books, members]);

  return (
    <Popover open={open && q.trim().length >= 2} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative hidden w-full max-w-sm md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            placeholder="Search books or members…"
            className="h-9 bg-background pl-9"
            aria-label="Search books or members"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1" onOpenAutoFocus={(e) => e.preventDefault()}>
        {results.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">No matches for "{q}"</p>
        ) : (
          results.map((r) => (
            <button
              key={r.id}
              className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-accent focus:bg-accent"
              onClick={() => { setOpen(false); setQ(""); navigate({ to: r.to, search: { q: r.label } }); }}
            >
              <span className="text-sm font-medium">{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.to === "/books" ? "Book" : "Member"} · {r.sub}</span>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

function Notifications() {
  const { loans, books, members } = useLibrary();
  const today = todayISO();
  const overdue = loans.filter((l) => isOpen(l) && l.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications: ${overdue.length} overdue loans`}>
          <Bell className="size-[18px]" />
          {overdue.length > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-card" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Overdue loans</p>
          <p className="text-xs text-muted-foreground">{overdue.length} need attention</p>
        </div>
        <ul className="max-h-72 overflow-auto py-1">
          {overdue.slice(0, 6).map((l) => (
            <li key={l.id} className="px-4 py-2 text-sm">
              <p className="truncate font-medium">{books.find((b) => b.id === l.bookId)?.title}</p>
              <p className="text-xs text-muted-foreground">
                {members.find((m) => m.id === l.memberId)?.name} · due {l.dueDate}
              </p>
            </li>
          ))}
          {overdue.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">All caught up.</li>}
        </ul>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/loans" search={{ tab: "overdue" }}>View all overdue</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV.find((n) => path.startsWith(n.url));
  const { profile } = useLibrary();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur md:px-6">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/dashboard">Libratify</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>{current?.title ?? "Workspace"}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex flex-1 items-center justify-end gap-2">
              <GlobalSearch />
              <Notifications />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted" aria-label="Open user menu">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials(profile.name)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium lg:inline">{profile.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-sm">{profile.name}</p>
                    <p className="text-xs font-normal text-muted-foreground">{profile.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
                    <Settings className="size-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate({ to: "/" })}>
                    <LogOut className="size-4" /> Exit demo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-4 md:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
