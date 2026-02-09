
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Scene, Assets, GenerationSettings, ProductContext } from "../types";
import { analyzeProductIdentity, getConsistencyPrompt, ProductIdentity } from "./productAnalyzer";

const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.code === 429 || error.message?.includes('429') || error.message?.includes('quota');
    if (retries > 0 && isRateLimit) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const splitPromptIntoScenes = async (
  mainPrompt: string,
  assets: Assets,
  context: ProductContext,
  templates: string[]
): Promise<Scene[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const sceneCount = context === 'LISTING' ? 6 : 5;
  const contextLabel = context === 'LISTING' ? "Amazon Product Listing Images (STANDARD)" : "Amazon A+ Content (BRAND STORY)";

  const templateContext = templates.map((t, i) => `[TEMPLATE SCENE ${i + 1}]:\n${t}`).join('\n\n');

  // Build multimodal parts
  const parts: any[] = [];

  // Add visual context if assets exist
  if (assets.product) parts.push({ inlineData: { mimeType: assets.product.mimeType, data: assets.product.data.split(",")[1] } }, { text: "[VISUAL REFERENCE]: MAIN PRODUCT JAR" });
  if (assets.lid) parts.push({ inlineData: { mimeType: assets.lid.mimeType, data: assets.lid.data.split(",")[1] } }, { text: "[VISUAL REFERENCE]: JAR LID" });
  if (assets.sticker) parts.push({ inlineData: { mimeType: assets.sticker.mimeType, data: assets.sticker.data.split(",")[1] } }, { text: "[VISUAL REFERENCE]: STICKER FRONT/DESIGN" });
  if (assets.stickerBack) parts.push({ inlineData: { mimeType: assets.stickerBack.mimeType, data: assets.stickerBack.data.split(",")[1] } }, { text: "[VISUAL REFERENCE]: STICKER BACK/CONTENT" });
  if (assets.box) parts.push({ inlineData: { mimeType: assets.box.mimeType, data: assets.box.data.split(",")[1] } }, { text: "[VISUAL REFERENCE]: GIFT BOX" });
  if (assets.thankYouCard) parts.push({ inlineData: { mimeType: assets.thankYouCard.mimeType, data: assets.thankYouCard.data.split(",")[1] } }, { text: "[VISUAL REFERENCE]: THANK YOU CARD" });

  const systemInstruction = `
    You are an expert E-commerce Creative Director specializing in ${contextLabel}. 
    Your goal is to write a storyboard based on a USER IDEA ("${mainPrompt}"), while strictly adhering to the structure of the provided REFERENCE TEMPLATES.

    STRICT CONTEXT: This is a ${context === 'LISTING' ? 'LISTING' : 'A+ CONTENT'} project. DO NOT use the logic or style of the other type.

    INPUTS:
    1. VISUAL REFERENCES (Above): Actual product images uploaded by the user.
    2. REFERENCE TEMPLATES (Below): The required layout, text placement, and camera angle for each scene.
    3. USER IDEA: "${mainPrompt}" (The theme/setting/vibe).

    INSTRUCTIONS:
    For each of the ${sceneCount} scenes, generate a detailed image prompt that:
    1. STRUCTURE & LAYOUT: Follows the [TEMPLATE SCENE] structure EXACTLY (composition, text overlays, key elements). Do not change the scene type (e.g. if template says "Infographic", keep it "Infographic").
    2. PRODUCT DETAILS (CRITICAL): Describe the product *exactly* as seen in the VISUAL REFERENCES. 
       - Replace generic template descriptions (e.g. "Green pickle cards") with specific details from the uploaded images (e.g. "Yellow card with cat illustration", "Jar label says 'Happy Jar'").
       - If the uploaded image shows specific colors or text, use them.
       - If no visual reference is provided for a specific item, fallback to the template description.
    3. THEME & ATMOSPHERE: Apply the USER IDEA strictly to the *Background*, *Decorations*, *Lighting*, and *Context*.

    USER IDEA: "${mainPrompt}"

    REFERENCE TEMPLATES TO ADAPT:
    ${templateContext}
  `;

  parts.push({ text: systemInstruction });

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Short title for the scene" },
                prompt: { type: Type.STRING, description: "The full detailed image prompt combining Template Structure + Visual Product Details + User Idea Theme." }
              },
              required: ["title", "prompt"]
            },
            minItems: sceneCount,
            maxItems: sceneCount,
          },
        },
        required: ["scenes"],
      },
    },
  }));

  const rawJson = JSON.parse(response.text || "{\"scenes\": []}");
  return (rawJson.scenes || []).map((data: any, idx: number) => ({
    id: idx + 1,
    title: data.title || `Cảnh ${idx + 1}`,
    prompt: data.prompt,
  }));
};

