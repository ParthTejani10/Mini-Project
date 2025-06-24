import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
    },
});

/**
 * Dynamically generate system instructions using the Google Gemini API.
 * @returns {Promise<string>} The generated system instructions.
 */
const generateSystemInstruction = async () => {
    const prompt = `
        Create a system instruction for a generative AI model. 
        The instruction should describe the model as an expert in MERN stack development with 10 years of experience. 
        Include examples for creating an Express application, handling REST APIs, and responding to user queries. 
        Ensure the examples are modular, scalable, and follow best practices.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Error generating system instruction:", error);
        throw new Error("Failed to generate system instruction.");
    }
};

// Generate system instructions and use them in the model configuration
const initializeModelWithDynamicInstructions = async () => {
    try {
        const systemInstruction = await generateSystemInstruction();

        const dynamicModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.4,
            },
            systemInstruction,
        });

        return dynamicModel;
    } catch (error) {
        console.error("Error initializing model with dynamic instructions:", error);
        throw new Error("Failed to initialize model with dynamic instructions.");
    }
};

export const generateResult = async (prompt) => {
    try {
        const dynamicModel = await initializeModelWithDynamicInstructions();
        const result = await dynamicModel.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Error generating result:", error);
        throw new Error("Failed to generate result.");
    }
};