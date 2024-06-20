import React, { useState, useEffect, useRef } from "react";
import {
  Step,
} from "./utils/chatService";
import Chatbox from "./Chatbox";
import { parseDesignDoc } from "./utils/utils";

/* VSCODE FUNCTIONS */
// @ts-ignore
declare const vscode: VSCode;

function readDesignDoc() {
  return vscode.postMessage({ type: 'readDesignDoc' });
}

function generateTemplateDesignDoc() {
  return vscode.postMessage({ type: "generateTemplateDesignDoc" });
}

function generateStepsAndUpdateDesignDoc() {
  return vscode.postMessage({ type: "generateStepsFromDesignDoc" });
}

function generate(step: Step) {
  return vscode.postMessage({ type: "generate", value: step });
}

/* MAIN APP */

function getSavedMessages(steps: Step[]) {
  const savedStepIdx = localStorage.getItem("savedStepIdx");
  const savedStepDescription = localStorage.getItem("savedStepDescription");

  // Check if saved messages are invalid -- start of the app probably
  if (!savedStepIdx  || !savedStepDescription) {
    return {
      stepIdx: 0,
      messages: null
    }
  }

  // Check if valid step index
  const stepIdx = parseInt(savedStepIdx);
  if (stepIdx < 0) {
    resetSavedMessages();
    return {
      stepIdx: -1,
      messages: null
    }
  }

  if (stepIdx >= steps.length) {
    resetSavedMessages();
    return {
      stepIdx: null,
      messages: null
    }
  }

  const { description: existingDescription } = steps[stepIdx];
  
  // Check if the step description is the same
  if (existingDescription !== savedStepDescription) {
    localStorage.removeItem("savedStepDescription");
    localStorage.removeItem("savedStepMessages");
    return {
      stepIdx,
      messages: null
    }
  }

  return {
    stepIdx: parseInt(savedStepIdx || "-1"),
    messages: null,
  }
}

function resetSavedMessages() {
  localStorage.removeItem("savedStepIdx");
  localStorage.removeItem("savedStepDescription");
  localStorage.removeItem("savedStepMessages");
}

function saveMessages(stepIdx: number, description: string, messages: string[]) {
  localStorage.setItem("savedStepIdx", stepIdx.toString());
  localStorage.setItem("savedStepDescription", description);
  localStorage.setItem("savedStepMessages", JSON.stringify(messages));
}

export default function App() {
  /* STATES */
  const [designDoc, setDesignDoc] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [messages, setMessages] = useState<string[]>([]);
  const [isDangoLoading, setIsDangoLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const addMessages = (newMessages: string[]) => {
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
    const foundSteps = parseDesignDoc(designDoc);
    console.log("Found steps", foundSteps);

    setSteps(foundSteps);
    
    // Get saved step index and messages
    const { stepIdx, messages: savedMessages } = getSavedMessages(foundSteps);
    if (savedMessages && stepIdx !== null && stepIdx > 0) {
      setCurrentStepIdx(stepIdx || 0);
      setMessages(savedMessages);
    }
  }

  const handleStepChange = (newStep: number) => {
    setCurrentStepIdx(newStep);

    // If new step is -1 (landing)
    if (newStep === -1) {
      return;
    }

    // Check if we're navigating to the "currentStepIdx"; if so, load messages from local storage
    const { stepIdx, messages } = getSavedMessages(steps);
    if (messages && stepIdx !== null) {
      // If we're navigating to the same step, just load the messages
      if (newStep === stepIdx) {
        setMessages(messages);
        return;
      }
      
      // Else, if there's an existing saved step, notify the user that their conversation will be erased
      setMessages([
        `(NOTE: Working on this step will erase your logs from Step ${stepIdx + 1}.)`
      ]);
    } else {
      setMessages([]);
    }
  }

  useEffect(() => {
    // Initialize listener to receive signals from vscode
    const listener = (event: MessageEvent) => {
      const message = event.data;
      const { type, value } = message;
      console.log("Received message:", message);

      switch (type) {
        case "readDesignDoc":
          if (value.success) {
            handleDesignDocFound(value.content);
          } else {
            setMessages(['No design doc found. Type <b>${EXECUTE_PHRASE}</b> to generate a starter template. Or, create design.md in the root of your workspace.']);
          }
          setIsDangoLoading(false);
          break;
        case "generateTemplateDesignDoc":
          setDesignDoc(value);
          setIsDangoLoading(false);
          break;
        case "generateStepsFromDesignDoc":
          if (!value.success) return;
          const steps = value.content;
          setSteps(steps);
          setIsDangoLoading(false);
          break;
        case "generate":
          console.log("Received generated code", value);
          if (!value.success) {
            addMessages(["🍡 couldn't generate code for this step. Double check that this is a code generation step, modify your design doc, or try again later."]);
            setIsDangoLoading(false);
            return;
          }
          addMessages(value.newMessages);
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
        setIsDangoLoading={setIsDangoLoading}
        handleGoMessage={() => generate(steps[currentStepIdx])}
        handleStepChange={handleStepChange}
        handleDesignDocGeneration={generateTemplateDesignDoc}
        handleStepGeneration={generateStepsAndUpdateDesignDoc}
        messagesEndRef={messagesEndRef}
      />
    </div>
  );
}