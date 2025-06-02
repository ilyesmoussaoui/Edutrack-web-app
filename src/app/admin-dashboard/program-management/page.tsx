
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BookOpenText } from 'lucide-react';

export default function ProgramManagementPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BookOpenText className="mr-2 h-6 w-6 text-primary" />
          Program Management
        </CardTitle>
        <CardDescription>Structure academic programs, create and manage groups, and set up recurring class schedules.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This section will allow you to define programs, create student groups, and manage their schedules and teacher assignments.</p>
        {/* Placeholder for program management UI */}
      </CardContent>
    </Card>
  );
}
