
import { GoogleGenAI, Type } from "@google/genai";
import { Package } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const performOCR = async (base64Image: string): Promise<{ address: string; recipient: string } | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Lógica de logística: Extrae la DIRECCIÓN de entrega (Calle y Número) y el nombre del DESTINATARIO. Retorna JSON: {'address': 'Nombre Calle Numero', 'recipient': '...'}. Si no hay nombre usa 'CLIENTE'." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            address: { type: Type.STRING },
            recipient: { type: Type.STRING }
          },
          required: ["address"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result.address ? result : null;
  } catch (error) {
    console.error("OCR Error:", error);
    return null;
  }
};

export const optimizeRoute = async (packages: Package[]): Promise<Package[]> => {
  if (packages.length < 2) return packages;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `ERES UN EXPERTO EN LOGÍSTICA. Optimiza esta ruta de reparto para MINIMIZAR EL MILLAJE y evitar volver a pasar por la misma calle dos veces. 
      REGLAS CRÍTICAS:
      1. Agrupa paquetes de la MISMA CALLE.
      2. Ordena los números de casa de forma secuencial (ej. 100, 105, 120) para no retroceder.
      3. Minimiza giros en U.
      4. Retorna SOLO un array de IDs en el orden óptimo.
      
      PAQUETES: ${JSON.stringify(packages.map(p => ({id: p.id, address: p.address})))}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const orderedIds: string[] = JSON.parse(response.text || "[]");
    const optimized = orderedIds
        .map(id => packages.find(p => p.id === id))
        .filter((p): p is Package => p !== undefined);
    
    const missing = packages.filter(p => !orderedIds.includes(p.id));
    return [...optimized, ...missing];
  } catch (error) {
    console.warn("Route optimization failed:", error);
    return packages;
  }
};
