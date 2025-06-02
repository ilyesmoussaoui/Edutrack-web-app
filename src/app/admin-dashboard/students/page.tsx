
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function StudentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="mr-2 h-6 w-6 text-primary" />
          Manage Students
        </CardTitle>
        <CardDescription>Oversee student records, enrollment, and group assignments.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This section will allow you to manage student accounts, view their details, and assign them to programs/groups.</p>
        {/* Placeholder for student management UI */}
      </CardContent>
    </Card>
  );
}
