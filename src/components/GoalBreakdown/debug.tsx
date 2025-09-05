import React, { useState, useEffect } from 'react';

const GoalBreakerDebug = () => {
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    console.log('GoalBreaker Debug: Component mounted');
    if (!isStarted) {
      console.log('GoalBreaker Debug: Setting isStarted to true');
      setIsStarted(true);
    }
  }, [isStarted]);

  console.log('GoalBreaker Debug: Rendering, isStarted =', isStarted);

  if (!isStarted) {
    console.log('GoalBreaker Debug: Returning Loading...');
    return <div style={{padding: '20px', fontSize: '24px'}}>Loading...</div>;
  }

  console.log('GoalBreaker Debug: Returning main content');
  return (
    <div style={{padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh'}}>
      <h1 style={{fontSize: '32px', color: '#333'}}>Goal Breaker Debug - Working!</h1>
      <p>If you see this, the basic component structure is working.</p>
      <p>isStarted: {isStarted.toString()}</p>
    </div>
  );
};

export default GoalBreakerDebug;
