"use client";

import React, { useState, useCallback } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { CSVUploader } from '@/components/csv-uploader';
import { AISuggester } from '@/components/ai-suggester';
import type { ChartConfig, ChartType } from '@/components/chart-visualizer';
import { ChartVisualizer } from '@/components/chart-visualizer';
import type { ParsedCSV } from '@/lib/csv-parser';
import type { SuggestChartTypesOutput } from '@/ai/flows/suggest-chart-types';

interface UploadedFileData extends ParsedCSV {
  fileName: string;
  rawContent: string;
}

export default function DashboardPage() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFileData | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);

  const handleFileUpload = useCallback((data: UploadedFileData) => {
    setUploadedFile(data);
    setChartConfig(null); // Reset chart config on new file upload
  }, []);

  const handleClearData = useCallback(() => {
    setUploadedFile(null);
    setChartConfig(null);
  }, []);

  const handleSuggestionSelect = useCallback((suggestion: SuggestChartTypesOutput['suggestions'][0]) => {
    const newConfig: ChartConfig = { type: suggestion.chartType as ChartType };
    if (suggestion.chartType === 'pie') {
      newConfig.categoryKey = suggestion.dataGroupings[0];
      newConfig.valueKey = suggestion.dataGroupings[1];
    } else { // bar, line
      newConfig.xAxisKey = suggestion.dataGroupings[0];
      newConfig.yAxisKey = suggestion.dataGroupings[1];
    }
    setChartConfig(newConfig);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6 flex flex-col">
            <CSVUploader 
              onFileUpload={handleFileUpload} 
              clearData={handleClearData}
              uploadedFileName={uploadedFile?.fileName || null}
            />
            {uploadedFile && (
              <AISuggester
                csvRawContent={uploadedFile.rawContent}
                fileName={uploadedFile.fileName}
                onSuggestionSelect={handleSuggestionSelect}
              />
            )}
          </div>
          <div className="lg:col-span-2">
            <ChartVisualizer data={uploadedFile} initialConfig={chartConfig} />
          </div>
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        Data Dashboard Lite &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
