import OpenAI from "openai";

const openai = new OpenAI({
  // @ts-ignore
  apiKey: window.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

/* TYPES */

export type Step = {
  number: number;
  description: string;
  files: string[] | null;
  information: string;
}

enum MessageSender {
  USER = "user",
  BOT = "system",
}

export type Message = {
  role: MessageSender;
  content: string;
}

export type VscodeResponse = {
  code: string;
  filename: string;
  type: string;
}

/* UTILITY FUNCTIONS */

export const botSays = (content: string) => {
  return { role: MessageSender.BOT, content };
}

export const userSays = (content: string) => {
  return { role: MessageSender.USER, content };
}

const errorResponse = "I'm sorry, I ran into an error generating a response. Please try again later.";

/* CHAT FUNCTIONS */

export const getDesignDocConfirmation = (step: Step): Message[] => {
  const { description } = step;
  return [
    botSays(`Hi! I'm Dango and I'm your AI project co-collaborator. Type 'proceed' to work together on the current step:\n\n<b>${description}</b>`),
  ];
}

/* HANDLE USER MESSAGES AND SPECIAL REQUESTS */
/* Two phases of interaction:
    1. DETECTIVE: Dango asks you questions about the step
    2. PROGRAMMER: Dango generates code
*/

const getInitialPrompt = (designDoc: string, { description, files, information }: Step) => `
  You are a pair programmer whose job is to generate code given a 'living design document', which you will update as you receive information by chatting with the project's owner.\n\n

  It is important to follow the current state of the 'living design doc':\n${designDoc}\n\n

  You are currently on step ${description}.\n
  ${files && `The relevant files for this step are:\n${files.join('\n')}\n`}
  ${information && `Additional information:\n${information}`}\n

  Your interface allows for the following commands:\n
  - 'proceed' to move forward with generating code\n
  - 'add' to add information to the design doc\n
  - 'code' to generate code\n
  These commands should be automatically detected and handled. If the user deviates from these commands, you can remind them of the available commands.\n\n
`;

const handleInitialDetectiveRequest = async (step: Step, designDoc: string) => {
  const additionalQuestioningPrompt = `
    By the information provided, do you think you can generate relevant code for this step? Is there any other information you would need to generate correct code? If so, what questions would you like to ask the project's owner to clarify things?\n\n

    You may ONLY respond in the following JSON format:\n
    {\n
      "ready": boolean where true means you are ready to generate code with no questions,\n
      "questions": list of strings where each string is a question you have for the project's owner,\n
    }\n\n

    An example response is:\n
    {\n
      "ready": false,\n
      "questions": ["What is the expected output of the program?", "What is the language of the program?"],\n
    }\n
  `;

  const response = await openai.chat.completions.create({
    messages: [
      botSays(getInitialPrompt(designDoc, step)),
      botSays(additionalQuestioningPrompt),
    ],
    model: "gpt-4-turbo",
    response_format: { type: "json_object" },
  });

  try {
    const message = response.choices[0]?.message.content;
    const { ready, questions } = JSON.parse(message as string);
    if (ready) {
      return {
        success: true,
        newMessages: [botSays("Seems like I have no further questions about this step! Type 'code' to generate code.")],
      }
    } else {
      const formattedQuestions = questions.map((q: string) => `- ${q}`).join('\n');
      const questionMessage =  `Before we move on, it would be helpful to answer the question(s):\n\n${formattedQuestions}\n\nRespond with 'add' followed by your answers to the questions or edit your design doc directly. Or, type 'code' to generate code immediately.`
      return {
        success: true,
        newMessages: [botSays(questionMessage)],
      }
    }
  } catch (error) {
    console.log("Error parsing code response:", error);
    return {
      success: false,
      newMessages: [botSays(errorResponse)],
    }
  }
}

const handleAddInformationRequest = async ({
  messages,
  step,
  designDoc,
  userMessage,
  updateDesignDoc,
}: {
  messages: Message[],
  step: Step,
  designDoc: string,
  userMessage: string,
  updateDesignDoc: (stepToUpdate: Step) => void,
}) => {
  const additionalInformationPrompt = `
    The current step looks like the JSON object:\n
    ${JSON.stringify(step)}\n\n

    The user responded 'add' plus additional information they'd like to add to the design doc relating to this step.\n

    Keep in mind the design doc structure:\n${designDoc}\n\n

    From the user response, return the updated step object with any new information. You may ONLY respond in the following JSON format:\n
    {\n
      "number": number as the step number (keep this the same),\n
      "description": string describing the step at a high level,\n
      "files": list of strings or null of relevant file paths,\n
      "information": string 
    }\n\n

    An example response is:\n
    {\n
      "number": 1,\n
      "description": "Write a program that prints 'Hello, world!'",\n
      "files": ["hello.py"],\n
      "information": "The program should be written in JavaScript. And it should use the Note.js library."
    }\n
  `;

  const response = await openai.chat.completions.create({
    messages: [
      botSays(getInitialPrompt(designDoc, step)),
      ...messages,
      userSays(userMessage),
      botSays(additionalInformationPrompt),
    ],
    model: "gpt-4-turbo",
  });

  if (response.choices[0]?.message.content) {
    const updatedStep = JSON.parse(response.choices[0].message.content);
    console.log("Add response:", response.choices[0].message.content);
    await updateDesignDoc(updatedStep); // Send it off to vscode to update!
    return {
      success: true,
      newMessages: [botSays("Design doc successfully updated. Type 'proceed' to continue.")],
    }
  }

  return {
    success: false,
    newMessages: [botSays(errorResponse)],
  }
}

const handleCodeGenerationRequest = async ({
  messages,
  step,
  designDoc,
  userMessage,
  generateFile,
}: {
  messages: Message[],
  step: Step,
  designDoc: string,
  userMessage: string,
  generateFile: (response: VscodeResponse) => void,
}) => {
  const codePrompt = `
    You are asked to generate code for ONLY the current step:\n${JSON.stringify(step)}\n\n
    Try not to generate code for future steps or steps that have already been completed. However, prioritize generating code that is correct and complete for the current step.\n\n

    Generate code for the current step based on the design doc. You may ONLY respond in the following JSON format:\n
    {\n
      "code": string of the code to generate,\n
      "filename": string of the filename to save the code as\n
    }\n\n

    An example response is:\n
    {\n
      "code": "print('Hello, world!')",\n
      "filename": "hello.py"\n
    }\n
  `;

  const response = await openai.chat.completions.create({
    messages: [
      botSays(getInitialPrompt(designDoc, step)),
      ...messages,
      userSays(userMessage),
      botSays(codePrompt),
    ],
    model: "gpt-4-turbo",
    response_format: { type: "json_object" },
  });

  try {
    const message = response.choices[0]?.message.content;
    const { code, filename } = JSON.parse(message as string);
    await generateFile({ code, filename, type: "addFile" });
    return {
      success: true,
      newMessages: [botSays(`Generated code for ${filename} and opened the file in the editor.\n\nSay 'approve' to move on to the next step, or 'reject' to try again (these don't work yet oops).`)]
    }
  } catch (error) {
    console.log("Error parsing code response:", error);
    return {
      success: false,
      newMessages: [botSays(errorResponse)],
    }
  }
}

export const sendMessage = async ({
  command,
  userMessage,
  step,
  designDoc,
  messages,
  /* VSCODE FUNCTIONS */
  generateFile,
  updateDesignDoc,
}: {
  command: string;
  userMessage: string;
  step: Step;
  designDoc: string;
  messages: Message[];
  generateFile: (response: VscodeResponse) => void;
  updateDesignDoc: (stepToUpdate: Step) => void;
}): Promise<{
  success: boolean;
  newMessages: Message[];
}> => {
  switch (command) {
    case "proceed":
      return handleInitialDetectiveRequest(step, designDoc);
    case "add":
      return handleAddInformationRequest({
        messages,
        step,
        designDoc,
        userMessage,
        updateDesignDoc
      });
    case "code":
      return handleCodeGenerationRequest({
        messages,
        step,
        designDoc,
        userMessage,
        generateFile,
      });
  }
  
  // Normal chat catch-all (codebase questions, etc.)
  const response = await openai.chat.completions.create({
    messages: [
      botSays(getInitialPrompt(designDoc, step)),
      ...messages,
      userSays(userMessage),
      botSays("Respond concisely and simply, ideally within 1-2 sentences."),
    ],
    model: "gpt-4-turbo",
  })

  if (response.choices[0]?.message.content) {
    return {
      success: true,
      newMessages: [botSays(response.choices[0].message.content)],
    }
  }

  // Default error response
  return {
    success: false,
    newMessages: [botSays(errorResponse)],
  }
};
