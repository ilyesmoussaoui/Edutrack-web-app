
"use client";

import type { FormEvent } from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Edit3, Trash2, Loader2, AlertTriangle, PlusCircle } from 'lucide-react';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Department {
  id: string;
  name: string;
  createdAt?: Timestamp;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentToEditName, setDepartmentToEditName] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setIsLoadingList(true);
    const departmentsCollectionRef = collection(db, "departments");
    const q = query(departmentsCollectionRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDepartments: Department[] = [];
      snapshot.forEach((doc) => {
        fetchedDepartments.push({ id: doc.id, ...doc.data() } as Department);
      });
      setDepartments(fetchedDepartments);
      setIsLoadingList(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching departments:", err);
      setError("Failed to fetch departments. Please try again.");
      setIsLoadingList(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch departments.",
      });
    });

    return () => unsubscribe();
  }, [toast]);

  const handleAddDepartment = async (event: FormEvent) => {
    event.preventDefault();
    if (!newDepartmentName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Department name cannot be empty.",
      });
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, "departments"), { 
        name: newDepartmentName.trim(),
        createdAt: serverTimestamp()
      });
      setNewDepartmentName('');
      toast({
        title: "Success",
        description: `Department "${newDepartmentName.trim()}" added.`,
      });
    } catch (err: any) {
      console.error("Error adding department:", err);
      setError("Failed to add department. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not add department.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setDepartmentToEditName(department.name);
    setShowEditDialog(true);
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment || !departmentToEditName.trim()) {
       toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Department name cannot be empty for update.",
      });
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const departmentDocRef = doc(db, "departments", editingDepartment.id);
      await updateDoc(departmentDocRef, { name: departmentToEditName.trim() });
      setShowEditDialog(false);
      setEditingDepartment(null);
      toast({
        title: "Success",
        description: `Department "${departmentToEditName.trim()}" updated.`,
      });
    } catch (err: any) {
      console.error("Error updating department:", err);
      setError("Failed to update department. Please try again.");
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update department.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const openDeleteDialog = (department: Department) => {
    setDepartmentToDelete(department);
    setShowDeleteConfirmDialog(true);
  };

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const departmentDocRef = doc(db, "departments", departmentToDelete.id);
      await deleteDoc(departmentDocRef);
      setShowDeleteConfirmDialog(false);
      setDepartmentToDelete(null);
      toast({
        title: "Success",
        description: `Department "${departmentToDelete.name}" deleted.`,
      });
    } catch (err: any) {
      console.error("Error deleting department:", err);
      setError("Failed to delete department. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete department.",
      });
    } finally {
      setIsSubmitting(false);
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
          <CardDescription>Define and organize academic or functional departments within the application.</CardDescription>
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
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" disabled={isSubmitting || !newDepartmentName.trim()}>
              {isSubmitting && !editingDepartment && !departmentToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
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
          {isLoadingList ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading departments...</p>
            </div>
          ) : departments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No departments found. Add one to get started.</p>
          ) : (
            <div className="space-y-3">
              {departments.map((dept) => (
                <Card key={dept.id} className="bg-card hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="font-medium text-card-foreground">{dept.name}</span>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(dept)} disabled={isSubmitting}>
                        <Edit3 className="mr-1.5 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(dept)} disabled={isSubmitting}>
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

      {/* Edit Department Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(isOpen) => {
        setShowEditDialog(isOpen);
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
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateDepartment} disabled={isSubmitting || !departmentToEditName.trim() || departmentToEditName.trim() === editingDepartment?.name}>
              {isSubmitting && editingDepartment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => {
        setShowDeleteConfirmDialog(isOpen);
        if (!isOpen) setDepartmentToDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the department
              <span className="font-semibold"> "{departmentToDelete?.name}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDepartment} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
              {isSubmitting && departmentToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

