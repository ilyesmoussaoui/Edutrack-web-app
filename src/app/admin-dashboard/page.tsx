
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Building, Users, UserCog, BookOpenText } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardOverviewPage() {
  const overviewItems = [
    { title: "Manage Departments", href: "/admin-dashboard/departments", icon: Building, description: "Define and organize academic or functional departments." },
    { title: "Manage Students", href: "/admin-dashboard/students", icon: Users, description: "Oversee student records, enrollment, and group assignments." },
    { title: "Manage Teachers", href: "/admin-dashboard/teachers", icon: UserCog, description: "Administer teacher profiles, schedules, and assignments." },
    { title: "Program Management", href: "/admin-dashboard/program-management", icon: BookOpenText, description: "Structure academic programs, create groups, and set schedules." },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-6 w-6 text-primary" />
            Admin Dashboard Overview
          </CardTitle>
          <CardDescription>Welcome to the Data Dashboard Lite admin control panel. From here, you can manage all aspects of the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Select an option from the sidebar or use the quick links below to navigate to different management sections.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {overviewItems.map((item) => (
          <Link href={item.href} key={item.title} passHref>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
              <CardHeader className="flex flex-row items-center space-x-3 pb-3">
                <item.icon className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
