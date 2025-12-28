import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, BarChart3, Settings, AlertTriangle, 
  QrCode, LogOut, Building2, User, ChevronDown
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useIsHQ, useIsManager, useIsCollector, useCurrentHospital } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";

const managerMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Analitik", url: "/analytics", icon: BarChart3 },
  { title: "Uygunsuzluklar", url: "/issues", icon: AlertTriangle },
  { title: "Ayarlar", url: "/settings", icon: Settings },
];

const collectorMenuItems = [
  { title: "Saha İşlemleri", url: "/collector", icon: QrCode },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isHQ = useIsHQ();
  const isManager = useIsManager();
  const isCollector = useIsCollector();
  const currentHospital = useCurrentHospital();

  const menuItems = isCollector && !isManager && !isHQ 
    ? collectorMenuItems 
    : managerMenuItems;

  const roleLabel = isHQ ? "Genel Merkez" : isManager ? "Hastane Yöneticisi" : "Saha Personeli";
  const roleBadgeVariant = isHQ ? "default" : isManager ? "secondary" : "outline";

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground font-bold">
            WMS
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">Atık Yönetimi</h2>
            <p className="text-xs text-muted-foreground truncate">Stratejik Merkez</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menü</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isManager || isHQ) && isCollector && (
          <SidebarGroup>
            <SidebarGroupLabel>Saha</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/collector"}
                  >
                    <Link href="/collector" data-testid="nav-collector">
                      <QrCode className="h-4 w-4" />
                      <span>Saha İşlemleri</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!isHQ && currentHospital && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent mb-3">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: currentHospital.colorHex }}
            />
            <span className="text-xs truncate flex-1">{currentHospital.name}</span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 px-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName || user?.username}
                </p>
                <Badge variant={roleBadgeVariant} className="text-[10px] px-1.5 py-0">
                  {roleLabel}
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2">
              <ThemeToggle />
              <span>Tema Değiştir</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="gap-2 text-destructive focus:text-destructive" 
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Çıkış Yap</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
