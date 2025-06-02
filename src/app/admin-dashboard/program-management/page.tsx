
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs, where, type Timestamp, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, BookOpenText, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

interface Department { id: string; name: string; }
interface Year { id: string; name: string; }
interface Speciality { id: string; name: string; }
interface Group { id: string; name: string; departmentId: string, yearId: string, specialityId: string }
interface Teacher { uid: string; fullName: string; }

interface ScheduleSlotData {
  day: string;
  time: string;
  moduleName: string;
  teacherId: string;
  teacherName: string;
  roomHall: string;
  groupId: string;
  groupName: string;
}

interface ScheduleSlotDocument extends ScheduleSlotData {
  id: string; // Firestore document ID, e.g., Sunday_0830-1000
}


const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const TIME_SLOTS = [
  "08:30 - 10:00",
  "10:00 - 11:30",
  "12:30 - 14:00",
  "14:00 - 15:30",
];

// Helper to create a Firestore-safe ID from day and time
const createSlotDocId = (day: string, time: string) => `${day}_${time.replace(/[\s:-]/g, '')}`;

export default function ProgramManagementPage() {
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedSpecialityId, setSelectedSpecialityId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const [isLoadingDeps, setIsLoadingDeps] = useState(false);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  const [selectedGroupDetails, setSelectedGroupDetails] = useState<Group | null>(null);
  const [groupSchedule, setGroupSchedule] = useState<ScheduleSlotDocument[]>([]);

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [currentEditingSlot, setCurrentEditingSlot] = useState<{ day: string; time: string } | null>(null);
  const [modalTeacherId, setModalTeacherId] = useState('');
  const [modalModuleName, setModalModuleName] = useState('');
  const [modalRoomHall, setModalRoomHall] = useState('');
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [isDeletingSlot, setIsDeletingSlot] = useState(false);
  
  const [slotExistsInModal, setSlotExistsInModal] = useState(false);


  useEffect(() => {
    const fetchDepartments = async () => {
      setIsLoadingDeps(true);
      try {
        const q = query(collection(db, "departments"), orderBy("name"));
        const snapshot = await getDocs(q);
        setDepartments(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        console.error("Error fetching departments:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load departments." });
      } finally {
        setIsLoadingDeps(false);
      }
    };
    fetchDepartments();
  }, [toast]);

  useEffect(() => {
    if (!selectedDepartmentId) {
      setYears([]); setSelectedYearId('');
      setSpecialities([]); setSelectedSpecialityId('');
      setGroups([]); setSelectedGroupId('');
      setSelectedGroupDetails(null); setGroupSchedule([]);
      return;
    }
    setIsLoadingYears(true); setYears([]); setSelectedYearId(''); 
    setSpecialities([]); setSelectedSpecialityId('');
    setGroups([]); setSelectedGroupId('');
    setSelectedGroupDetails(null); setGroupSchedule([]);
    const fetchYears = async () => {
      try {
        const yearsQuery = query(collection(db, "departments", selectedDepartmentId, "years"), orderBy("name"));
        const snapshot = await getDocs(yearsQuery);
        setYears(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        console.error("Error fetching years:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load years." });
      } finally { setIsLoadingYears(false); }
    };
    fetchYears();
  }, [selectedDepartmentId, toast]);

  useEffect(() => {
    if (!selectedYearId) {
      setSpecialities([]); setSelectedSpecialityId('');
      setGroups([]); setSelectedGroupId('');
      setSelectedGroupDetails(null); setGroupSchedule([]);
      return;
    }
    setIsLoadingSpecs(true); setSpecialities([]); setSelectedSpecialityId('');
    setGroups([]); setSelectedGroupId('');
    setSelectedGroupDetails(null); setGroupSchedule([]);
    const fetchSpecialities = async () => {
      try {
        const specsQuery = query(collection(db, "departments", selectedDepartmentId, "years", selectedYearId, "specialities"), orderBy("name"));
        const snapshot = await getDocs(specsQuery);
        setSpecialities(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        console.error("Error fetching specialities:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load specialities." });
      } finally { setIsLoadingSpecs(false); }
    };
    fetchSpecialities();
  }, [selectedDepartmentId, selectedYearId, toast]);

  useEffect(() => {
    if (!selectedSpecialityId) {
      setGroups([]); setSelectedGroupId('');
      setSelectedGroupDetails(null); setGroupSchedule([]);
      return;
    }
    setIsLoadingGroups(true); setGroups([]); setSelectedGroupId('');
    setSelectedGroupDetails(null); setGroupSchedule([]);
    const fetchGroups = async () => {
      try {
        const groupsQuery = query(collection(db, "departments", selectedDepartmentId, "years", selectedYearId, "specialities", selectedSpecialityId, "groups"), orderBy("name"));
        const snapshot = await getDocs(groupsQuery);
        setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
      } catch (err) {
        console.error("Error fetching groups:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load groups." });
      } finally { setIsLoadingGroups(false); }
    };
    fetchGroups();
  }, [selectedDepartmentId, selectedYearId, selectedSpecialityId, toast]);
  
  useEffect(() => {
    if (selectedGroupId && groups.length > 0) {
        const group = groups.find(g => g.id === selectedGroupId);
        setSelectedGroupDetails(group || null);
    } else {
        setSelectedGroupDetails(null);
        setGroupSchedule([]);
    }
  }, [selectedGroupId, groups]);

  useEffect(() => {
    if (!selectedGroupDetails) {
      setGroupSchedule([]);
      return;
    }
    setIsLoadingSchedule(true);
    const scheduleCollectionRef = collection(db, "departments", selectedGroupDetails.departmentId, "years", selectedGroupDetails.yearId, "specialities", selectedGroupDetails.specialityId, "groups", selectedGroupDetails.id, "schedule");
    
    const unsubscribe = onSnapshot(scheduleCollectionRef, (snapshot) => {
      const fetchedSchedule: ScheduleSlotDocument[] = [];
      snapshot.forEach((doc) => {
        fetchedSchedule.push({ id: doc.id, ...doc.data() } as ScheduleSlotDocument);
      });
      setGroupSchedule(fetchedSchedule);
      setIsLoadingSchedule(false);
    }, (err) => {
      console.error("Error fetching schedule for group:", err);
      toast({ variant: "destructive", title: "Schedule Error", description: "Could not load schedule for the selected group." });
      setIsLoadingSchedule(false);
    });

    return () => unsubscribe();
  }, [selectedGroupDetails, toast]);


  const fetchTeachers = useCallback(async () => {
    if (availableTeachers.length > 0 && !isLoadingTeachers) return;
    setIsLoadingTeachers(true);
    try {
      const teachersQuery = query(collection(db, "users"), where("role", "==", "Teacher"), orderBy("fullName", "asc"));
      const snapshot = await getDocs(teachersQuery);
      setAvailableTeachers(snapshot.docs.map(doc => ({ uid: doc.id, fullName: doc.data().fullName } as Teacher)));
    } catch (err) {
      console.error("Error fetching teachers:", err);
      toast({ variant: "destructive", title: "Error", description: "Could not load teachers." });
    } finally { setIsLoadingTeachers(false); }
  }, [toast, availableTeachers.length, isLoadingTeachers]);


  const getPath = () => {
    let path = "";
    if (selectedDepartmentId) path += departments.find(d => d.id === selectedDepartmentId)?.name || "";
    if (selectedYearId) path += (path ? " > " : "") + (years.find(y => y.id === selectedYearId)?.name || "");
    if (selectedSpecialityId) path += (path ? " > " : "") + (specialities.find(s => s.id === selectedSpecialityId)?.name || "");
    if (selectedGroupId) path += (path ? " > " : "") + (groups.find(g => g.id === selectedGroupId)?.name || "");
    return path;
  }

  const handleSlotClick = (day: string, time: string) => {
    setCurrentEditingSlot({ day, time });
    fetchTeachers(); // Ensure teachers are loaded

    const slotDocId = createSlotDocId(day, time);
    const existingSlot = groupSchedule.find(s => s.id === slotDocId);

    if (existingSlot) {
      setModalTeacherId(existingSlot.teacherId);
      setModalModuleName(existingSlot.moduleName);
      setModalRoomHall(existingSlot.roomHall);
      setSlotExistsInModal(true);
    } else {
      setModalTeacherId('');
      setModalModuleName('');
      setModalRoomHall('');
      setSlotExistsInModal(false);
    }
    setShowSlotModal(true);
  };

  const handleSaveSlotDetails = async () => {
    if (!currentEditingSlot || !selectedGroupDetails) return;
    if (!modalTeacherId || !modalModuleName.trim() || !modalRoomHall.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please fill all fields: Teacher, Module Name, and Room/Hall." });
      return;
    }
    
    setIsSavingSlot(true);
    const slotDocId = createSlotDocId(currentEditingSlot.day, currentEditingSlot.time);
    const slotData: ScheduleSlotData = {
      day: currentEditingSlot.day,
      time: currentEditingSlot.time,
      teacherId: modalTeacherId,
      teacherName: availableTeachers.find(t => t.uid === modalTeacherId)?.fullName || 'N/A',
      moduleName: modalModuleName.trim(),
      roomHall: modalRoomHall.trim(),
      groupId: selectedGroupDetails.id,
      groupName: selectedGroupDetails.name,
    };

    try {
      const slotDocRef = doc(db, "departments", selectedGroupDetails.departmentId, "years", selectedGroupDetails.yearId, "specialities", selectedGroupDetails.specialityId, "groups", selectedGroupDetails.id, "schedule", slotDocId);
      await setDoc(slotDocRef, slotData); // setDoc will create or overwrite
      toast({ title: "Success", description: "Class slot details saved." });
      setShowSlotModal(false);
    } catch (error) {
        console.error("Error saving slot details:", error);
        toast({ variant: "destructive", title: "Save Error", description: "Could not save class slot details." });
    } finally {
        setIsSavingSlot(false);
    }
  };
  
  const handleDeleteSlotDetails = async () => {
    if (!currentEditingSlot || !selectedGroupDetails) return;
    
    setIsDeletingSlot(true);
    const slotDocId = createSlotDocId(currentEditingSlot.day, currentEditingSlot.time);
    try {
      const slotDocRef = doc(db, "departments", selectedGroupDetails.departmentId, "years", selectedGroupDetails.yearId, "specialities", selectedGroupDetails.specialityId, "groups", selectedGroupDetails.id, "schedule", slotDocId);
      await deleteDoc(slotDocRef);
      toast({ title: "Success", description: "Class slot cleared." });
      setShowSlotModal(false);
    } catch (error) {
        console.error("Error deleting slot details:", error);
        toast({ variant: "destructive", title: "Delete Error", description: "Could not clear class slot." });
    } finally {
        setIsDeletingSlot(false);
    }
  };

  const getSlotContent = (day: string, time: string) => {
    const slotDocId = createSlotDocId(day, time);
    const slotData = groupSchedule.find(s => s.id === slotDocId);
    if (slotData) {
      return (
        <div className="text-xs leading-tight p-1 break-words">
          <p className="font-semibold text-primary truncate">{slotData.moduleName}</p>
          <p className="text-muted-foreground truncate">{slotData.teacherName}</p>
          <p className="text-muted-foreground truncate">@{slotData.roomHall}</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center text-xs text-muted-foreground h-full">
        <Edit3 className="h-4 w-4 group-hover:text-primary" />
        <span className="mt-1">Add/Edit</span>
      </div>
    );
  };
  
  const isProcessing = isSavingSlot || isDeletingSlot;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpenText className="mr-2 h-6 w-6 text-primary" />
            Program Management
          </CardTitle>
          <CardDescription>Select a group to create or edit its recurring weekly program.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-md shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="department-select">Department</Label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId} disabled={isLoadingDeps || isProcessing}>
                <SelectTrigger id="department-select"><SelectValue placeholder={isLoadingDeps ? "Loading..." : "Select Department"} /></SelectTrigger>
                <SelectContent>{departments.map(dep => <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year-select">Year</Label>
              <Select value={selectedYearId} onValueChange={setSelectedYearId} disabled={!selectedDepartmentId || isLoadingYears || isProcessing}>
                <SelectTrigger id="year-select" className={!selectedDepartmentId ? "opacity-50 cursor-not-allowed" : ""}><SelectValue placeholder={isLoadingYears ? "Loading..." : "Select Year"} /></SelectTrigger>
                <SelectContent>{years.map(year => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="speciality-select">Speciality</Label>
              <Select value={selectedSpecialityId} onValueChange={setSelectedSpecialityId} disabled={!selectedYearId || isLoadingSpecs || isProcessing}>
                <SelectTrigger id="speciality-select" className={!selectedYearId ? "opacity-50 cursor-not-allowed" : ""}><SelectValue placeholder={isLoadingSpecs ? "Loading..." : "Select Speciality"} /></SelectTrigger>
                <SelectContent>{specialities.map(spec => <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-select">Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId} disabled={!selectedSpecialityId || isLoadingGroups || isProcessing}>
                <SelectTrigger id="group-select" className={!selectedSpecialityId ? "opacity-50 cursor-not-allowed" : ""}><SelectValue placeholder={isLoadingGroups ? "Loading..." : "Select Group"} /></SelectTrigger>
                <SelectContent>{groups.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {selectedGroupDetails && (
            <div className="mt-6 p-4 border rounded-md bg-secondary/30">
              <h3 className="text-lg font-semibold text-foreground mb-1">Selected Group: <span className="text-primary">{selectedGroupDetails.name}</span></h3>
              <p className="text-sm text-muted-foreground">Path: {getPath()}</p>
            </div>
          )}
           {!selectedGroupId && selectedSpecialityId && !isLoadingGroups && groups.length === 0 && (<p className="text-muted-foreground text-center py-4">No groups for selected speciality. Add groups in 'Departments' section.</p>)}
           {!selectedGroupId && selectedSpecialityId && !isLoadingGroups && groups.length > 0 && (<p className="text-muted-foreground text-center py-4">Please select a group to manage its program.</p>)}
        </CardContent>
      </Card>

      {selectedGroupDetails && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Weekly Program for <span className="text-primary">{selectedGroupDetails.name}</span></CardTitle>
            <CardDescription>Click on a slot to add, edit, or clear class details.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSchedule ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p>Loading schedule...</p></div>
            ) : (
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
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={`${day}-${timeSlot}`}
                      className={cn("group border-r border-b border-border min-h-[100px] bg-background hover:bg-accent/50 transition-colors cursor-pointer flex flex-col justify-start items-stretch", day === DAYS_OF_WEEK[DAYS_OF_WEEK.length -1] && "border-r-0", timeSlot === TIME_SLOTS[TIME_SLOTS.length -1] && "border-b-0")}
                      onClick={() => handleSlotClick(day, timeSlot)}
                    >
                       {getSlotContent(day, timeSlot)}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showSlotModal} onOpenChange={setShowSlotModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{slotExistsInModal ? "Edit" : "Set"} Class Details</DialogTitle>
            <DialogDescription>
              For {currentEditingSlot?.day} at {currentEditingSlot?.time} in group {selectedGroupDetails?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-select-modal">Assigned Teacher</Label>
              <Select value={modalTeacherId} onValueChange={setModalTeacherId} disabled={isLoadingTeachers || isProcessing}>
                <SelectTrigger id="teacher-select-modal"><SelectValue placeholder={isLoadingTeachers ? "Loading teachers..." : "Select Teacher"} /></SelectTrigger>
                <SelectContent>
                  {availableTeachers.map(teacher => (<SelectItem key={teacher.uid} value={teacher.uid}>{teacher.fullName}</SelectItem>))}
                  {availableTeachers.length === 0 && !isLoadingTeachers && <p className="p-2 text-sm text-muted-foreground">No teachers available.</p>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="module-name-modal">Module Name</Label>
                <Input id="module-name-modal" value={modalModuleName} onChange={(e) => setModalModuleName(e.target.value)} placeholder="e.g., Introduction to AI" disabled={isProcessing}/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="room-hall-modal">Room / Hall</Label>
                <Input id="room-hall-modal" value={modalRoomHall} onChange={(e) => setModalRoomHall(e.target.value)} placeholder="e.g., Amphitheater C" disabled={isProcessing}/>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {slotExistsInModal && (
                 <Button variant="destructive" onClick={handleDeleteSlotDetails} disabled={isProcessing || isDeletingSlot}>
                    {isDeletingSlot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Clear Slot
                </Button>
            )}
            <div className={cn("flex gap-2", !slotExistsInModal && "w-full justify-end")}>
                <DialogClose asChild>
                    <Button variant="outline" disabled={isProcessing}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleSaveSlotDetails} disabled={isProcessing || isLoadingTeachers || !modalTeacherId || !modalModuleName.trim() || !modalRoomHall.trim()}>
                    {isSavingSlot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Details
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    

    

    