import React, { useState, useEffect } from "react";
import Chat from "./Chat";

export enum MessageSender {
  USER = "user",
  BOT = "assistant",
}

export const botSays = (content: string) => {
  return { role: MessageSender.BOT, content };
}

export const userSays = (content: string) => {
  return { role: MessageSender.USER, content };
}

// @ts-ignore
declare const vscode: VSCode;

const parseSteps = (input: string) => {
  const stepPrefix = '# Steps';
  const startIndex = input.indexOf(stepPrefix) + stepPrefix.length;
  const stepsPart = input.substring(startIndex);
  const stepsArray = stepsPart.split('\n').map(step => step.trim()).filter(step => step);
  return stepsArray;
}

export default function App() {
  const [designDoc, setDesignDoc] = useState<string>("");
  const [steps, setSteps] = useState<string[]>([]);
  const [messages, setMessages] = useState<{ role: MessageSender, content: string }[]>([]);

  useEffect(() => {
    vscode.postMessage({ type: "readDesignDoc" });
  }, []);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "readDesignDoc") {
        console.log("Received design doc", message.value);
        setDesignDoc(message.value);
        setSteps(parseSteps(message.value));
      } else if (message.type === "addFile") {
        const { code, filename } = message.value;
        setMessages([...messages, botSays(`Generated code for ${filename}:\n\`\`\`${code}\`\`\``), botSays("Say 'approve' to save this code, or 'reject' to try again.")]);
      }
    }
    window.addEventListener("message", listener);

    return () => {
      window.removeEventListener("message", listener);
    }
  });

  return (
    <>
      <Chat
        designDoc={designDoc}
        steps={steps}
        messages={messages}
        setMessages={setMessages} />
    </>
  );
}