import React from "react";
import { Step, formatStep } from "./utils/chatService";
import { ellipses, parseAndFormatMessageText } from "./utils/utils";

function NavButton({ currentStepIdx, steps, handleStepChange, direction }: {
  currentStepIdx: number,
  steps: Step[],
  handleStepChange: (newStep: number) => void,
  direction: "prev" | "next",
}) {
  const isPrev = direction === "prev";
  const stepIdx = currentStepIdx + (isPrev ? -1 : 1);
  if (stepIdx == -1) { // -1 is the landing page
    return (
      <button
        className={`subtitle`}
        onClick={() => handleStepChange(stepIdx)}>
        {`← Setup`}
      </button>
    )
  }

  if (stepIdx < -1 || stepIdx >= steps.length) {
    return <div></div>;
  }

  const step = steps[stepIdx];
  const { number, description } = step;
  
  return (
    <button
      className={`subtitle`}
      onClick={() => handleStepChange(stepIdx)}>
      {direction === "prev" && "←"} {`Step ${number}: ${ellipses(description)}`} {direction === "next" && "→"}
    </button>
  );
}

function StepFooter({
  currentStepIdx, steps, handleStepChange
}: {
  currentStepIdx: number,
  steps: Step[],
  handleStepChange: (newStep: number) => void,
}) {
  function getCurrentStep() {
    const currentStep = steps[currentStepIdx];

    if (!currentStep) {
      return <div></div>;
    }

    const { number, description } = currentStep;
    return (
      <p className="subtitle text-center">
        You're on <b>Step {number}: {currentStep && ellipses(description, 10)}</b>.
      </p>
    );
  }

  return (
    <div className="mt-2">
      {getCurrentStep()}

      <div className="flex flex-row w-full justify-between gap-2 mt-2">
        {steps.length ? (
          <>
            <NavButton currentStepIdx={currentStepIdx} steps={steps} handleStepChange={handleStepChange} direction="prev" />
            <NavButton currentStepIdx={currentStepIdx} steps={steps} handleStepChange={handleStepChange} direction="next" />
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function Chatbox({
  messages,
  designDoc,
  currentStepIdx,
  steps,
  isDangoLoading,
  setIsDangoLoading,
  handleGoMessage,
  handleStepChange,
  handleDesignDocGeneration,
  handleStepGeneration,
  messagesEndRef,
}: {
  messages: string[],
  designDoc: string | null,
  currentStepIdx: number,
  steps: Step[],
  isDangoLoading: boolean,
  setIsDangoLoading: React.Dispatch<React.SetStateAction<boolean>>,
  handleGoMessage: () => void,
  handleStepChange: (newStep: number) => void,
  handleDesignDocGeneration: () => void,
  handleStepGeneration: () => void,
  messagesEndRef: React.RefObject<HTMLDivElement>,
}) {
  function LoadingLink({ label, onClickHandler, possiblyLong }: {
    label: string,
    onClickHandler: () => void
    possiblyLong?: boolean
  }) {
    if (isDangoLoading) {
      return (
        <p className="underline gray cursor-not-allowed">
          🍡 is thinking... {possiblyLong && "(may take a few minutes, don't click away!)"}
        </p>
      )
    }
  
    const onClickHandlerWithLoading = () => {
      setIsDangoLoading(true);
      onClickHandler();
    }
  
    return (
      <a className="underline cursor-pointer" onClick={onClickHandlerWithLoading}>
        {label}
      </a>
    )
  }
  
  // First page -- instructional, tells you what steps you have, if you have a design doc
  if (currentStepIdx === -1) {
    return (
      <>
        <div className="flex flex-col gap-2 mb-2 h-[90vh] min-h-[90vh] max-h-[70vh] overflow-y-auto gap-4">
          <div>
            <h1><b>🍡 Dango</b></h1>
            <hr className="my-2" />
            <p className="mt-4">
              Dango is an AI pair programmer that works with your design doc and codebase to give you better code generations.
              <br /><br />
              To start, make sure you're in the right project directory. We'll start by ensuring you have a design doc named design.md at root, with a section for steps. Then, we'll walk through each step together.
            </p>
          </div>

          <p>
            <b>📝 Design Doc</b>{'  '}
            {designDoc ? (
              <>
                Located design.md! Update it to reflect whatever project you want to work on.
              </>
            ) : (
              <>
                No design.md found at root. <LoadingLink label="Create one from a template!" onClickHandler={handleDesignDocGeneration} />
              </>
            )}
          </p>

          {designDoc && (
            <p>
              <b>📚 Steps</b>{'  '}
              {steps.length ? (
                <>
                  {steps.length} steps found.
                  {steps.map((step, idx) => (
                    <>
                      <br />
                      - <a className="underline cursor-pointer" onClick={() => handleStepChange(idx)}>
                        Step {step.number}: {ellipses(step.description, 15)}
                      </a>
                    </>
                  ))}
                  <br />
                </>
              ) : (
                <>
                  No steps found. <LoadingLink label="Generate example steps from a template!" onClickHandler={handleStepGeneration} />
                </>
              )}

            </p>
          )}
        </div>
        
        <StepFooter
          currentStepIdx={currentStepIdx}
          steps={steps}
          handleStepChange={handleStepChange}
        />
      </>
    )
  }

  const step = steps[currentStepIdx];

  return (
    <>
      <div className="flex flex-col gap-2 mb-2 h-[79h] min-h-[79vh] max-h-[79vh] overflow-y-auto">
        <h1><b>🍡 Dango</b>: Step {step.number} Logs</h1>
        <hr className="my-2" />
        <p>We are currently working on <b>{formatStep(step)}</b></p>
        {messages.map((message, idx) => (
          <div key={idx} className="mb-2">
            {parseAndFormatMessageText(message)}
          </div>
        ))}
        <div ref={messagesEndRef} className="h-1 w-0"></div>
      </div>

      <button
        className={`submit-button align-middle select-none font-bold text-center uppercase transition-all disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none py-2 px-6 rounded-lg bg-gray-900 text-white shadow-md shadow-gray-900/10 hover:shadow-lg hover:shadow-gray-900/20 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none w-full ${isDangoLoading ? "cursor-not-allowed bg-gray-400" : ""}`} 
        disabled={isDangoLoading}
        onClick={() => {
          setIsDangoLoading(true);
          handleGoMessage();
        }}>
        {isDangoLoading ? "🍡 is thinking..." : "work on this step!"}
      </button>

      <StepFooter
        currentStepIdx={currentStepIdx}
        steps={steps}
        handleStepChange={handleStepChange}
      />
    </>
  );
}