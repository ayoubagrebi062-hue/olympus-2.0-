'use client';

export default function ContextualChat() {
  const [messages, setMessages] = useState([]);

  return (
    <div>
      <h2 className="text-xl font-bold">Contextual Chat</h2>
      <div>
        {messages.map((message) => (
          <div key={message.id}>{message.text}</div>
        ))}
      </div>
    </div>
  );
}