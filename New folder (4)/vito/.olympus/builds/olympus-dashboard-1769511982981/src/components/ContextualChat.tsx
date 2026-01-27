import React, { useState } from 'react';

export function ContextualChat({ buildId }: { buildId: string }) {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    // Implement sending message logic
    console.log(`Message sent for build: ${buildId}`);
    setMessage('');
  };

  return (
    <div className="bg-card p-4 rounded-lg shadow-lg">
      <h2 className="text-lg font-bold mb-4">Contextual Chat</h2>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask about the current build..."
        className="w-full p-2 text-sm border rounded-md mb-2"
      />
      <button
        onClick={handleSendMessage}
        className="bg-primary text-primary-foreground py-2 px-4 rounded-md"
      >
        Send
      </button>
    </div>
  );
}