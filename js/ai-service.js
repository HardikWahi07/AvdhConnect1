// AI Service for BizHub
// Handles generic chat and business listing evaluation

const GEMINI_API_KEY = 'AIzaSyCTaWfaQHZIsHE73_oitO_U7MXnCgnLwyE';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

class AIService {
    constructor() { }

    // Evaluate a business listing for quality and appropriateness
    // Returns { score: number (0-100), approved: boolean, reason: string }
    async evaluateBusinessListing(name, description, category) {
        const prompt = `
        You are a content moderator for a business directory. Evaluate the following business listing:
        
        Business Name: ${name}
        Category: ${category}
        Description: ${description}
        
        Check for:
        1. Inappropriate content (NSFW, hate speech, illegal).
        2. Spam or low quality (gibberish, repeated text).
        3. Relevance (does it look like a real business?).
        
        Return a JSON object with:
        - score: A quality score from 0 to 100.
        - approved: true if it should be published, false otherwise.
        - reason: A short explanation (max 1 sentence).
        
        Output JSON only.
        `;

        try {
            const response = await this.callGeminiAPI(prompt, true);
            // Clean up code fences if present
            const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            console.error("AI Evaluation failed", e);
            // Default to manual review on error
            return { score: 0, approved: false, reason: "AI Service unavailable. Manual review required." };
        }
    }

