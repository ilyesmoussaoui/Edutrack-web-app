
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Building, Users, UserCog, BookOpenText, LogOut, ClipboardList, BarChart3 } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { href: '/admin-dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin-dashboard/departments', label: 'Departments', icon: Building },
  { href: '/admin-dashboard/students', label: 'Students', icon: Users },
  { href: '/admin-dashboard/teachers', label: 'Teachers', icon: UserCog },
  { href: '/admin-dashboard/program-management', label: 'Program Management', icon: BookOpenText },
  { href: '/admin-dashboard/attendance-viewer', label: 'Attendance Viewer', icon: ClipboardList },
  { href: '/admin-dashboard/grades-viewer', label: 'Grades Viewer', icon: BarChart3 },
];

export function AdminSidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/admin'); 
    } catch (error) {
      console.error("Admin logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not log you out. Please try again." });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <SidebarMenu className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.label}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                variant="default"
                size="default"
                className={cn(
                  "w-full justify-start",
                  pathname === item.href && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                  pathname !== item.href && "hover:bg-accent hover:text-accent-foreground"
                )}
                isActive={pathname === item.href}
                tooltip={{content: item.label, side: 'right', align: 'center' }}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <div className="p-2 mt-auto border-t">
        <SidebarMenuButton variant="ghost" className="w-full justify-start" onClick={handleLogout} 
          tooltip={{content: "Logout", side: 'right', align: 'center' }}>
          <LogOut className="mr-2 h-5 w-5" />
          <span className="truncate">Logout</span>
        </SidebarMenuButton>
      </div>
    </div>
  );
}
