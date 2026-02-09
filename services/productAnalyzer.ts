
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Assets } from "../types";

/**
 * Represents the analyzed identity/characteristics of a product
 * extracted from reference images
 */
export interface ProductIdentity {
    jar: {
        labelColor: string;
        labelText: string;
        shape: string;
        approximateHeight: string;
    };
    box: {
        primaryColor: string;
        pattern: string;
        approximateHeight: string;
    };
    cards: {
        design: string;
        approximateSize: string;
    };
    rawAnalysis: string; // Full AI analysis text for reference
}

/**
 * Analyzes product assets to extract consistent identity information
 * that should be maintained across all generated scenes
 * 
 * @param assets - The uploaded product reference images
 * @returns ProductIdentity object with detailed product characteristics
 */
export const analyzeProductIdentity = async (assets: Assets): Promise<ProductIdentity> => {
    const apiKey = typeof window !== 'undefined' && localStorage.getItem('gemini_api_key')
        ? localStorage.getItem('gemini_api_key')!.trim()
        : (import.meta.env as any).VITE_GEMINI_API_KEY || (import.meta.env as any).GEMINI_API_KEY;

    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = [];

    // Add all available reference images
    if (assets.product) {
        parts.push(
            { inlineData: { mimeType: assets.product.mimeType, data: assets.product.data.split(",")[1] } },
            { text: "[IMAGE 1]: MAIN PRODUCT JAR - Analyze shape, label color, label text, approximate height" }
        );
    }

    if (assets.lid) {
        parts.push(
            { inlineData: { mimeType: assets.lid.mimeType, data: assets.lid.data.split(",")[1] } },
            { text: "[IMAGE 2]: JAR LID - Analyze color, material, design" }
        );
    }

    if (assets.sticker) {
        parts.push(
            { inlineData: { mimeType: assets.sticker.mimeType, data: assets.sticker.data.split(",")[1] } },
            { text: "[IMAGE 3]: STICKER/CARD FRONT - Analyze design elements, text, style" }
        );
    }

    if (assets.stickerBack) {
        parts.push(
            { inlineData: { mimeType: assets.stickerBack.mimeType, data: assets.stickerBack.data.split(",")[1] } },
            { text: "[IMAGE 4]: STICKER/CARD BACK - Analyze content, design" }
        );
    }

    if (assets.box) {
        parts.push(
            { inlineData: { mimeType: assets.box.mimeType, data: assets.box.data.split(",")[1] } },
            { text: "[IMAGE 5]: GIFT BOX - Analyze color, pattern, design, approximate height relative to jar" }
        );
    }

    if (assets.thankYouCard) {
        parts.push(
            { inlineData: { mimeType: assets.thankYouCard.mimeType, data: assets.thankYouCard.data.split(",")[1] } },
            { text: "[IMAGE 6]: THANK YOU CARD - Analyze design, text" }
        );
    }

    parts.push({
        text: `You are a product analyst. Analyze these product reference images and extract the EXACT visual identity that MUST be maintained consistently across all marketing images.

CRITICAL ANALYSIS REQUIREMENTS:

1. **JAR IDENTITY**:
   - Label color (be VERY specific - e.g., "bright yellow #FFD700", not just "yellow")
   - Exact text visible on label (transcribe it precisely)
   - Jar shape (cylindrical, square, unique shape?)
   - Approximate height (estimate in inches/cm)

2. **BOX IDENTITY**:
   - Primary color scheme (be specific with color names/codes if visible)
   - Pattern/design elements (animals, rainbows, geometric shapes, etc.)
   - Approximate height relative to jar (e.g., "same height as jar ~3.3 inches", "taller than jar ~4 inches")

3. **CARDS/STICKERS IDENTITY**:
   - Design style (cartoon, minimalist, hand-drawn, etc.)
   - Dominant colors
   - Approximate size (business card size ~2 inches, larger, smaller?)
   - Any unique visual elements (characters, icons, borders)

4. **CRITICAL RELATIONSHIPS**:
   - Are the jar and box the same height? If yes, emphasize this STRONGLY.
   - What is the visual hierarchy? (Which item is largest/most prominent)

Output your analysis in a clear, detailed format that can be used as reference for image generation prompts.`
    });

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    jar: {
                        type: Type.OBJECT,
                        properties: {
                            labelColor: { type: Type.STRING, description: "Specific color of the jar label" },
                            labelText: { type: Type.STRING, description: "Exact text visible on the label" },
                            shape: { type: Type.STRING, description: "Shape of the jar" },
                            approximateHeight: { type: Type.STRING, description: "Estimated height of the jar" }
                        },
                        required: ["labelColor", "labelText", "shape", "approximateHeight"]
                    },
                    box: {
                        type: Type.OBJECT,
                        properties: {
                            primaryColor: { type: Type.STRING, description: "Primary color of the box" },
                            pattern: { type: Type.STRING, description: "Pattern or design on the box" },
                            approximateHeight: { type: Type.STRING, description: "Height of box, especially relative to jar" }
                        },
                        required: ["primaryColor", "pattern", "approximateHeight"]
                    },
                    cards: {
                        type: Type.OBJECT,
                        properties: {
                            design: { type: Type.STRING, description: "Design style and elements of the cards" },
                            approximateSize: { type: Type.STRING, description: "Approximate size of the cards" }
                        },
                        required: ["design", "approximateSize"]
                    },
                    rawAnalysis: {
                        type: Type.STRING,
                        description: "Full detailed analysis text"
                    }
                },
                required: ["jar", "box", "cards", "rawAnalysis"]
            }
        }
    });

    const result = JSON.parse(response.text || "{}");
    return result as ProductIdentity;
};

