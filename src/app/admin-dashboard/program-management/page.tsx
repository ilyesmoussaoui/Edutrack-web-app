
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs, where, type Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, BookOpenText, Edit3 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface Department { id: string; name: string; }
interface Year { id: string; name: string; }
interface Speciality { id: string; name: string; }
interface Group { id: string; name: string; departmentId: string, yearId: string, specialityId: string }
interface Teacher { uid: string; fullName: string; }

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const TIME_SLOTS = [
  "08:30 - 10:00",
  "10:00 - 11:30",
  "12:30 - 14:00",
  "14:00 - 15:30",
];

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

  const [selectedGroupDetails, setSelectedGroupDetails] = useState<Group | null>(null);

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);
  const [modalTeacherId, setModalTeacherId] = useState('');
  const [modalModuleName, setModalModuleName] = useState('');
  const [modalRoomHall, setModalRoomHall] = useState('');
  const [isSavingSlot, setIsSavingSlot] = useState(false);


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
    const fetchYears = async () => {
      if (!selectedDepartmentId) {
        setYears([]); setSelectedYearId('');
        setSpecialities([]); setSelectedSpecialityId('');
        setGroups([]); setSelectedGroupId('');
        setSelectedGroupDetails(null);
        return;
      }
      setIsLoadingYears(true);
      setYears([]); setSelectedYearId(''); 
      setSpecialities([]); setSelectedSpecialityId('');
      setGroups([]); setSelectedGroupId('');
      setSelectedGroupDetails(null);
      try {
        const yearsQuery = query(collection(db, "departments", selectedDepartmentId, "years"), orderBy("name"));
        const snapshot = await getDocs(yearsQuery);
        setYears(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        console.error("Error fetching years:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load years." });
      } finally {
        setIsLoadingYears(false);
      }
    };
    fetchYears();
  }, [selectedDepartmentId, toast]);

  useEffect(() => {
    const fetchSpecialities = async () => {
      if (!selectedDepartmentId || !selectedYearId) {
        setSpecialities([]); setSelectedSpecialityId('');
        setGroups([]); setSelectedGroupId('');
        setSelectedGroupDetails(null);
        return;
      }
      setIsLoadingSpecs(true);
      setSpecialities([]); setSelectedSpecialityId('');
      setGroups([]); setSelectedGroupId('');
      setSelectedGroupDetails(null);
      try {
        const specsQuery = query(collection(db, "departments", selectedDepartmentId, "years", selectedYearId, "specialities"), orderBy("name"));
        const snapshot = await getDocs(specsQuery);
        setSpecialities(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        console.error("Error fetching specialities:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load specialities." });
      } finally {
        setIsLoadingSpecs(false);
      }
    };
    fetchSpecialities();
  }, [selectedDepartmentId, selectedYearId, toast]);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!selectedDepartmentId || !selectedYearId || !selectedSpecialityId) {
        setGroups([]); setSelectedGroupId('');
        setSelectedGroupDetails(null);
        return;
      }
      setIsLoadingGroups(true);
      setGroups([]); setSelectedGroupId('');
      setSelectedGroupDetails(null);
      try {
        const groupsQuery = query(collection(db, "departments", selectedDepartmentId, "years", selectedYearId, "specialities", selectedSpecialityId, "groups"), orderBy("name"));
        const snapshot = await getDocs(groupsQuery);
        const fetchedGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
        setGroups(fetchedGroups);

      } catch (err) {
        console.error("Error fetching groups:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load groups." });
      } finally {
        setIsLoadingGroups(false);
      }
    };
    fetchGroups();
  }, [selectedDepartmentId, selectedYearId, selectedSpecialityId, toast]);

  useEffect(() => {
    if (selectedGroupId && groups.length > 0) {
        const group = groups.find(g => g.id === selectedGroupId);
        setSelectedGroupDetails(group || null);
    } else {
        setSelectedGroupDetails(null);
    }
  }, [selectedGroupId, groups]);

  const fetchTeachers = useCallback(async () => {
    if (availableTeachers.length > 0) return; // Don't refetch if already loaded

    setIsLoadingTeachers(true);
    try {
      const teachersQuery = query(
        collection(db, "users"),
        where("role", "==", "Teacher"),
        orderBy("fullName", "asc")
      );
      const snapshot = await getDocs(teachersQuery);
      setAvailableTeachers(snapshot.docs.map(doc => ({ uid: doc.id, fullName: doc.data().fullName } as Teacher)));
    } catch (err) {
      console.error("Error fetching teachers:", err);
      toast({ variant: "destructive", title: "Error", description: "Could not load teachers." });
    } finally {
      setIsLoadingTeachers(false);
    }
  }, [toast, availableTeachers.length]);


  const getPath = () => {
    let path = "";
    if (selectedDepartmentId) {
        const dept = departments.find(d => d.id === selectedDepartmentId);
        path += dept?.name || "";
    }
    if (selectedYearId) {
        const year = years.find(y => y.id === selectedYearId);
        path += (path ? " > " : "") + (year?.name || "");
    }
    if (selectedSpecialityId) {
        const spec = specialities.find(s => s.id === selectedSpecialityId);
        path += (path ? " > " : "") + (spec?.name || "");
    }
    if (selectedGroupId) {
        const group = groups.find(g => g.id === selectedGroupId);
        path += (path ? " > " : "") + (group?.name || "");
    }
    return path;
  }

  const handleSlotClick = (day: string, time: string) => {
    setSelectedSlot({ day, time });
    if (availableTeachers.length === 0) {
        fetchTeachers();
    }
    setModalTeacherId('');
    setModalModuleName('');
    setModalRoomHall('');
    setShowSlotModal(true);
  };

  const handleSaveSlotDetails = async () => {
    if (!selectedSlot || !selectedGroupDetails) return;
    if (!modalTeacherId || !modalModuleName.trim() || !modalRoomHall.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Please fill all fields: Teacher, Module Name, and Room/Hall." });
        return;
    }
    
    setIsSavingSlot(true);
    const slotData = {
        day: selectedSlot.day,
        time: selectedSlot.time,
        teacherId: modalTeacherId,
        teacherName: availableTeachers.find(t => t.uid === modalTeacherId)?.fullName || 'N/A',
        moduleName: modalModuleName.trim(),
        roomHall: modalRoomHall.trim(),
        groupId: selectedGroupDetails.id,
    };

    console.log("Saving slot details:", slotData);
    // Firestore saving logic will be added in the next step.

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({ title: "Slot Details Logged", description: "Check console for details. Firestore saving next." });
    setIsSavingSlot(false);
    setShowSlotModal(false);
  };

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
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId} disabled={isLoadingDeps || isSavingSlot}>
                <SelectTrigger id="department-select">
                  <SelectValue placeholder={isLoadingDeps ? "Loading..." : "Select Department"} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dep => <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year-select">Year</Label>
              <Select value={selectedYearId} onValueChange={setSelectedYearId} disabled={!selectedDepartmentId || isLoadingYears || isSavingSlot}>
                <SelectTrigger id="year-select" className={!selectedDepartmentId ? "opacity-50 cursor-not-allowed" : ""}>
                  <SelectValue placeholder={isLoadingYears ? "Loading..." : "Select Year"} />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="speciality-select">Speciality</Label>
              <Select value={selectedSpecialityId} onValueChange={setSelectedSpecialityId} disabled={!selectedYearId || isLoadingSpecs || isSavingSlot}>
                <SelectTrigger id="speciality-select" className={!selectedYearId ? "opacity-50 cursor-not-allowed" : ""}>
                  <SelectValue placeholder={isLoadingSpecs ? "Loading..." : "Select Speciality"} />
                </SelectTrigger>
                <SelectContent>
                  {specialities.map(spec => <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="group-select">Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId} disabled={!selectedSpecialityId || isLoadingGroups || isSavingSlot}>
                <SelectTrigger id="group-select" className={!selectedSpecialityId ? "opacity-50 cursor-not-allowed" : ""}>
                  <SelectValue placeholder={isLoadingGroups ? "Loading..." : "Select Group"} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedGroupDetails && (
            <div className="mt-6 p-4 border rounded-md bg-secondary/30">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Selected Group: <span className="text-primary">{selectedGroupDetails.name}</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                Path: {getPath()}
              </p>
            </div>
          )}
           {!selectedGroupId && selectedSpecialityId && !isLoadingGroups && groups.length === 0 && (
             <p className="text-muted-foreground text-center py-4">No groups found for the selected speciality. Please add groups in the 'Departments' section.</p>
           )}
           {!selectedGroupId && selectedSpecialityId && !isLoadingGroups && groups.length > 0 && (
             <p className="text-muted-foreground text-center py-4">Please select a group to manage its program.</p>
           )}
        </CardContent>
      </Card>

      {selectedGroupDetails && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Weekly Program for <span className="text-primary">{selectedGroupDetails.name}</span></CardTitle>
            <CardDescription>
              Setup the recurring weekly schedule. Click on a slot to add or edit a class.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1 border rounded-lg p-1 bg-muted/20">
              <div className="p-2 text-xs font-medium text-muted-foreground rounded-md"></div>
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="font-semibold p-2 border rounded-md text-center bg-muted text-sm">
                  {day}
                </div>
              ))}

              {TIME_SLOTS.map((timeSlot) => (
                <React.Fragment key={timeSlot}>
                  <div className="font-semibold p-2 border rounded-md text-center bg-muted text-sm flex items-center justify-center">
                    {timeSlot}
                  </div>
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={`${day}-${timeSlot}`}
                      className="p-3 border rounded-md min-h-[100px] bg-background hover:bg-accent/50 transition-colors cursor-pointer flex flex-col items-center justify-center text-xs text-muted-foreground"
                      onClick={() => handleSlotClick(day, timeSlot)}
                    >
                       {/* Content for each slot will go here later (e.g., module name, teacher) */}
                       <Edit3 className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                       <span className="mt-1">Add/Edit</span>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showSlotModal} onOpenChange={setShowSlotModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Set Class Details</DialogTitle>
            <DialogDescription>
              For {selectedSlot?.day} at {selectedSlot?.time} in group {selectedGroupDetails?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-select-modal">Assigned Teacher</Label>
              <Select value={modalTeacherId} onValueChange={setModalTeacherId} disabled={isLoadingTeachers || isSavingSlot}>
                <SelectTrigger id="teacher-select-modal">
                  <SelectValue placeholder={isLoadingTeachers ? "Loading teachers..." : "Select Teacher"} />
                </SelectTrigger>
                <SelectContent>
                  {availableTeachers.map(teacher => (
                    <SelectItem key={teacher.uid} value={teacher.uid}>{teacher.fullName}</SelectItem>
                  ))}
                  {availableTeachers.length === 0 && !isLoadingTeachers && <p className="p-2 text-sm text-muted-foreground">No teachers available.</p>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="module-name-modal">Module Name</Label>
                <Input 
                    id="module-name-modal" 
                    value={modalModuleName} 
                    onChange={(e) => setModalModuleName(e.target.value)} 
                    placeholder="e.g., Introduction to AI"
                    disabled={isSavingSlot}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="room-hall-modal">Room / Hall</Label>
                <Input 
                    id="room-hall-modal" 
                    value={modalRoomHall} 
                    onChange={(e) => setModalRoomHall(e.target.value)} 
                    placeholder="e.g., Amphitheater C"
                    disabled={isSavingSlot}
                />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSavingSlot}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveSlotDetails} disabled={isSavingSlot || isLoadingTeachers || !modalTeacherId || !modalModuleName.trim() || !modalRoomHall.trim()}>
              {isSavingSlot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
    
