
import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AdminSidebarNav } from '@/components/layout/admin-sidebar-nav';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <SidebarProvider defaultOpen>
        <div className="flex flex-1">
          <Sidebar collapsible="icon" className="border-r">
            <SidebarHeader className="p-2 flex justify-end">
              {/* SidebarTrigger can be placed here if manual toggle inside sidebar is desired when collapsible="icon" */}
              {/* For now, relying on rail or external trigger */}
            </SidebarHeader>
            <SidebarContent>
              <AdminSidebarNav />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <header className="p-4 border-b md:hidden"> 
              <SidebarTrigger />
            </header>
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        <p>Edutrack Admin &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
