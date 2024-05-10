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

export default function App() {
  /* LOCAL STORAGE */
  const initialStep = parseInt(localStorage.getItem("currentStep") || "0");

  /* STATES */
  const [designDoc, setDesignDoc] = useState<string | null>(null);
  const [allFileContents, setAllFileContents] = useState<{ name: string; content: string }[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [messages, setMessages] = useState<Message[]>([
      botSays(`Hi! I'm Dango, your project co-collaborator. I work off of your design doc to generate code and improve your workflow. Let's get started!`),
      botSays(`No design doc found. Reply with '${EXECUTE_PHRASE}' to generate a starter template. Or, create design.md with information on your intended project in the root of your workspace.`),
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
    const foundSteps = parseDesignDoc(designDoc);
    if (!foundSteps.length) {
      setMessages([botSays(`Design doc found, but unable to read steps. Reply with '${EXECUTE_PHRASE}' and I'll generate steps for us to work on. (This might take a minute or two.)`)]);
      return;
    }

    // Reset step index if it exceeds the number of steps
    let stepIdx = currentStepIdx;
    if (currentStepIdx >= foundSteps.length) {
      stepIdx = 0;
      setCurrentStepIdx(stepIdx);
      window.localStorage.setItem("currentStep", stepIdx.toString());
    }

    setSteps(foundSteps);
    setMessages(getDesignDocConfirmation(foundSteps[stepIdx]));
  }

  const handleStepChange = (newStep: number) => {
    setCurrentStepIdx(newStep);
    window.localStorage.setItem("currentStep", newStep.toString());
    setMessages(getDesignDocConfirmation(steps[newStep]));
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
      if (response.newMessages.length) {
        addMessages(newMessages);
        setIsDangoLoading(false);
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
          addMessages([botSays(`Design doc successfully updated. Type '${PLANNING_PHRASE}' to continue.`)]);
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
            botSays(`Type '${PLANNING_PHRASE}' to begin planning the implementation for this current step together.`)
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