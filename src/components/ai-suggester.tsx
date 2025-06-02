"use client";

import React from "react";
import { useMutation } from "@tanstack/react-query";
import { Lightbulb, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { SuggestChartTypesInput, SuggestChartTypesOutput } from "@/ai/flows/suggest-chart-types";
import { suggestChartTypes } from "@/ai/flows/suggest-chart-types";
import { useToast } from "@/hooks/use-toast";

interface AISuggesterProps {
  csvRawContent: string | null;
  fileName: string | null;
  onSuggestionSelect: (suggestion: SuggestChartTypesOutput['suggestions'][0]) => void;
}

export function AISuggester({ csvRawContent, fileName, onSuggestionSelect }: AISuggesterProps) {
  const { toast } = useToast();

  const mutation = useMutation<SuggestChartTypesOutput, Error, SuggestChartTypesInput>({
    mutationFn: suggestChartTypes,
    onSuccess: (data) => {
      if (data.suggestions && data.suggestions.length > 0) {
        toast({
          title: "Suggestions Ready",
          description: "AI has generated chart suggestions.",
        });
      } else {
        toast({
          variant: "default",
          title: "No Suggestions",
          description: "AI could not generate specific suggestions for this data.",
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Suggestion Error",
        description: error.message || "Failed to get suggestions from AI.",
      });
    },
  });

  const handleGetSuggestions = () => {
    if (csvRawContent) {
      mutation.mutate({ csvData: csvRawContent });
    } else {
      toast({
        variant: "destructive",
        title: "No CSV Data",
        description: "Please upload a CSV file first.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Lightbulb className="h-6 w-6 mr-2 text-primary" />
            <CardTitle>Chart Suggestions</CardTitle>
          </div>
          <Button onClick={handleGetSuggestions} disabled={!csvRawContent || mutation.isPending} size="sm">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Get Suggestions
          </Button>
        </div>
        <CardDescription>
          Let AI analyze {fileName ? `"${fileName}"` : "your CSV"} and suggest optimal chart types.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isError && (
          <div className="flex flex-col items-center justify-center p-6 text-destructive bg-destructive/10 rounded-md">
            <AlertTriangle className="h-10 w-10 mb-2" />
            <p className="font-semibold">Error loading suggestions.</p>
            <p className="text-sm text-center">{mutation.error.message}</p>
          </div>
        )}

        {!mutation.isPending && !mutation.isError && !mutation.data?.suggestions && (
          <div className="text-center text-muted-foreground py-8">
            <p>Upload a CSV and click "Get Suggestions" to see recommendations here.</p>
          </div>
        )}
        
        {mutation.data?.suggestions && mutation.data.suggestions.length === 0 && !mutation.isPending && (
           <div className="text-center text-muted-foreground py-8">
            <p>No specific chart suggestions could be generated for this dataset.</p>
          </div>
        )}

        {mutation.data?.suggestions && mutation.data.suggestions.length > 0 && (
          <ScrollArea className="h-[300px] pr-3">
            <div className="space-y-4">
              {mutation.data.suggestions.map((suggestion, index) => (
                <Card key={index} className="bg-background hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {suggestion.chartType.charAt(0).toUpperCase() + suggestion.chartType.slice(1)} Chart
                       <Button variant="outline" size="sm" onClick={() => onSuggestionSelect(suggestion)}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500"/> Use this
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm pb-3">
                    <p><strong className="font-medium">Reason:</strong> {suggestion.reason}</p>
                    <div>
                      <strong className="font-medium">Data Groupings:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {suggestion.dataGroupings.map((group, i) => (
                          <Badge key={i} variant="secondary">{group}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
       {mutation.isPending && (
        <CardFooter className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Generating suggestions...</p>
        </CardFooter>
        )}
    </Card>
  );
}
