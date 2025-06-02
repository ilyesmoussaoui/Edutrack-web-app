
"use client";

import React, { useEffect, useState, useMemo, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collectionGroup, query, where, onSnapshot, collection, serverTimestamp, setDoc, Timestamp, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; 
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, LogOut, CalendarDays, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';


interface UserData {
  uid: string;
  fullName: string;
  email: string;
  role: 'Student' | 'Teacher' | string;
  assignedGroupId?: string;
}

interface StudentFromUserDoc {
  uid: string;
  fullName: string;
  email: string;
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

interface StudentAttendanceUIState {
  studentId: string;
  studentName: string;
  status: 'Present' | 'Absent' | 'AbsentWithJustification' | '';
  justificationNote: string;
  originalRecordExists: boolean; 
}

interface AttendanceRecord {
  studentId: string;
  classInstanceId: string; 
  groupId: string;
  teacherId: string;
  moduleName: string;
  date: Timestamp; 
  timeSlot: string;
  status: 'Present' | 'Absent' | 'AbsentWithJustification';
  justificationNote?: string;
  timestamp: Timestamp; 
}


const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const TIME_SLOTS = [
  "08:30 - 10:00",
  "10:00 - 11:30",
  "12:30 - 14:00",
  "14:00 - 15:30",
];

const createSlotKey = (day: string, time: string) => `${day}_${time.replace(/[\s:-]/g, '')}`;

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; 
  return new Date(d.setDate(diff));
};

const getDateForDayInWeek = (startDate: Date, dayName: string): Date => {
  const dayIndex = DAYS_OF_WEEK.indexOf(dayName);
  if (dayIndex === -1) throw new Error("Invalid day name");
  const newDate = new Date(startDate);
  newDate.setDate(startDate.getDate() + dayIndex);
  return newDate;
};

const formatDateRange = (startDate: Date): string => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); 
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}, ${startDate.getFullYear()}`;
};


export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
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
  const [selectedClassActualDate, setSelectedClassActualDate] = useState<Date | null>(null);

  const [currentDisplayDate, setCurrentDisplayDate] = useState<Date>(getStartOfWeek(new Date()));
  const [currentWeekIdentifier, setCurrentWeekIdentifier] = useState<string>(formatDateRange(getStartOfWeek(new Date())));

  const [studentsForModal, setStudentsForModal] = useState<StudentFromUserDoc[]>([]);
  const [isLoadingStudentsForModal, setIsLoadingStudentsForModal] = useState(false);
  const [studentAttendanceStates, setStudentAttendanceStates] = useState<Map<string, StudentAttendanceUIState>>(new Map());
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [currentClassInstanceId, setCurrentClassInstanceId] = useState<string | null>(null);
  
  const [myAttendanceForSelectedSlot, setMyAttendanceForSelectedSlot] = useState<AttendanceRecord | null | 'loading' | 'not_recorded'>('not_recorded');


  useEffect(() => {
    setCurrentWeekIdentifier(formatDateRange(currentDisplayDate));
  }, [currentDisplayDate]);

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
            console.log("User Data Fetched:", fetchedUserData); // Log user data including role for verification
            
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
        
        if (!hasAssignments && !isLoadingUser && !error && userData?.role === 'Teacher') { 
            setDisplayMessage('You have no classes in your recurring schedule, or please wait for admin assignment.');
        } else if (hasAssignments) {
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
  }, [userData, currentUser, displayMessage, isLoadingUser, error]);

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

        if (!groupHasSchedule && !isLoadingUser && !error && userData?.role === 'Student' && userData.assignedGroupId) {
            setDisplayMessage('Your assigned group currently has no schedule. Please check back later or contact an admin.');
        } else if (groupHasSchedule) {
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
  }, [userData, currentUser, displayMessage, isLoadingUser, error]);

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

  const handlePreviousWeek = () => {
    setCurrentDisplayDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  };

  const handleNextWeek = () => {
    setCurrentDisplayDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  };
  
  const handleSlotClick = async (slotData: ScheduleSlotFetched, dayOfWeek: string) => {
    setSelectedClassSlotDetails(slotData);
    const actualDate = getDateForDayInWeek(currentDisplayDate, dayOfWeek);
    setSelectedClassActualDate(actualDate);
    
    const classInstanceIdGenerated = `${slotData.groupId}_${slotData.day}_${slotData.time.replace(/[\s:-]/g, '')}_${actualDate.getFullYear()}${(actualDate.getMonth() + 1).toString().padStart(2, '0')}${actualDate.getDate().toString().padStart(2, '0')}`;
    setCurrentClassInstanceId(classInstanceIdGenerated);

    if (userData?.role === 'Teacher' && currentUser) {
      setIsLoadingStudentsForModal(true);
      setStudentsForModal([]);
      setStudentAttendanceStates(new Map());

      try {
        if (!slotData.groupId) {
          console.error("Error in handleSlotClick (Teacher): slotData.groupId is undefined.", slotData);
          toast({ variant: "destructive", title: "Data Integrity Error", description: "Class slot is missing group information. Cannot load students." });
          setIsLoadingStudentsForModal(false);
          setShowClassDetailsModal(true); // Keep modal open to show error
          return;
        }

        const studentsQuery = query(collection(db, 'users'), where('assignedGroupId', '==', slotData.groupId), where('role', '==', 'Student'), orderBy('fullName'));
        const studentDocsSnap = await getDocs(studentsQuery);
        const fetchedStudents = studentDocsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StudentFromUserDoc));
        setStudentsForModal(fetchedStudents);

        const newAttendanceStates = new Map<string, StudentAttendanceUIState>();
        if (fetchedStudents.length > 0) {
            const attendanceRecordsQuery = query(collection(db, 'attendances'), where('classInstanceId', '==', classInstanceIdGenerated));
            const attendanceRecordsSnap = await getDocs(attendanceRecordsQuery);
            const existingRecordsMap = new Map<string, AttendanceRecord>();
            attendanceRecordsSnap.forEach(doc => {
                const rec = doc.data() as AttendanceRecord;
                existingRecordsMap.set(rec.studentId, rec);
            });

            fetchedStudents.forEach(student => {
                const existingRec = existingRecordsMap.get(student.uid);
                newAttendanceStates.set(student.uid, {
                    studentId: student.uid,
                    studentName: student.fullName,
                    status: existingRec?.status || '',
                    justificationNote: existingRec?.justificationNote || '',
                    originalRecordExists: !!existingRec,
                });
            });
        }
        setStudentAttendanceStates(newAttendanceStates);

      } catch (err: any) {
        console.error("Error fetching students or attendance for modal:", err);
        let description = "Could not load student data or attendance. Please try again.";
        if (err.message) {
            description = `Failed to load data: ${err.message}`;
        }
        if (err.code === 'permission-denied') {
            description = "Permission denied. Check Firestore rules.";
        } else if (err.message && err.message.toLowerCase().includes('index')) {
            description = "A Firestore index might be missing or inactive.";
        }
        toast({ variant: "destructive", title: "Data Loading Error", description });
      } finally {
        setIsLoadingStudentsForModal(false);
      }
    } else if (userData?.role === 'Student' && currentUser) {
        setMyAttendanceForSelectedSlot('loading');
        try {
            const attendanceDocId = `${classInstanceIdGenerated}_${currentUser.uid}`;
            const attendanceDocRef = doc(db, "attendances", attendanceDocId);
            const docSnap = await getDoc(attendanceDocRef);
            if (docSnap.exists()) {
                setMyAttendanceForSelectedSlot(docSnap.data() as AttendanceRecord);
            } else {
                setMyAttendanceForSelectedSlot('not_recorded');
            }
        } catch (err: any) {
            console.error("Error fetching student's attendance record:", err);
            toast({variant: "destructive", title: "Attendance Error", description: `Could not load your attendance status: ${err.message}`});
            setMyAttendanceForSelectedSlot('not_recorded'); 
        }
    }
    setShowClassDetailsModal(true);
  };

  const handleAttendanceStatusChange = (studentId: string, status: StudentAttendanceUIState['status']) => {
    setStudentAttendanceStates(prev => {
      const newState = new Map(prev);
      const studentState = newState.get(studentId);
      if (studentState) {
        newState.set(studentId, { ...studentState, status, justificationNote: status !== 'AbsentWithJustification' ? '' : studentState.justificationNote });
      }
      return newState;
    });
  };

  const handleJustificationNoteChange = (studentId: string, note: string) => {
     setStudentAttendanceStates(prev => {
      const newState = new Map(prev);
      const studentState = newState.get(studentId);
      if (studentState) {
        newState.set(studentId, { ...studentState, justificationNote: note });
      }
      return newState;
    });
  };

  const handleSaveAttendance = async () => {
    if (!currentUser || !selectedClassSlotDetails || !currentClassInstanceId || !selectedClassActualDate) {
        toast({variant: "destructive", title: "Error", description: "Missing critical data to save attendance."});
        return;
    }
    setIsSavingAttendance(true);
    try {
        const batchPromises = Array.from(studentAttendanceStates.values()).map(async (studentState) => {
            if (!studentState.status) return; 

            const attendanceDocId = `${currentClassInstanceId}_${studentState.studentId}`;
            const attendanceDocRef = doc(db, "attendances", attendanceDocId);
            
            const recordData: Omit<AttendanceRecord, 'timestamp'> & { timestamp?: any } = {
                studentId: studentState.studentId,
                classInstanceId: currentClassInstanceId,
                groupId: selectedClassSlotDetails.groupId,
                teacherId: currentUser.uid,
                moduleName: selectedClassSlotDetails.moduleName,
                date: Timestamp.fromDate(selectedClassActualDate),
                timeSlot: selectedClassSlotDetails.time,
                status: studentState.status,
            };

            if (studentState.status === 'AbsentWithJustification') {
                recordData.justificationNote = studentState.justificationNote.trim();
            }
            
            await setDoc(attendanceDocRef, { ...recordData, timestamp: serverTimestamp() }, { merge: true });
        });
        await Promise.all(batchPromises);
        toast({title: "Success", description: "Attendance saved successfully."});
        setShowClassDetailsModal(false);
    } catch (err: any) {
        console.error("Error saving attendance:", err);
        toast({variant: "destructive", title: "Save Error", description: `Could not save attendance: ${err.message}`});
    } finally {
        setIsSavingAttendance(false);
    }
  };


  const mainLoading = isLoadingUser || 
                      (userData?.role === 'Teacher' && isLoadingTeacherSchedule && !displayMessage && teacherSchedule.size === 0) || 
                      (userData?.role === 'Student' && userData.assignedGroupId && isLoadingStudentSchedule && !displayMessage && studentSchedule.size === 0); 

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
            <CardHeader><CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2" /> Error</CardTitle></CardHeader>
            <CardContent><p className="text-destructive">{error}</p></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="mr-2 h-6 w-6 text-primary" />
              {displayMessage ? "Important Message" : "Your Weekly Schedule"}
            </CardTitle>
            {userData && <CardDescription>Role: {userData.role}</CardDescription>}
          </CardHeader>
          <CardContent>
            {displayMessage ? (
              <p className="text-lg text-center py-8 px-4 bg-secondary/30 rounded-md">{displayMessage}</p>
            ) : (userData?.role === 'Teacher' || (userData?.role === 'Student' && userData.assignedGroupId)) ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={handlePreviousWeek} disabled={isSavingAttendance}> 
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous Week
                  </Button>
                  <p className="text-sm font-medium text-muted-foreground">{currentWeekIdentifier}</p>
                  <Button variant="outline" size="sm" onClick={handleNextWeek} disabled={isSavingAttendance}> 
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
                            onClick={scheduledClass ? () => handleSlotClick(scheduledClass, day) : undefined}
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
                    <p className="text-center text-muted-foreground py-4">You have no classes in your recurring schedule for this week.</p>
                )}
              </div>
            ) : (
                 <p className="text-center text-muted-foreground py-4">Loading schedule or role not applicable for this view.</p>
            )}
          </CardContent>
        </Card>

        {selectedClassSlotDetails && (
          <Dialog open={showClassDetailsModal} onOpenChange={setShowClassDetailsModal}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Class Details</DialogTitle>
                 <DialogDescription>
                  {selectedClassSlotDetails.moduleName} 
                  {userData?.role === 'Teacher' && ` - Group: ${selectedClassSlotDetails.groupName}`}
                  {userData?.role === 'Student' && ` - Teacher: ${selectedClassSlotDetails.teacherName}`}
                  <br/>
                  Date: {selectedClassActualDate?.toLocaleDateString()} at {selectedClassSlotDetails.time} <br/>
                  Location: {selectedClassSlotDetails.roomHall}
                </DialogDescription>
              </DialogHeader>
              
              {userData?.role === 'Teacher' && (
                isLoadingStudentsForModal ? <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin"/></div> :
                studentsForModal.length === 0 ? <p className="text-muted-foreground text-center py-4">No students found in this group or unable to load student data.</p> :
                <ScrollArea className="flex-grow pr-4 -mr-4">
                  <div className="space-y-4 py-4">
                  {studentsForModal.map((student) => {
                    const attendanceState = studentAttendanceStates.get(student.uid);
                    if (!attendanceState) return null;
                    return (
                      <Card key={student.uid} className="p-4">
                        <p className="font-semibold mb-2">{student.fullName}</p>
                        <RadioGroup 
                          value={attendanceState.status} 
                          onValueChange={(value) => handleAttendanceStatusChange(student.uid, value as StudentAttendanceUIState['status'])}
                          className="flex flex-wrap space-x-4 mb-2"
                          disabled={isSavingAttendance}
                        >
                          <div className="flex items-center space-x-2"><RadioGroupItem value="Present" id={`${student.uid}-present`} /><Label htmlFor={`${student.uid}-present`}>Present</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="Absent" id={`${student.uid}-absent`} /><Label htmlFor={`${student.uid}-absent`}>Absent</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="AbsentWithJustification" id={`${student.uid}-just`} /><Label htmlFor={`${student.uid}-just`}>Absent w/ Justification</Label></div>
                        </RadioGroup>
                        
                        {attendanceState.status === 'AbsentWithJustification' && (
                          <div className="space-y-3 mt-3 pt-3 border-t">
                            <Label htmlFor={`${student.uid}-justification-note`}>Justification Note</Label>
                            <Textarea 
                              id={`${student.uid}-justification-note`}
                              placeholder="Reason for absence..." 
                              value={attendanceState.justificationNote}
                              onChange={(e) => handleJustificationNoteChange(student.uid, e.target.value)}
                              disabled={isSavingAttendance}
                              rows={2}
                            />
                          </div>
                        )}
                      </Card>
                    )
                  })}
                  </div>
                </ScrollArea>
              )}

              {userData?.role === 'Student' && (
                 <div className="space-y-3 py-4 text-sm border-t mt-4">
                    <h3 className="font-semibold text-base text-foreground">Your Attendance Status</h3>
                    {myAttendanceForSelectedSlot === 'loading' && (
                        <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading your attendance...</div>
                    )}
                    {myAttendanceForSelectedSlot === 'not_recorded' && (
                        <p className="text-muted-foreground">Your attendance for this class has not been recorded yet.</p>
                    )}
                    {myAttendanceForSelectedSlot && typeof myAttendanceForSelectedSlot === 'object' && (
                        <div className="space-y-1">
                            <p><strong>Student:</strong> {userData.fullName}</p>
                            <p><strong>Status:</strong> <span className={cn(
                                myAttendanceForSelectedSlot.status === 'Present' && 'text-green-600',
                                myAttendanceForSelectedSlot.status === 'Absent' && 'text-red-600',
                                myAttendanceForSelectedSlot.status === 'AbsentWithJustification' && 'text-orange-600',
                                'font-medium'
                            )}>{myAttendanceForSelectedSlot.status.replace(/([A-Z])/g, ' $1').trim()}</span></p>
                            {myAttendanceForSelectedSlot.status === 'AbsentWithJustification' && myAttendanceForSelectedSlot.justificationNote && (
                                <p><strong>Justification:</strong> {myAttendanceForSelectedSlot.justificationNote}</p>
                            )}
                        </div>
                    )}
                </div>
              )}
              
              <DialogFooter className="mt-auto pt-4 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSavingAttendance}>Close</Button>
                </DialogClose>
                {userData?.role === 'Teacher' && studentsForModal.length > 0 && (
                  <Button onClick={handleSaveAttendance} disabled={isSavingAttendance || isLoadingStudentsForModal || studentAttendanceStates.size === 0}>
                    {isSavingAttendance ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save Attendance
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        <p>Edutrack &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

