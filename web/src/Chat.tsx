import React, { useState } from "react";

enum MessageSender {
  USER,
  BOT
}

const initialMessages = [
  {
    from: MessageSender.USER,
    content: "Hello!"
  },
  {
    from: MessageSender.BOT,
    content: "Hi!"
  },
  {
    from: MessageSender.USER,
    content: "How are you?"
  },
  {
    from: MessageSender.BOT,
    content: "I'm good, how are you?"
  }
]

export default function Chat() {
  const [messages, setMessages] = useState<{ from: MessageSender, content: string }[]>(initialMessages);

  const sendMessage = async () => {
    // Process user message
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    const userMessage = textarea.value;
    if (!userMessage) return;
    setMessages([...messages, { from: MessageSender.USER, content: userMessage }]);
    textarea.value = "";

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // @ts-ignore
        'Authorization': `Bearer ${window.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          // Here you would include previous messages in the format:
          // { role: "user", content: "What's the weather like?" },
          // { role: "assistant", content: "Right now, it's sunny and 72 degrees." },
          // And the new message:
          { role: "user", content: userMessage },
        ],
        max_tokens: 150
      })
    });    

    if (response.ok) {
      const data = await response.json();
      setMessages(prevMessages => [...prevMessages, { from: MessageSender.BOT, content: data.choices[0].message.content }]);
    } else {
      console.error('Failed to fetch response from OpenAI:', response.statusText);
      // Handle errors or show a default message
      setMessages(prevMessages => [...prevMessages, { from: MessageSender.BOT, content: "Sorry, I couldn't understand that." }]);
    }
  }

  return (
    <div className="gap-2">
      {messages.map((message, index) => (
        <div key={index} className="bg-gray-700 p-2 rounded-md mb-2">
          <b>{message.from === MessageSender.USER ? "You" : "Naruto"}: </b>
          {message.content}
        </div>
      ))}
      <textarea className="bg-white p-2 rounded-md w-full resize-none" placeholder="Say something..."></textarea>
      <button className="bg-blue-500 text-white p-2 rounded-md" onClick={sendMessage}>Submit</button>
    </div>
  )
}
