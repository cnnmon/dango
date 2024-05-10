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

function getSavedMessages(steps: Step[], fallbackMessages: Message[]) {
  const savedStepIdx = localStorage.getItem("savedStepIdx");
  const savedStepMessages = localStorage.getItem("savedStepMessages");
  const savedStepDescription = localStorage.getItem("savedStepDescription");

  // Check if saved messages are invalid -- start of the app probably
  if (!savedStepIdx || !savedStepMessages || !savedStepDescription) {
    return {
      stepIdx: 0,
      messages: fallbackMessages
    }
  }

  // Check if valid step index
  const stepIdx = parseInt(savedStepIdx);
  if (stepIdx < 0 || stepIdx >= steps.length) {
    resetSavedMessages();
    return {
      stepIdx: null,
      messages: fallbackMessages
    }
  }

  const { description: existingDescription } = steps[stepIdx];
  
  // Check if the step description is the same
  if (existingDescription !== savedStepDescription) {
    resetSavedMessages();
    return {
      stepIdx: null,
      messages: fallbackMessages
    }
  }

  return {
    stepIdx: parseInt(savedStepIdx || "0"),
    messages: JSON.parse(savedStepMessages || JSON.stringify(fallbackMessages))
  }
}

function resetSavedMessages() {
  localStorage.removeItem("savedStepIdx");
  localStorage.removeItem("savedStepDescription");
  localStorage.removeItem("savedStepMessages");
}

function saveMessages(stepIdx: number, description: string, messages: Message[]) {
  localStorage.setItem("savedStepIdx", stepIdx.toString());
  localStorage.setItem("savedStepDescription", description);
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
    console.log("Found steps", foundSteps);
    
    if (!foundSteps.length) {
      setMessages([botSays(`Design doc found, but unable to read steps. Reply with '${EXECUTE_PHRASE}' and I'll generate steps for us to work on. (This might take a minute or two.)`)]);
      return;
    }
    setSteps(foundSteps);

    // Get saved step index and messages
    const { stepIdx, messages: savedMessages } = getSavedMessages(foundSteps, getDesignDocConfirmation(foundSteps[currentStepIdx]));
    setCurrentStepIdx(stepIdx || 0);
    setMessages(savedMessages);
  }

  const handleStepChange = (newStep: number) => {
    setCurrentStepIdx(newStep);

    // Check if we're navigating to the "currentStepIdx"; if so, load messages from local storage
    const fallbackMessages = getDesignDocConfirmation(steps[newStep]);
    const { stepIdx, messages } = getSavedMessages(steps, fallbackMessages);
    if (newStep === stepIdx) {
      setMessages(messages);
      return;
    }

    // If there's an existing saved step, notify the user that their conversation will be erased
    if (stepIdx) {
      setMessages([
        ...fallbackMessages,
        botSays(`(NOTE: Sending messages will erase your conversation on Step ${stepIdx})`)
      ]);
    } else {
      setMessages(fallbackMessages);
    }
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
        const { description } = steps[currentStepIdx];
        saveMessages(currentStepIdx, description, allMessages);
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
          addMessages([botSays(`Generated ${value.filename}. (Approve? Reject?)`)]);
          setIsDangoLoading(false);
          break;
        case "updateDesignDoc":
          if (value) {
            addMessages([botSays(`Design doc successfully updated. Type '${PLANNING_PHRASE}' to plan this step. If you want to generate immediately, type '${EXECUTE_PHRASE}'.`)]);
          } else {
            addMessages([botSays(`Failed to update design doc. Please try again.`)]);
          }
          setIsDangoLoading(false);
          break;
        case "readDesignDoc":
          if (value.success) {
            handleDesignDocFound(value.content);
          } else {
            setMessages([botSays(`No design doc found. Reply with '${EXECUTE_PHRASE}' to generate a starter template. Or, create design.md with information on your intended project in the root of your workspace.`)]);
          }
          setIsDangoLoading(false);
          break;
        case "readAllFiles":
          const { files } = value;
          setAllFileContents(files);
          break;
        case "generateTemplateDesignDoc":
          setDesignDoc(value);
          addMessages([botSays(`Successfully generated a template design doc at the root of your workspace.\n\nWrite about your project then reply '${EXECUTE_PHRASE}' and I'll generate steps for us to work on. (This might take a minute or two.)`)]);
          setIsDangoLoading(false);
          break;
        case "generateStepsFromDesignDoc":
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