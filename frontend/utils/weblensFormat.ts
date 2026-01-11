/**
 * WebLens File Format Utilities
 * 
 * Handles encoding/decoding of the custom .weblens file format.
 */

import { FlowGraph } from '../types/flow';

const WEBLENS_SIGNATURE = 'WEBLENS_V1';

interface WeblensMetadata {
  version: string;
  timestamp: string;
  flow_name: string;
  flow_description: string;
  checksum: string;
}

/**
 * Calculate SHA-256 checksum of a string
 */
async function calculateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encode a FlowGraph to .weblens format
 */
export async function encodeWeblens(
  flow: FlowGraph,
  flowName?: string,
  flowDescription?: string
): Promise<string> {
  // Serialize flow to JSON
  const flowJson = JSON.stringify(flow, null, 2);
  
  // Calculate checksum
  const checksum = await calculateChecksum(flowJson);
  
  // Create metadata
  const metadata: WeblensMetadata = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    flow_name: flowName || flow.name || 'Untitled Flow',
    flow_description: flowDescription || flow.description || '',
    checksum
  };
  
  const metadataJson = JSON.stringify(metadata, null, 2);
  
  // Assemble .weblens file
  const parts = [
    WEBLENS_SIGNATURE,
    '---METADATA---',
    metadataJson,
    '---FLOW---',
    flowJson,
    '---END---'
  ];
  
  return parts.join('\n');
}

/**
 * Decode a .weblens file to FlowGraph
 */
export async function decodeWeblens(content: string): Promise<{
  metadata: WeblensMetadata;
  flow: FlowGraph;
}> {
  const lines = content.split('\n');
  
  // Validate signature
  if (lines[0] !== WEBLENS_SIGNATURE) {
    throw new Error('Invalid .weblens file: missing signature');
  }
  
  // Find section markers
  const metadataStart = lines.findIndex(l => l === '---METADATA---');
  const flowStart = lines.findIndex(l => l === '---FLOW---');
  const endMarker = lines.findIndex(l => l === '---END---');
  
  if (metadataStart === -1 || flowStart === -1 || endMarker === -1) {
    throw new Error('Invalid .weblens file: missing section markers');
  }
  
  // Extract sections
  const metadataJson = lines.slice(metadataStart + 1, flowStart).join('\n');
  const flowJson = lines.slice(flowStart + 1, endMarker).join('\n');
  
  // Parse JSON
  let metadata: WeblensMetadata;
  let flow: FlowGraph;
  
  try {
    metadata = JSON.parse(metadataJson);
    flow = JSON.parse(flowJson);
  } catch (e) {
    throw new Error('Invalid .weblens file: malformed JSON');
  }
  
  // Verify checksum
  const calculatedChecksum = await calculateChecksum(flowJson);
  if (calculatedChecksum !== metadata.checksum) {
    throw new Error('Invalid .weblens file: checksum mismatch');
  }
  
  return { metadata, flow };
}

/**
 * Validate a .weblens file
 */
export async function validateWeblens(content: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    await decodeWeblens(content);
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

/**
 * Download a .weblens file
 */
export function downloadWeblens(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/x-weblens' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.weblens') ? filename : `${filename}.weblens`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}
