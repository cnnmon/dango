import React, { useState, useEffect, useRef } from "react";
import {
  Message,
  getDesignDocConfirmation,
  sendMessage,
  userSays,
  botSays,
  VscodeResponse,
  Step,
} from "./utils/chatService";
import Chatbox from "./Chatbox";
import { parseDesignDoc } from "./utils/utils";
//import { read } from "fs";

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

function generateTemplateDesignDoc() {
  return vscode.postMessage({ type: "generateTemplateDesignDoc" });
}

/* MAIN APP */

export default function App() {
  /* LOCAL STORAGE */
  const initialStep = parseInt(localStorage.getItem("currentStep") || "0");

  /* STATES */
  const [designDoc, setDesignDoc] = useState<string | null>(null);
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [allFileContents, setAllFileContents] = useState<{ name: string; content: string }[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [messages, setMessages] = useState<Message[]>([
      botSays("No design doc found. Make sure design.md is present in the root of your workspace, then reload."),
    ]
  );
  const [isDangoLoading, setIsDangoLoading] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(initialStep);
  const [textareaValue, setTextareaValue] = useState<string>("");
  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const addMessages = (newMessages: Message[]) => {
    setMessages([...messages, ...newMessages]);
  }

  const readAllFiles = async () => {
    vscode.postMessage({ type: "readAllFiles" });
    return allFileContents;
  }

  useEffect(() => {
    // Ensure scrolling to the bottom every time messages update
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDesignDocFound = (designDoc: string) => {
    setDesignDoc(designDoc);
    const { steps: foundSteps, files } = parseDesignDoc(designDoc);
    console.log("Found steps:", foundSteps, "Files:", files);
    if (!foundSteps.length) {
      setMessages([botSays("Design doc found, but unable to read steps. (add to this oops)")]);
    }
    setSteps(foundSteps);
    setAllFiles(files);
    setMessages(getDesignDocConfirmation(foundSteps[currentStepIdx]));
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

    if (!designDoc) {
      addMessages([botSays("Unable to proceed without a design doc. Make sure design.md is present in the root of your workspace, then reload.")]);
      return;
    }

    if (!steps.length) {
      addMessages([botSays("Unable to proceed without steps. Make sure your design doc has enumerated (1., 2., 3., etc.) steps on new lines, then reload.")]);
      return;
    }

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
      readAllFiles,
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
      // Handle non-chat related chat responses (everything else is handled in sendMessage)
      switch (type) {
        case "readDesignDoc":
          console.log("Received design doc", value);
          const { success, content } = value;
          if (!success) return;
          handleDesignDocFound(content);
          break;
        case "generateTemplateDesignDoc":
          console.log("Received template design doc request", value);
          addMessages([botSays("Successfully generated a template design doc at the root of your workspace! Modify it to your needs, then reload.")]);
          break;
        case "readAllFiles":
          console.log("Received all files", value);
          const bruh = designDoc;
          const { files } = value;
          setAllFileContents(files);
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
        handleDesignDocGeneration={generateTemplateDesignDoc}
        messagesEndRef={messagesEndRef}
      />
    </div>
  );
}