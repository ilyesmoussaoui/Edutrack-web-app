
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, Users, Circle, Edit, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

interface Student {
  uid: string;
  fullName: string;
  email: string;
  role: string;
  createdAt?: Timestamp;
  assignedGroupId?: string | null;
}

interface Department { id: string; name: string; }
interface Year { id: string; name: string; }
interface Speciality { id: string; name: string; }
interface Group { id: string; name: string; }

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

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


  useEffect(() => {
    setIsLoadingStudents(true);
    const studentsQuery = query(
      collection(db, "users"),
      where("role", "==", "Student"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      const fetchedStudents: Student[] = [];
      snapshot.forEach((doc) => {
        fetchedStudents.push({ uid: doc.id, ...doc.data() } as Student);
      });
      setStudents(fetchedStudents);
      setIsLoadingStudents(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching students:", err);
      setError("Failed to fetch students.");
      setIsLoadingStudents(false);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch students." });
    });

    return () => unsubscribe();
  }, [toast]);

  const fetchDepartments = useCallback(async () => {
    setIsLoadingDeps(true);
    try {
      const q = query(collection(db, "departments"), orderBy("name"));
      const snapshot = await getDocs(q);
      setDepartments(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    } catch (err) {
      console.error("Error fetching departments for dropdown:", err);
      toast({ variant: "destructive", title: "Error", description: "Could not load departments for assignment." });
    } finally {
      setIsLoadingDeps(false);
    }
  }, [toast]);

  useEffect(() => {
    if (showAssignDialog) {
      fetchDepartments();
    }
  }, [showAssignDialog, fetchDepartments]);


  useEffect(() => {
    const fetchYears = async () => {
      if (!selectedDepartmentId) {
        setYears([]);
        setSelectedYearId(''); 
        return;
      }
      setIsLoadingYears(true);
      setYears([]); setSelectedYearId(''); 
      setSpecialities([]); setSelectedSpecialityId('');
      setGroups([]); setSelectedGroupId('');
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
        setSpecialities([]);
        setSelectedSpecialityId('');
        return;
      }
      setIsLoadingSpecs(true);
      setSpecialities([]); setSelectedSpecialityId('');
      setGroups([]); setSelectedGroupId('');
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
        setGroups([]);
        setSelectedGroupId('');
        return;
      }
      setIsLoadingGroups(true);
      setGroups([]); setSelectedGroupId('');
      try {
        const groupsQuery = query(collection(db, "departments", selectedDepartmentId, "years", selectedYearId, "specialities", selectedSpecialityId, "groups"), orderBy("name"));
        const snapshot = await getDocs(groupsQuery);
        setGroups(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        console.error("Error fetching groups:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load groups." });
      } finally {
        setIsLoadingGroups(false);
      }
    };
    fetchGroups();
  }, [selectedDepartmentId, selectedYearId, selectedSpecialityId, toast]);


  const handleOpenAssignDialog = (student: Student) => {
    setSelectedStudent(student);
    setSelectedDepartmentId('');
    setSelectedYearId('');
    setSelectedSpecialityId('');
    setSelectedGroupId('');
    setYears([]);
    setSpecialities([]);
    setGroups([]);
    setShowAssignDialog(true);
  };

  const handleAssignGroup = async () => {
    if (!selectedStudent || !selectedGroupId) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please select a group to assign." });
      return;
    }
    setIsAssigning(true);
    try {
      const studentDocRef = doc(db, "users", selectedStudent.uid);
      await updateDoc(studentDocRef, { assignedGroupId: selectedGroupId });
      toast({ title: "Success", description: `${selectedStudent.fullName} assigned to group.` });
      setShowAssignDialog(false);
      setSelectedStudent(null);
    } catch (err) {
      console.error("Error assigning group:", err);
      toast({ variant: "destructive", title: "Error", description: "Could not assign group." });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6 text-primary" />Manage Students</CardTitle>
          <CardDescription>View registered students and assign them to groups.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStudents ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground">Loading students...</p></div>
          ) : error ? (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/><p>{error}</p></div>
          ) : students.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No students found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.uid}>
                    <TableCell>
                      <Circle className={cn("h-4 w-4", student.assignedGroupId ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500")} />
                    </TableCell>
                    <TableCell className="font-medium">{student.fullName}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleOpenAssignDialog(student)}>
                        <Edit className="mr-1.5 h-4 w-4" /> Assign Group
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Group Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={(isOpen) => { setShowAssignDialog(isOpen); if (!isOpen) setSelectedStudent(null); }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Assign Group to {selectedStudent?.fullName}</DialogTitle>
            <DialogDescription>Select the department, year, speciality, and group.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="department-select">Department</Label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId} disabled={isLoadingDeps}>
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
              <Select value={selectedYearId} onValueChange={setSelectedYearId} disabled={!selectedDepartmentId || isLoadingYears}>
                <SelectTrigger id="year-select">
                  <SelectValue placeholder={isLoadingYears ? "Loading..." : "Select Year"} />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="speciality-select">Speciality</Label>
              <Select value={selectedSpecialityId} onValueChange={setSelectedSpecialityId} disabled={!selectedYearId || isLoadingSpecs}>
                <SelectTrigger id="speciality-select">
                  <SelectValue placeholder={isLoadingSpecs ? "Loading..." : "Select Speciality"} />
                </SelectTrigger>
                <SelectContent>
                  {specialities.map(spec => <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="group-select">Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId} disabled={!selectedSpecialityId || isLoadingGroups}>
                <SelectTrigger id="group-select">
                  <SelectValue placeholder={isLoadingGroups ? "Loading..." : "Select Group"} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isAssigning}>Cancel</Button></DialogClose>
            <Button onClick={handleAssignGroup} disabled={isAssigning || !selectedGroupId || isLoadingDeps || isLoadingYears || isLoadingSpecs || isLoadingGroups}>
              {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    