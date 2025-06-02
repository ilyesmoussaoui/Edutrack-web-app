"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Info } from 'lucide-react';
import { tryParseFloat } from '@/lib/csv-parser';
import type { ParsedCSV } from '@/lib/csv-parser';
import type { SuggestChartTypesOutput } from '@/ai/flows/suggest-chart-types';
import Image from 'next/image';

export type ChartType = 'bar' | 'line' | 'pie';

interface ChartConfig {
  type: ChartType;
  xAxisKey?: string;
  yAxisKey?: string; // For single Y-axis charts. Could be extended to string[] for multiple.
  categoryKey?: string; // For Pie chart categories
  valueKey?: string; // For Pie chart values
}

interface ChartVisualizerProps {
  data: ParsedCSV | null;
  initialConfig?: ChartConfig | null;
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28'];

export function ChartVisualizer({ data, initialConfig }: ChartVisualizerProps) {
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(initialConfig || null);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setChartConfig(initialConfig || null);
    setLocalErrorMessage(null); // Reset local error when initialConfig changes
  }, [initialConfig]);
  
  useEffect(() => {
    // If there's data but no chart config, default to bar chart if possible
    if (data && data.headers.length > 0 && !chartConfig) {
        const newConfig: ChartConfig = { type: 'bar' };
        if (data.headers.length > 0) newConfig.xAxisKey = data.headers[0];
        if (data.headers.length > 1) newConfig.yAxisKey = data.headers[1];
        setChartConfig(newConfig);
    }
    // If no data, clear config
    if(!data) {
      setChartConfig(null);
    }
  }, [data, chartConfig]);


  const handleConfigChange = <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => {
    setChartConfig(prev => {
      const newConfig = { ...(prev || { type: 'bar' } as ChartConfig), [key]: value };
      // Reset dependent keys if chart type changes
      if (key === 'type') {
        if (value === 'pie') {
          newConfig.xAxisKey = undefined;
          newConfig.yAxisKey = undefined;
          newConfig.categoryKey = data?.headers[0] || undefined;
          newConfig.valueKey = data?.headers[1] || undefined;
        } else { // bar or line
          newConfig.categoryKey = undefined;
          newConfig.valueKey = undefined;
          newConfig.xAxisKey = data?.headers[0] || undefined;
          newConfig.yAxisKey = data?.headers[1] || undefined;
        }
      }
      return newConfig;
    });
    setLocalErrorMessage(null);
  };

  const processedChartData = useMemo(() => {
    if (!data || !chartConfig) return [];
    setLocalErrorMessage(null); // Clear previous errors

    const { type, xAxisKey, yAxisKey, categoryKey, valueKey } = chartConfig;

    if (type === 'pie') {
      if (!categoryKey || !valueKey) {
        setLocalErrorMessage("For Pie charts, please select both a category and a value field.");
        return [];
      }
      return data.rows.map(row => ({
        name: row[categoryKey],
        value: tryParseFloat(row[valueKey]),
      })).filter(item => item.value !== null && item.value !== undefined);
    } else { // Bar or Line
      if (!xAxisKey || !yAxisKey) {
         setLocalErrorMessage("For Bar/Line charts, please select X-axis and Y-axis fields.");
        return [];
      }
      return data.rows.map(row => ({
        name: row[xAxisKey],
        [yAxisKey]: tryParseFloat(row[yAxisKey]),
      })).filter(item => item[yAxisKey] !== null && item[yAxisKey] !== undefined);
    }
  }, [data, chartConfig]);

  if (!data) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Data Visualization</CardTitle>
          <CardDescription>Upload a CSV to visualize your data.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4" />
            <p>No data uploaded yet.</p>
            <p className="text-sm">Please upload a CSV file to begin.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const renderChart = () => {
    if (!chartConfig || processedChartData.length === 0) {
       return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
          {localErrorMessage ? (
            <>
              <AlertCircle className="h-12 w-12 mb-2 text-destructive" />
              <p className="font-semibold text-destructive">Configuration Error</p>
              <p className="text-sm text-center">{localErrorMessage}</p>
            </>
          ) : (
            <>
              <Image src="https://placehold.co/300x200.png" alt="Chart placeholder" width={300} height={200} data-ai-hint="chart graph" className="opacity-50 mb-4 rounded"/>
              <p>Select chart type and configure fields to display data.</p>
              {processedChartData.length === 0 && chartConfig && (chartConfig.xAxisKey || chartConfig.categoryKey) && (chartConfig.yAxisKey || chartConfig.valueKey) && (
                <p className="text-sm mt-1">The selected columns might not contain valid numeric data or data is empty.</p>
              )}
            </>
          )}
        </div>
      );
    }

    switch (chartConfig.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={processedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
              <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--popover-foreground))' }}/>
              <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }}/>
              <Bar dataKey={chartConfig.yAxisKey} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={processedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--foreground))' }}/>
              <YAxis tick={{ fill: 'hsl(var(--foreground))' }}/>
              <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--popover-foreground))' }}/>
              <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }}/>
              <Line type="monotone" dataKey={chartConfig.yAxisKey} stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie data={processedChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                {processedChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--popover-foreground))' }}/>
              <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }}/>
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return <p>Select a chart type.</p>;
    }
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Data Visualization</CardTitle>
        <CardDescription>Configure and view your chart.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-md">
          <div>
            <Label htmlFor="chartTypeSelect">Chart Type</Label>
            <Select
              value={chartConfig?.type || ''}
              onValueChange={(value) => handleConfigChange('type', value as ChartType)}
            >
              <SelectTrigger id="chartTypeSelect">
                <SelectValue placeholder="Select chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {chartConfig?.type !== 'pie' && (
            <>
              <div>
                <Label htmlFor="xAxisKeySelect">X-Axis (Category)</Label>
                <Select
                  value={chartConfig?.xAxisKey || ''}
                  onValueChange={(value) => handleConfigChange('xAxisKey', value)}
                  disabled={!data.headers.length}
                >
                  <SelectTrigger id="xAxisKeySelect">
                    <SelectValue placeholder="Select X-axis" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="yAxisKeySelect">Y-Axis (Value)</Label>
                <Select
                  value={chartConfig?.yAxisKey || ''}
                  onValueChange={(value) => handleConfigChange('yAxisKey', value)}
                  disabled={!data.headers.length}
                >
                  <SelectTrigger id="yAxisKeySelect">
                    <SelectValue placeholder="Select Y-axis" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {chartConfig?.type === 'pie' && (
            <>
              <div>
                <Label htmlFor="categoryKeySelect">Category</Label>
                <Select
                  value={chartConfig?.categoryKey || ''}
                  onValueChange={(value) => handleConfigChange('categoryKey', value)}
                   disabled={!data.headers.length}
                >
                  <SelectTrigger id="categoryKeySelect">
                    <SelectValue placeholder="Select category field" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="valueKeySelect">Value</Label>
                <Select
                  value={chartConfig?.valueKey || ''}
                  onValueChange={(value) => handleConfigChange('valueKey', value)}
                   disabled={!data.headers.length}
                >
                  <SelectTrigger id="valueKeySelect">
                    <SelectValue placeholder="Select value field" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <div className="flex-grow min-h-[400px] border rounded-md p-2 bg-card">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}
