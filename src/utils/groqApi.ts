// Groq API utility for generating goal breakdowns

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

export interface AISubGoal {
  text: string;
  id: string;
}

/**
 * Calls Groq API to shorten/condense a long goal into an impactful headline
 * @param goalText The long goal text to shorten
 * @returns Shortened, impactful goal headline (max 55 words)
 */
export async function shortenGoalText(goalText: string): Promise<string> {
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
            content: 'You are a goal clarity expert. Transform goals into clear, concise headlines. CRITICAL: Keep between 30-57 characters. Preserve key details while being concise. Return ONLY the improved goal text - no quotes, no explanations.'
          },
          {
            role: 'user',
            content: `Make this goal clear and concise (30-57 chars, preserve key details): "${goalText}"`
          }
        ],
        temperature: 0.5, // Balanced temp for preserving details while condensing
        max_tokens: 20, // ~57 chars = 15 tokens + buffer
        top_p: 0.9, // Slight nucleus sampling for quality
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API error response:', errorData);
      return goalText;
    }

    const data = await response.json();
    const shortenedText = data.choices[0]?.message?.content?.trim();

    if (!shortenedText) {
      return goalText;
    }

    // Remove any surrounding quotes if Groq added them
    const cleaned = shortenedText.replace(/^["']|["']$/g, '');
    
    // Enforce 57 char limit as safety net
    return cleaned.length <= 57 ? cleaned : cleaned.substring(0, 57);

  } catch (error) {
    console.error('Error calling Groq API for shortening:', error);
    return goalText;
  }
}

/**
 * Calls Groq API to break down a goal into 3-5 actionable sub-goals
 * @param goalText The parent goal text to break down
 * @returns Array of 3-5 sub-goal suggestions
 */
export async function getAISubGoals(
  goalText: string, 
  context?: {
    parentGoalText?: string;
    siblingGoals?: string[];
    mainGoal?: string;
  }
): Promise<AISubGoal[]> {
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
            content: 'You are a goal breakdown expert. Create 3-5 actionable sub-goals using format "[Action] to [benefit]". CRITICAL: Aim for 35-45 chars (be specific, not brief!). Avoid repeating parent goal content. Return ONLY a JSON array of strings.'
          },
          {
            role: 'user',
            content: (() => {
              let prompt = `Break "${goalText}" into 3-5 specific sub-goals using "[Action] to [benefit]" format (35-45 chars).`;
              
              // Add context if provided
              if (context?.mainGoal) {
                prompt += `

Ultimate goal: "${context.mainGoal}"`;
              }
              if (context?.parentGoalText) {
                prompt += `
Parent already covers: "${context.parentGoalText}"`;
              }
              if (context?.siblingGoals && context.siblingGoals.length > 0) {
                prompt += `
Sibling goals already exist: ${context.siblingGoals.map(s => `"${s}"`).join(', ')}`;
              }
              
              prompt += `

Create NEW sub-goals that don't repeat parent/sibling content. Be specific and actionable.`;
              
              return prompt;
            })()
          }
        ],
        temperature: 0.7, // Balanced creativity/consistency
        max_tokens: 150, // 5 goals × 15 tokens + JSON overhead
        top_p: 0.95, // High-quality token selection
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
          .map((line: string) => {
            // Remove bullets, numbers, quotes
            return line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '');
          })
          .slice(0, 5);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to parse AI suggestions');
    }

    // Convert to AISubGoal objects with unique IDs and enforce 57-char limit
    return subGoals.map((text, index) => ({
      text: text.trim().substring(0, 57), // Hard limit at 57 chars
      id: `ai-suggestion-${Date.now()}-${index}`,
    }));

  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw error;
  }
}