    // Generic Chat
    async chat(userMessage, systemContext, history = []) {
        // Construct messages array
        const contents = [];

        // Automation Tools Definition
        const toolsInstruction = `
        You have access to the following tools to control the website and fetch information.
        To use a tool, you must respond with a JSON object in this format:
        { "tool": "toolName", "params": { "param1": "value" }, "response": "Message to user (optional)" }

        Available Tools:
        1. findBusiness(query): Search the database for businesses. Use this to ANSWER questions like "which business is X" or "find me a plumber". Params: { "query": "pizza" }
        2. navigate(url): Go to a page. relative paths allowed (e.g., 'index.html', 'search.html').
        3. search(query): Use this ONLY if the user explicitly asks to "go to search page" or "show me search results". Params: { "query": "pizza" }
        4. setTheme(theme): Switch theme. Params: { "theme": "light" | "dark" | "system" }
        5. showAlert(message, type): Show a toast notification. Params: { "message": "text", "type": "success"|"error"|"info" }
        6. scroll(position): Scroll page. Params: { "position": "top"|"bottom"|"elementId" }

        Strategy:
        - If the user asks a specific question (e.g., "Who is the hackathon team?"), use 'findBusiness' first to get the data, then answer the user in the next turn.
        - If 'findBusiness' returns data, use that data to answer the user's question.
        - If the user wants to perform an action (nav, scroll), use the appropriate tool.
        - Always output valid JSON for tools.
        `;

        if (history.length === 0) {
            const fullSystemContext = systemContext ? `${systemContext}\n\n${toolsInstruction}` : toolsInstruction;
            contents.push({ role: 'user', parts: [{ text: fullSystemContext }] });
            contents.push({ role: 'model', parts: [{ text: "Understood. I can control the website and find info using JSON tool commands." }] });
        } else {
            // If history exists, we need to inject the tool instructions if this is a fresh session context rebuild
            // But usually GeminiChatbot keeps `conversationHistory` which doesn't include the initial system prompt.
            // We should prepend system context to the current request contents.
            const fullSystemContext = systemContext ? `${systemContext}\n\n${toolsInstruction}` : toolsInstruction;
            contents.push({ role: 'user', parts: [{ text: fullSystemContext }] });
            contents.push({ role: 'model', parts: [{ text: "Understood." }] });
        }

        history.forEach(msg => {
            contents.push({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.text }] });
        });

        contents.push({ role: 'user', parts: [{ text: userMessage }] });

        // ReAct Loop
        let iterations = 0;
        const MAX_ITERATIONS = 3;

        while (iterations < MAX_ITERATIONS) {
            iterations++;
            console.log(`🤖 AI Chat Loop Iteration ${iterations}`);

            try {
                const responseText = await this.callGeminiAPI(null, false, contents);

                // Check for tool usage
                let command = null;
                let cleanJson = "";
                try {
                    // Try to clean potential markdown code blocks
                    cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                    if (cleanJson.startsWith('{') && cleanJson.endsWith('}')) {
                        command = JSON.parse(cleanJson);
                    }
                } catch (jsonError) {
                    // Not JSON, treat as normal text
                }

                if (command && command.tool) {
                    // Execute Tool
                    const toolResult = await this.executeTool(command.tool, command.params);

                    // If tool returns data (DATA: prefix), feed it back to AI
                    if (toolResult && typeof toolResult === 'string' && toolResult.startsWith('DATA:')) {
                        console.log("🔄 Feeding tool data back to AI");
                        // Add model's tool call
                        contents.push({ role: 'model', parts: [{ text: cleanJson }] });
                        // Add function output
                        contents.push({ role: 'user', parts: [{ text: `Tool Output: ${toolResult.substring(5)}` }] });
                        continue; // Loop again
                    } else {
                        // Action tool (nav, theme) - just return
                        return command.response || "Done!";
                    }
                }

                // If no tool, or tool was an action, return the text
                return responseText;

            } catch (error) {
                console.error("AI Loop failed", error);
                throw error;
            }
        }

        return "I'm sorry, I got stuck in a loop trying to answer that.";
    }

    // Execute website automation tools
    async executeTool(toolName, params) {
        console.log(`🤖 AI executing tool: ${toolName}`, params);

        switch (toolName) {
            case 'findBusiness':
                try {
                    if (typeof supabase === 'undefined') return "DATA: Database not available.";
                    const { data, error } = await supabase
                        .from('businesses')
                        .select('name, description, category_id, address, phone, email')
                        .or(`name.ilike.%${params.query}%,description.ilike.%${params.query}%`)
                        .limit(5);

                    if (error) return `DATA: Error searching: ${error.message}`;
                    if (!data || data.length === 0) return "DATA: No businesses found matching that query.";

                    return `DATA: Found businesses: ${JSON.stringify(data)}`;
                } catch (e) {
                    return `DATA: Error: ${e.message}`;
                }

            case 'navigate':
                if (params.url) window.location.href = params.url;
                return "Action performed";
            case 'search':
                if (params.query) {
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.value = params.query;
                        if (typeof window.performSearch === 'function') {
                            window.performSearch();
                        } else {
                            searchInput.dispatchEvent(new Event('change'));
                        }
                    } else {
                        window.location.href = `search.html?q=${encodeURIComponent(params.query)}`;
                    }
                }
                return "Action performed";
            case 'setTheme':
                if (params.theme && window.setTheme) {
                    window.setTheme(params.theme);
                }
                return "Action performed";
            case 'showAlert':
                if (typeof showToast === 'function') {
                    showToast(params.message, params.type || 'info');
                } else {
                    alert(`${params.type ? params.type.toUpperCase() : 'INFO'}: ${params.message}`);
                }
                return "Action performed";
            case 'scroll':
                if (params.position === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
                if (params.position === 'bottom') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                if (params.position && params.position !== 'top' && params.position !== 'bottom') {
                    const el = document.getElementById(params.position);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
                return "Action performed";
            default:
                console.warn(`Unknown tool: ${toolName}`);
                return "DATA: Unknown tool";
        }
    }

    async callGeminiAPI(prompt, isJson = false, messages = null) {
        const bodyContent = messages ? { contents: messages } : {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };

        // Use header-based authentication instead of query parameter
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify(bodyContent)
        });

        if (!response.ok) {
            if (response.status === 429) throw new Error('Rate limit exceeded');
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
}

// Export singleton
window.aiService = new AIService();