export const generatePromptsFromAssets = async (assets: Assets, context: ProductContext, templates: string[]): Promise<{ id: number; prompt: string }[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const sceneCount = context === 'LISTING' ? 6 : 5;
  const contextLabel = context === 'LISTING' ? "Standard Product Listing" : "Amazon A+ Content (Brand Story)";
  const negativeContext = context === 'LISTING' ? "Do not use A+ Content layouts." : "Do not use Standard White Background Listing layouts.";

  const templatesInstruction = templates.map((t, i) => `
  [SCENE ${i + 1} TEMPLATE]
  ${t}
  --------------------------------------------------
  `).join('\n');

  const parts: any[] = [];
  if (assets.product) parts.push({ inlineData: { mimeType: assets.product.mimeType, data: assets.product.data.split(",")[1] } }, { text: "VISUAL REF: PRODUCT" });
  if (assets.lid) parts.push({ inlineData: { mimeType: assets.lid.mimeType, data: assets.lid.data.split(",")[1] } }, { text: "VISUAL REF: LID" });
  if (assets.sticker) parts.push({ inlineData: { mimeType: assets.sticker.mimeType, data: assets.sticker.data.split(",")[1] } }, { text: "VISUAL REF: STICKER" });
  if (assets.box) parts.push({ inlineData: { mimeType: assets.box.mimeType, data: assets.box.data.split(",")[1] } }, { text: "VISUAL REF: BOX" });
  if (assets.thankYouCard) parts.push({ inlineData: { mimeType: assets.thankYouCard.mimeType, data: assets.thankYouCard.data.split(",")[1] } }, { text: "VISUAL REF: THANK YOU CARD" });

  parts.push({
    text: `ROLE: Creative Director for ${contextLabel}.
    
    STRICT REQUIREMENT: You are generating ${contextLabel}. ${negativeContext}
    
    TASK: Write exactly ${sceneCount} detailed image prompts (Scene 1 to Scene ${sceneCount}).
    
    CRITICAL RULES:
    1. **STRICTLY ADHERE TO TEMPLATES**: For Scene 1, you MUST adapt [SCENE 1 TEMPLATE]. For Scene 2, use [SCENE 2 TEMPLATE], etc. Do NOT mix them up.
    2. **PRODUCT GROUNDING**: Replace generic template placeholders with ACTUAL details from the VISUAL REF images above.
    3. **SCENE 1 LISTING SPECIAL RULE**: If context is LISTING, Scene 1 MUST follow the layout: Text addition on left ("A DAILY DOSE OF POSITIVITY"), Jar (1.3) and Box (1.2) of equal height on oak desk. NO THANK YOU CARD.
    
    REFERENCE TEMPLATES TO ADAPT:
    ${templatesInstruction}
    
    Output JSON: { "scenes": [{ "id": 1, "prompt": "..." }, { "id": 2, "prompt": "..." }] }`
  });

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                prompt: { type: Type.STRING }
              },
              required: ["id", "prompt"]
            },
            minItems: sceneCount,
            maxItems: sceneCount
          }
        }
      }
    }
  }));

  const rawJson = JSON.parse(response.text || "{\"scenes\": []}");
  return rawJson.scenes || [];
};

export const generateProductTailoredPrompt = async (assets: Assets, referenceTemplate: string, context: ProductContext): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contextLabel = context === 'LISTING' ? "Standard Product Listing" : "Amazon A+ Content";
  const parts: any[] = [];

  if (assets.product) parts.push({ inlineData: { mimeType: assets.product.mimeType, data: assets.product.data.split(",")[1] } });
  if (assets.lid) parts.push({ inlineData: { mimeType: assets.lid.mimeType, data: assets.lid.data.split(",")[1] } });
  if (assets.sticker) parts.push({ inlineData: { mimeType: assets.sticker.mimeType, data: assets.sticker.data.split(",")[1] } });
  if (assets.box) parts.push({ inlineData: { mimeType: assets.box.mimeType, data: assets.box.data.split(",")[1] } });
  if (assets.thankYouCard) parts.push({ inlineData: { mimeType: assets.thankYouCard.mimeType, data: assets.thankYouCard.data.split(",")[1] } });

  parts.push({
    text: `You are creating a prompt for ${contextLabel}.\n\nReference template: "${referenceTemplate}"\n\nTask: Adapt this template to the product images provided above. Keep the layout and vibe of the template, but update the specific product details (colors, text, shape) to match the images. Output ONLY the new prompt in English. If this is Scene 1 of a LISTING, ensure the text "A DAILY DOSE OF POSITIVITY" is on the left and NO thank you card is present.`
  });

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts }
  }));
  return response.text?.trim() || "";
};

