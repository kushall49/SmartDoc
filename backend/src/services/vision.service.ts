/**
 * AI Vision Service
 * Uses GPT-4o Vision to analyze images embedded in documents:
 * - Charts and graphs → extract data points
 * - Tables in images → convert to structured data
 * - Signatures → detect presence
 * - Stamps/seals → verify authenticity markers
 * - Handwriting → transcribe
 * - Infographics → extract insights
 *
 * This is a feature most document apps DON'T have.
 * Standard OCR (Tesseract) only reads text. Vision AI understands CONTEXT.
 */

import openai from '@/lib/openai';
import { logger } from '@/lib/logger';

export type VisionAnalysisType =
  | 'full-analysis'   // Complete document visual understanding
  | 'chart-extraction' // Extract chart data into structured format
  | 'table-extraction' // Extract tables into JSON
  | 'signature-detection' // Detect signatures, stamps
  | 'handwriting'      // Transcribe handwritten text
  | 'quality-check';   // Assess scan quality, detect issues

export interface VisionResult {
  type: VisionAnalysisType;
  description: string;
  structuredData?: Record<string, unknown>;
  confidence: number;
  warnings: string[];
  processingTime: number;
}

export interface ChartData {
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'table' | 'unknown';
  title?: string;
  labels?: string[];
  datasets?: Array<{ label: string; values: number[] }>;
  summary: string;
}

export interface DocumentVisualAnalysis {
  hasCharts: boolean;
  hasTables: boolean;
  hasSignatures: boolean;
  hasHandwriting: boolean;
  hasStamps: boolean;
  scanQuality: 'excellent' | 'good' | 'poor' | 'unreadable';
  charts: ChartData[];
  tables: Array<{ headers: string[]; rows: string[][] }>;
  textualDescription: string;
  redFlags: string[];
}

/**
 * Analyze a document image with GPT-4o Vision
 * This goes beyond simple OCR - it UNDERSTANDS what's in the image
 */
export async function analyzeDocumentWithVision(
  imageBuffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
  analysisType: VisionAnalysisType = 'full-analysis'
): Promise<VisionResult> {
  const startTime = Date.now();

  logger.info('Starting AI Vision analysis', { analysisType, imageSize: imageBuffer.length });

  const prompts: Record<VisionAnalysisType, string> = {
    'full-analysis': `Analyze this document image comprehensively. Identify:
1. Document type and purpose
2. All text content (printed and handwritten)
3. Charts/graphs - describe the data they represent
4. Tables - list headers and sample data
5. Signatures, stamps, or seals present
6. Any suspicious elements, inconsistencies, or red flags
7. Overall scan/document quality

Return a detailed JSON with keys: documentType, extractedText, charts (array), tables (array), 
signatures (boolean), stamps (boolean), redFlags (array), scanQuality (excellent/good/poor), summary.`,

    'chart-extraction': `Focus ONLY on charts and graphs in this image.
For each chart:
- chartType: bar/line/pie/scatter/table
- title: if visible
- xAxisLabel and yAxisLabel
- approximate data values
- key insight from the data
- trends or anomalies

Return JSON with "charts" array. If no charts found, return {"charts": [], "message": "No charts detected"}.`,

    'table-extraction': `Extract ALL tables from this image.
For each table: provide headers array and rows as array of arrays.
Preserve exact values including numbers, dates, and text.
Return JSON: {"tables": [{"title": "...", "headers": [...], "rows": [[...], ...]}]}`,

    'signature-detection': `Analyze this document for authentication markers:
1. Handwritten signatures - location and count
2. Official stamps or seals - type and location  
3. Date stamps
4. Notary marks
5. Any signs of tampering (cut-paste, whiteout, digital alterations)
6. Consistency of ink/pen strokes

Return JSON: {"hasSignature": bool, "hasStamp": bool, "signatureLocations": [], 
"suspiciousSigns": [], "authenticityScore": 0-100, "notes": "..."}`,

    'handwriting': `Transcribe ALL handwritten text in this image with high accuracy.
Include:
- All handwritten notes, annotations, or corrections
- Crossed-out text (mark as [CROSSED OUT: ...])
- Unclear text (mark as [ILLEGIBLE])
- Marginal notes

Return JSON: {"transcriptions": [{"location": "...", "text": "...", "confidence": 0-100}]}`,

    'quality-check': `Assess the quality of this document scan:
1. Overall clarity (0-100)
2. Is text readable throughout?
3. Are there dark spots, shadows, or cutoff edges?
4. Is the document skewed/rotated?
5. Are there any missing sections?
6. Recommendations for re-scanning if needed

Return JSON: {"qualityScore": 0-100, "issues": [], "isReadable": bool, "recommendations": []}`,
  };

  try {
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Vision requires gpt-4o
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high', // High detail for document analysis
              },
            },
            {
              type: 'text',
              text: prompts[analysisType],
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content || '{}';

    // Extract JSON from response (model may wrap it in markdown)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    
    let structuredData: Record<string, unknown> = {};
    try {
      structuredData = JSON.parse(jsonString);
    } catch {
      structuredData = { raw: content };
    }

    const processingTime = Date.now() - startTime;

    logger.info('Vision analysis completed', { analysisType, processingTime });

    return {
      type: analysisType,
      description: (structuredData.summary as string) || content.substring(0, 300),
      structuredData,
      confidence: 90,
      warnings: [],
      processingTime,
    };
  } catch (error) {
    logger.error('Vision analysis failed', error as Error);
    throw new Error(`Vision analysis failed: ${(error as Error).message}`);
  }
}

/**
 * Extract chart data from a document image and convert to JSON
 * This is incredibly powerful - turns visual charts into queryable data
 */
export async function extractChartsFromImage(imageBuffer: Buffer): Promise<ChartData[]> {
  const result = await analyzeDocumentWithVision(imageBuffer, 'image/jpeg', 'chart-extraction');
  const charts = (result.structuredData?.charts as ChartData[]) || [];
  return charts;
}

/**
 * Full visual intelligence pass over a document page
 */
export async function fullVisualIntelligence(
  imageBuffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
): Promise<DocumentVisualAnalysis> {
  const result = await analyzeDocumentWithVision(imageBuffer, mimeType, 'full-analysis');
  const data = result.structuredData || {};

  return {
    hasCharts: Array.isArray(data.charts) && (data.charts as unknown[]).length > 0,
    hasTables: Array.isArray(data.tables) && (data.tables as unknown[]).length > 0,
    hasSignatures: Boolean(data.signatures),
    hasHandwriting: Boolean(data.hasHandwriting),
    hasStamps: Boolean(data.stamps),
    scanQuality: (data.scanQuality as DocumentVisualAnalysis['scanQuality']) || 'good',
    charts: (data.charts as ChartData[]) || [],
    tables: (data.tables as Array<{ headers: string[]; rows: string[][] }>) || [],
    textualDescription: (data.summary as string) || result.description,
    redFlags: (data.redFlags as string[]) || [],
  };
}
