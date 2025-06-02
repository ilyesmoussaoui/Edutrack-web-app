
"use client";

import type { FormEvent } from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Edit3, Trash2, Loader2, AlertTriangle, PlusCircle, Briefcase, ChevronRight, ListTree, CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
  createdAt?: Timestamp;
}

interface Year {
  id: string;
  name: string;
  createdAt?: Timestamp;
}

interface Speciality {
  id: string;
  name: string;
  createdAt?: Timestamp;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentToEditName, setDepartmentToEditName] = useState('');
  const [showEditDepartmentDialog, setShowEditDepartmentDialog] = useState(false);

  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [showDeleteDepartmentConfirmDialog, setShowDeleteDepartmentConfirmDialog] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  
  const [years, setYears] = useState<Year[]>([]);
  const [newYearName, setNewYearName] = useState('');
  const [editingYear, setEditingYear] = useState<Year | null>(null);
  const [yearToEditName, setYearToEditName] = useState('');
  const [showEditYearDialog, setShowEditYearDialog] = useState(false);
  const [yearToDelete, setYearToDelete] = useState<Year | null>(null);
  const [showDeleteYearConfirmDialog, setShowDeleteYearConfirmDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);

  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [newSpecialityName, setNewSpecialityName] = useState('');
  const [editingSpeciality, setEditingSpeciality] = useState<Speciality | null>(null);
  const [specialityToEditName, setSpecialityToEditName] = useState('');
  const [showEditSpecialityDialog, setShowEditSpecialityDialog] = useState(false);
  const [specialityToDelete, setSpecialityToDelete] = useState<Speciality | null>(null);
  const [showDeleteSpecialityConfirmDialog, setShowDeleteSpecialityConfirmDialog] = useState(false);

  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isLoadingSpecialities, setIsLoadingSpecialities] = useState(false);
  
  const [isProcessingDepartment, setIsProcessingDepartment] = useState(false);
  const [isProcessingYear, setIsProcessingYear] = useState(false);
  const [isProcessingSpeciality, setIsProcessingSpeciality] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setIsLoadingDepartments(true);
    const departmentsCollectionRef = collection(db, "departments");
    const q = query(departmentsCollectionRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDepartments: Department[] = [];
      snapshot.forEach((doc) => {
        fetchedDepartments.push({ id: doc.id, ...doc.data() } as Department);
      });
      setDepartments(fetchedDepartments);
      setIsLoadingDepartments(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching departments:", err);
      setError("Failed to fetch departments. Please try again.");
      setIsLoadingDepartments(false);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch departments." });
    });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (selectedDepartment?.id) {
      setIsLoadingYears(true);
      setYears([]);
      const yearsCollectionRef = collection(db, "departments", selectedDepartment.id, "years");
      const q = query(yearsCollectionRef, orderBy("name", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedYears: Year[] = [];
        snapshot.forEach((doc) => {
          fetchedYears.push({ id: doc.id, ...doc.data() } as Year);
        });
        setYears(fetchedYears);
        setIsLoadingYears(false);
        setError(null);
      }, (err) => {
        console.error(`Error fetching years for ${selectedDepartment.name}:`, err);
        setError(`Failed to fetch years. Please try again.`);
        setIsLoadingYears(false);
        toast({ variant: "destructive", title: "Error", description: `Could not fetch years for ${selectedDepartment.name}.`});
      });
      return () => unsubscribe();
    } else {
      setYears([]);
      setSelectedYear(null); 
    }
  }, [selectedDepartment?.id, toast, selectedDepartment?.name]);

  useEffect(() => {
    if (selectedDepartment?.id && selectedYear?.id) {
      setIsLoadingSpecialities(true);
      setSpecialities([]);
      const specialitiesCollectionRef = collection(db, "departments", selectedDepartment.id, "years", selectedYear.id, "specialities");
      const q = query(specialitiesCollectionRef, orderBy("name", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedSpecialities: Speciality[] = [];
        snapshot.forEach((doc) => {
          fetchedSpecialities.push({ id: doc.id, ...doc.data() } as Speciality);
        });
        setSpecialities(fetchedSpecialities);
        setIsLoadingSpecialities(false);
        setError(null);
      }, (err) => {
        console.error(`Error fetching specialities for ${selectedYear.name}:`, err);
        setError(`Failed to fetch specialities. Please try again.`);
        setIsLoadingSpecialities(false);
        toast({ variant: "destructive", title: "Error", description: `Could not fetch specialities for ${selectedYear.name}.`});
      });
      return () => unsubscribe();
    } else {
      setSpecialities([]);
    }
  }, [selectedDepartment?.id, selectedYear?.id, toast, selectedYear?.name]);


  const handleAddDepartment = async (event: FormEvent) => {
    event.preventDefault();
    if (!newDepartmentName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Department name cannot be empty." });
      return;
    }
    setIsProcessingDepartment(true); setError(null);
    try {
      await addDoc(collection(db, "departments"), { name: newDepartmentName.trim(), createdAt: serverTimestamp() });
      setNewDepartmentName('');
      toast({ title: "Success", description: `Department "${newDepartmentName.trim()}" added.` });
    } catch (err: any) {
      console.error("Error adding department:", err); setError("Failed to add department.");
      toast({ variant: "destructive", title: "Error", description: "Could not add department." });
    } finally { setIsProcessingDepartment(false); }
  };

  const openEditDepartmentDialog = (department: Department) => {
    setEditingDepartment(department); setDepartmentToEditName(department.name); setShowEditDepartmentDialog(true);
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment || !departmentToEditName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Department name cannot be empty for update." }); return;
    }
    setIsProcessingDepartment(true); setError(null);
    try {
      const deptDocRef = doc(db, "departments", editingDepartment.id);
      await updateDoc(deptDocRef, { name: departmentToEditName.trim() });
      setShowEditDepartmentDialog(false); setEditingDepartment(null);
      toast({ title: "Success", description: `Department "${departmentToEditName.trim()}" updated.` });
    } catch (err: any) {
      console.error("Error updating department:", err); setError("Failed to update department.");
      toast({ variant: "destructive", title: "Error", description: "Could not update department." });
    } finally { setIsProcessingDepartment(false); }
  };
  
  const openDeleteDepartmentDialog = (department: Department) => {
    setDepartmentToDelete(department); setShowDeleteDepartmentConfirmDialog(true);
  };

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return;
    setIsProcessingDepartment(true); setError(null);
    try {
      if (selectedDepartment?.id === departmentToDelete.id) { setSelectedDepartment(null); } // Also resets selectedYear and specialities via useEffect
      const deptDocRef = doc(db, "departments", departmentToDelete.id);
      await deleteDoc(deptDocRef);
      setShowDeleteDepartmentConfirmDialog(false); setDepartmentToDelete(null);
      toast({ title: "Success", description: `Department "${departmentToDelete.name}" deleted.` });
    } catch (err: any) {
      console.error("Error deleting department:", err); setError("Failed to delete department.");
      toast({ variant: "destructive", title: "Error", description: "Could not delete department." });
    } finally { setIsProcessingDepartment(false); }
  };

  const handleSelectDepartment = (department: Department) => {
    if (selectedDepartment?.id === department.id) {
      setSelectedDepartment(null); // Deselect, also clears selectedYear via useEffect
    } else {
      setSelectedDepartment(department);
      setSelectedYear(null); // Clear year selection when department changes
      setError(null);
    }
  };

  const handleAddYear = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDepartment || !newYearName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Year name cannot be empty and department must be selected."}); return;
    }
    setIsProcessingYear(true); setError(null);
    try {
      await addDoc(collection(db, "departments", selectedDepartment.id, "years"), { name: newYearName.trim(), createdAt: serverTimestamp() });
      setNewYearName('');
      toast({ title: "Success", description: `Year "${newYearName.trim()}" added to ${selectedDepartment.name}.`});
    } catch (err:any) {
      console.error("Error adding year:", err); setError("Failed to add year.");
      toast({ variant: "destructive", title: "Error", description: "Could not add year." });
    } finally { setIsProcessingYear(false); }
  };

  const openEditYearDialog = (year: Year) => {
    setEditingYear(year); setYearToEditName(year.name); setShowEditYearDialog(true);
  };

  const handleUpdateYear = async () => {
    if (!editingYear || !selectedDepartment || !yearToEditName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Year name cannot be empty." }); return;
    }
    setIsProcessingYear(true); setError(null);
    try {
      const yearDocRef = doc(db, "departments", selectedDepartment.id, "years", editingYear.id);
      await updateDoc(yearDocRef, { name: yearToEditName.trim() });
      setShowEditYearDialog(false); setEditingYear(null);
      toast({ title: "Success", description: `Year "${yearToEditName.trim()}" updated.` });
    } catch (err:any) {
      console.error("Error updating year:", err); setError("Failed to update year.");
      toast({ variant: "destructive", title: "Error", description: "Could not update year." });
    } finally { setIsProcessingYear(false); }
  };

  const openDeleteYearDialog = (year: Year) => {
    setYearToDelete(year); setShowDeleteYearConfirmDialog(true);
  };

  const handleDeleteYear = async () => {
    if (!yearToDelete || !selectedDepartment) return;
    setIsProcessingYear(true); setError(null);
    try {
      if (selectedYear?.id === yearToDelete.id) { setSelectedYear(null); } // Also resets specialities via useEffect
      const yearDocRef = doc(db, "departments", selectedDepartment.id, "years", yearToDelete.id);
      await deleteDoc(yearDocRef);
      setShowDeleteYearConfirmDialog(false); setYearToDelete(null);
      toast({ title: "Success", description: `Year "${yearToDelete.name}" deleted.` });
    } catch (err: any) {
      console.error("Error deleting year:", err); setError("Failed to delete year.");
      toast({ variant: "destructive", title: "Error", description: "Could not delete year." });
    } finally { setIsProcessingYear(false); }
  };

  const handleSelectYear = (year: Year) => {
    if (selectedYear?.id === year.id) {
      setSelectedYear(null); // Deselect
    } else {
      setSelectedYear(year);
      setError(null);
    }
  };

  const handleAddSpeciality = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDepartment || !selectedYear || !newSpecialityName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Speciality name cannot be empty and department/year must be selected."}); return;
    }
    setIsProcessingSpeciality(true); setError(null);
    try {
      await addDoc(collection(db, "departments", selectedDepartment.id, "years", selectedYear.id, "specialities"), { name: newSpecialityName.trim(), createdAt: serverTimestamp() });
      setNewSpecialityName('');
      toast({ title: "Success", description: `Speciality "${newSpecialityName.trim()}" added to ${selectedYear.name}.`});
    } catch (err:any) {
      console.error("Error adding speciality:", err); setError("Failed to add speciality.");
      toast({ variant: "destructive", title: "Error", description: "Could not add speciality." });
    } finally { setIsProcessingSpeciality(false); }
  };

  const openEditSpecialityDialog = (speciality: Speciality) => {
    setEditingSpeciality(speciality); setSpecialityToEditName(speciality.name); setShowEditSpecialityDialog(true);
  };

  const handleUpdateSpeciality = async () => {
    if (!editingSpeciality || !selectedDepartment || !selectedYear || !specialityToEditName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Speciality name cannot be empty." }); return;
    }
    setIsProcessingSpeciality(true); setError(null);
    try {
      const specDocRef = doc(db, "departments", selectedDepartment.id, "years", selectedYear.id, "specialities", editingSpeciality.id);
      await updateDoc(specDocRef, { name: specialityToEditName.trim() });
      setShowEditSpecialityDialog(false); setEditingSpeciality(null);
      toast({ title: "Success", description: `Speciality "${specialityToEditName.trim()}" updated.` });
    } catch (err:any) {
      console.error("Error updating speciality:", err); setError("Failed to update speciality.");
      toast({ variant: "destructive", title: "Error", description: "Could not update speciality." });
    } finally { setIsProcessingSpeciality(false); }
  };

  const openDeleteSpecialityDialog = (speciality: Speciality) => {
    setSpecialityToDelete(speciality); setShowDeleteSpecialityConfirmDialog(true);
  };

  const handleDeleteSpeciality = async () => {
    if (!specialityToDelete || !selectedDepartment || !selectedYear) return;
    setIsProcessingSpeciality(true); setError(null);
    try {
      const specDocRef = doc(db, "departments", selectedDepartment.id, "years", selectedYear.id, "specialities", specialityToDelete.id);
      await deleteDoc(specDocRef);
      setShowDeleteSpecialityConfirmDialog(false); setSpecialityToDelete(null);
      toast({ title: "Success", description: `Speciality "${specialityToDelete.name}" deleted.` });
    } catch (err: any) {
      console.error("Error deleting speciality:", err); setError("Failed to delete speciality.");
      toast({ variant: "destructive", title: "Error", description: "Could not delete speciality." });
    } finally { setIsProcessingSpeciality(false); }
  };

  return (
    <div className="space-y-6">
      {/* Departments Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Building className="mr-2 h-6 w-6 text-primary" />Manage Departments</CardTitle>
          <CardDescription>Define academic departments. Click on a department to manage its years.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDepartment} className="flex items-end gap-4 mb-6 pb-6 border-b">
            <div className="flex-grow space-y-2">
              <Label htmlFor="newDepartmentName">New Department Name</Label>
              <Input id="newDepartmentName" type="text" placeholder="e.g., Computer Science" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} disabled={isProcessingDepartment} />
            </div>
            <Button type="submit" disabled={isProcessingDepartment || !newDepartmentName.trim()}>
              {isProcessingDepartment && !editingDepartment && !departmentToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Department
            </Button>
          </form>
          {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/><p>{error}</p></div>}
          <h3 className="text-lg font-semibold mb-4 text-foreground">Existing Departments</h3>
          {isLoadingDepartments ? <div className="flex items-center justify-center py-8"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground">Loading departments...</p></div>
            : departments.length === 0 ? <p className="text-muted-foreground text-center py-4">No departments found.</p>
            : <div className="space-y-3">
                {departments.map((dept) => (
                  <Card key={dept.id} className={cn("bg-card hover:shadow-md transition-shadow cursor-pointer", selectedDepartment?.id === dept.id && "ring-2 ring-primary shadow-lg")} onClick={() => handleSelectDepartment(dept)}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform", selectedDepartment?.id === dept.id && "rotate-90 text-primary")} />
                        <span className={cn("ml-2 font-medium text-card-foreground", selectedDepartment?.id === dept.id && "text-primary")}>{dept.name}</span>
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditDepartmentDialog(dept);}} disabled={isProcessingDepartment || isProcessingYear || isProcessingSpeciality}><Edit3 className="mr-1.5 h-4 w-4" /> Edit</Button>
                        <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); openDeleteDepartmentDialog(dept);}} disabled={isProcessingDepartment || isProcessingYear || isProcessingSpeciality}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
          }
        </CardContent>
      </Card>

      {/* Years Management Card */}
      {selectedDepartment && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-6 w-6 text-primary" />Manage Years for {selectedDepartment.name}</CardTitle>
            <CardDescription>Add, edit, or delete academic years. Click on a year to manage its specialities.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddYear} className="flex items-end gap-4 mb-6 pb-6 border-b">
              <div className="flex-grow space-y-2">
                <Label htmlFor="newYearName">New Year Name</Label>
                <Input id="newYearName" type="text" placeholder="e.g., 1st Year" value={newYearName} onChange={(e) => setNewYearName(e.target.value)} disabled={isProcessingYear} />
              </div>
              <Button type="submit" disabled={isProcessingYear || !newYearName.trim()}>
                {isProcessingYear && !editingYear && !yearToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Year
              </Button>
            </form>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Existing Years</h3>
            {isLoadingYears ? <div className="flex items-center justify-center py-8"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground">Loading years...</p></div>
              : years.length === 0 ? <p className="text-muted-foreground text-center py-4">No years found for this department.</p>
              : <div className="space-y-3">
                  {years.map((year) => (
                    <Card key={year.id} className={cn("bg-background hover:shadow-sm transition-shadow cursor-pointer", selectedYear?.id === year.id && "ring-2 ring-primary-foreground shadow-md bg-primary/10")} onClick={() => handleSelectYear(year)}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center">
                           <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform", selectedYear?.id === year.id && "rotate-90 text-primary")} />
                           <span className={cn("ml-2 font-medium text-card-foreground", selectedYear?.id === year.id && "text-primary")}>{year.name}</span>
                        </div>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditYearDialog(year);}} disabled={isProcessingYear || isProcessingDepartment || isProcessingSpeciality}><Edit3 className="mr-1.5 h-4 w-4" /> Edit</Button>
                          <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); openDeleteYearDialog(year);}} disabled={isProcessingYear || isProcessingDepartment || isProcessingSpeciality}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
            }
          </CardContent>
        </Card>
      )}

      {/* Specialities Management Card */}
      {selectedDepartment && selectedYear && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center"><ListTree className="mr-2 h-6 w-6 text-primary" />Manage Specialities for {selectedYear.name} ({selectedDepartment.name})</CardTitle>
            <CardDescription>Add, edit, or delete specialities for the selected year.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSpeciality} className="flex items-end gap-4 mb-6 pb-6 border-b">
              <div className="flex-grow space-y-2">
                <Label htmlFor="newSpecialityName">New Speciality Name</Label>
                <Input id="newSpecialityName" type="text" placeholder="e.g., Software Development" value={newSpecialityName} onChange={(e) => setNewSpecialityName(e.target.value)} disabled={isProcessingSpeciality} />
              </div>
              <Button type="submit" disabled={isProcessingSpeciality || !newSpecialityName.trim()}>
                {isProcessingSpeciality && !editingSpeciality && !specialityToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Speciality
              </Button>
            </form>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Existing Specialities</h3>
            {isLoadingSpecialities ? <div className="flex items-center justify-center py-8"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground">Loading specialities...</p></div>
              : specialities.length === 0 ? <p className="text-muted-foreground text-center py-4">No specialities found for this year.</p>
              : <div className="space-y-3">
                  {specialities.map((spec) => (
                    <Card key={spec.id} className="bg-background hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between">
                        <span className="font-medium text-card-foreground">{spec.name}</span>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditSpecialityDialog(spec)} disabled={isProcessingSpeciality || isProcessingDepartment || isProcessingYear}><Edit3 className="mr-1.5 h-4 w-4" /> Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteSpecialityDialog(spec)} disabled={isProcessingSpeciality || isProcessingDepartment || isProcessingYear}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
            }
          </CardContent>
        </Card>
      )}

      {/* Edit Department Dialog */}
      <Dialog open={showEditDepartmentDialog} onOpenChange={(isOpen) => { setShowEditDepartmentDialog(isOpen); if (!isOpen) setEditingDepartment(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Department</DialogTitle><DialogDescription>Update department name.</DialogDescription></DialogHeader>
          <div className="space-y-2 py-2"><Label htmlFor="editDepartmentName">Department Name</Label><Input id="editDepartmentName" value={departmentToEditName} onChange={(e) => setDepartmentToEditName(e.target.value)} disabled={isProcessingDepartment}/></div>
          <DialogFooter><DialogClose asChild><Button variant="outline" disabled={isProcessingDepartment}>Cancel</Button></DialogClose><Button onClick={handleUpdateDepartment} disabled={isProcessingDepartment || !departmentToEditName.trim() || departmentToEditName.trim() === editingDepartment?.name}>{isProcessingDepartment && editingDepartment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Department Dialog */}
      <AlertDialog open={showDeleteDepartmentConfirmDialog} onOpenChange={(isOpen) => { setShowDeleteDepartmentConfirmDialog(isOpen); if (!isOpen) setDepartmentToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Department?</AlertDialogTitle><AlertDialogDescription>This permanently deletes "{departmentToDelete?.name}". Associated years/specialities will be orphaned.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isProcessingDepartment}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteDepartment} className="bg-destructive hover:bg-destructive/90" disabled={isProcessingDepartment}>{isProcessingDepartment && departmentToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Year Dialog */}
      <Dialog open={showEditYearDialog} onOpenChange={(isOpen) => { setShowEditYearDialog(isOpen); if (!isOpen) setEditingYear(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Year</DialogTitle><DialogDescription>Update year name for {selectedDepartment?.name}.</DialogDescription></DialogHeader>
          <div className="space-y-2 py-2"><Label htmlFor="editYearName">Year Name</Label><Input id="editYearName" value={yearToEditName} onChange={(e) => setYearToEditName(e.target.value)} disabled={isProcessingYear}/></div>
          <DialogFooter><DialogClose asChild><Button variant="outline" disabled={isProcessingYear}>Cancel</Button></DialogClose><Button onClick={handleUpdateYear} disabled={isProcessingYear || !yearToEditName.trim() || yearToEditName.trim() === editingYear?.name}>{isProcessingYear && editingYear ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Year Dialog */}
      <AlertDialog open={showDeleteYearConfirmDialog} onOpenChange={(isOpen) => { setShowDeleteYearConfirmDialog(isOpen); if (!isOpen) setYearToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Year?</AlertDialogTitle><AlertDialogDescription>This permanently deletes "{yearToDelete?.name}" from "{selectedDepartment?.name}". Associated specialities will be orphaned.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isProcessingYear}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteYear} className="bg-destructive hover:bg-destructive/90" disabled={isProcessingYear}>{isProcessingYear && yearToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Speciality Dialog */}
      <Dialog open={showEditSpecialityDialog} onOpenChange={(isOpen) => { setShowEditSpecialityDialog(isOpen); if (!isOpen) setEditingSpeciality(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Speciality</DialogTitle><DialogDescription>Update speciality name for {selectedYear?.name} in {selectedDepartment?.name}.</DialogDescription></DialogHeader>
          <div className="space-y-2 py-2"><Label htmlFor="editSpecialityName">Speciality Name</Label><Input id="editSpecialityName" value={specialityToEditName} onChange={(e) => setSpecialityToEditName(e.target.value)} disabled={isProcessingSpeciality}/></div>
          <DialogFooter><DialogClose asChild><Button variant="outline" disabled={isProcessingSpeciality}>Cancel</Button></DialogClose><Button onClick={handleUpdateSpeciality} disabled={isProcessingSpeciality || !specialityToEditName.trim() || specialityToEditName.trim() === editingSpeciality?.name}>{isProcessingSpeciality && editingSpeciality ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Speciality Dialog */}
      <AlertDialog open={showDeleteSpecialityConfirmDialog} onOpenChange={(isOpen) => { setShowDeleteSpecialityConfirmDialog(isOpen); if (!isOpen) setSpecialityToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Speciality?</AlertDialogTitle><AlertDialogDescription>This permanently deletes speciality "{specialityToDelete?.name}" from year "{selectedYear?.name}" in department "{selectedDepartment?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isProcessingSpeciality}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSpeciality} className="bg-destructive hover:bg-destructive/90" disabled={isProcessingSpeciality}>{isProcessingSpeciality && specialityToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    