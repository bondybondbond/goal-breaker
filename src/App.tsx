import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import StartScreen from './components/StartScreen';
import SimpleGoalBreaker from './components/SimpleGoalBreaker';

function App() {
  const [hasStarted, setHasStarted] = React.useState(false);
  const [initialGoal, setInitialGoal] = React.useState('');
  const [useAI, setUseAI] = React.useState(false);

  const handleStart = (goalText: string, aiMode: boolean) => {
    setInitialGoal(goalText);
    setUseAI(aiMode);
    setHasStarted(true);
  };

  // Handle loading existing canvas
  const handleLoadCanvas = () => {
    setInitialGoal(''); // Empty means load from localStorage
    setUseAI(false);
    setHasStarted(true);
  };

  // Handle returning to splash screen (e.g., after deleting canvas)
  const handleReturnToHome = () => {
    setHasStarted(false);
    setInitialGoal('');
    setUseAI(false);
  };

  if (!hasStarted) {
    return <StartScreen onStart={handleStart} onLoadCanvas={handleLoadCanvas} />;
  }

  return (
    <div className="App">
      <SimpleGoalBreaker 
        initialGoal={initialGoal} 
        useAI={useAI} 
        onReturnToHome={handleReturnToHome}
      />
      <Analytics />
    </div>
  );
}

export default App;