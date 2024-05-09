// @ts-nocheck
import React, { useState, useEffect } from "react";
import OpenAI from "openai";
import { MessageSender, botSays, userSays } from "./App.tsx";

const openai = new OpenAI({
  apiKey: window.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function Chat({
  designDoc,
  steps,
  messages,
  setMessages,
}: {
  designDoc: string | null;
  steps: string[];
  messages: { role: MessageSender, content: string }[];
  setMessages: (messages: { role: MessageSender, content: string }[]) => void;
}) {
  const [currentStep, setCurrentStep] = useState(localStorage.getItem("currentStep") ? parseInt(localStorage.getItem("currentStep")!) : 0);

  useEffect(() => {
    if (steps && steps.length > 0) {
      setMessages([...messages,
        botSays("Hello! I'm Naruto and I'm here to help you develop your project from your design doc. I see your current step is: " + steps[currentStep] + "."),
        botSays("Type 'code' for generative help, 'next' or 'prev' to move around steps, or ask me anything.")]);
    }
  }, [steps]);

  const sendMessage = async () => {
    const currentMessages = [...messages];

    // Process user message
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    const userMessage = textarea.value;
    if (!userMessage) return;
    currentMessages.push(userSays(userMessage));
    textarea.value = "";

    // Check for special commands
    /* CODE */
    if (userMessage.toLowerCase() === "code") {
      currentMessages.push(botSays("I can help you with that!"));
      setMessages(currentMessages);

      const assistant = await openai.beta.assistants.create({
        instructions: `You are a creative project co-collaborator whose job is to generate code. It is important to follow the project's design doc:\n${designDoc}\n
        
        You may ONLY respond in a JSON format with the following key/value pairs: "code" must be one full file of completed, compilable code. "filename" is the name of the generated file (existing or new). For example, {
          "code": "print('Hello, world!')",
          "filename": "hello.py"
        }.\n
        
        Do not include any other text or commentary, unless it is within comments.`,
        name: "Naruto",
        model: "gpt-3.5-turbo",
        response_format: { "type": "json_object" },
      });
      
      const thread = await openai.beta.threads.create();
      await openai.beta.threads.messages.create(
        thread.id,
        {
          role: "user",
          content: `Please generate code for step ${steps[currentStep]}.`,

        }
      );

      let run = await openai.beta.threads.runs.createAndPoll(
        thread.id,
        { 
          assistant_id: assistant.id,
          instructions: `You are a creative project co-collaborator whose job is to generate code. It is important to follow the project's design doc:\n${designDoc}\n
        
          You may ONLY respond in a JSON format with the following key/value pairs: "code" must be one full file of completed, compilable code. "filename" is the name of the generated file (existing or new). For example, {
            "code": "print('Hello, world!')",
            "filename": "hello.py"
          }.\n
          
          Do not include any other text or commentary, unless it is within comments.`
        }
      );

      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(
          run.thread_id
        );
        for (const message of messages.data.reverse()) {
          if (message.role === 'assistant') {
            try {
              const { code, filename } = JSON.parse(message.content[0].text.value);
              await vscode.postMessage({ type: "addFile", value: {
                code,
                filename
              } });
            } catch (error) {
              setMessages([...currentMessages, botSays("I'm sorry, I couldn't generate code: " + error)]);
            }
          }
        }
      }
      return;
    }

    /* NEXT/PREV */
    if (userMessage.toLowerCase() === "next" || userMessage.toLowerCase() === "prev") {
      const newStep = userMessage.toLowerCase() === "next" ? currentStep + 1 : currentStep - 1;

      if (newStep < 0) {
        currentMessages.push(botSays("You're already at the beginning."));
        setMessages(currentMessages);
        return;
      } else if (newStep >= steps.length) {
        currentMessages.push(botSays("You've reached the end of the steps."));
        setMessages(currentMessages);
        return;
      }

      setCurrentStep(newStep);
      window.localStorage.setItem("currentStep", newStep.toString());
      currentMessages.push(botSays("Moving to step: " + steps[newStep] + ". Remember, type 'code' for generative help, 'next' or 'prev' to move around steps, or ask me anything."));
      setMessages(currentMessages);
      return;
    }

    /* CHAT */
    const response = await openai.chat.completions.create({
      messages: [{role: "user", content: `You are a creative project co-collaborator. Answer concisely and under 50 tokens.\nIt is important to follow the project's design doc:\n${designDoc}`}, ...currentMessages],
      model: "gpt-3.5-turbo",
    })
    const botMessage = response.choices[0];
    currentMessages.push(botSays(botMessage.message.content));
    setMessages(currentMessages);
  }

  return (
    <div className="gap-2">
      {messages.filter(message => message.hidden !== true).map((message, index) => (
        <div key={index} className="bg-gray-700 p-2 rounded-md mb-2">
          <b>{message.role === MessageSender.USER ? "You" : "Naruto"}: </b>
          {message.content}
        </div>
      ))}
      <textarea className="bg-white p-2 rounded-md w-full resize-none" placeholder="Say something..."></textarea>
      <button className="bg-blue-500 text-white p-2 rounded-md" onClick={sendMessage}>Submit</button>
    </div>
  )
}
