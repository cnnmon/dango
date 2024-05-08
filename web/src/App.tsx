import React, { useState, useEffect, useRef } from "react";
import {
  Message,
  getVscodeConfirmation,
  getDesignDocConfirmation,
  getStepConfirmation,
  sendMessage,
  userSays,
  botSays,
  VscodeResponse,
} from "./utils/chatService";
import Chatbox from "./Chatbox";

/* VSCODE FUNCTIONS */
const IS_DEVELOPMENT = true;

// @ts-ignore
declare const vscode: VSCode;

function readDesignDoc() {
  if (IS_DEVELOPMENT) {
    console.log("Skipping readDesignDoc in development mode");
    return;
  }
  return vscode.postMessage({
    command: 'readDesignDoc',
  });
}

function generateFile(response: VscodeResponse) {
  if (IS_DEVELOPMENT) {
    console.log("Skipping generateFile in development mode");
    return;
  }
  const { code, filename } = response;
  return vscode.postMessage({ type: "addFile", value: {
    code,
    filename
  }});
}

const parseSteps = (input: string) => {
  const stepPrefix = '# Steps';
  const startIndex = input.indexOf(stepPrefix) + stepPrefix.length;
  const stepsPart = input.substring(startIndex);
  const stepsArray = stepsPart.split('\n').map(step => step.trim()).filter(step => step);
  return stepsArray;
}

export default function App() {
  /* LOCAL STORAGE */
  const initialStep = parseInt(localStorage.getItem("currentStep") || "0");

  /* STATES */
  const [designDoc, setDesignDoc] = useState<string>("");
  const [steps, setSteps] = useState<string[]>(
    // @ts-ignore
    IS_DEVELOPMENT ? ["Import a thing", "Create files and stuff", "Write the entire program la dee da sajdasdsadkoasdpas"] : []
  );
  const [messages, setMessages] = useState<Message[]>(
    // @ts-ignore
    IS_DEVELOPMENT ? [botSays("Development.")] : []
  );
  const [isDangoLoading, setIsDangoLoading] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(initialStep);
  const [textareaValue, setTextareaValue] = useState<string>("");
  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const addMessages = (newMessages: Message[]) => {
    setMessages([...messages, ...newMessages]);
  }

  useEffect(() => {
    // Ensure scrolling to the bottom every time messages update
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDesignDocChange = (designDoc: string) => {
    setDesignDoc(designDoc);
    setSteps(parseSteps(designDoc));
    setMessages(
      [...getDesignDocConfirmation(steps[currentStepIdx])]
    );
  }

  const handleStepChange = (newStep: number) => {
    setCurrentStepIdx(newStep);
    window.localStorage.setItem("currentStep", newStep.toString());
    setMessages(
      [...getStepConfirmation(steps[newStep])]
    );
  }

  const handleUserMessage = async () => {
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    const userMessage = textarea.value;
    if (!userMessage) return;
    textarea.value = "";
    const command = userMessage.toLowerCase().split(" ")[0];

    // Special commands that require async handling
    const newMessages = [userSays(userMessage)];
    addMessages(newMessages);
    setIsDangoLoading(true);
    await sendMessage(command, userMessage, steps[currentStepIdx], designDoc, generateFile).then((response) => {
      if (response.success) {
        newMessages.push(...response.newMessages);
      } else {
        newMessages.push(botSays("I'm sorry, I couldn't understand that."));
      }
      addMessages(newMessages);
      setIsDangoLoading(false);
    });
  }

  useEffect(() => {
    // Initialize listener to receive signals from vscode
    const listener = (event: MessageEvent) => {
      const message = event.data;
      const { type, value } = message;
      switch (type) {
        case "readDesignDoc":
          console.log("Received design doc", value);
          handleDesignDocChange(value);
          break;
        case "addFile":
          console.log("Received add file request", value);
          addMessages(getVscodeConfirmation(message));
          break;
      }
    }
    window.addEventListener("message", listener);

    return () => {
      window.removeEventListener("message", listener);
    }
  });

  // At start, ask vscode to read the design doc from the current workspace
  useEffect(() => {
    readDesignDoc();
  }, []);
  
  return (
    <div className="gap-2 pt-6">
      <Chatbox
        messages={messages}
        currentStepIdx={currentStepIdx}
        steps={steps}
        isDangoLoading={isDangoLoading}
        textareaValue={textareaValue}
        setTextareaValue={setTextareaValue}
        handleUserMessage={handleUserMessage}
        handleStepChange={handleStepChange}
        messagesEndRef={messagesEndRef}
      />
    </div>
  );
}