
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Building } from 'lucide-react';

export default function DepartmentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building className="mr-2 h-6 w-6 text-primary" />
          Manage Departments
        </CardTitle>
        <CardDescription>Define and organize academic or functional departments within the application.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This section will allow you to create, view, edit, and delete departments.</p>
        {/* Placeholder for department management UI */}
      </CardContent>
    </Card>
  );
}
