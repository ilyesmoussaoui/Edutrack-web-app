
"use client";

import type { FormEvent } from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Edit3, Trash2, Loader2, AlertTriangle, PlusCircle, Briefcase, ChevronRight } from 'lucide-react';
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

  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  
  const [isProcessingDepartment, setIsProcessingDepartment] = useState(false);
  const [isProcessingYear, setIsProcessingYear] = useState(false);
  
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch departments.",
      });
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (selectedDepartment?.id) {
      setIsLoadingYears(true);
      setYears([]); // Clear previous years
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
        toast({
          variant: "destructive",
          title: "Error",
          description: `Could not fetch years for ${selectedDepartment.name}.`,
        });
      });
      return () => unsubscribe();
    } else {
      setYears([]);
    }
  }, [selectedDepartment?.id, toast, selectedDepartment?.name]);


  const handleAddDepartment = async (event: FormEvent) => {
    event.preventDefault();
    if (!newDepartmentName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Department name cannot be empty." });
      return;
    }
    setIsProcessingDepartment(true);
    setError(null);
    try {
      await addDoc(collection(db, "departments"), { 
        name: newDepartmentName.trim(),
        createdAt: serverTimestamp()
      });
      setNewDepartmentName('');
      toast({ title: "Success", description: `Department "${newDepartmentName.trim()}" added.` });
    } catch (err: any) {
      console.error("Error adding department:", err);
      setError("Failed to add department. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Could not add department." });
    } finally {
      setIsProcessingDepartment(false);
    }
  };

  const openEditDepartmentDialog = (department: Department) => {
    setEditingDepartment(department);
    setDepartmentToEditName(department.name);
    setShowEditDepartmentDialog(true);
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment || !departmentToEditName.trim()) {
       toast({ variant: "destructive", title: "Validation Error", description: "Department name cannot be empty for update." });
      return;
    }
    setIsProcessingDepartment(true);
    setError(null);
    try {
      const departmentDocRef = doc(db, "departments", editingDepartment.id);
      await updateDoc(departmentDocRef, { name: departmentToEditName.trim() });
      setShowEditDepartmentDialog(false);
      setEditingDepartment(null);
      toast({ title: "Success", description: `Department "${departmentToEditName.trim()}" updated.` });
    } catch (err: any) {
      console.error("Error updating department:", err);
      setError("Failed to update department. Please try again.");
       toast({ variant: "destructive", title: "Error", description: "Could not update department." });
    } finally {
      setIsProcessingDepartment(false);
    }
  };
  
  const openDeleteDepartmentDialog = (department: Department) => {
    setDepartmentToDelete(department);
    setShowDeleteDepartmentConfirmDialog(true);
  };

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return;
    setIsProcessingDepartment(true);
    setError(null);
    try {
      // If the department being deleted is currently selected, unselect it
      if (selectedDepartment?.id === departmentToDelete.id) {
        setSelectedDepartment(null);
      }
      const departmentDocRef = doc(db, "departments", departmentToDelete.id);
      // Note: Deleting a document does not automatically delete its subcollections in client SDKs.
      // For full cleanup, one might need a Firebase Function or manual deletion of subcollection items.
      // However, for this app's scope, we'll just delete the department document.
      await deleteDoc(departmentDocRef);
      setShowDeleteDepartmentConfirmDialog(false);
      setDepartmentToDelete(null);
      toast({ title: "Success", description: `Department "${departmentToDelete.name}" deleted.` });
    } catch (err: any) {
      console.error("Error deleting department:", err);
      setError("Failed to delete department. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Could not delete department." });
    } finally {
      setIsProcessingDepartment(false);
    }
  };

  const handleSelectDepartment = (department: Department) => {
    if (selectedDepartment?.id === department.id) {
      setSelectedDepartment(null); // Toggle off if already selected
    } else {
      setSelectedDepartment(department);
      setError(null); // Clear general errors when selecting a new department
    }
  };

  const handleAddYear = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDepartment || !newYearName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Year name cannot be empty and a department must be selected."});
      return;
    }
    setIsProcessingYear(true);
    setError(null);
    try {
      await addDoc(collection(db, "departments", selectedDepartment.id, "years"), {
        name: newYearName.trim(),
        createdAt: serverTimestamp()
      });
      setNewYearName('');
      toast({ title: "Success", description: `Year "${newYearName.trim()}" added to ${selectedDepartment.name}.`});
    } catch (err:any) {
      console.error("Error adding year:", err);
      setError("Failed to add year. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Could not add year." });
    } finally {
      setIsProcessingYear(false);
    }
  };

  const openEditYearDialog = (year: Year) => {
    setEditingYear(year);
    setYearToEditName(year.name);
    setShowEditYearDialog(true);
  };

  const handleUpdateYear = async () => {
    if (!editingYear || !selectedDepartment || !yearToEditName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Year name cannot be empty for update." });
      return;
    }
    setIsProcessingYear(true);
    setError(null);
    try {
      const yearDocRef = doc(db, "departments", selectedDepartment.id, "years", editingYear.id);
      await updateDoc(yearDocRef, { name: yearToEditName.trim() });
      setShowEditYearDialog(false);
      setEditingYear(null);
      toast({ title: "Success", description: `Year "${yearToEditName.trim()}" updated.` });
    } catch (err:any) {
      console.error("Error updating year:", err);
      setError("Failed to update year. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Could not update year." });
    } finally {
      setIsProcessingYear(false);
    }
  };

  const openDeleteYearDialog = (year: Year) => {
    setYearToDelete(year);
    setShowDeleteYearConfirmDialog(true);
  };

  const handleDeleteYear = async () => {
    if (!yearToDelete || !selectedDepartment) return;
    setIsProcessingYear(true);
    setError(null);
    try {
      const yearDocRef = doc(db, "departments", selectedDepartment.id, "years", yearToDelete.id);
      await deleteDoc(yearDocRef);
      setShowDeleteYearConfirmDialog(false);
      setYearToDelete(null);
      toast({ title: "Success", description: `Year "${yearToDelete.name}" deleted.` });
    } catch (err: any) {
      console.error("Error deleting year:", err);
      setError("Failed to delete year. Please try again.");
      toast({ variant: "destructive", title: "Error", description: "Could not update year." });
    } finally {
      setIsProcessingYear(false);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-6 w-6 text-primary" />
            Manage Departments
          </CardTitle>
          <CardDescription>Define academic departments. Click on a department to manage its years.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDepartment} className="flex items-end gap-4 mb-6 pb-6 border-b">
            <div className="flex-grow space-y-2">
              <Label htmlFor="newDepartmentName">New Department Name</Label>
              <Input
                id="newDepartmentName"
                type="text"
                placeholder="e.g., Computer Science"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                disabled={isProcessingDepartment}
              />
            </div>
            <Button type="submit" disabled={isProcessingDepartment || !newDepartmentName.trim()}>
              {isProcessingDepartment && !editingDepartment && !departmentToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Add Department
            </Button>
          </form>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5"/>
              <p>{error}</p>
            </div>
          )}

          <h3 className="text-lg font-semibold mb-4 text-foreground">Existing Departments</h3>
          {isLoadingDepartments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading departments...</p>
            </div>
          ) : departments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No departments found. Add one to get started.</p>
          ) : (
            <div className="space-y-3">
              {departments.map((dept) => (
                <Card 
                  key={dept.id} 
                  className={cn(
                    "bg-card hover:shadow-md transition-shadow cursor-pointer",
                    selectedDepartment?.id === dept.id && "ring-2 ring-primary shadow-lg"
                  )}
                  onClick={() => handleSelectDepartment(dept)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform", selectedDepartment?.id === dept.id && "rotate-90 text-primary")} />
                      <span className={cn("ml-2 font-medium text-card-foreground", selectedDepartment?.id === dept.id && "text-primary")}>{dept.name}</span>
                    </div>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditDepartmentDialog(dept);}} disabled={isProcessingDepartment || isProcessingYear}>
                        <Edit3 className="mr-1.5 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); openDeleteDepartmentDialog(dept);}} disabled={isProcessingDepartment || isProcessingYear}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDepartment && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="mr-2 h-6 w-6 text-primary" />
              Manage Years for {selectedDepartment.name}
            </CardTitle>
            <CardDescription>Add, edit, or delete academic years for the selected department.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddYear} className="flex items-end gap-4 mb-6 pb-6 border-b">
              <div className="flex-grow space-y-2">
                <Label htmlFor="newYearName">New Year Name</Label>
                <Input
                  id="newYearName"
                  type="text"
                  placeholder="e.g., 1st Year, Final Year"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  disabled={isProcessingYear}
                />
              </div>
              <Button type="submit" disabled={isProcessingYear || !newYearName.trim()}>
                {isProcessingYear && !editingYear && !yearToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Add Year
              </Button>
            </form>

            <h3 className="text-lg font-semibold mb-4 text-foreground">Existing Years</h3>
            {isLoadingYears ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading years...</p>
              </div>
            ) : years.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No years found for this department. Add one to get started.</p>
            ) : (
              <div className="space-y-3">
                {years.map((year) => (
                  <Card key={year.id} className="bg-background hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="font-medium text-card-foreground">{year.name}</span>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditYearDialog(year)} disabled={isProcessingYear || isProcessingDepartment}>
                          <Edit3 className="mr-1.5 h-4 w-4" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => openDeleteYearDialog(year)} disabled={isProcessingYear || isProcessingDepartment}>
                          <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Department Dialog */}
      <Dialog open={showEditDepartmentDialog} onOpenChange={(isOpen) => {
        setShowEditDepartmentDialog(isOpen);
        if (!isOpen) setEditingDepartment(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update the name of the department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="editDepartmentName">Department Name</Label>
            <Input
              id="editDepartmentName"
              value={departmentToEditName}
              onChange={(e) => setDepartmentToEditName(e.target.value)}
              placeholder="e.g., Mathematics"
              disabled={isProcessingDepartment}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessingDepartment}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateDepartment} disabled={isProcessingDepartment || !departmentToEditName.trim() || departmentToEditName.trim() === editingDepartment?.name}>
              {isProcessingDepartment && editingDepartment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Department Confirmation Dialog */}
      <AlertDialog open={showDeleteDepartmentConfirmDialog} onOpenChange={(isOpen) => {
        setShowDeleteDepartmentConfirmDialog(isOpen);
        if (!isOpen) setDepartmentToDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the department
              <span className="font-semibold"> "{departmentToDelete?.name}"</span>. 
              Any associated years will remain in the database but will be orphaned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingDepartment}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDepartment} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isProcessingDepartment}>
              {isProcessingDepartment && departmentToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Department
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Year Dialog */}
      <Dialog open={showEditYearDialog} onOpenChange={(isOpen) => {
        setShowEditYearDialog(isOpen);
        if (!isOpen) setEditingYear(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Year</DialogTitle>
            <DialogDescription>Update the name of the year for {selectedDepartment?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="editYearName">Year Name</Label>
            <Input
              id="editYearName"
              value={yearToEditName}
              onChange={(e) => setYearToEditName(e.target.value)}
              placeholder="e.g., 2nd Year"
              disabled={isProcessingYear}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessingYear}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateYear} disabled={isProcessingYear || !yearToEditName.trim() || yearToEditName.trim() === editingYear?.name}>
              {isProcessingYear && editingYear ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Year Confirmation Dialog */}
      <AlertDialog open={showDeleteYearConfirmDialog} onOpenChange={(isOpen) => {
        setShowDeleteYearConfirmDialog(isOpen);
        if (!isOpen) setYearToDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the year
              <span className="font-semibold"> "{yearToDelete?.name}"</span> from department <span className="font-semibold">"{selectedDepartment?.name}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingYear}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteYear} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isProcessingYear}>
              {isProcessingYear && yearToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Year
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    