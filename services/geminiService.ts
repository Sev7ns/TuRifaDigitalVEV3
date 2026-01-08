import { GoogleGenAI } from "@google/genai";

// Declaration to fix "Cannot find name 'process'" error (TS2580)
declare var process: {
  env: {
    API_KEY: string;
  };
};

export const generateRaffleDescription = async (
  title: string, 
  ticketPrice: number, 
  prizes: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Write a catchy, exciting, and professional description for a digital raffle.
      Title: ${title}
      Ticket Price: $${ticketPrice}
      Prizes involved: ${prizes}
      
      Keep it under 100 words. Use emojis. Focus on urgency and trust.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a professional marketing copywriter for high-end digital raffles.",
      }
    });

    return response.text || "Join our exclusive raffle today! Win amazing prizes.";
  } catch (error) {
    console.error("Gemini Generation Failed:", error);
    return "Error generating content. Please write description manually.";
  }
};