export const generateSceneImage = async (
  scene: Scene,
  assets: Assets,
  settings: GenerationSettings,
  isEditing: boolean,
  refinementInstruction?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isHighQuality = settings.quality === "High";
  const modelName = isHighQuality ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";
  const contextStyle = settings.productContext === 'LISTING' ? "E-commerce Listing: Clean studio, high contrast." : "Amazon A+ Content: Cinematic, luxury brand storytelling, editorial look.";
  const parts: any[] = [];

  // STEP 1: Analyze Product Identity (if we have required assets)
  let productIdentity: ProductIdentity | null = null;
  if (assets.product && assets.box) {
    try {
      productIdentity = await analyzeProductIdentity(assets);
      console.log("Product identity analyzed:", productIdentity);
    } catch (error) {
      console.warn("Failed to analyze product identity, proceeding without it:", error);
    }
  }

  // STEP 2: Add Product Identity Grounding (HIGHEST PRIORITY)
  if (productIdentity) {
    const consistencyPrompt = getConsistencyPrompt(productIdentity, scene.id);
    parts.push({ text: consistencyPrompt });
  } else {
    // Fallback warning if no identity analysis
    parts.push({ text: `[IMPORTANT]: You are a professional product photographer. You MUST generate an image that features the EXACT product shown in the reference images below. Pay close attention to the shape, label text, colors, and materials of the 'MAIN PRODUCT JAR', 'JAR LID', and 'GIFT BOX'. Do not hallucinate different packaging or box designs. DO NOT change the jar label color or text between scenes.` });
  }

  // STEP 3: Add Reference Images WITH EXPLICIT DESCRIPTIONS
  parts.push({ text: "═══════════════════════════════════════════════════════\n📸 REFERENCE IMAGES - STUDY THESE CAREFULLY\n═══════════════════════════════════════════════════════" });

  if (assets.product) {
    parts.push({ text: "\n🏺 REFERENCE IMAGE 1: MAIN PRODUCT JAR\n→ This is THE jar you MUST recreate in the scene.\n→ COPY its exact label color, text, shape.\n→ DO NOT invent a different jar design." });
    parts.push({ inlineData: { mimeType: assets.product.mimeType, data: assets.product.data.split(",")[1] } });
  }

  if (assets.lid) {
    parts.push({ text: "\n🎨 REFERENCE IMAGE 2: JAR LID DESIGN\n→ This is the exact lid design.\n→ COPY this lid appearance." });
    parts.push({ inlineData: { mimeType: assets.lid.mimeType, data: assets.lid.data.split(",")[1] } });
  }

  if (assets.sticker) {
    parts.push({ text: "\n🎴 REFERENCE IMAGE 3: CARD/STICKER FRONT\n→ These are the exact cards that go inside the jar.\n→ COPY their design, colors, and characters." });
    parts.push({ inlineData: { mimeType: assets.sticker.mimeType, data: assets.sticker.data.split(",")[1] } });
  }

  if (assets.stickerBack) {
    parts.push({ text: "\n📝 REFERENCE IMAGE 3B: CARD/STICKER BACK\n→ This is the back side of the cards.\n→ COPY this text content and style." });
    parts.push({ inlineData: { mimeType: assets.stickerBack.mimeType, data: assets.stickerBack.data.split(",")[1] } });
  }

  if (assets.box) {
    parts.push({ text: "\n📦 REFERENCE IMAGE 4: GIFT BOX\n→ This is THE exact gift box design.\n→ COPY its color, pattern, and design elements.\n→ DO NOT create a different box." });
    parts.push({ inlineData: { mimeType: assets.box.mimeType, data: assets.box.data.split(",")[1] } });
  }

  if (assets.thankYouCard) {
    parts.push({ text: "\n💌 REFERENCE IMAGE 5: THANK YOU CARD\n→ This is the thank you card design.\n→ COPY this card appearance." });
    parts.push({ inlineData: { mimeType: assets.thankYouCard.mimeType, data: assets.thankYouCard.data.split(",")[1] } });
  }

  parts.push({ text: "\n═══════════════════════════════════════════════════════\n⚠️  END OF REFERENCE IMAGES\n═══════════════════════════════════════════════════════" });

  // STEP 4: Add CRITICAL Negative Prompts
  const negativePrompt = `
🚫 ABSOLUTE PROHIBITIONS - DO NOT VIOLATE:

1. DO NOT change the jar label color from what you see in [REFERENCE IMAGE 1]
2. DO NOT change or modify the text on the jar label
3. DO NOT invent different pickle characters or card designs
4. DO NOT change the box pattern or color scheme
5. DO NOT make the jar opaque if the reference shows it transparent
6. DO NOT add different labels, stickers, or text that aren't in the reference
7. DO NOT change the product from what is shown in reference images

❌ FORBIDDEN ACTIONS:
- Creating a different jar design
- Using different colors for the label
- Changing pickle card illustrations
- Modifying box patterns
- Hallucinating new product variations

✅ YOU MUST:
- Copy the EXACT jar label color and text from [REFERENCE IMAGE 1]
- Copy the EXACT pickle card design from [REFERENCE IMAGE 3]
- Copy the EXACT box pattern from [REFERENCE IMAGE 4]
- Only change the BACKGROUND, LIGHTING, and SETTING
- Keep the product looking IDENTICAL to references
  `.trim();

  parts.push({ text: negativePrompt });

  // STEP 5: Add Editing or Generation Instruction
  if (isEditing && scene.imageUrl) {
    // EDIT MODE: Include the current image and the refinement instruction
    parts.push({ inlineData: { mimeType: "image/png", data: scene.imageUrl.split(",")[1] } });
    parts.push({ text: `[IMAGE TO EDIT]: The image above is the current generated result.` });

    const instr = refinementInstruction || "Improve the quality and realism of this image.";
    parts.push({ text: `[TASK]: EDIT the [IMAGE TO EDIT] based on this instruction: "${instr}". Maintain the product identity from reference images. Context: ${contextStyle}` });
  } else {
    // GENERATION MODE: Ignore previous image, start fresh from prompt
    parts.push({
      text: `
[TASK]: Generate a lifestyle product photography image.

🎯 YOUR MISSION:
1. Look at [REFERENCE IMAGE 1] (jar), [REFERENCE IMAGE 3] (cards), [REFERENCE IMAGE 4] (box)
2. MEMORIZE their exact appearance - colors, text, design
3. RECREATE them IDENTICALLY in the new scene
4. Only change the background/setting according to: "${scene.prompt}"

SCENE DESCRIPTION: "${scene.prompt}"
STYLE: ${contextStyle}
ASPECT RATIO: ${settings.aspectRatio}

⚠️ CRITICAL REMINDER (FINAL WARNING):
The jar label, pickle cards, and box MUST look EXACTLY like the reference images.
If you change their design, this generation will FAIL.
COPY the product appearance, CHANGE only the background.
    `.trim()
    });

    // IMPORTANT: Remind AI of reference images ONE MORE TIME before generation
    if (assets.product) {
      parts.push({ text: "\n\n🔁 REMINDER: Here is the EXACT jar you must copy:" });
      parts.push({ inlineData: { mimeType: assets.product.mimeType, data: assets.product.data.split(",")[1] } });
    }
    if (assets.box) {
      parts.push({ text: "🔁 REMINDER: Here is the EXACT box you must copy:" });
      parts.push({ inlineData: { mimeType: assets.box.mimeType, data: assets.box.data.split(",")[1] } });
    }
    if (assets.sticker) {
      parts.push({ text: "🔁 REMINDER: Here are the EXACT cards you must copy:" });
      parts.push({ inlineData: { mimeType: assets.sticker.mimeType, data: assets.sticker.data.split(",")[1] } });
    }
  }

  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: { imageConfig: { aspectRatio: settings.aspectRatio, ...(isHighQuality ? { imageSize: "1K" } : {}) } }
  }));

  let imageUrl = "";
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) { imageUrl = `data:image/png;base64,${part.inlineData.data}`; break; }
    }
  }
  if (!imageUrl) throw new Error("Image error");
  return imageUrl;
};
