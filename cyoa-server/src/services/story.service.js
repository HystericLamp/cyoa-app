const { openai, MODEL } = require('../config/openai');

/**
 * Generate a response from the OpenAI API based on the user's action
 * @param {string} userAction - The user's action to generate a response from
 * @param {number} storyStep - The current step number of the story
 * @returns {string} - The response from the OpenAI API
 */
exports.generateNextStory = async (userAction, storyStep) => {
    const prompt = `
    The user has made the following choice: "${userAction}"
    This is step ${storyStep} of the story.

    Continue the story based on the user's choice.
    The result should be a maximum of 2 paragraphs.

    If the story feels naturally complete, or this is step ${storyStep >= 5 ? storyStep : '{storyStep}'}, end the story with a proper conclusion and do NOT provide more choices.

    If the story continues, provide a maximum of 3 different choices for the user to choose from in the format:
    "1.", "2.", "3.", etc.
    `;

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
        });
        
        return completion.choices[0].message.content;
    } catch (error) {
        if (error.name === 'APIError') {
            throw new Error(`OpenAI API Error: ${error.message}`);
        } else if (error.name === 'APIConnectionError') {
            throw new Error('Failed to connect to OpenAI API. Please check your internet connection.');
        } else if (error.name === 'RateLimitError') {
            throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        } else if (error.name === 'AuthenticationError') {
            throw new Error('Invalid OpenAI API key. Please check your configuration.');
        }
        
        throw new Error(`Error generating response: ${error.message}`);
    }
}

/**
 * Generate 3 choices from an intro scenario
 * @param {string} introScenario - The intro scenario to a story
 * @returns {string} - 3 choices based on the intro scenario in listed-number format
 */
exports.generateIntro = async (introScenario) => {
    const prompt = `
    You are a storyteller.
    You are given a scenario and you need to generate a story based on the scenario.
    Scenario: "${introScenario}"
    Please provide a maximum of 3 different choices for the user to choose from to get the story started.
    The choices should be in the format of "1.", "2.", "3.", etc.
    `;

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
        });

        return completion.choices[0].message.content;
    } catch (error) {
        throw new Error(`Error generating response: ${error.message}`);
    }
}

/**
 * Extract the result of the user's choice from a string
 * Should be used after the generateNextStory function
 * Gets the paragraph before the first choice
 * @param {string} resultText - The text containing the result of the user's choice
 * @returns {string} - The result of the user's choice
 */
exports.extractResult = (resultText) => {
    try {
        const resultRegex = /^[\s\S]*?(?=\n\s*1\.)/;
        const result = resultText.match(resultRegex);
        return result[0].trim();
    } catch (TypeError) {
        // Most likely, result has no choices and can't trim cuz nothing was found in regex
        // Thus the end
        // Could be implemented better by encapsulating story end logic
        return resultText;
    }
}

/**
 * Extract choices from a string that has all the choices in listed-number format. E.g. "1.", "2.", "3.", etc.
 * @param {string} choices - The string containing the choices
 * @returns {string[]} - An array of choices
 */
exports.extractChoices = (choicesText) => {
    const choiceRegex = /^\s*\d+\.\s+(.+)$/gm;

    const choices = []
    let match;

    while ((match = choiceRegex.exec(choicesText)) !== null) {
        choices.push(match[1].trim());
    }

    return choices;
}