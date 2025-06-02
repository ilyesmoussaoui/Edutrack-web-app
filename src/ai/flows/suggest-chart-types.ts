// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview This file defines a Genkit flow that suggests appropriate chart types and data groupings
 * based on the column headers and data types of an uploaded CSV file.
 *
 * - suggestChartTypes - The main function to trigger the chart suggestion flow.
 * - SuggestChartTypesInput - The input type for the suggestChartTypes function, representing the CSV data.
 * - SuggestChartTypesOutput - The output type for the suggestChartTypes function, providing chart suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the CSV data
const SuggestChartTypesInputSchema = z.object({
  csvData: z
    .string()
    .describe('The CSV data uploaded by the user as a string.'),
});

export type SuggestChartTypesInput = z.infer<typeof SuggestChartTypesInputSchema>;

// Define the output schema for the chart suggestions
const SuggestChartTypesOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      chartType: z.string().describe('Suggested chart type (e.g., bar, line, pie).'),
      dataGroupings: z.array(z.string()).describe('Suggested data groupings for the chart.'),
      reason: z.string().describe('Explanation for why this chart type is suggested.'),
    })
  ).describe('Array of suggested chart types and data groupings.'),
});

export type SuggestChartTypesOutput = z.infer<typeof SuggestChartTypesOutputSchema>;

// Exported function to trigger the flow
export async function suggestChartTypes(input: SuggestChartTypesInput): Promise<SuggestChartTypesOutput> {
  return suggestChartTypesFlow(input);
}

// Define the prompt for suggesting chart types
const suggestChartTypesPrompt = ai.definePrompt({
  name: 'suggestChartTypesPrompt',
  input: {schema: SuggestChartTypesInputSchema},
  output: {schema: SuggestChartTypesOutputSchema},
  prompt: `You are an expert data visualization consultant. Analyze the following CSV data and suggest appropriate chart types and data groupings to create effective visualizations.

CSV Data:
{{csvData}}

Consider the column headers and data types to suggest chart types (e.g., bar, line, pie) and optimal data groupings for clear and insightful visualizations. Explain why each chart type is suitable for the data.

Your suggestions should be actionable and directly usable for creating visualizations.

Ensure the output is a valid JSON object that conforms to the SuggestChartTypesOutputSchema.
`, 
});

// Define the Genkit flow for suggesting chart types
const suggestChartTypesFlow = ai.defineFlow(
  {
    name: 'suggestChartTypesFlow',
    inputSchema: SuggestChartTypesInputSchema,
    outputSchema: SuggestChartTypesOutputSchema,
  },
  async input => {
    const {output} = await suggestChartTypesPrompt(input);
    return output!;
  }
);
