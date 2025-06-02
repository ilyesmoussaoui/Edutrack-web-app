
import { AppHeader } from '@/components/layout/app-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-headline font-semibold">Admin Dashboard</h2>
          {/* Add a logout button or other admin-specific navigation here later */}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome, Admin!</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the Admin Dashboard. You have successfully logged in.</p>
            <p className="mt-4">You can manage your application from here.</p>
             <Link href="/admin" passHref legacyBehavior>
                <Button variant="outline" className="mt-6">Logout (placeholder)</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        <p>Data Dashboard Lite &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
