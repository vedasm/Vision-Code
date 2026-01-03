import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    frames: {
      type: Type.ARRAY,
      description: "A chronological list of states (frames) representing the code execution step-by-step.",
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.INTEGER, description: "Sequence number of the step" },
          lineCode: { type: Type.STRING, description: "The specific line of code executed in this step" },
          explanation: { type: Type.STRING, description: "What happened in this step (e.g. 'Node 1 created', 'Pointer updated')" },
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                type: { type: Type.STRING },
                color: { type: Type.STRING },
              },
              required: ["id", "label"],
            },
          },
          edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING },
                target: { type: Type.STRING },
                label: { type: Type.STRING },
              },
              required: ["source", "target"],
            },
          },
        },
        required: ["step", "lineCode", "explanation", "nodes", "edges"],
      },
    },
    timeComplexity: { type: Type.STRING, description: "Big-O time complexity (e.g., O(n))" },
    spaceComplexity: { type: Type.STRING, description: "Big-O space complexity" },
    conceptExplanation: { type: Type.STRING, description: "Brief explanation of the logic or data structure state." },
    detectedStructure: { type: Type.STRING, description: "Name of the data structure (e.g., Linked List, BST)" },
  },
  required: ["frames", "timeComplexity", "spaceComplexity", "conceptExplanation", "detectedStructure"],
};

export const analyzeCode = async (code: string, mode: string): Promise<AnalysisResult> => {
  const prompt = `
    You are the "Omni-Mapper" engine. Your goal is to visualize the *step-by-step execution* of the following code.
    
    Language: ${mode}
    Code:
    ${code}

    Instructions:
    1. Analyze the code execution line by line.
    2. Generate a series of 'frames'. Each frame represents the state of the data structure after a significant operation (variable assignment, node creation, pointer update).
    3. **Critical**: Ensure Node IDs are consistent across frames. If a node is created with ID 'n1' in frame 1, it must be 'n1' in all subsequent frames.
    4. Start with an initial frame (empty or first variable). End with the final state.
    5. For Linked Lists/Trees: Visualize nodes and pointers.
    6. For Recursion: Visualize the stack or tree growth.
    
    Return the data strictly in JSON format matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
        systemInstruction: "You are an expert Computer Science educator and visualization engine.",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze code execution.");
  }
};