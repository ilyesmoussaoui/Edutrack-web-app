"use client";

import type { ChangeEvent, DragEvent } from "react";
import React, { useState, useCallback } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedCSV } from "@/lib/csv-parser";
import { parseCSV } from "@/lib/csv-parser";
import { useToast } from "@/hooks/use-toast";

interface CSVUploaderProps {
  onFileUpload: (data: ParsedCSV & { fileName: string; rawContent: string }) => void;
  clearData: () => void;
  uploadedFileName: string | null;
}

export function CSVUploader({ onFileUpload, clearData, uploadedFileName }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileChange = useCallback((file: File | null) => {
    if (file) {
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (text) {
            try {
              const parsedData = parseCSV(text);
              if (parsedData.headers.length === 0 || parsedData.rows.length === 0) {
                toast({
                  variant: "destructive",
                  title: "Empty CSV",
                  description: "The uploaded CSV file appears to be empty or incorrectly formatted.",
                });
                return;
              }
              onFileUpload({ ...parsedData, fileName: file.name, rawContent: text });
              toast({
                title: "CSV Uploaded",
                description: `${file.name} has been successfully processed.`,
              });
            } catch (error) {
               toast({
                variant: "destructive",
                title: "Parsing Error",
                description: `Could not parse ${file.name}. Please ensure it's a valid CSV.`,
              });
            }
          }
        };
        reader.onerror = () => {
          toast({
            variant: "destructive",
            title: "File Read Error",
            description: `Could not read ${file.name}.`,
          });
        }
        reader.readAsText(file);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a valid .csv file.",
        });
      }
    }
  }, [onFileUpload, toast]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileChange(event.dataTransfer.files[0]);
    }
  }, [handleFileChange]);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFileChange(event.target.files[0]);
      event.target.value = ""; // Reset file input
    }
  }, [handleFileChange]);

  if (uploadedFileName) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uploaded CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-md bg-secondary/30">
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">{uploadedFileName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={clearData} aria-label="Remove file">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload CSV File</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md cursor-pointer
            ${isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/70"}
            transition-colors duration-200 ease-in-out`}
          onClick={() => document.getElementById("csvFileInput")?.click()}
        >
          <UploadCloud className={`h-12 w-12 mb-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          <p className="mb-2 text-sm text-center">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground text-center">CSV files up to 5MB</p>
          <input
            type="file"
            id="csvFileInput"
            accept=".csv"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
}
