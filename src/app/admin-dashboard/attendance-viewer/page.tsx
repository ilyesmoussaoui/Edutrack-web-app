
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, orderBy, getDocs, where, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ClipboardList, AlertTriangle, Eye } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

// Interfaces (can be moved to a types file later)
interface Department { id: string; name: string; }
interface Year { id: string; name: string; }
interface Speciality { id: string; name: string; }
interface Group { id: string; name: string; } // Assuming group object structure from previous usage
interface UserData { uid: string; fullName: string; email: string; role: string; }

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

interface AttendanceRecordWithStudentName extends AttendanceRecord {
  studentFullName?: string; 
}

interface ClassInstanceSummary {
  classInstanceId: string;
  date: string; // Formatted date string
  timeSlot: string;
  moduleName: string;
  teacherFullName: string;
  rawDate: Timestamp; // For sorting
}

export default function AttendanceViewerPage() {
  const { toast } = useToast();

  const [allUsersMap, setAllUsersMap] = useState<Map<string, UserData>>(new Map());
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedSpecialityId, setSelectedSpecialityId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const [isLoadingDeps, setIsLoadingDeps] = useState(false);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  const [allAttendanceForGroup, setAllAttendanceForGroup] = useState<AttendanceRecord[]>([]);
  const [classInstanceSummaries, setClassInstanceSummaries] = useState<ClassInstanceSummary[]>([]);
  const [isLoadingClassInstances, setIsLoadingClassInstances] = useState(false);
  
  const [selectedClassInstanceForModal, setSelectedClassInstanceForModal] = useState<ClassInstanceSummary | null>(null);
  const [detailedAttendanceRecords, setDetailedAttendanceRecords] = useState<AttendanceRecordWithStudentName[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLoadingModalDetails, setIsLoadingModalDetails] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Fetch all users (students and teachers) once
  useEffect(() => {
    const fetchAllUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersMap = new Map<string, UserData>();
        usersSnapshot.forEach(doc => usersMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserData));
        setAllUsersMap(usersMap);
      } catch (err) {
        console.error("Error fetching users:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load user data." });
        setError("Could not load essential user data. Please try again.");
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchAllUsers();
  }, [toast]);

  // Cascading dropdown logic
  useEffect(() => {
    const fetchDepartments = async () => {
      setIsLoadingDeps(true);
      try {
        const q = query(collection(db, "departments"), orderBy("name"));
        const snapshot = await getDocs(q);
        setDepartments(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) { console.error(err); toast({ variant: "destructive", title: "Error", description: "Could not load departments." }); }
      finally { setIsLoadingDeps(false); }
    };
    fetchDepartments();
  }, [toast]);

  useEffect(() => {
    if (!selectedDepartmentId) { setYears([]); setSelectedYearId(''); return; }
    setIsLoadingYears(true); setYears([]); setSelectedYearId(''); setSpecialities([]); setSelectedSpecialityId(''); setGroups([]); setSelectedGroupId(''); setClassInstanceSummaries([]); setAllAttendanceForGroup([]);
    const fetchYears = async () => {
      try {
        const q = query(collection(db, "departments", selectedDepartmentId, "years"), orderBy("name"));
        const snapshot = await getDocs(q);
        setYears(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) { console.error(err); toast({ variant: "destructive", title: "Error", description: "Could not load years." }); }
      finally { setIsLoadingYears(false); }
    };
    fetchYears();
  }, [selectedDepartmentId, toast]);

  useEffect(() => {
    if (!selectedYearId) { setSpecialities([]); setSelectedSpecialityId(''); return; }
    setIsLoadingSpecs(true); setSpecialities([]); setSelectedSpecialityId(''); setGroups([]); setSelectedGroupId(''); setClassInstanceSummaries([]); setAllAttendanceForGroup([]);
    const fetchSpecialities = async () => {
      try {
        const q = query(collection(db, "departments", selectedDepartmentId, "years", selectedYearId, "specialities"), orderBy("name"));
        const snapshot = await getDocs(q);
        setSpecialities(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) { console.error(err); toast({ variant: "destructive", title: "Error", description: "Could not load specialities." }); }
      finally { setIsLoadingSpecs(false); }
    };
    fetchSpecialities();
  }, [selectedDepartmentId, selectedYearId, toast]);

  useEffect(() => {
    if (!selectedSpecialityId) { setGroups([]); setSelectedGroupId(''); return; }
    setIsLoadingGroups(true); setGroups([]); setSelectedGroupId(''); setClassInstanceSummaries([]); setAllAttendanceForGroup([]);
    const fetchGroups = async () => {
      try {
        const q = query(collection(db, "departments", selectedDepartmentId, "years", selectedYearId, "specialities", selectedSpecialityId, "groups"), orderBy("name"));
        const snapshot = await getDocs(q);
        setGroups(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) { console.error(err); toast({ variant: "destructive", title: "Error", description: "Could not load groups." }); }
      finally { setIsLoadingGroups(false); }
    };
    fetchGroups();
  }, [selectedDepartmentId, selectedYearId, selectedSpecialityId, toast]);

  // Fetch attendance records for selected group and process them
  useEffect(() => {
    if (!selectedGroupId || allUsersMap.size === 0) {
      setClassInstanceSummaries([]);
      setAllAttendanceForGroup([]);
      return;
    }
    setIsLoadingClassInstances(true);
    setError(null);
    const attendanceQuery = query(
      collection(db, "attendances"),
      where("groupId", "==", selectedGroupId),
      orderBy("date", "desc"),
      orderBy("timeSlot", "asc") // Secondary sort for consistency within a day
    );

    const unsubscribe = getDocs(attendanceQuery)
      .then(snapshot => {
        const records: AttendanceRecord[] = [];
        snapshot.forEach(doc => records.push(doc.data() as AttendanceRecord));
        setAllAttendanceForGroup(records);

        const summariesMap = new Map<string, ClassInstanceSummary>();
        records.forEach(record => {
          if (!summariesMap.has(record.classInstanceId)) {
            const teacher = allUsersMap.get(record.teacherId);
            summariesMap.set(record.classInstanceId, {
              classInstanceId: record.classInstanceId,
              date: record.date.toDate().toLocaleDateString(),
              timeSlot: record.timeSlot,
              moduleName: record.moduleName,
              teacherFullName: teacher?.fullName || 'N/A',
              rawDate: record.date,
            });
          }
        });
        
        const sortedSummaries = Array.from(summariesMap.values()).sort((a,b) => {
            const dateComparison = b.rawDate.toMillis() - a.rawDate.toMillis();
            if (dateComparison !== 0) return dateComparison;
            return a.timeSlot.localeCompare(b.timeSlot);
        });
        setClassInstanceSummaries(sortedSummaries);

      })
      .catch(err => {
        console.error("Error fetching attendance data:", err);
        setError("Failed to fetch attendance data. Please try again.");
        toast({ variant: "destructive", title: "Error", description: "Could not load attendance records." });
      })
      .finally(() => {
        setIsLoadingClassInstances(false);
      });
      
    // No real-time subscription needed for admin viewer, so no unsubscribe function to return.
  }, [selectedGroupId, toast, allUsersMap]);

  const handleClassInstanceClick = (instanceSummary: ClassInstanceSummary) => {
    setSelectedClassInstanceForModal(instanceSummary);
    setIsLoadingModalDetails(true);
    
    const recordsForInstance = allAttendanceForGroup
      .filter(rec => rec.classInstanceId === instanceSummary.classInstanceId)
      .map(rec => ({
        ...rec,
        studentFullName: allUsersMap.get(rec.studentId)?.fullName || 'Unknown Student'
      }));
    
    setDetailedAttendanceRecords(recordsForInstance);
    setIsLoadingModalDetails(false);
    setShowDetailsModal(true);
  };
  
  const anyDropdownLoading = isLoadingDeps || isLoadingYears || isLoadingSpecs || isLoadingGroups || isLoadingUsers;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="mr-2 h-6 w-6 text-primary" />
            Attendance Viewer
          </CardTitle>
          <CardDescription>Select a group to view its past attendance records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-md shadow-sm">
            {/* Cascading Dropdowns */}
            <div className="space-y-2">
              <Label htmlFor="department-select">Department</Label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId} disabled={anyDropdownLoading}>
                <SelectTrigger id="department-select"><SelectValue placeholder={isLoadingDeps ? "Loading..." : "Select Department"} /></SelectTrigger>
                <SelectContent>{departments.map(dep => <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year-select">Year</Label>
              <Select value={selectedYearId} onValueChange={setSelectedYearId} disabled={!selectedDepartmentId || anyDropdownLoading}>
                <SelectTrigger id="year-select"><SelectValue placeholder={isLoadingYears ? "Loading..." : "Select Year"} /></SelectTrigger>
                <SelectContent>{years.map(year => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="speciality-select">Speciality</Label>
              <Select value={selectedSpecialityId} onValueChange={setSelectedSpecialityId} disabled={!selectedYearId || anyDropdownLoading}>
                <SelectTrigger id="speciality-select"><SelectValue placeholder={isLoadingSpecs ? "Loading..." : "Select Speciality"} /></SelectTrigger>
                <SelectContent>{specialities.map(spec => <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-select">Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId} disabled={!selectedSpecialityId || anyDropdownLoading}>
                <SelectTrigger id="group-select"><SelectValue placeholder={isLoadingGroups ? "Loading..." : "Select Group"} /></SelectTrigger>
                <SelectContent>{groups.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {error && <div className="my-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/><p>{error}</p></div>}
        </CardContent>
      </Card>

      {selectedGroupId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recorded Class Instances for {groups.find(g => g.id === selectedGroupId)?.name || 'Selected Group'}</CardTitle>
            <CardDescription>Click on a class instance to view detailed attendance.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingClassInstances ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading class instances...</p></div>
            ) : classInstanceSummaries.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No attendance records found for this group, or group has no classes with attendance taken.</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time Slot</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classInstanceSummaries.map((instance) => (
                      <TableRow key={instance.classInstanceId}>
                        <TableCell>{instance.date}</TableCell>
                        <TableCell>{instance.timeSlot}</TableCell>
                        <TableCell>{instance.moduleName}</TableCell>
                        <TableCell>{instance.teacherFullName}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleClassInstanceClick(instance)}>
                            <Eye className="mr-1.5 h-4 w-4" /> View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
            {selectedClassInstanceForModal && (
              <DialogDescription>
                Module: {selectedClassInstanceForModal.moduleName} <br />
                Teacher: {selectedClassInstanceForModal.teacherFullName} <br />
                Date: {selectedClassInstanceForModal.date} at {selectedClassInstanceForModal.timeSlot}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex-grow overflow-hidden">
          {isLoadingModalDetails ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="mr-2 h-8 w-8 animate-spin"/></div>
          ) : detailedAttendanceRecords.length === 0 && selectedClassInstanceForModal ? (
             <p className="text-muted-foreground text-center py-4">No student attendance data available for this specific class instance.</p>
          ) : (
            <ScrollArea className="h-full max-h-[calc(80vh-200px)] pr-2"> {/* Adjusted max-h */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Justification Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailedAttendanceRecords.map((record) => (
                    <TableRow key={record.studentId}>
                      <TableCell>{record.studentFullName}</TableCell>
                      <TableCell>
                        <span className={cn(
                          record.status === 'Present' && 'text-green-600',
                          record.status === 'Absent' && 'text-red-600',
                          record.status === 'AbsentWithJustification' && 'text-orange-600',
                          'font-medium'
                        )}>
                          {record.status.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </TableCell>
                      <TableCell>{record.justificationNote || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          </div>
          <DialogFooter className="mt-auto pt-4 border-t">
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