/**
 * Generates a consistency prompt section that enforces product identity
 * across different scenes
 * 
 * @param identity - The analyzed product identity
 * @param sceneNumber - The current scene number (1-6)
 * @returns A formatted prompt section to inject into generation prompts
 */
export const getConsistencyPrompt = (identity: ProductIdentity, sceneNumber: number): string => {
    return `
═══════════════════════════════════════════════════════════════
🔒 MANDATORY PRODUCT IDENTITY (Scene ${sceneNumber})
═══════════════════════════════════════════════════════════════

⚠️  CRITICAL: These product details MUST match EXACTLY across ALL scenes.
    Do NOT change colors, labels, text, or proportions.

📦 MAIN JAR:
   • Shape: ${identity.jar.shape}
   • Label Color: ${identity.jar.labelColor}
   • Label Text: "${identity.jar.labelText}"
   • Height: ${identity.jar.approximateHeight}

📦 GIFT BOX:
   • Color: ${identity.box.primaryColor}
   • Pattern: ${identity.box.pattern}
   • Height: ${identity.box.approximateHeight}

🎴 CARDS/STICKERS:
   • Design: ${identity.cards.design}
   • Size: ${identity.cards.approximateSize}

⚡ CRITICAL RELATIONSHIPS:
${identity.jar.approximateHeight.toLowerCase().includes('same') ||
            identity.box.approximateHeight.toLowerCase().includes('same') ||
            identity.box.approximateHeight.toLowerCase().includes('equal')
            ? `   • ⚠️  JAR and BOX are THE SAME HEIGHT! This is CRITICAL - they must appear equal in height!`
            : `   • Height relationship: Jar (${identity.jar.approximateHeight}) vs Box (${identity.box.approximateHeight})`
        }

🚫 DO NOT:
   • Change the jar label color or text
   • Modify the box pattern or design
   • Alter the relative sizes of jar vs box
   • Hallucinate different products (e.g., real pickles instead of pickle cards)

✅ PRODUCT CONSISTENCY CHECK:
   If this is Scene ${sceneNumber}, compare with Scene 1.
   The jar label, box design, and product identity MUST be IDENTICAL.

═══════════════════════════════════════════════════════════════
`.trim();
};

/**
 * Gets a short identity summary for inline use in prompts
 * 
 * @param identity - The analyzed product identity
 * @returns A concise one-line summary
 */
export const getIdentitySummary = (identity: ProductIdentity): string => {
    return `Product: ${identity.jar.labelColor} jar labeled "${identity.jar.labelText}", ${identity.box.primaryColor} box with ${identity.box.pattern}, ${identity.cards.design} cards (~${identity.cards.approximateSize})`;
};
