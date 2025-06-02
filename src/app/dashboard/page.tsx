
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collectionGroup, query, where, onSnapshot, type Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Loader2, AlertTriangle, LogOut, CalendarDays, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserData {
  uid: string;
  fullName: string;
  email: string;
  role: 'Student' | 'Teacher' | string;
  assignedGroupId?: string;
  // For students, potentially store denormalized path components if needed, or fetch group details separately.
}

interface ScheduleSlotFetched {
  id: string; 
  day: string;
  time: string;
  moduleName: string;
  teacherId: string;
  teacherName: string;
  roomHall: string;
  groupId: string;
  groupName: string;
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
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teacherSchedule, setTeacherSchedule] = useState<Map<string, ScheduleSlotFetched>>(new Map());
  const [isLoadingTeacherSchedule, setIsLoadingTeacherSchedule] = useState(false);
  
  const [studentSchedule, setStudentSchedule] = useState<Map<string, ScheduleSlotFetched>>(new Map());
  const [isLoadingStudentSchedule, setIsLoadingStudentSchedule] = useState(false);

  const [showClassDetailsModal, setShowClassDetailsModal] = useState(false);
  const [selectedClassSlotDetails, setSelectedClassSlotDetails] = useState<ScheduleSlotFetched | null>(null);

  const [currentWeekIdentifier, setCurrentWeekIdentifier] = useState<string>("This Week's Recurring Schedule"); 

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setIsLoadingUser(true); 
      setError(null); 
      setDisplayMessage(null);
      setTeacherSchedule(new Map()); 
      setStudentSchedule(new Map());

      if (user) {
        setCurrentUser(user);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const fetchedUserData = { uid: user.uid, ...userDocSnap.data() } as UserData;
            setUserData(fetchedUserData);
            
            if (fetchedUserData.role === 'Student' && !fetchedUserData.assignedGroupId) {
              setDisplayMessage('Please wait until the Admin assigns you to a group/program.');
            }
          } else {
            setError("User data not found. Please sign up again or contact support.");
            await signOut(auth);
            router.push('/login');
          }
        } catch (err: any) {
          console.error("Error fetching user data:", err);
          setError("Failed to load dashboard data. Please try again.");
        }
      } else {
        router.push('/login');
        setUserData(null);
        setCurrentUser(null);
      }
      setIsLoadingUser(false);
    });

    return () => unsubscribeAuth();
  }, [router]);

  // Effect for Teacher's schedule
  useEffect(() => {
    if (userData?.role === 'Teacher' && currentUser && !displayMessage) {
      setIsLoadingTeacherSchedule(true);
      setTeacherSchedule(new Map());

      const scheduleQuery = query(
        collectionGroup(db, 'schedule'),
        where('teacherId', '==', currentUser.uid)
      );

      const unsubscribeSchedule = onSnapshot(scheduleQuery, (snapshot) => {
        const newSchedule = new Map<string, ScheduleSlotFetched>();
        let hasAssignments = false;
        snapshot.forEach((docSnap) => {
          const slotData = { id: docSnap.id, ...docSnap.data() } as ScheduleSlotFetched;
          const slotKey = createSlotKey(slotData.day, slotData.time);
          newSchedule.set(slotKey, slotData);
          hasAssignments = true;
        });
        setTeacherSchedule(newSchedule);
        
        if (!hasAssignments) {
            setDisplayMessage('You have no classes in your recurring schedule, or please wait for admin assignment.');
        } else {
            setDisplayMessage(null); 
        }
        setIsLoadingTeacherSchedule(false);
      }, (err) => {
        console.error("Error fetching teacher schedule:", err);
        setError("Failed to load your schedule. Please try again.");
        setIsLoadingTeacherSchedule(false);
      });

      return () => unsubscribeSchedule();
    } else if (userData?.role !== 'Teacher') {
      setTeacherSchedule(new Map()); 
    }
  }, [userData, currentUser, displayMessage]);

  // Effect for Student's schedule
  useEffect(() => {
    if (userData?.role === 'Student' && userData.assignedGroupId && currentUser && !displayMessage) {
      setIsLoadingStudentSchedule(true);
      setStudentSchedule(new Map());

      const scheduleQuery = query(
        collectionGroup(db, 'schedule'),
        where('groupId', '==', userData.assignedGroupId)
      );
      
      const unsubscribeSchedule = onSnapshot(scheduleQuery, (snapshot) => {
        const newSchedule = new Map<string, ScheduleSlotFetched>();
        let groupHasSchedule = false;
        snapshot.forEach((docSnap) => {
          const slotData = { id: docSnap.id, ...docSnap.data() } as ScheduleSlotFetched;
          const slotKey = createSlotKey(slotData.day, slotData.time);
          newSchedule.set(slotKey, slotData);
          groupHasSchedule = true;
        });
        setStudentSchedule(newSchedule);

        if (!groupHasSchedule) {
            setDisplayMessage('Your assigned group currently has no schedule. Please check back later or contact an admin.');
        } else {
            setDisplayMessage(null);
        }
        setIsLoadingStudentSchedule(false);
      }, (err) => {
        console.error("Error fetching student schedule:", err);
        setError(`Failed to load schedule for your group. ${err.message}`);
        setIsLoadingStudentSchedule(false);
      });

      return () => unsubscribeSchedule();
    } else if (userData?.role !== 'Student' || !userData?.assignedGroupId) {
      setStudentSchedule(new Map());
    }
  }, [userData, currentUser, displayMessage]);


  const handleLogout = async () => {
    setIsLoadingUser(true);
    try {
      await signOut(auth);
      router.push('/');
    } catch (err) {
      console.error("Logout error:", err);
      setError("Failed to logout. Please try again.");
      setIsLoadingUser(false);
    }
  };
  
  const handleSlotClick = (slotData: ScheduleSlotFetched) => {
    setSelectedClassSlotDetails(slotData);
    setShowClassDetailsModal(true);
  };

  const mainLoading = isLoadingUser || 
                      (userData?.role === 'Teacher' && isLoadingTeacherSchedule && !displayMessage) ||
                      (userData?.role === 'Student' && userData.assignedGroupId && isLoadingStudentSchedule && !displayMessage);

  const currentScheduleMap = userData?.role === 'Teacher' ? teacherSchedule : studentSchedule;

  if (mainLoading && !displayMessage && !error) {
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
          <Button variant="outline" onClick={handleLogout} disabled={isLoadingUser}>
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
              {displayMessage ? "Important Message" : "Your Weekly Recurring Schedule"}
            </CardTitle>
            {userData && <CardDescription>Role: {userData.role}</CardDescription>}
          </CardHeader>
          <CardContent>
            {displayMessage ? (
              <p className="text-lg text-center py-8 px-4 bg-secondary/30 rounded-md">{displayMessage}</p>
            ) : (userData?.role === 'Teacher' || (userData?.role === 'Student' && userData.assignedGroupId)) ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" disabled> 
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous Week
                  </Button>
                  <p className="text-sm font-medium text-muted-foreground">{currentWeekIdentifier}</p>
                  <Button variant="outline" size="sm" disabled> 
                    Next Week <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-px border rounded-lg p-px bg-border overflow-hidden">
                  <div className="p-2 text-xs font-medium text-muted-foreground bg-muted"></div> 
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
                        const scheduledClass = currentScheduleMap.get(slotKey);
                        return (
                          <div
                            key={`${day}-${timeSlot}`}
                            className={cn(
                              "border-r border-b border-border min-h-[100px] bg-background p-1.5 text-xs leading-tight",
                              scheduledClass && "cursor-pointer hover:bg-accent/50 transition-colors",
                              day === DAYS_OF_WEEK[DAYS_OF_WEEK.length -1] && "border-r-0",
                              timeSlot === TIME_SLOTS[TIME_SLOTS.length -1] && "border-b-0"
                            )}
                            onClick={scheduledClass ? () => handleSlotClick(scheduledClass) : undefined}
                          >
                            {scheduledClass ? (
                              <div className="flex flex-col h-full">
                                <p className="font-semibold text-primary truncate">{scheduledClass.moduleName}</p>
                                {userData.role === 'Teacher' && <p className="text-muted-foreground truncate">Group: {scheduledClass.groupName}</p>}
                                {userData.role === 'Student' && <p className="text-muted-foreground truncate">Teacher: {scheduledClass.teacherName}</p>}
                                <p className="text-muted-foreground truncate mt-auto pt-1">@{scheduledClass.roomHall}</p>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-muted-foreground/30">
                                <Info className="h-4 w-4"/>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
                {currentScheduleMap.size === 0 && !isLoadingTeacherSchedule && !isLoadingStudentSchedule && !displayMessage && (
                    <p className="text-center text-muted-foreground py-4">You have no classes in your recurring schedule.</p>
                )}
              </div>
            ) : (
                 <p className="text-center text-muted-foreground py-4">Loading schedule or role not applicable for this view.</p>
            )}
          </CardContent>
        </Card>

        {selectedClassSlotDetails && (
          <Dialog open={showClassDetailsModal} onOpenChange={setShowClassDetailsModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Class Details</DialogTitle>
                <DialogDescription>
                  Information for the selected class slot.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4 text-sm">
                <p><strong>Module:</strong> {selectedClassSlotDetails.moduleName}</p>
                <p><strong>Teacher:</strong> {selectedClassSlotDetails.teacherName}</p>
                <p><strong>Group:</strong> {selectedClassSlotDetails.groupName}</p>
                <p><strong>Room/Hall:</strong> {selectedClassSlotDetails.roomHall}</p>
                <p><strong>Day:</strong> {selectedClassSlotDetails.day}</p>
                <p><strong>Time:</strong> {selectedClassSlotDetails.time}</p>
                <p><strong>Date:</strong> Recurring weekly ({currentWeekIdentifier.replace("This Week's Recurring Schedule", "Recurring")})</p>
              </div>
               <DialogClose asChild>
                  <Button type="button" variant="outline">Close</Button>
                </DialogClose>
            </DialogContent>
          </Dialog>
        )}

      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        <p>Data Dashboard Lite &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
