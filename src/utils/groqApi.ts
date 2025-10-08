// Groq API utility for generating goal breakdowns

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

export interface AISubGoal {
  text: string;
  id: string;
}

/**
 * Calls Groq API to break down a goal into 3-5 actionable sub-goals
 * @param goalText The parent goal text to break down
 * @returns Array of 3-5 sub-goal suggestions
 */
export async function getAISubGoals(goalText: string): Promise<AISubGoal[]> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ API key not found. Please add REACT_APP_GROQ_API_KEY to your .env file');
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a goal breakdown assistant. Break down goals into 3-5 specific, actionable sub-goals. Return ONLY a JSON array of strings, nothing else. Example: ["Sub-goal 1", "Sub-goal 2", "Sub-goal 3"]'
          },
          {
            role: 'user',
            content: `Break down this goal into 3-5 specific, actionable sub-goals: "${goalText}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API error response:', errorData);
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from Groq API');
    }

    // Parse the AI response (expecting JSON array of strings)
    let subGoals: string[];
    try {
      // Try to extract JSON array from response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        subGoals = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by newlines and clean up
        subGoals = aiResponse
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .map((line: string) => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''))
          .slice(0, 5);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to parse AI suggestions');
    }

    // Convert to AISubGoal objects with unique IDs
    return subGoals.map((text, index) => ({
      text: text.trim(),
      id: `ai-suggestion-${Date.now()}-${index}`,
    }));

  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw error;
  }
}
