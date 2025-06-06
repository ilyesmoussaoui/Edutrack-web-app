
"use client";

import React, { useEffect, useState, useMemo, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collectionGroup, query, where, onSnapshot, collection, serverTimestamp, setDoc, Timestamp, orderBy, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; 
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertTriangle, LogOut, CalendarDays, ChevronLeft, ChevronRight, Info, ClipboardEdit, ListChecks, CheckSquare, BookOpen, Users as UsersIcon, AlertCircleIcon, PercentCircle, GraduationCap as GradeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface ScheduleSlotFetchedWithParentIds extends ScheduleSlotFetched {
  departmentId: string;
  yearId: string;
  specialityId: string;
}

interface ManagedGroupInfo {
  id: string; // groupId
  name: string; // groupName
  path: string; 
  departmentId: string;
  yearId: string;
  specialityId: string;
  departmentName: string;
  yearName: string;
  specialityName: string;
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

interface StudentGradeEntry {
  studentId: string;
  studentFullName: string;
  attendanceParticipationScore: string; 
  quizScore: string; 
  tdScore: number; 
  testScore: string; 
  moduleTotal: number; 
  tdError?: string;
  originalGradeDocId?: string;
  isModified?: boolean;
}

interface GradeDocument {
  studentId: string;
  groupId: string;
  moduleName: string; // Uppercase
  teacherId: string;
  attendanceParticipation?: number; // Optional for historical data
  quiz?: number; // Optional for historical data
  TD?: number; // Optional for historical data
  test?: number; // Optional for historical data
  moduleTotal?: number; // Optional for historical data
  createdAt?: any; 
  updatedAt: any; 
}

interface StudentModuleGradeInfo {
  moduleName: string;
  teacherName: string;
  teacherId: string;
  grade?: GradeDocument; // GradeDocument will now have potentially calculated moduleTotal
  isLoadingGrade: boolean; 
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

  const [teacherSchedule, setTeacherSchedule] = useState<Map<string, ScheduleSlotFetchedWithParentIds>>(new Map());
  const [isLoadingTeacherSchedule, setIsLoadingTeacherSchedule] = useState(false);
  
  const [studentSchedule, setStudentSchedule] = useState<Map<string, ScheduleSlotFetchedWithParentIds>>(new Map());
  const [isLoadingStudentSchedule, setIsLoadingStudentSchedule] = useState(false);

  const [showClassDetailsModal, setShowClassDetailsModal] = useState(false);
  const [selectedClassSlotDetails, setSelectedClassSlotDetails] = useState<ScheduleSlotFetchedWithParentIds | null>(null);
  const [selectedClassActualDate, setSelectedClassActualDate] = useState<Date | null>(null);

  const [currentDisplayDate, setCurrentDisplayDate] = useState<Date>(getStartOfWeek(new Date()));
  const [currentWeekIdentifier, setCurrentWeekIdentifier] = useState<string>(formatDateRange(getStartOfWeek(new Date())));

  const [studentsForModal, setStudentsForModal] = useState<StudentFromUserDoc[]>([]);
  const [isLoadingStudentsForModal, setIsLoadingStudentsForModal] = useState(false);
  const [studentAttendanceStates, setStudentAttendanceStates] = useState<Map<string, StudentAttendanceUIState>>(new Map());
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [currentClassInstanceId, setCurrentClassInstanceId] = useState<string | null>(null);
  
  const [myAttendanceForSelectedSlot, setMyAttendanceForSelectedSlot] = useState<AttendanceRecord | null | 'loading' | 'not_recorded'>('not_recorded');

  // States for Teacher Grades Management Tab
  const [managedGroupsList, setManagedGroupsList] = useState<ManagedGroupInfo[]>([]);
  const [isLoadingManagedGroups, setIsLoadingManagedGroups] = useState(false);
  const [selectedGroupForGrading, setSelectedGroupForGrading] = useState<ManagedGroupInfo | null>(null);
  const [availableModulesForSelectedGroup, setAvailableModulesForSelectedGroup] = useState<string[]>([]);
  const [isLoadingModulesForGroup, setIsLoadingModulesForGroup] = useState(false);
  const [selectedModuleForGrading, setSelectedModuleForGrading] = useState<string | null>(null);
  const [studentsForGrading, setStudentsForGrading] = useState<StudentGradeEntry[]>([]);
  const [isLoadingStudentsForGrading, setIsLoadingStudentsForGrading] = useState(false);
  const [isSavingGrades, setIsSavingGrades] = useState(false);

  // States for Student "My Grades" Tab
  const [studentModulesWithGrades, setStudentModulesWithGrades] = useState<StudentModuleGradeInfo[]>([]);
  const [isLoadingStudentModuleGrades, setIsLoadingStudentModuleGrades] = useState(false);
  const [showStudentGradeDetailsModal, setShowStudentGradeDetailsModal] = useState(false);
  const [selectedModuleForGradeDetails, setSelectedModuleForGradeDetails] = useState<StudentModuleGradeInfo | null>(null);


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
      setManagedGroupsList([]);
      setSelectedGroupForGrading(null);
      setAvailableModulesForSelectedGroup([]);
      setSelectedModuleForGrading(null);
      setStudentsForGrading([]);
      setStudentModulesWithGrades([]);
      setSelectedModuleForGradeDetails(null);


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

  useEffect(() => {
    if (userData?.role === 'Teacher' && currentUser && !displayMessage) {
      setIsLoadingTeacherSchedule(true);
      setTeacherSchedule(new Map());

      const scheduleQuery = query(
        collectionGroup(db, 'schedule'),
        where('teacherId', '==', currentUser.uid)
      );

      const unsubscribeSchedule = onSnapshot(scheduleQuery, (snapshot) => {
        const newSchedule = new Map<string, ScheduleSlotFetchedWithParentIds>();
        let hasAssignments = false;
        snapshot.docs.forEach((docSnap) => {
          const pathSegments = docSnap.ref.path.split('/');
          if (pathSegments.length >= 8) { 
            const slotData = { 
              id: docSnap.id, 
              ...docSnap.data(),
              departmentId: pathSegments[1],
              yearId: pathSegments[3],
              specialityId: pathSegments[5],
              groupId: pathSegments[7] 
            } as ScheduleSlotFetchedWithParentIds;
            const slotKey = createSlotKey(slotData.day, slotData.time);
            newSchedule.set(slotKey, slotData);
            hasAssignments = true;
          }
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
        const newSchedule = new Map<string, ScheduleSlotFetchedWithParentIds>();
        let groupHasSchedule = false;
        snapshot.docs.forEach((docSnap) => {
          const pathSegments = docSnap.ref.path.split('/');
          if (pathSegments.length >= 8) {
            const slotData = { 
              id: docSnap.id, 
              ...docSnap.data(),
              departmentId: pathSegments[1],
              yearId: pathSegments[3],
              specialityId: pathSegments[5],
              groupId: pathSegments[7]
            } as ScheduleSlotFetchedWithParentIds;
            const slotKey = createSlotKey(slotData.day, slotData.time);
            newSchedule.set(slotKey, slotData);
            groupHasSchedule = true;
          }
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

  useEffect(() => {
    if (userData?.role !== 'Teacher' || teacherSchedule.size === 0) {
      setManagedGroupsList([]);
      setSelectedGroupForGrading(null);
      return;
    }

    const processGroups = async () => {
      setIsLoadingManagedGroups(true);
      const uniqueGroupsMap = new Map<string, Omit<ManagedGroupInfo, 'path' | 'departmentName' | 'yearName' | 'specialityName'>>();

      teacherSchedule.forEach(slot => {
        if (!uniqueGroupsMap.has(slot.groupId) && slot.departmentId && slot.yearId && slot.specialityId) {
          uniqueGroupsMap.set(slot.groupId, {
            id: slot.groupId,
            name: slot.groupName,
            departmentId: slot.departmentId,
            yearId: slot.yearId,
            specialityId: slot.specialityId,
          });
        }
      });

      const groupsWithPaths: ManagedGroupInfo[] = [];
      for (const groupCandidate of uniqueGroupsMap.values()) {
        try {
          const deptDocRef = doc(db, "departments", groupCandidate.departmentId);
          const yearDocRef = doc(db, "departments", groupCandidate.departmentId, "years", groupCandidate.yearId);
          const specDocRef = doc(db, "departments", groupCandidate.departmentId, "years", groupCandidate.yearId, "specialities", groupCandidate.specialityId);

          const [deptSnap, yearSnap, specSnap] = await Promise.all([
            getDoc(deptDocRef),
            getDoc(yearDocRef),
            getDoc(specDocRef)
          ]);

          const deptName = deptSnap.exists() ? deptSnap.data().name : "Unknown Department";
          const yearName = yearSnap.exists() ? yearSnap.data().name : "Unknown Year";
          const specName = specSnap.exists() ? specSnap.data().name : "Unknown Speciality";
          
          const path = `Dept: ${deptName}, Year: ${yearName}, Spec: ${specName}, Group: ${groupCandidate.name}`;
          
          groupsWithPaths.push({
            ...groupCandidate,
            departmentName: deptName,
            yearName: yearName,
            specialityName: specName,
            path,
          });

        } catch (err) {
          console.error(`Error fetching path for group ${groupCandidate.id}:`, err);
          toast({ variant: "destructive", title: "Path Error", description: `Could not fetch full path for group ${groupCandidate.name}. Some details might be missing.`});
          groupsWithPaths.push({ 
            ...groupCandidate,
            departmentName: "Error", yearName: "Error", specialityName: "Error",
            path: `Group: ${groupCandidate.name} (Error fetching full path)`,
          });
        }
      }
      
      groupsWithPaths.sort((a, b) => a.path.localeCompare(b.path));
      setManagedGroupsList(groupsWithPaths);
      setIsLoadingManagedGroups(false);
    };

    processGroups();
  }, [teacherSchedule, userData?.role, toast]);

  useEffect(() => {
    if (!selectedGroupForGrading || !currentUser || teacherSchedule.size === 0) {
      setAvailableModulesForSelectedGroup([]);
      setSelectedModuleForGrading(null);
      return;
    }
  
    setIsLoadingModulesForGroup(true);
    const modules = new Set<string>();
  
    teacherSchedule.forEach(slot => {
      if (slot.groupId === selectedGroupForGrading.id && slot.teacherId === currentUser.uid && slot.moduleName) {
        modules.add(slot.moduleName);
      }
    });
  
    const sortedModules = Array.from(modules).sort((a, b) => a.localeCompare(b));
    setAvailableModulesForSelectedGroup(sortedModules);
  
    if (selectedModuleForGrading && !sortedModules.includes(selectedModuleForGrading)) {
      setSelectedModuleForGrading(null); 
    }
  
    setIsLoadingModulesForGroup(false);
  }, [selectedGroupForGrading, teacherSchedule, currentUser, selectedModuleForGrading]);

  useEffect(() => {
    if (!selectedGroupForGrading || !selectedModuleForGrading || !currentUser) {
      setStudentsForGrading([]);
      return;
    }

    const fetchStudentsAndGrades = async () => {
      setIsLoadingStudentsForGrading(true);
      setStudentsForGrading([]);
      try {
        const studentsQuery = query(
          collection(db, "users"),
          where("assignedGroupId", "==", selectedGroupForGrading.id),
          where("role", "==", "Student"),
          orderBy("fullName")
        );
        const studentDocsSnap = await getDocs(studentsQuery);
        
        const studentList = studentDocsSnap.docs.map(sDoc => {
          const studentData = sDoc.data() as StudentFromUserDoc;
          return {
            studentId: sDoc.id,
            studentFullName: studentData.fullName,
            attendanceParticipationScore: '',
            quizScore: '',
            tdScore: 0,
            testScore: '',
            moduleTotal: 0,
            isModified: false,
          } as StudentGradeEntry;
        });

        const gradesQuery = query(
          collection(db, "grades"),
          where("groupId", "==", selectedGroupForGrading.id),
          where("moduleName", "==", selectedModuleForGrading.toUpperCase()),
          where("teacherId", "==", currentUser.uid),
          where("studentId", "in", studentList.length > 0 ? studentList.map(s => s.studentId) : ["dummyIdToPreventEmptyInError"])
        );
        const gradesSnap = await getDocs(gradesQuery);
        const existingGradesMap = new Map<string, {data: GradeDocument, id: string}>();
        gradesSnap.forEach(gradeDoc => {
          existingGradesMap.set(gradeDoc.data().studentId, {data: gradeDoc.data() as GradeDocument, id: gradeDoc.id});
        });
        
        const studentsWithPopulatedGrades = studentList.map(student => {
          const existingGrade = existingGradesMap.get(student.studentId);
          if (existingGrade) {
            const testScoreNum = existingGrade.data.test ?? 0;
            const tdScoreNum = existingGrade.data.TD ?? 0;
            const moduleTotalNum = existingGrade.data.moduleTotal ?? parseFloat(((testScoreNum * 0.6) + (tdScoreNum * 0.4)).toFixed(2));
            return {
              ...student,
              attendanceParticipationScore: String(existingGrade.data.attendanceParticipation ?? ''),
              quizScore: String(existingGrade.data.quiz ?? ''),
              tdScore: tdScoreNum,
              testScore: String(testScoreNum),
              moduleTotal: moduleTotalNum,
              originalGradeDocId: existingGrade.id,
              isModified: false, 
            };
          }
          return student;
        });

        setStudentsForGrading(studentsWithPopulatedGrades);

      } catch (err: any) {
        console.error("Error fetching students or grades:", err);
        toast({
          variant: "destructive",
          title: "Data Loading Error",
          description: `Could not load students or grades for ${selectedGroupForGrading.name} / ${selectedModuleForGrading}: ${err.message}`,
        });
      } finally {
        setIsLoadingStudentsForGrading(false);
      }
    };

    fetchStudentsAndGrades();
  }, [selectedGroupForGrading, selectedModuleForGrading, currentUser, toast]);

  useEffect(() => {
    if (userData?.role === 'Student' && userData.assignedGroupId && currentUser && studentSchedule.size > 0) {
        const fetchStudentGrades = async () => {
            setIsLoadingStudentModuleGrades(true);
            const uniqueModulesMap = new Map<string, { moduleName: string; teacherId: string; teacherName: string }>();
            
            studentSchedule.forEach(slot => {
                const key = `${slot.moduleName}-${slot.teacherId}`;
                if (!uniqueModulesMap.has(key)) {
                    uniqueModulesMap.set(key, {
                        moduleName: slot.moduleName,
                        teacherId: slot.teacherId,
                        teacherName: slot.teacherName,
                    });
                }
            });

            const moduleGradePromises = Array.from(uniqueModulesMap.values()).map(async (moduleInfo) => {
                const gradeQuery = query(
                    collection(db, "grades"),
                    where("studentId", "==", currentUser.uid),
                    where("groupId", "==", userData.assignedGroupId!),
                    where("moduleName", "==", moduleInfo.moduleName.toUpperCase()),
                    where("teacherId", "==", moduleInfo.teacherId)
                );
                const gradeSnap = await getDocs(gradeQuery);
                
                let processedGradeData: GradeDocument | undefined = undefined;
                if (!gradeSnap.empty) {
                    const rawGrade = gradeSnap.docs[0].data() as GradeDocument;
                    let calculatedModuleTotal: number | undefined = undefined;

                    if (typeof rawGrade.moduleTotal === 'number') {
                        calculatedModuleTotal = rawGrade.moduleTotal;
                    } else {
                        const testScoreIsNum = typeof rawGrade.test === 'number';
                        const tdScoreIsNum = typeof rawGrade.TD === 'number';
                        if (testScoreIsNum || tdScoreIsNum) { 
                            const testVal = rawGrade.test ?? 0;
                            const tdVal = rawGrade.TD ?? 0;
                            calculatedModuleTotal = parseFloat(((testVal * 0.6) + (tdVal * 0.4)).toFixed(2));
                        }
                    }
                    processedGradeData = {
                        ...rawGrade,
                        moduleTotal: calculatedModuleTotal,
                    };
                }
                return { ...moduleInfo, grade: processedGradeData, isLoadingGrade: false };
            });

            try {
                const results = await Promise.all(moduleGradePromises);
                results.sort((a,b) => a.moduleName.localeCompare(b.moduleName));
                setStudentModulesWithGrades(results);
            } catch (err: any) {
                console.error("Error fetching student grades:", err);
                toast({ variant: "destructive", title: "Grades Error", description: `Could not load your grades: ${err.message}` });
            } finally {
                setIsLoadingStudentModuleGrades(false);
            }
        };
        fetchStudentGrades();
    } else {
        setStudentModulesWithGrades([]);
    }
  }, [studentSchedule, userData, currentUser, toast]);


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
  
 const handleSlotClick = async (slotData: ScheduleSlotFetchedWithParentIds, dayOfWeek: string) => {
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
        if (!slotData?.groupId) {
          console.error("Error in handleSlotClick (Teacher): slotData.groupId is missing.", slotData);
          toast({ variant: "destructive", title: "Configuration Error", description: "The selected class slot is missing group information. Cannot load students." });
          setIsLoadingStudentsForModal(false); 
          return; 
        }

        const studentsQuery = query(collection(db, 'users'), where('assignedGroupId', '==', slotData.groupId), where('role', '==', 'Student'), orderBy('fullName'));
        const studentDocsSnap = await getDocs(studentsQuery);
        const fetchedStudents = studentDocsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StudentFromUserDoc));
        setStudentsForModal(fetchedStudents);

        const newAttendanceStates = new Map<string, StudentAttendanceUIState>();
        if (fetchedStudents.length > 0 && currentUser.uid) {
            const attendanceRecordsQuery = query(
                collection(db, 'attendances'), 
                where('classInstanceId', '==', classInstanceIdGenerated),
                where('teacherId', '==', currentUser.uid) 
            );
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
        let description = `Could not load student data or attendance: ${err.message || 'Unknown error'}.`;
        if (err.code === 'permission-denied') {
            description = "Permission denied. Check Firestore rules or ensure necessary indexes exist.";
        } else if (err.message && err.message.toLowerCase().includes('index')) {
            description = "A Firestore index might be missing or inactive. Check console for link.";
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

 const handleGradeChange = (studentId: string, field: keyof Pick<StudentGradeEntry, 'attendanceParticipationScore' | 'quizScore' | 'testScore'>, value: string) => {
    setStudentsForGrading(prevStudents =>
      prevStudents.map(student => {
        if (student.studentId === studentId) {
          let numericValue = parseFloat(value);
          const updatedStudent = { ...student, isModified: true, tdError: undefined };

          let stringValue = value; 

          if (field === 'attendanceParticipationScore') {
            if (isNaN(numericValue)) { /* allow empty string */ } else numericValue = Math.max(0, Math.min(8, numericValue));
            stringValue = value === '' ? '' : (isNaN(numericValue) ? student.attendanceParticipationScore : String(numericValue));
            updatedStudent.attendanceParticipationScore = stringValue;
          } else if (field === 'quizScore') {
            if (isNaN(numericValue)) { /* allow empty string */ } else numericValue = Math.max(0, Math.min(12, numericValue));
            stringValue = value === '' ? '' : (isNaN(numericValue) ? student.quizScore : String(numericValue));
            updatedStudent.quizScore = stringValue;
          } else if (field === 'testScore') {
            if (isNaN(numericValue)) { /* allow empty string */ } else numericValue = Math.max(0, Math.min(20, numericValue));
            stringValue = value === '' ? '' : (isNaN(numericValue) ? student.testScore : String(numericValue));
            updatedStudent.testScore = stringValue;
          }
          
          const apScoreNum = parseFloat(updatedStudent.attendanceParticipationScore) || 0;
          const qScoreNum = parseFloat(updatedStudent.quizScore) || 0;
          updatedStudent.tdScore = Math.min(20, apScoreNum + qScoreNum);

          if (apScoreNum + qScoreNum > 20) {
            updatedStudent.tdError = "Total TD (A&P + Quiz) cannot exceed 20. Please adjust scores.";
          }
          
          const currentTestScoreNum = parseFloat(updatedStudent.testScore) || 0;
          updatedStudent.moduleTotal = parseFloat(((currentTestScoreNum * 0.6) + (updatedStudent.tdScore * 0.4)).toFixed(2));
          
          return updatedStudent;
        }
        return student;
      })
    );
  };

  const handleSaveGrades = async () => {
    if (!currentUser || !selectedGroupForGrading || !selectedModuleForGrading) {
      toast({ variant: "destructive", title: "Error", description: "Missing group or module selection." });
      return;
    }

    const studentsWithTdErrors = studentsForGrading.filter(s => s.tdError);
    if (studentsWithTdErrors.length > 0) {
      toast({ variant: "destructive", title: "Validation Error", description: "Cannot save. One or more students have TD scores exceeding 20. Please correct them."});
      return;
    }

    setIsSavingGrades(true);
    const batch = writeBatch(db);

    try {
      studentsForGrading.forEach(student => {
        if (!student.isModified && student.originalGradeDocId) return; 

        const ap = parseFloat(student.attendanceParticipationScore) || 0;
        const quiz = parseFloat(student.quizScore) || 0;
        const test = parseFloat(student.testScore) || 0;
        
        const gradeData: Omit<GradeDocument, 'createdAt' | 'moduleTotal'> & { createdAt?: any, updatedAt: any, moduleTotal: number } = {
          studentId: student.studentId,
          groupId: selectedGroupForGrading.id,
          moduleName: selectedModuleForGrading.toUpperCase(),
          teacherId: currentUser.uid,
          attendanceParticipation: ap,
          quiz: quiz,
          TD: student.tdScore,
          test: test,
          moduleTotal: student.moduleTotal, // Ensure moduleTotal is included
          updatedAt: serverTimestamp(),
        };

        let docRef;
        if (student.originalGradeDocId) {
          docRef = doc(db, "grades", student.originalGradeDocId);
          batch.update(docRef, gradeData);
        } else {
          const newGradeDocId = `${student.studentId}_${selectedGroupForGrading!.id}_${selectedModuleForGrading!.toUpperCase()}_${currentUser!.uid}`;
          docRef = doc(db, "grades", newGradeDocId);
          gradeData.createdAt = serverTimestamp();
          batch.set(docRef, gradeData as GradeDocument);
        }
      });

      await batch.commit();
      toast({ title: "Success", description: "Grades saved successfully." });
      
      setStudentsForGrading(prev => prev.map(s => ({ ...s, isModified: false })));
      
      const currentModule = selectedModuleForGrading;
      setSelectedModuleForGrading(null); 
      setTimeout(() => setSelectedModuleForGrading(currentModule), 0);


    } catch (err: any) {
      console.error("Error saving grades:", err);
      toast({ variant: "destructive", title: "Save Error", description: `Could not save grades: ${err.message}` });
    } finally {
      setIsSavingGrades(false);
    }
  };
  
  const canSaveGrades = !isLoadingStudentsForGrading && !isSavingGrades && studentsForGrading.length > 0 && !studentsForGrading.some(s => s.tdError);

  const handleStudentModuleClick = (moduleInfo: StudentModuleGradeInfo) => {
    setSelectedModuleForGradeDetails(moduleInfo);
    setShowStudentGradeDetailsModal(true);
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

        {userData?.role === 'Teacher' && (
          displayMessage ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="mr-2 h-6 w-6 text-primary" />
                  Important Message
                </CardTitle>
                 {userData && <CardDescription>Role: {userData.role}</CardDescription>}
              </CardHeader>
              <CardContent>
                <p className="text-lg text-center py-8 px-4 bg-secondary/30 rounded-md">{displayMessage}</p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="schedule" className="w-full space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="schedule">Weekly Schedule &amp; Attendance</TabsTrigger>
                <TabsTrigger value="grades">Grades Management</TabsTrigger>
              </TabsList>
              <TabsContent value="schedule">
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
                                  <p className="text-muted-foreground truncate">Group: {scheduledClass.groupName}</p>
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
                  {currentScheduleMap.size === 0 && !isLoadingTeacherSchedule && (
                      <p className="text-center text-muted-foreground py-4">You have no classes in your recurring schedule for this week.</p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="grades">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                        <ListChecks className="mr-2 h-5 w-5 text-primary" />Grades Management
                    </CardTitle>
                    <CardDescription>Select a group, then a module to manage student grades.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingManagedGroups ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
                        <p className="text-muted-foreground">Loading your groups...</p>
                      </div>
                    ) : managedGroupsList.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No groups found in your teaching schedule for grade management.</p>
                    ) : (
                      <div className="space-y-3">
                        <h3 className="text-md font-medium text-foreground mb-2">Your Groups:</h3>
                        <ScrollArea className="h-[200px] pr-3">
                          {managedGroupsList.map(group => (
                            <Card 
                              key={group.id} 
                              className={cn(
                                "mb-2 cursor-pointer hover:shadow-md transition-shadow",
                                selectedGroupForGrading?.id === group.id && "ring-2 ring-primary bg-primary/5"
                              )}
                              onClick={() => {
                                setSelectedGroupForGrading(group);
                                setSelectedModuleForGrading(null); 
                                setStudentsForGrading([]);
                              }}
                            >
                              <CardContent className="p-3">
                                <p className="font-semibold text-primary-focus">{group.name}</p>
                                <p className="text-xs text-muted-foreground">{group.path}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </ScrollArea>
                      </div>
                    )}

                    {selectedGroupForGrading && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-md font-semibold text-foreground mb-2">
                          Select Module for <span className="text-primary">{selectedGroupForGrading.name}</span>
                        </h4>
                        {isLoadingModulesForGroup ? (
                          <div className="flex items-center text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading modules...
                          </div>
                        ) : availableModulesForSelectedGroup.length > 0 ? (
                          <div className="max-w-sm space-y-2">
                            <Label htmlFor="module-select-grading">Module</Label>
                            <Select
                              value={selectedModuleForGrading || ""}
                              onValueChange={(value) => {
                                setSelectedModuleForGrading(value === "" ? null : value);
                                setStudentsForGrading([]);
                              }}
                            >
                              <SelectTrigger id="module-select-grading">
                                <SelectValue placeholder="Select a module" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableModulesForSelectedGroup.map(moduleName => (
                                  <SelectItem key={moduleName} value={moduleName}>
                                    {moduleName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No modules found taught by you in this group.</p>
                        )}

                        {selectedModuleForGrading && (
                          <div className="mt-6 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                              <ClipboardEdit className="mr-2 h-5 w-5 text-primary" />
                              Grade Entry for <span className="text-primary ml-1">{selectedModuleForGrading}</span>
                            </h3>
                            {isLoadingStudentsForGrading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary"/>
                                    <p className="text-muted-foreground">Loading students for {selectedGroupForGrading.name}...</p>
                                </div>
                            ) : studentsForGrading.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">No students found in this group.</p>
                            ) : (
                                <div className="space-y-4">
                                  <ScrollArea className="h-[400px] pr-3">
                                      {studentsForGrading.map((student) => (
                                          <Card key={student.studentId} className="p-4 mb-3">
                                              <CardTitle className="text-md mb-3 flex items-center">
                                                <UsersIcon className="mr-2 h-5 w-5 text-muted-foreground" /> 
                                                {student.studentFullName}
                                              </CardTitle>
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                                  <div className="space-y-1">
                                                      <Label htmlFor={`ap-${student.studentId}`}>Attendance &amp; Participation (Max: 8)</Label>
                                                      <Input 
                                                          type="number" 
                                                          id={`ap-${student.studentId}`} 
                                                          value={student.attendanceParticipationScore}
                                                          onChange={(e) => handleGradeChange(student.studentId, 'attendanceParticipationScore', e.target.value)}
                                                          min="0" max="8" step="0.25"
                                                          placeholder="Score /8"
                                                          disabled={isSavingGrades}
                                                      />
                                                  </div>
                                                  <div className="space-y-1">
                                                      <Label htmlFor={`quiz-${student.studentId}`}>Quiz (Max: 12)</Label>
                                                      <Input 
                                                          type="number" 
                                                          id={`quiz-${student.studentId}`} 
                                                          value={student.quizScore}
                                                          onChange={(e) => handleGradeChange(student.studentId, 'quizScore', e.target.value)}
                                                          min="0" max="12" step="0.25"
                                                          placeholder="Score /12"
                                                          disabled={isSavingGrades}
                                                      />
                                                  </div>
                                                   <div className="space-y-1">
                                                      <Label htmlFor={`td-${student.studentId}`}>TD Score (A&amp;P + Quiz, Max: 20)</Label>
                                                      <Input 
                                                          type="number" 
                                                          id={`td-${student.studentId}`} 
                                                          value={student.tdScore} 
                                                          readOnly 
                                                          disabled
                                                          className={cn("bg-muted/50", student.tdError && "border-destructive text-destructive focus-visible:ring-destructive")}
                                                      />
                                                      {student.tdError && (
                                                          <p className="text-xs text-destructive mt-1 flex items-center">
                                                              <AlertCircleIcon className="h-3 w-3 mr-1" />{student.tdError}
                                                          </p>
                                                      )}
                                                  </div>
                                                  <div className="space-y-1">
                                                      <Label htmlFor={`test-${student.studentId}`}>Test (Max: 20)</Label>
                                                      <Input 
                                                          type="number" 
                                                          id={`test-${student.studentId}`} 
                                                          value={student.testScore}
                                                          onChange={(e) => handleGradeChange(student.studentId, 'testScore', e.target.value)}
                                                          min="0" max="20" step="0.25"
                                                          placeholder="Score /20"
                                                          disabled={isSavingGrades}
                                                      />
                                                  </div>
                                                  <div className="space-y-1 md:col-start-2">
                                                      <Label htmlFor={`moduletotal-${student.studentId}`}>Module Total (Test*0.6 + TD*0.4)</Label>
                                                      <Input 
                                                          type="number" 
                                                          id={`moduletotal-${student.studentId}`} 
                                                          value={student.moduleTotal.toFixed(2)} 
                                                          readOnly 
                                                          disabled
                                                          className="bg-muted/50 font-semibold"
                                                      />
                                                  </div>
                                              </div>
                                          </Card>
                                      ))}
                                  </ScrollArea>
                                  <div className="mt-6 flex justify-end">
                                      <Button onClick={handleSaveGrades} disabled={!canSaveGrades}>
                                          {isSavingGrades ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ClipboardEdit className="mr-2 h-4 w-4"/>} 
                                          Save All Grades
                                      </Button>
                                  </div>
                                </div>
                            )}
                          </div>
                        )}
                        {!selectedModuleForGrading && selectedGroupForGrading && availableModulesForSelectedGroup.length > 0 && !isLoadingModulesForGroup && (
                            <p className="text-sm text-muted-foreground mt-4">Please select a module to proceed.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )
        )}

        {userData?.role === 'Student' && userData.assignedGroupId && (
          displayMessage ? (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Info className="mr-2 h-6 w-6 text-primary" /> Important Message
                    </CardTitle>
                    {userData && <CardDescription>Role: {userData.role}</CardDescription>}
                </CardHeader>
                <CardContent>
                    <p className="text-lg text-center py-8 px-4 bg-secondary/30 rounded-md">{displayMessage}</p>
                </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="schedule" className="w-full space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="schedule">My Schedule</TabsTrigger>
                    <TabsTrigger value="grades">My Grades</TabsTrigger>
                </TabsList>
                <TabsContent value="schedule">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <CalendarDays className="mr-2 h-6 w-6 text-primary" />
                                Your Weekly Schedule
                            </CardTitle>
                            {userData && <CardDescription>Group: {studentSchedule.values().next().value?.groupName || 'Loading group...'}</CardDescription>}
                        </CardHeader>
                        <CardContent>
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
                                                <p className="text-muted-foreground truncate">Teacher: {scheduledClass.teacherName}</p>
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
                                {currentScheduleMap.size === 0 && !isLoadingStudentSchedule && (
                                    <p className="text-center text-muted-foreground py-4">You have no classes in your recurring schedule for this week.</p>
                                )}
                                </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="grades">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <GradeIcon className="mr-2 h-6 w-6 text-primary" /> My Grades
                            </CardTitle>
                            <CardDescription>View your grades for different modules. Click on a module for details.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingStudentModuleGrades ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                                    <p className="text-muted-foreground">Loading your grades...</p>
                                </div>
                            ) : studentModulesWithGrades.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">No modules or grades found for your program yet.</p>
                            ) : (
                                <ScrollArea className="h-[400px] pr-3">
                                    <div className="space-y-3">
                                        {studentModulesWithGrades.map((moduleGradeInfo, index) => (
                                            <Card 
                                                key={`${moduleGradeInfo.moduleName}-${moduleGradeInfo.teacherId}-${index}`} 
                                                className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                                                onClick={() => handleStudentModuleClick(moduleGradeInfo)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-lg text-primary">{moduleGradeInfo.moduleName}</h4>
                                                        <p className="text-sm text-muted-foreground">Taught by: {moduleGradeInfo.teacherName}</p>
                                                    </div>
                                                    {moduleGradeInfo.grade ? (
                                                        typeof moduleGradeInfo.grade.moduleTotal === 'number' ? (
                                                             <div className="text-right">
                                                                <p className="text-xl font-bold text-foreground">{moduleGradeInfo.grade.moduleTotal.toFixed(2)} <span className="text-xs text-muted-foreground">/ 20</span></p>
                                                                <p className="text-xs text-muted-foreground">Module Total</p>
                                                            </div>
                                                        ) : (
                                                            <div className="text-right">
                                                                <p className="text-sm text-muted-foreground italic">Total grade not available</p>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">Grades not yet recorded</p>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
          )
        )}
        
        {!isLoadingUser && !error && !displayMessage && 
         !(userData?.role === 'Teacher') && 
         !(userData?.role === 'Student' && userData?.assignedGroupId) && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Info className="mr-2 h-6 w-6 text-primary" />
                        Dashboard Information
                    </CardTitle>
                    {userData && <CardDescription>Role: {userData.role}</CardDescription>}
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-4">
                        {isLoadingUser ? "Loading..." : "Dashboard content is not applicable for your current role or status."}
                    </p>
                </CardContent>
            </Card>
        )}


        {/* Teacher: Class Details & Attendance Modal */}
        {selectedClassSlotDetails && userData?.role === 'Teacher' && (
          <Dialog open={showClassDetailsModal} onOpenChange={setShowClassDetailsModal}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Class Details &amp; Attendance</DialogTitle>
                 <DialogDescription>
                  {selectedClassSlotDetails.moduleName} - Group: {selectedClassSlotDetails.groupName}
                  <br/>
                  Date: {selectedClassActualDate?.toLocaleDateString()} at {selectedClassSlotDetails.time} <br/>
                  Location: {selectedClassSlotDetails.roomHall}
                </DialogDescription>
              </DialogHeader>
              
              {isLoadingStudentsForModal ? <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin"/></div> :
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
              }
              
              <DialogFooter className="mt-auto pt-4 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSavingAttendance}>Close</Button>
                </DialogClose>
                {studentsForModal.length > 0 && (
                  <Button onClick={handleSaveAttendance} disabled={isSavingAttendance || isLoadingStudentsForModal || studentAttendanceStates.size === 0}>
                    {isSavingAttendance ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save Attendance
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Student: Class Details & Own Attendance Modal */}
        {selectedClassSlotDetails && userData?.role === 'Student' && (
          <Dialog open={showClassDetailsModal} onOpenChange={setShowClassDetailsModal}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Class Details</DialogTitle>
                 <DialogDescription>
                  {selectedClassSlotDetails.moduleName} - Teacher: {selectedClassSlotDetails.teacherName}
                  <br/>
                  Date: {selectedClassActualDate?.toLocaleDateString()} at {selectedClassSlotDetails.time} <br/>
                  Location: {selectedClassSlotDetails.roomHall}
                </DialogDescription>
              </DialogHeader>
              
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
              
              <DialogFooter className="mt-auto pt-4 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Student: Detailed Grade Modal */}
        {selectedModuleForGradeDetails && userData?.role === 'Student' && (
          <Dialog open={showStudentGradeDetailsModal} onOpenChange={(isOpen) => {
            setShowStudentGradeDetailsModal(isOpen);
            if (!isOpen) setSelectedModuleForGradeDetails(null);
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">Grade Details: {selectedModuleForGradeDetails.moduleName}</DialogTitle>
                <DialogDescription>Taught by: {selectedModuleForGradeDetails.teacherName}</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3">
                {selectedModuleForGradeDetails.grade ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Attendance &amp; Participation:</span>
                      <span className="font-medium text-foreground">{(selectedModuleForGradeDetails.grade.attendanceParticipation ?? 0).toFixed(2)} / 8.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Quiz:</span>
                      <span className="font-medium text-foreground">{(selectedModuleForGradeDetails.grade.quiz ?? 0).toFixed(2)} / 12.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">TD Score (Calculated):</span>
                      <span className="font-medium text-foreground">{(selectedModuleForGradeDetails.grade.TD ?? 0).toFixed(2)} / 20.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Test Score:</span>
                      <span className="font-medium text-foreground">{(selectedModuleForGradeDetails.grade.test ?? 0).toFixed(2)} / 20.00</span>
                    </div>
                    <div className="border-t my-2"></div>
                    <div className="flex justify-between items-center text-lg">
                      <strong className="text-primary">Module Total:</strong>
                      <strong className="text-primary">
                        {typeof selectedModuleForGradeDetails.grade.moduleTotal === 'number' 
                          ? selectedModuleForGradeDetails.grade.moduleTotal.toFixed(2) 
                          : 'N/A'}{' '}
                        / 20.00
                      </strong>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-6">Grades for this module have not been recorded yet.</p>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
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

