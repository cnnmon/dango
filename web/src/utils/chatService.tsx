import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: window.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

/* TYPES */

enum MessageSender {
  USER = "user",
  BOT = "assistant",
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

const dangoChatPrompt = (designDoc: string) => {
  const prompt = `
  You are a creative project co-collaborator whose job is to answer questions about the codebase. If the user asks for code generation, you can remind them that your interface allows them to generate code directly into their workspace by typing 'code'.\n\n
  
  In answering questions, it is important to follow the project's design doc:\n${designDoc}\n\n
  
  Ensure each answer is concise, clear, and helpful. If you are unsure of the answer, you can ask the user for more information or suggest they refer to the design doc.`;
  return prompt;
}

const dangoCodePrompt = (designDoc: string) => {
  // TODO: Ask for more information about the project if not previously provided; e.g. project type, language, relevant files for the step, etc.
  const prompt = `
  You are a creative project co-collaborator whose job is to generate code. It is important to follow the project's design doc:\n${designDoc}\n\n

  You may ONLY respond in a JSON format with the following key/value pairs: "code" must be one full file of completed, compilable code. "filename" is the name of the generated file (existing or new).\n\n
  
  An example response is:\n
  {
    "code": "print('Hello, world!')",
    "filename": "hello.py"
  }.\n\n

  Do not include any other text or commentary, unless it is within code comments.`;
  return prompt;
}

const errorResponse = "I'm sorry, I ran into an error generating a response. Please try again later.";

/* CHAT FUNCTIONS */

export const getVscodeConfirmation = (message: VscodeResponse): Message[] => {
  const { code, filename, type } = message;
  switch (type) {
    case "addFile":
      return [
        botSays(`Generated code for ${filename}:\n\`\`\`${code}\`\`\``),
        botSays("Say 'approve' to save this code, or 'reject' to try again."),
      ];
    default:
      return [botSays("I'm sorry, I couldn't generate code.")];
  }
}

export const getDesignDocConfirmation = (step: string): Message[] => [
  botSays("Hi! I'm Dango and I'm here to help you develop your project based on information from your design doc."),
  botSays("Type 'code' to generate code for the current step."),
  botSays("You can also type 'next' or 'prev' to move between steps. Or, ask me anything, and I'll answer to the best of my knowledge of your codebase and design."),
]

export const getStepConfirmation = (step: string): Message[] => [
  botSays(`You're on step ${step}.`),
]

/* HANDLE USER MESSAGES AND SPECIAL REQUESTS */

const handleCodeRequest = async (step: string, designDoc: string, generateFile: (response: VscodeResponse) => void) => {
  const assistant = await openai.beta.assistants.create({
    instructions: dangoCodePrompt(designDoc),
    name: "Dango",
    model: "gpt-4-turbo",
    response_format: { "type": "json_object" },
  });
  const thread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(
    thread.id,
    {
      role: "user",
      content: `Please generate code for step ${step}.`,
    }
  );
  let run = await openai.beta.threads.runs.createAndPoll(
    thread.id,
    { 
      assistant_id: assistant.id,
      instructions: dangoCodePrompt(designDoc),
    }
  );
  if (run.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(
      run.thread_id
    );
    for (const message of messages.data.reverse()) {
      if (message.role === 'assistant') {
        try {
          console.log("Code response:", message.content[0]);
          // @ts-ignore
          const response = JSON.parse(message.content[0].text.value);
          generateFile(response);
          return {
            success: true,
            newMessages: [], // No need to update here; a message will be posted after the file is added
          }
        } catch (error) {
          console.log("Error parsing code response:", error);
        }
      }
    }
  }
  return {
    success: false,
    newMessages: [botSays(errorResponse)],
  }
}

export const sendMessage = async (
  command: string,
  userMessage: string,
  step: string,
  designDoc: string,
  generateFile: (response: VscodeResponse) => void
): Promise<{
  success: boolean;
  newMessages: Message[];
}> => {
  if (command == "code") {
    // Code generation request
    return handleCodeRequest(step, designDoc, generateFile);
  } else {
    // Normal chat catch-all (codebase questions, etc.)
    const response = await openai.chat.completions.create({
      messages: [userSays(dangoChatPrompt(designDoc)), userSays(userMessage)],
      model: "gpt-4-turbo",
    })
    const botMessage = response.choices[0];
    if (botMessage.message.content) {
      return {
        success: true,
        newMessages: [botSays(botMessage.message.content)],
      }
    }
  }

  // Default error response
  return {
    success: false,
    newMessages: [botSays(errorResponse)],
  }
};
