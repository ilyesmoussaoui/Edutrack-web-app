import { GraduationCap } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center">
        <GraduationCap className="h-7 w-7 mr-2 text-primary" />
        <h1 className="text-xl font-headline font-semibold text-foreground">
          Edutrack
        </h1>
      </div>
    </header>
  );
}
