
"use client";

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BarChart3, AlertTriangle, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Interfaces (can be moved to a types file later)
interface Department { id: string; name: string; }
interface Year { id: string; name: string; }
interface Speciality { id: string; name: string; }
interface Group { id: string; name: string; }
// Note: GradeRecord interface will be defined in the next step when displaying grades.

export default function GradesViewerPage() {
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableModules, setAvailableModules] = useState<string[]>([]);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedSpecialityId, setSelectedSpecialityId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const [isLoadingDeps, setIsLoadingDeps] = useState(false);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  // Fetch Departments
  useEffect(() => {
    setIsLoadingDeps(true);
    const fetchDepartments = async () => {
      try {
        const q = query(collection(db, "departments"), orderBy("name"));
        const snapshot = await getDocs(q);
        setDepartments(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        console.error("Error fetching departments:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load departments." });
        setError("Could not load departments.");
      } finally {
        setIsLoadingDeps(false);
      }
    };
    fetchDepartments();
  }, [toast]);

  // Fetch Years based on Department
  useEffect(() => {
    if (!selectedDepartmentId) {
      setYears([]); setSelectedYearId('');
      setSpecialities([]); setSelectedSpecialityId('');
      setGroups([]); setSelectedGroupId('');
      setAvailableModules([]); setSelectedModule(null);
      return;
    }
    setIsLoadingYears(true);
    setYears([]); setSelectedYearId(''); 
    setSpecialities([]); setSelectedSpecialityId('');
    setGroups([]); setSelectedGroupId('');
    setAvailableModules([]); setSelectedModule(null);
    const fetchYears = async () => {
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

  // Fetch Specialities based on Year
  useEffect(() => {
    if (!selectedYearId) {
      setSpecialities([]); setSelectedSpecialityId('');
      setGroups([]); setSelectedGroupId('');
      setAvailableModules([]); setSelectedModule(null);
      return;
    }
    setIsLoadingSpecs(true);
    setSpecialities([]); setSelectedSpecialityId('');
    setGroups([]); setSelectedGroupId('');
    setAvailableModules([]); setSelectedModule(null);
    const fetchSpecialities = async () => {
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

  // Fetch Groups based on Speciality
  useEffect(() => {
    if (!selectedSpecialityId) {
      setGroups([]); setSelectedGroupId('');
      setAvailableModules([]); setSelectedModule(null);
      return;
    }
    setIsLoadingGroups(true);
    setGroups([]); setSelectedGroupId('');
    setAvailableModules([]); setSelectedModule(null);
    const fetchGroups = async () => {
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

  // Fetch Modules based on Group
  useEffect(() => {
    if (!selectedGroupId) {
      setAvailableModules([]);
      setSelectedModule(null);
      return;
    }
    setIsLoadingModules(true);
    setAvailableModules([]);
    setSelectedModule(null);
    const fetchModules = async () => {
      try {
        const gradesQuery = query(
          collection(db, "grades"),
          where("groupId", "==", selectedGroupId)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        const moduleSet = new Set<string>();
        gradesSnapshot.forEach(doc => {
          const gradeData = doc.data();
          if (gradeData.moduleName) {
            moduleSet.add(String(gradeData.moduleName).toUpperCase());
          }
        });
        setAvailableModules(Array.from(moduleSet).sort());
      } catch (err) {
        console.error("Error fetching modules from grades:", err);
        toast({ variant: "destructive", title: "Module Error", description: "Could not load modules for the selected group." });
        setError("Failed to load modules for the selected group. Ensure Firestore indexes are set up for 'grades' collection on 'groupId'.");
      } finally {
        setIsLoadingModules(false);
      }
    };
    fetchModules();
  }, [selectedGroupId, toast]);

  const anyDropdownLoading = isLoadingDeps || isLoadingYears || isLoadingSpecs || isLoadingGroups;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-6 w-6 text-primary" />
            Grades Viewer
          </CardTitle>
          <CardDescription>Select a group and module to view student grades.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 border rounded-md shadow-sm">
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
                <SelectTrigger id="year-select" className={!selectedDepartmentId ? "opacity-50 cursor-not-allowed" : ""}><SelectValue placeholder={isLoadingYears ? "Loading..." : "Select Year"} /></SelectTrigger>
                <SelectContent>{years.map(year => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="speciality-select">Speciality</Label>
              <Select value={selectedSpecialityId} onValueChange={setSelectedSpecialityId} disabled={!selectedYearId || anyDropdownLoading}>
                <SelectTrigger id="speciality-select" className={!selectedYearId ? "opacity-50 cursor-not-allowed" : ""}><SelectValue placeholder={isLoadingSpecs ? "Loading..." : "Select Speciality"} /></SelectTrigger>
                <SelectContent>{specialities.map(spec => <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-select">Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId} disabled={!selectedSpecialityId || anyDropdownLoading}>
                <SelectTrigger id="group-select" className={!selectedSpecialityId ? "opacity-50 cursor-not-allowed" : ""}><SelectValue placeholder={isLoadingGroups ? "Loading..." : "Select Group"} /></SelectTrigger>
                <SelectContent>{groups.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-select">Module</Label>
              <Select
                value={selectedModule || ""}
                onValueChange={(value) => setSelectedModule(value === "" ? null : value)}
                disabled={!selectedGroupId || isLoadingModules}
              >
                <SelectTrigger id="module-select" className={!selectedGroupId ? "opacity-50 cursor-not-allowed" : ""}>
                  <SelectValue placeholder={isLoadingModules ? "Loading..." : "Select Module"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.length === 0 && !isLoadingModules && selectedGroupId && (
                     <p className="p-2 text-sm text-muted-foreground text-center">No grades recorded for this group.</p>
                  )}
                  {availableModules.map(mod => <SelectItem key={mod} value={mod}>{mod}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <div className="my-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/><p>{error}</p></div>}
        </CardContent>
      </Card>

      {selectedGroupId && selectedModule && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Grades for {groups.find(g => g.id === selectedGroupId)?.name} - Module: {selectedModule}</CardTitle>
            <CardDescription>Displaying grades for the selected group and module.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for grades table - to be implemented in the next step */}
            <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-muted-foreground/30 rounded-md p-4">
              <Info className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Grades table will be displayed here.</p>
              <p className="text-sm text-muted-foreground">Feature coming soon.</p>
            </div>
          </CardContent>
        </Card>
      )}
       {!selectedGroupId && (
        <Card className="mt-6">
            <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please select a department, year, speciality, and group to view modules and grades.</p>
            </CardContent>
        </Card>
      )}
      {selectedGroupId && !selectedModule && availableModules.length > 0 && (
        <Card className="mt-6">
            <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please select a module to view grades.</p>
            </CardContent>
        </Card>
      )}
      {selectedGroupId && !isLoadingModules && availableModules.length === 0 && (
        <Card className="mt-6">
            <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No grades have been recorded for any module in this group yet.</p>
            </CardContent>
        </Card>
      )}

    </div>
  );
}

