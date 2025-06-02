
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collectionGroup, query, where, onSnapshot, type Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertTriangle, LogOut, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserData {
  uid: string;
  fullName: string;
  email: string;
  role: 'Student' | 'Teacher' | string;
  assignedGroupId?: string;
}

interface ScheduleSlotFetched {
  id: string; // Firestore document ID of the schedule slot
  day: string;
  time: string;
  moduleName: string;
  teacherId: string;
  teacherName: string;
  roomHall: string;
  groupId: string;
  groupName: string;
}

interface TeacherScheduleDisplaySlot {
  moduleName: string;
  groupName: string;
  roomHall: string;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const TIME_SLOTS = [
  "08:30 - 10:00",
  "10:00 - 11:30",
  "12:30 - 14:00",
  "14:00 - 15:30",
];

const createSlotKey = (day: string, time: string) => `${day}_${time.replace(/[\s:-]/g, '')}`;

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teacherSchedule, setTeacherSchedule] = useState<Map<string, TeacherScheduleDisplaySlot>>(new Map());
  const [isLoadingTeacherSchedule, setIsLoadingTeacherSchedule] = useState(false);
  // Placeholder for week navigation - functionality to change dates is not yet implemented
  const [currentWeekIdentifier, setCurrentWeekIdentifier] = useState<string>("This Week's Recurring Schedule"); 

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true); // Reset loading state for auth changes
      if (user) {
        setCurrentUser(user);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const fetchedUserData = { uid: user.uid, ...userDocSnap.data() } as UserData;
            setUserData(fetchedUserData);
            
            // Initial message setup, might be overridden by schedule specific logic below
            if (fetchedUserData.role === 'Student' && !fetchedUserData.assignedGroupId) {
              setDisplayMessage('Please wait until the Admin assigns you to a group/program.');
            } else {
              setDisplayMessage(null); 
            }
          } else {
            setError("User data not found. Please sign up again or contact support.");
            await signOut(auth);
            router.push('/login');
          }
        } catch (err: any) {
          console.error("Error fetching user data:", err);
          setError("Failed to load dashboard data. Please try again.");
          setDisplayMessage(null);
        }
      } else {
        router.push('/login');
        setUserData(null);
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (userData?.role === 'Teacher' && currentUser) {
      if (displayMessage === 'Please wait until the Admin assigns you to a group/program.') {
         // This check ensures we don't try to load schedule if the generic "not assigned" message should be shown
         // based on initial check for teachers (which was removed, so this specific path might not be hit as before)
         // For now, we always attempt to load schedule if role is Teacher.
      }

      setIsLoadingTeacherSchedule(true);
      setTeacherSchedule(new Map()); // Clear previous schedule

      const scheduleQuery = query(
        collectionGroup(db, 'schedule'),
        where('teacherId', '==', currentUser.uid)
      );

      const unsubscribeSchedule = onSnapshot(scheduleQuery, (snapshot) => {
        const newSchedule = new Map<string, TeacherScheduleDisplaySlot>();
        let hasAssignments = false;
        snapshot.forEach((docSnap) => {
          const slotData = docSnap.data() as ScheduleSlotFetched;
          const slotKey = createSlotKey(slotData.day, slotData.time);
          newSchedule.set(slotKey, {
            moduleName: slotData.moduleName,
            groupName: slotData.groupName,
            roomHall: slotData.roomHall,
          });
          hasAssignments = true;
        });
        setTeacherSchedule(newSchedule);
        
        if (!hasAssignments) {
            setDisplayMessage('Please wait until the Admin assigns you to a group/program, or you have no classes in the recurring schedule.');
        } else {
            setDisplayMessage(null); // Clear message if assignments found
        }
        setIsLoadingTeacherSchedule(false);
      }, (err) => {
        console.error("Error fetching teacher schedule:", err);
        setError("Failed to load your schedule. Please try again.");
        setIsLoadingTeacherSchedule(false);
      });

      return () => unsubscribeSchedule();
    } else if (userData?.role !== 'Teacher') {
      setTeacherSchedule(new Map()); // Clear schedule if not a teacher
    }
  }, [userData, currentUser]);


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
  
  const mainLoading = isLoading || (userData?.role === 'Teacher' && isLoadingTeacherSchedule && !displayMessage);


  if (mainLoading) {
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
            <CardTitle className="flex items-center">
              <CalendarDays className="mr-2 h-6 w-6 text-primary" />
              {displayMessage ? "Important Message" : (userData?.role === 'Student' ? "Your Schedule (Details Coming Soon)" : "Your Weekly Recurring Schedule")}
            </CardTitle>
            {userData && <CardDescription>Role: {userData.role}</CardDescription>}
          </CardHeader>
          <CardContent>
            {displayMessage ? (
              <p className="text-lg text-center py-8 px-4 bg-secondary/30 rounded-md">{displayMessage}</p>
            ) : userData?.role === 'Student' ? (
              <div>
                <p>Your student-specific schedule view will be implemented here soon.</p>
              </div>
            ) : userData?.role === 'Teacher' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" disabled> {/* Placeholder */}
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous Week
                  </Button>
                  <p className="text-sm font-medium text-muted-foreground">{currentWeekIdentifier}</p>
                  <Button variant="outline" size="sm" disabled> {/* Placeholder */}
                    Next Week <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-px border rounded-lg p-px bg-border overflow-hidden">
                  <div className="p-2 text-xs font-medium text-muted-foreground bg-muted"></div> {/* Time header corner */}
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="font-semibold p-2 border-b border-r border-border text-center bg-muted text-sm text-foreground">
                      {day}
                    </div>
                  ))}
                  {TIME_SLOTS.map((timeSlot) => (
                    <React.Fragment key={timeSlot}>
                      <div className="font-semibold p-2 border-r border-border text-center bg-muted text-sm flex items-center justify-center text-foreground">
                        {timeSlot.replace(' - ', '\n-\n')}
                      </div>
                      {DAYS_OF_WEEK.map((day) => {
                        const slotKey = createSlotKey(day, timeSlot);
                        const scheduledClass = teacherSchedule.get(slotKey);
                        return (
                          <div
                            key={`${day}-${timeSlot}`}
                            className={cn(
                              "border-r border-b border-border min-h-[100px] bg-background p-1.5 text-xs leading-tight",
                              day === DAYS_OF_WEEK[DAYS_OF_WEEK.length -1] && "border-r-0",
                              timeSlot === TIME_SLOTS[TIME_SLOTS.length -1] && "border-b-0"
                            )}
                          >
                            {scheduledClass ? (
                              <div className="flex flex-col h-full">
                                <p className="font-semibold text-primary truncate">{scheduledClass.moduleName}</p>
                                <p className="text-muted-foreground truncate">Group: {scheduledClass.groupName}</p>
                                <p className="text-muted-foreground truncate mt-auto pt-1">@{scheduledClass.roomHall}</p>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-muted-foreground/70">
                                {/* Empty slot */}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
                {teacherSchedule.size === 0 && !isLoadingTeacherSchedule && !displayMessage && (
                    <p className="text-center text-muted-foreground py-4">You have no classes in your recurring schedule.</p>
                )}
              </div>
            ) : (
                 <p>Loading or role not applicable for this view.</p>
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

    