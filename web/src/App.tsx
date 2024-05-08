import React, { useState, useEffect, useRef } from "react";
import {
  Message,
  getVscodeConfirmation,
  getDesignDocConfirmation,
  sendMessage,
  userSays,
  botSays,
  VscodeResponse,
  Step,
} from "./utils/chatService";
import Chatbox from "./Chatbox";
import { parseDesignDocIntoSteps } from "./utils/utils";

/* VSCODE FUNCTIONS */
// @ts-ignore
declare const vscode: VSCode;

function readDesignDoc() {
  return vscode.postMessage({
    type: 'readDesignDoc',
  });
}

function generateFile(response: VscodeResponse) {
  const { code, filename } = response;
  return vscode.postMessage({ type: "addFile", value: {
    code,
    filename
  }});
}

function updateDesignDoc(step: Step) {
  return vscode.postMessage({ type: "updateDesignDoc", value: step });
}

export default function App() {
  /* LOCAL STORAGE */
  const initialStep = parseInt(localStorage.getItem("currentStep") || "0");

  /* STATES */
  const [designDoc, setDesignDoc] = useState<string>("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [messages, setMessages] = useState<Message[]>([
      botSays("No design doc found. Make sure design.md is in the root of your workspace, then reload."),
    ]
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

  const handleDesignDocFound = (designDoc: string) => {
    setDesignDoc(designDoc);
    const foundSteps = parseDesignDocIntoSteps(designDoc);
    setSteps(foundSteps);
    setMessages(getDesignDocConfirmation(foundSteps[initialStep]));
  }

  const handleDesignDocChange = (newDesignDoc: string) => {
    setDesignDoc(newDesignDoc);
    const foundSteps = parseDesignDocIntoSteps(newDesignDoc);
    setSteps(foundSteps);
    addMessages([botSays(`The new current step is <b>${foundSteps[currentStepIdx].description}.</b>`)]);
  }

  const handleStepChange = (newStep: number) => {
    setCurrentStepIdx(newStep);
    window.localStorage.setItem("currentStep", newStep.toString());
    setMessages(getDesignDocConfirmation(steps[newStep]));
  }

  const handleUserMessage = async () => {
    if (!textareaValue) return;
    setTextareaValue("");
    const command = textareaValue.toLowerCase().split(" ")[0];

    // Special commands that require async handling
    const newMessages = [userSays(textareaValue)];
    addMessages(newMessages);
    setIsDangoLoading(true);
    await sendMessage({
      command,
      userMessage: textareaValue,
      step: steps[currentStepIdx],
      designDoc,
      messages,
      /* VSCODE FUNCTIONS */
      generateFile,
      updateDesignDoc,
    }).then((response) => {
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
      console.log("Received message:", message);
      switch (type) {
        case "readDesignDoc":
          console.log("Received design doc", value);
          handleDesignDocFound(value);
          break;
        case "addFile":
          console.log("Received add file request", value);
          addMessages(getVscodeConfirmation(message));
          break;
        case "updateDesignDoc":
          console.log("Received design doc update", value);
          handleDesignDocChange(value);
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