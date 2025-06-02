
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertTriangle, LogOut } from 'lucide-react';

interface UserData {
  uid: string;
  fullName: string;
  email: string;
  role: 'Student' | 'Teacher' | string;
  assignedGroupId?: string;
}

interface GroupData {
  id: string;
  name: string;
  scheduleTemplate?: Array<{
    day: string;
    time: string;
    subject: string;
    teacherId?: string; 
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const fetchedUserData = userDocSnap.data() as UserData;
            setUserData(fetchedUserData);

            if (fetchedUserData.role === 'Student') {
              if (!fetchedUserData.assignedGroupId) {
                setDisplayMessage('Please wait until the Admin assigns you to a group/program.');
              } else {
                setDisplayMessage(null); 
              }
            } else if (fetchedUserData.role === 'Teacher') {
              const groupsCollectionRef = collection(db, "groups");
              const groupsSnapshot = await getDocs(groupsCollectionRef);
              let isAssigned = false;
              if (!groupsSnapshot.empty) {
                for (const groupDoc of groupsSnapshot.docs) {
                  const groupData = groupDoc.data() as Partial<Omit<GroupData, 'id'>>;
                  if (groupData.scheduleTemplate && Array.isArray(groupData.scheduleTemplate)) {
                    for (const slot of groupData.scheduleTemplate) {
                      if (slot.teacherId === user.uid) {
                        isAssigned = true;
                        break;
                      }
                    }
                  }
                  if (isAssigned) break;
                }
              }
              if (!isAssigned) {
                setDisplayMessage('Please wait until the Admin assigns you to a group/program.');
              } else {
                setDisplayMessage(null); 
              }
            } else {
              setError("User role is not recognized. Please contact support.");
              setDisplayMessage(null);
            }
          } else {
            setError("User data not found. Please sign up again or contact support.");
            await signOut(auth);
            router.push('/login');
          }
        } catch (err: any) {
          console.error("Error fetching user data or groups:", err);
          setError("Failed to load dashboard data. Please try again.");
          setDisplayMessage(null);
        }
      } else {
        router.push('/login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      router.push('/');
    } catch (err) {
      console.error("Logout error:", err);
      setError("Failed to logout. Please try again.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow flex flex-col items-center justify-center container mx-auto px-4 py-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-headline font-semibold">
            Dashboard {userData?.fullName ? `- Welcome, ${userData.fullName}!` : ''}
          </h2>
          <Button variant="outline" onClick={handleLogout} disabled={isLoading}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-destructive bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="mr-2" /> Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {displayMessage ? "Important Message" : (userData?.role === 'Student' ? "Your Schedule" : "Your Classes")}
            </CardTitle>
            {userData && <CardDescription>Role: {userData.role}</CardDescription>}
          </CardHeader>
          <CardContent>
            {displayMessage ? (
              <p className="text-lg text-center py-8 px-4 bg-secondary/30 rounded-md">{displayMessage}</p>
            ) : (
              <div>
                <p>Calendar placeholder - Your actual calendar will be displayed here soon.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        <p>Data Dashboard Lite &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
