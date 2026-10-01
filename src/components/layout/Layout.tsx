import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  LogOut, 
  Moon, 
  Sun, 
  UserCircle, 
  Settings, 
  UserCheck, 
  Truck, 
  Menu, 
  X, 
  PanelLeftClose, 
  PanelLeftOpen,
  PanelLeft,
  Building2
} from "lucide-react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { auth } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import { cn } from "../../lib/utils";
import { Button } from "../ui";
import { Logo } from "../Logo";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { useState, useEffect } from "react";
import { useAlertModal } from "../../context/AlertModalContext";

export function Layout() {
  const { user, logout } = useAuthStore();
  const { themeMode, setThemeMode } = useSettingsStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm } = useAlertModal();

  // Desktop sidebar collapse state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("meditrack_sidebar_collapsed") === "true";
  });

  // Mobile sidebar drawer state
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Sync collapsed state to localStorage
  const toggleDesktopSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("meditrack_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Close mobile sidebar whenever route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: "Confirm Log Out",
      message: "Are you sure you want to end your current session and sign out of MediTrack Pro?",
      confirmText: "Yes, Log Out",
      cancelText: "Stay Logged In",
      variant: "logout",
      eyebrow: "SECURITY SIGN-OUT"
    });
    if (!isConfirmed) return;

    if (auth) {
      await signOut(auth);
    }
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: ShoppingCart, label: 'Purchase', path: '/purchase' },
    { icon: Users, label: 'Sales', path: '/sales' },
    { icon: UserCheck, label: 'Patient Info', path: '/patients' },
    { icon: Truck, label: 'Supplier Info', path: '/suppliers' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: UserCircle, label: 'Profile', path: '/profile' },
  ];

  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-2xl md:hidden transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-9 h-9 shrink-0 drop-shadow-sm" />
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-teal-500 bg-clip-text text-transparent">
              MediTrack Pro
            </h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            onClick={() => setIsMobileOpen(false)}
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Workspace Switcher in Mobile Drawer */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <WorkspaceSwitcher isCollapsed={false} />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  isActive 
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold shadow-2xs" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center font-bold text-primary-600 dark:text-primary-400 shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 flex items-center justify-center gap-1.5 h-9" 
              onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
            >
              {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
              <span className="text-xs">{themeMode === 'dark' ? 'Light' : 'Dark'}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 flex items-center justify-center gap-1.5 h-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40" 
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs">Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Sidebar - Desktop (Collapsible) */}
      <aside 
        className={cn(
          "hidden md:flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300 ease-in-out shrink-0",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className={cn(
          "p-4 border-b border-slate-200 dark:border-slate-700 flex items-center h-16",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
              <Logo className="w-9 h-9 shrink-0 drop-shadow-sm" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-teal-500 bg-clip-text text-transparent truncate">
                MediTrack Pro
              </h1>
            </div>
          )}
          {isCollapsed && (
            <Logo className="w-9 h-9 shrink-0 drop-shadow-sm" />
          )}

          <Button 
            id="sidebar-desktop-toggle-btn"
            variant="ghost" 
            size="icon" 
            onClick={toggleDesktopSidebar}
            className={cn(
              "h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg",
              isCollapsed && "mt-2"
            )}
            title={isCollapsed ? "Expand sidebar (Open)" : "Collapse sidebar (Close)"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-primary-600" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Workspace Switcher in Desktop Sidebar */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <WorkspaceSwitcher isCollapsed={isCollapsed} />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-xl transition-all font-medium text-sm",
                  isCollapsed ? "justify-center px-2 py-3" : "gap-3.5 px-3.5 py-2.5",
                  isActive 
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold shadow-2xs" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User & Controls */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3 px-1">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center font-bold text-primary-600 dark:text-primary-400 shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="flex-1 h-8 rounded-lg" 
                  onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                  title={themeMode === 'dark' ? "Switch to Light theme" : "Switch to Dark theme"}
                >
                  {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="flex-1 h-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40" 
                  onClick={handleLogout}
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center font-bold text-primary-600 dark:text-primary-400"
                title={`${user.name} (${user.role})`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg" 
                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                title={themeMode === 'dark' ? "Switch to Light theme" : "Switch to Dark theme"}
              >
                {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" 
                onClick={handleLogout}
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar (Desktop & Mobile) */}
        <header className="h-14 md:h-16 px-4 md:px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Toggle Button */}
            <Button 
              id="mobile-sidebar-toggle-btn"
              variant="outline" 
              size="icon" 
              className="md:hidden h-9 w-9 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              onClick={() => setIsMobileOpen(true)}
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Desktop Quick Toggle Button (Always visible on header for fast collapse/expand) */}
            <Button 
              id="desktop-header-sidebar-toggle-btn"
              variant="ghost" 
              size="icon" 
              className="hidden md:flex h-9 w-9 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg"
              onClick={toggleDesktopSidebar}
              title={isCollapsed ? "Expand sidebar (Open)" : "Collapse sidebar (Close)"}
            >
              <PanelLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Button>

            <div className="flex items-center gap-2.5 min-w-0">
              <Logo className="w-6 h-6 md:hidden shrink-0" />
              <div className="min-w-0 flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200 truncate">
                  {navItems.find((item) => item.path === location.pathname)?.label || 'MediTrack Cloud'}
                </span>
                {user?.organizationName && (
                  <>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600 hidden sm:inline">·</span>
                    <Link
                      to="/settings?tab=workspace"
                      className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium truncate transition-colors"
                      title="Manage Workspace & Organization"
                    >
                      <Building2 className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                      <span className="truncate max-w-[180px]">{user.organizationName}</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-lg" 
              onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
              title={themeMode === 'dark' ? "Switch to Light mode" : "Switch to Dark mode"}
            >
              {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            </Button>

            <Link 
              to="/profile"
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              title="View Profile"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center font-bold text-primary-600 dark:text-primary-400 text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
                {user.name}
              </span>
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation for Quick Thumb Reach */}
        <nav className="md:hidden flex items-center justify-around p-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pb-safe shrink-0 shadow-lg">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors flex-1",
                  isActive ? "text-primary-600 font-bold" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-[10px] truncate">{item.label.replace(' Info', '')}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
