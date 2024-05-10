import React, { useState, useEffect, useRef } from "react";
import {
  Message,
  getDesignDocConfirmation,
  sendMessage,
  userSays,
  botSays,
  VscodeResponse,
  Step,
  formatStep,
} from "./utils/chatService";
import Chatbox from "./Chatbox";
import { EXECUTE_PHRASE, PLANNING_PHRASE, parseDesignDoc } from "./utils/utils";

/* VSCODE FUNCTIONS */
// @ts-ignore
declare const vscode: VSCode;

function readDesignDoc() {
  return vscode.postMessage({ type: 'readDesignDoc' });
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

async function generateStepsAndUpdateDesignDoc() {
  vscode.postMessage({ type: "generateStepsFromDesignDoc" });
}

/* MAIN APP */

const defaultMessages = [
  botSays(`Hi! I'm Dango, your project co-collaborator. I work off of your design doc to generate code and improve your workflow. Let's get started!`),
  botSays(`No design doc found. Reply with '${EXECUTE_PHRASE}' to generate a starter template. Or, create design.md with information on your intended project in the root of your workspace.`),
]

function getSavedMessages(fallbackMessages: Message[]) {
  return {
    stepIdx: parseInt(localStorage.getItem("savedStepIdx") || "0"),
    messages: JSON.parse(localStorage.getItem("savedStepMessages") || JSON.stringify(fallbackMessages))
  }
}

function resetSavedMessages() {
  localStorage.removeItem("savedStepIdx");
  localStorage.removeItem("savedStepMessages");
}

function saveMessages(stepIdx: number, messages: Message[]) {
  localStorage.setItem("savedStepIdx", stepIdx.toString());
  localStorage.setItem("savedStepMessages", JSON.stringify(messages));
}

export default function App() {
  /* STATES */
  const [designDoc, setDesignDoc] = useState<string | null>(null);
  const [allFileContents, setAllFileContents] = useState<{ name: string; content: string }[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isDangoLoading, setIsDangoLoading] = useState(false);
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
    const foundSteps = parseDesignDoc(designDoc);
    if (!foundSteps.length) {
      setMessages([botSays(`Design doc found, but unable to read steps. Reply with '${EXECUTE_PHRASE}' and I'll generate steps for us to work on. (This might take a minute or two.)`)]);
      return;
    }
    setSteps(foundSteps);

    // Get saved step index and messages
    const { stepIdx, messages: savedMessages } = getSavedMessages(getDesignDocConfirmation(foundSteps[currentStepIdx]));

    // Reset step index if it exceeds the number of steps
    if (stepIdx >= foundSteps.length) {
      resetSavedMessages();
      setCurrentStepIdx(0);
      setMessages(getDesignDocConfirmation(foundSteps[stepIdx]));
    }

    setCurrentStepIdx(stepIdx);
    setMessages(savedMessages);
  }

  const handleStepChange = (newStep: number) => {
    setCurrentStepIdx(newStep);

    // Check if we're navigating to the "currentStepIdx"; if so, load messages from local storage
    const fallbackMessages = getDesignDocConfirmation(steps[newStep]);
    const { stepIdx, messages } = getSavedMessages(fallbackMessages);
    if (newStep === stepIdx) {
      setMessages(messages);
      return;
    }

    setMessages(fallbackMessages);
  }

  const handleUserMessage = async () => {
    if (!textareaValue) return;
    setTextareaValue("");
    const command = textareaValue.toUpperCase().split(" ")[0];

    // Special commands that require async handling
    const newMessages = [userSays(textareaValue)];
    addMessages(newMessages);
    setIsDangoLoading(true);
    await sendMessage({
      command,
      userMessage: textareaValue,
      currentStepIdx,
      steps,
      designDoc,
      messages,
      /* VSCODE FUNCTIONS */
      generateFile,
      updateDesignDoc,
      readAllFiles,
      generateTemplateDesignDoc,
      generateStepsAndUpdateDesignDoc,
    }).then((response) => {
      if (response.success) {
        newMessages.push(...response.newMessages);
      } else {
        newMessages.push(botSays("I'm sorry, I couldn't understand that."));
      }

      // If new messages are generated, that means we can instantly stop the loading state
      // Else, we need to wait for vscode to respond
      const allMessages = [...messages, ...newMessages];
      if (response.newMessages.length) {
        setMessages(allMessages);
        setIsDangoLoading(false);
      }

      // Only save current step to come back to if you send a message in it
      if (steps) {
        saveMessages(currentStepIdx, allMessages);
      }
    });
  }

  useEffect(() => {
    // Initialize listener to receive signals from vscode
    const listener = (event: MessageEvent) => {
      const message = event.data;
      const { type, value } = message;
      console.log("Received message:", message);

      switch (type) {
        case "addFile":
          console.log("Received file", value);
          addMessages([botSays(`Generated ${value.filename}. (Approve? Reject?)`)]);
          setIsDangoLoading(false);
          break;
        case "updateDesignDoc":
          console.log("Received update design doc", value);
          addMessages([botSays(`Design doc successfully updated. Type '${PLANNING_PHRASE}' to plan this step. If you want to generate immediately, type '${EXECUTE_PHRASE}'.`)]);
          setIsDangoLoading(false);
          break;
        case "readDesignDoc":
          console.log("Received design doc", value);
          if (!value.success) return;
          handleDesignDocFound(value.content);
          setIsDangoLoading(false);
          break;
        case "readAllFiles":
          console.log("Received all files", value);
          const { files } = value;
          setAllFileContents(files);
          break;
        case "generateTemplateDesignDoc":
          console.log("Received generated steps", value);
          setDesignDoc(value);
          addMessages([botSays(`Successfully generated a template design doc at the root of your workspace.\n\nWrite about your project then reply '${EXECUTE_PHRASE}' and I'll generate steps for us to work on. (This might take a minute or two.)`)]);
          setIsDangoLoading(false);
          break;
        case "generateStepsFromDesignDoc":
          console.log("Received generated steps", value);
          if (!value.success) return;
          const steps = value.content;
          setSteps(steps);
          addMessages([
            botSays(`Successfully generated steps from design doc. I recommend you look over & modify the design doc to fit your needs before we get started.`),
            botSays(`You are currently on ${formatStep(steps[currentStepIdx])}`),
            botSays(`Type '${PLANNING_PHRASE}' to begin planning the implementation for this current step together. If you want to generate immediately, type '${EXECUTE_PHRASE}'.`)
          ]);
          setIsDangoLoading(false);
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
        designDoc={designDoc}
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