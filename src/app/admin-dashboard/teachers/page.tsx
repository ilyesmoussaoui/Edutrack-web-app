
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs, collectionGroup, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, UserCog, Circle, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

interface Teacher {
  uid: string;
  fullName: string;
  email: string;
  role: string;
  createdAt?: Timestamp;
}

// This interface represents a document from the 'schedule' subcollection
interface ScheduleSlotDocument {
  teacherId?: string;
  // Other fields like day, time, moduleName might exist but are not needed for this page's logic
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignedTeacherIds, setAssignedTeacherIds] = useState<Set<string>>(new Set());
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoadingTeachers(true);
    const teachersQuery = query(
      collection(db, "users"),
      where("role", "==", "Teacher"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(teachersQuery, (snapshot) => {
      const fetchedTeachers: Teacher[] = [];
      snapshot.forEach((doc) => {
        fetchedTeachers.push({ uid: doc.id, ...doc.data() } as Teacher);
      });
      setTeachers(fetchedTeachers);
      setIsLoadingTeachers(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching teachers:", err);
      setError("Failed to fetch teachers.");
      setIsLoadingTeachers(false);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch teachers." });
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    const fetchAssignments = async () => {
      setIsLoadingAssignments(true);
      setError(null); 
      const currentAssignedIds = new Set<string>();
      try {
        // Correctly query all 'schedule' subcollections
        const scheduleSlotsQuery = query(collectionGroup(db, 'schedule'));
        const scheduleSlotsSnapshot = await getDocs(scheduleSlotsQuery);

        scheduleSlotsSnapshot.forEach(slotDoc => {
          const slotData = slotDoc.data() as ScheduleSlotDocument;
          if (slotData && slotData.teacherId) { 
            currentAssignedIds.add(slotData.teacherId);
          }
        });
        setAssignedTeacherIds(currentAssignedIds);
      } catch (err: any) {
        console.error("Error fetching assignments:", err);
         if (err.code === 'permission-denied' || err.message.toLowerCase().includes('permission')) {
          setError("Failed to load teacher assignment statuses due to insufficient permissions. Please check Firestore rules and admin UID configuration.");
          toast({ variant: "destructive", title: "Permissions Error", description: "Could not load teacher assignments. Verify admin setup."});
        } else {
          setError("Failed to load teacher assignment statuses. " + (err.message || "Unknown error."));
          toast({ variant: "destructive", title: "Assignment Status Error", description: "Could not load teacher assignment statuses."});
        }
      } finally {
        setIsLoadingAssignments(false);
      }
    };
    fetchAssignments();
  }, [toast]);

  const isLoading = isLoadingTeachers || isLoadingAssignments;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><UserCog className="mr-2 h-6 w-6 text-primary" />Manage Teachers</CardTitle>
          <CardDescription>View registered teachers and their assignment status.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading teachers and assignments...</p>
            </div>
          ) : error ? (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5"/>
              <p>{error}</p>
            </div>
          ) : teachers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No teachers found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  {/* Add actions column if needed later */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.uid}>
                    <TableCell>
                      <Circle 
                        className={cn(
                          "h-4 w-4", 
                          assignedTeacherIds.has(teacher.uid) 
                            ? "fill-green-500 text-green-500" 
                            : "fill-muted-foreground/50 text-muted-foreground/50"
                        )} 
                        title={assignedTeacherIds.has(teacher.uid) ? "Assigned to classes" : "Not yet assigned to classes"}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{teacher.fullName}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
