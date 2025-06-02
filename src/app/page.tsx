
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow flex flex-col items-center justify-center container mx-auto px-4 py-6">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline">Welcome!</CardTitle>
            <CardDescription>
              Please login or sign up to access your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <Link href="/login" passHref legacyBehavior>
              <Button className="w-full" size="lg">
                Login
              </Button>
            </Link>
            <Link href="/login" passHref legacyBehavior>
              <Button variant="outline" className="w-full" size="lg">
                Sign Up
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        <p>Data Dashboard Lite &copy; {new Date().getFullYear()}</p>
        <div className="mt-2">
          <Link href="/admin" className="text-xs hover:underline text-muted-foreground hover:text-foreground transition-colors">
            Admin Panel
          </Link>
        </div>
      </footer>
    </div>
  );
}
